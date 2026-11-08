import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import type { UserProfile, UserRole, UserStatus } from '../types';
import { logSystemEvent } from './auditService';
import { getClassByCode, requestJoinClass } from './classService';

// E-mail oficial do Administrador / Professor com privilégios automáticos
export const ADMIN_EMAIL = 'williamdevide@gmail.com';
export const DEFAULT_COURSE = 'Técnico em Desenvolvimento de Sistemas';

export interface ExtraRegistrationData {
  fullName?: string;
  course?: string;
  turma?: string;
  courseOrClass?: string;
  registrationNumber?: string;
  phone?: string;
  requestedRole?: 'aluno' | 'professor';
  classCode?: string;
}

// Armazena temporariamente os dados de cadastro durante o fluxo de popup social (ex: Google)
let pendingRegistrationData: ExtraRegistrationData | null = null;

export function setPendingRegistrationData(data: ExtraRegistrationData | null) {
  pendingRegistrationData = data;
}

export function getPendingRegistrationData(): ExtraRegistrationData | null {
  return pendingRegistrationData;
}

/**
 * Cria um objeto de perfil padrão seguro caso o Firestore esteja em inicialização ou com regras pendentes
 */
function createFallbackProfile(
  user: FirebaseUser,
  extraData?: ExtraRegistrationData
): UserProfile {
  const isProfessorAdmin = (user.email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const course = extraData?.course || extraData?.courseOrClass || DEFAULT_COURSE;
  const turma = extraData?.turma || '';

  let role: UserRole = 'aluno';
  let status: UserStatus = 'active';

  if (isProfessorAdmin) {
    role = 'admin';
    status = 'active';
  } else if (extraData?.requestedRole === 'professor') {
    role = 'professor';
    status = 'pending_approval';
  }

  return {
    uid: user.uid,
    email: user.email || '',
    displayName: extraData?.fullName || user.displayName || (role === 'professor' ? 'Professor(a) SQLEditor' : 'Aluno(a) SQLEditor'),
    role,
    status,
    course,
    turma,
    courseOrClass: turma ? `${course} - ${turma}` : course,
    registrationNumber: extraData?.registrationNumber || '',
    phone: extraData?.phone || '',
    photoURL: user.photoURL || '',
    createdAt: new Date().toISOString(),
    emailVerified: user.emailVerified,
    providerId: user.providerData[0]?.providerId || 'password',
  };
}

/**
 * Cria ou sincroniza o documento de perfil do usuário no Firestore
 */
export async function syncUserProfile(
  user: FirebaseUser,
  extraData?: ExtraRegistrationData
): Promise<UserProfile> {
  const isProfessorAdmin = (user.email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const effectiveExtraData = extraData || pendingRegistrationData;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data() as UserProfile;
      // Garante que o e-mail do superusuário sempre tenha role 'admin' e status 'active'
      if (isProfessorAdmin && (data.role !== 'admin' || data.status !== 'active')) {
        const updated: UserProfile = { ...data, role: 'admin', status: 'active' };
        await setDoc(userDocRef, { role: 'admin', status: 'active' }, { merge: true });
        return updated;
      }

      // Se o usuário solicitou cadastro como 'professor' e não é o administrador superusuário
      if (effectiveExtraData?.requestedRole === 'professor' && !isProfessorAdmin) {
        const course = effectiveExtraData.course || data.course || DEFAULT_COURSE;
        const now = new Date().toISOString();
        const updated: UserProfile = {
          ...data,
          uid: user.uid,
          email: user.email || data.email || '',
          displayName: effectiveExtraData.fullName || user.displayName || data.displayName || 'Professor(a) SQLEditor',
          role: 'professor',
          // Se já estava previamente aprovado como professor, mantém 'active'; se veio de 'aluno' ou novo pedido, 'pending_approval'
          status: data.role === 'professor' && data.status === 'active' ? 'active' : 'pending_approval',
          course,
          turma: '', // Professor não pertence a turma
          courseOrClass: course,
          registrationNumber: effectiveExtraData.registrationNumber || data.registrationNumber || '',
          phone: effectiveExtraData.phone || data.phone || '',
          photoURL: user.photoURL || data.photoURL || '',
          classCode: '',
          classStatus: 'none',
          createdAt: data.createdAt || now,
          updatedAt: now,
          emailVerified: user.emailVerified || data.emailVerified || false,
          providerId: user.providerData[0]?.providerId || data.providerId || 'google.com',
        };

        if (data.role !== 'professor' || data.status !== updated.status) {
          await setDoc(userDocRef, updated, { merge: true });

          try {
            await logSystemEvent({
              type: 'USER_REGISTERED',
              authorUid: user.uid,
              authorName: updated.displayName,
              authorEmail: updated.email,
              details: 'Cadastro/Solicitação de perfil de Professor(a) via Google realizada (Aguardando autorização de um Administrador).',
            });
          } catch (err) {
            console.warn('Erro ao auditar solicitação de professor:', err);
          }
        }

        return updated;
      }

      return data;
    }

    const course = effectiveExtraData?.course || effectiveExtraData?.courseOrClass || DEFAULT_COURSE;
    const isTeacher = effectiveExtraData?.requestedRole === 'professor';

    let role: UserRole = 'aluno';
    let status: UserStatus = 'active';

    if (isProfessorAdmin) {
      role = 'admin';
      status = 'active';
    } else if (isTeacher) {
      role = 'professor';
      status = 'pending_approval';
    }

    const turma = role === 'professor' ? '' : (effectiveExtraData?.turma || '');

    // Novo perfil a ser gravado no Firestore
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: effectiveExtraData?.fullName || user.displayName || (role === 'professor' ? 'Professor(a) SQLEditor' : 'Aluno(a) SQLEditor'),
      role,
      status,
      course,
      turma,
      courseOrClass: turma ? `${course} - ${turma}` : course,
      registrationNumber: effectiveExtraData?.registrationNumber || '',
      phone: effectiveExtraData?.phone || '',
      photoURL: user.photoURL || '',
      classCode: role === 'aluno' ? (effectiveExtraData?.classCode?.trim().toUpperCase() || '') : '',
      classStatus: role === 'aluno' && effectiveExtraData?.classCode ? 'pending' : 'none',
      createdAt: new Date().toISOString(),
      emailVerified: user.emailVerified,
      providerId: user.providerData[0]?.providerId || 'password',
    };

    await setDoc(userDocRef, newProfile);

    // Se aluno forneceu classCode válido, associa solicitação
    if (newProfile.role === 'aluno' && effectiveExtraData?.classCode && effectiveExtraData.classCode.trim()) {
      try {
        const targetClass = await getClassByCode(effectiveExtraData.classCode.trim());
        if (targetClass) {
          await requestJoinClass({ classItem: targetClass, student: newProfile });
        }
      } catch (err) {
        console.warn('Erro ao associar código de turma no registro via Google/novo perfil:', err);
      }
    }

    // Registra evento de auditoria para o novo perfil
    try {
      await logSystemEvent({
        type: 'USER_REGISTERED',
        authorUid: user.uid,
        authorName: newProfile.displayName,
        authorEmail: newProfile.email,
        details: isTeacher
          ? 'Cadastro de novo Professor(a) realizado com sucesso (Aguardando autorização de um Administrador).'
          : `Cadastro de novo Aluno(a) realizado com sucesso${effectiveExtraData?.classCode ? ` com solicitação para turma código [${effectiveExtraData.classCode.toUpperCase()}].` : '.'}`,
      });
    } catch (err) {
      console.warn('Erro ao auditar novo cadastro:', err);
    }

    return newProfile;
  } catch (err: any) {
    console.warn('[syncUserProfile] Aviso: Falha ao sincronizar perfil no Firestore (verifique firestore.rules):', err);
    // Retorna o perfil de fallback para não impedir o login e a experiência do usuário
    return createFallbackProfile(user, effectiveExtraData ?? undefined);
  }
}

/**
 * Realiza login com E-mail e Senha
 */
export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return syncUserProfile(cred.user);
}

/**
 * Realiza o cadastro de um novo usuário (Aluno ou Professor) com envio imediato de e-mail de verificação
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  extraData: ExtraRegistrationData
): Promise<UserProfile> {
  const cleanEmail = email.trim();
  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);

  // Atualiza displayName no Auth do Firebase
  if (extraData.fullName) {
    try {
      await updateProfile(cred.user, { displayName: extraData.fullName.trim() });
    } catch {
      // Falha não impeditiva
    }
  }

  // Dispara o e-mail de confirmação obrigatório
  try {
    await sendEmailVerification(cred.user);
  } catch (err) {
    console.warn('Erro ao disparar e-mail de confirmação:', err);
  }

  const profile = await syncUserProfile(cred.user, extraData);

  // Se o aluno forneceu um código de turma válido, tenta vincular a solicitação
  if (profile.role === 'aluno' && extraData.classCode && extraData.classCode.trim()) {
    try {
      const targetClass = await getClassByCode(extraData.classCode.trim());
      if (targetClass) {
        await requestJoinClass({ classItem: targetClass, student: profile });
      }
    } catch (err) {
      console.warn('Erro ao associar código de turma no registro:', err);
    }
  }

  // Registra no histórico de auditoria
  try {
    const isTeacher = profile.role === 'professor';
    await logSystemEvent({
      type: 'USER_REGISTERED',
      authorUid: cred.user.uid,
      authorName: profile.displayName,
      authorEmail: cleanEmail,
      details: isTeacher
        ? `Cadastro de novo Professor(a) realizado com sucesso (Aguardando autorização de um Administrador).`
        : `Cadastro de novo Aluno(a) realizado com sucesso${extraData.classCode ? ` com solicitação para turma código [${extraData.classCode.toUpperCase()}].` : '.'}`,
    });
  } catch (err) {
    console.warn('Erro ao auditar cadastro:', err);
  }

  return profile;
}

/**
 * Realiza login ou cadastro via Conta Google (Popup)
 */
export async function loginWithGoogle(extraData?: ExtraRegistrationData): Promise<UserProfile> {
  pendingRegistrationData = extraData || null;
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return await syncUserProfile(cred.user, extraData);
  } finally {
    setTimeout(() => {
      pendingRegistrationData = null;
    }, 5000);
  }
}

/**
 * Envia e-mail para redefinição de senha
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Reenvia o e-mail de confirmação para o usuário logado atualmente
 */
export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Nenhum usuário ativo para reenviar confirmação.');
  }
  await sendEmailVerification(auth.currentUser);
}

/**
 * Recarrega o estado do usuário do Firebase Auth para verificar se o e-mail foi validado
 */
export async function reloadCurrentUser(): Promise<boolean> {
  if (!auth.currentUser) return false;
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
}

/**
 * Atualiza os dados do perfil do usuário no Firestore
 */
export async function updateUserProfileData(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  const snap = await getDoc(userDocRef);
  const existing = snap.exists() ? (snap.data() as UserProfile) : null;
  const currentUser = auth.currentUser;
  const isProfessorAdmin = (currentUser?.email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // Preserva papéis e status existentes para integridade e compatibilidade com firestore.rules
  const role: UserRole = existing?.role || (isProfessorAdmin ? 'admin' : (updates.role || 'aluno'));
  const status: UserStatus = existing?.status || (isProfessorAdmin ? 'active' : (updates.status || (role === 'professor' ? 'pending_approval' : 'active')));

  const payload: Partial<UserProfile> = {
    uid,
    email: existing?.email || currentUser?.email || '',
    displayName: updates.displayName || existing?.displayName || currentUser?.displayName || 'Usuário SQLEditor',
    role,
    status,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Garante campos estruturais na criação inicial ou reconciliação
  if (!existing?.createdAt) {
    payload.createdAt = new Date().toISOString();
  }
  if (!existing?.providerId && currentUser) {
    payload.providerId = currentUser.providerData[0]?.providerId || 'password';
  }
  if (existing?.emailVerified !== undefined) {
    payload.emailVerified = existing.emailVerified;
  } else if (currentUser) {
    payload.emailVerified = currentUser.emailVerified;
  }

  await setDoc(userDocRef, payload, { merge: true });

  if (currentUser) {
    const profileUpdates: { displayName?: string; photoURL?: string } = {};
    if (updates.displayName) profileUpdates.displayName = updates.displayName;
    if (updates.photoURL !== undefined) profileUpdates.photoURL = updates.photoURL;

    if (Object.keys(profileUpdates).length > 0) {
      try {
        await updateProfile(currentUser, profileUpdates);
      } catch {
        // Ignora erro leve de sincronia local
      }
    }
  }
}

/**
 * Altera a senha do usuário atualmente autenticado com suporte a reautenticação segura
 */
export async function updateCurrentUserPassword(
  newPass: string,
  currentPass?: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Nenhum usuário logado para alterar senha.');
  }

  // Se a senha atual foi fornecida e o usuário tem e-mail direto, reautentica primeiro
  if (currentPass && currentUser.email) {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
    await reauthenticateWithCredential(currentUser, credential);
  }

  await updatePassword(currentUser, newPass);
}

/**
 * Finaliza a sessão do usuário
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Recupera o perfil completo de um usuário pelo UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
}

/**
 * Lista todos os usuários cadastrados (Exclusivo para o Painel do Administrador)
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const users: UserProfile[] = [];
  snap.forEach((d) => {
    users.push(d.data() as UserProfile);
  });
  return users;
}

/**
 * Altera a permissão / papel de um usuário (Exclusivo para Administrador)
 */
export async function updateUserRole(
  uid: string,
  newRole: UserRole,
  adminUser?: UserProfile,
  targetUser?: UserProfile
): Promise<void> {
  const updates: Partial<UserProfile> = {
    role: newRole,
    status: 'active', // Ao ser promovido ou alterado pelo admin, fica ativo
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', uid), updates, { merge: true });

  if (adminUser) {
    await logSystemEvent({
      type: 'ROLE_CHANGED',
      authorUid: adminUser.uid,
      authorName: adminUser.displayName,
      authorEmail: adminUser.email,
      targetUid: uid,
      targetName: targetUser?.displayName,
      targetEmail: targetUser?.email,
      details: `Administrador ${adminUser.displayName} alterou a permissão de ${targetUser?.displayName || uid} para [${newRole.toUpperCase()}].`,
    });
  }
}

/**
 * Autoriza um professor que estava com cadastro pendente (Exclusivo para Administrador)
 */
export async function approveTeacher(
  teacher: UserProfile,
  adminUser: UserProfile
): Promise<void> {
  const now = new Date().toISOString();
  await setDoc(
    doc(db, 'users', teacher.uid),
    {
      status: 'active',
      updatedAt: now,
    },
    { merge: true }
  );

  await logSystemEvent({
    type: 'PROFESSOR_APPROVED',
    authorUid: adminUser.uid,
    authorName: adminUser.displayName,
    authorEmail: adminUser.email,
    targetUid: teacher.uid,
    targetName: teacher.displayName,
    targetEmail: teacher.email,
    details: `Administrador ${adminUser.displayName} autorizou o cadastro do Professor(a) ${teacher.displayName} (${teacher.email}).`,
  });
}

/**
 * Recusa o cadastro de um professor pendente (Exclusivo para Administrador)
 */
export async function rejectTeacher(
  teacher: UserProfile,
  adminUser: UserProfile,
  reason?: string
): Promise<void> {
  const now = new Date().toISOString();
  await setDoc(
    doc(db, 'users', teacher.uid),
    {
      status: 'rejected',
      updatedAt: now,
    },
    { merge: true }
  );

  await logSystemEvent({
    type: 'PROFESSOR_REJECTED',
    authorUid: adminUser.uid,
    authorName: adminUser.displayName,
    authorEmail: adminUser.email,
    targetUid: teacher.uid,
    targetName: teacher.displayName,
    targetEmail: teacher.email,
    details: `Administrador ${adminUser.displayName} recusou o cadastro do Professor(a) ${teacher.displayName}.${reason ? ` Motivo: ${reason}` : ''}`,
  });
}

/**
 * Exclui permanentemente um usuário da plataforma (Exclusivo para o Administrador)
 * Observação: Conforme regra estrita do sistema, o professor NUNCA pode excluir da plataforma, apenas o administrador.
 */
export async function deleteUserPermanently(
  targetUser: UserProfile,
  adminUser: UserProfile
): Promise<void> {
  if (adminUser.role !== 'admin' && adminUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Apenas o Administrador possui permissão para excluir usuários da plataforma.');
  }

  // Deleta o registro do usuário na coleção 'users'
  await deleteDoc(doc(db, 'users', targetUser.uid));

  // Registra no histórico de auditoria
  await logSystemEvent({
    type: 'USER_DELETED',
    authorUid: adminUser.uid,
    authorName: adminUser.displayName,
    authorEmail: adminUser.email,
    targetUid: targetUser.uid,
    targetName: targetUser.displayName,
    targetEmail: targetUser.email,
    details: `Administrador ${adminUser.displayName} excluiu permanentemente o usuário ${targetUser.displayName} (${targetUser.email}, perfil: ${targetUser.role.toUpperCase()}) da plataforma.`,
  });
}

