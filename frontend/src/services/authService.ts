import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import type { UserProfile, UserRole } from '../types';

// E-mail oficial do Administrador / Professor com privilégios automáticos
export const ADMIN_EMAIL = 'williamdevide@gmail.com';

/**
 * Cria ou sincroniza o documento de perfil do usuário no Firestore
 */
export async function syncUserProfile(
  user: FirebaseUser,
  extraData?: {
    fullName?: string;
    courseOrClass?: string;
    registrationNumber?: string;
    phone?: string;
  }
): Promise<UserProfile> {
  const userDocRef = doc(db, 'users', user.uid);
  const userDocSnap = await getDoc(userDocRef);

  const isProfessorAdmin = (user.email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (userDocSnap.exists()) {
    const data = userDocSnap.data() as UserProfile;
    // Garante que o e-mail do professor sempre tenha role 'admin'
    if (isProfessorAdmin && data.role !== 'admin') {
      const updated: UserProfile = { ...data, role: 'admin' };
      await setDoc(userDocRef, { role: 'admin' }, { merge: true });
      return updated;
    }
    return data;
  }

  // Novo perfil a ser gravado
  const newProfile: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: extraData?.fullName || user.displayName || 'Aluno(a) SQLEditor',
    role: isProfessorAdmin ? 'admin' : 'aluno',
    courseOrClass: extraData?.courseOrClass || '',
    registrationNumber: extraData?.registrationNumber || '',
    phone: extraData?.phone || '',
    photoURL: user.photoURL || '',
    createdAt: new Date().toISOString(),
    emailVerified: user.emailVerified,
    providerId: user.providerData[0]?.providerId || 'password',
  };

  await setDoc(userDocRef, newProfile);
  return newProfile;
}

/**
 * Realiza login com E-mail e Senha
 */
export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return syncUserProfile(cred.user);
}

/**
 * Realiza o cadastro de um novo aluno com envio imediato de e-mail de verificação
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  extraData: {
    fullName: string;
    courseOrClass?: string;
    registrationNumber?: string;
    phone?: string;
  }
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

  return syncUserProfile(cred.user, extraData);
}

/**
 * Realiza login ou cadastro via Conta Google (Popup)
 */
export async function loginWithGoogle(): Promise<UserProfile> {
  const cred = await signInWithPopup(auth, googleProvider);
  return syncUserProfile(cred.user);
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
 * Atualiza os dados do perfil do aluno no Firestore
 */
export async function updateUserProfileData(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  const payload = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(userDocRef, payload, { merge: true });

  if (updates.displayName && auth.currentUser) {
    try {
      await updateProfile(auth.currentUser, { displayName: updates.displayName });
    } catch {
      // Ignora erro leve de sincronia local
    }
  }
}

/**
 * Altera a senha do usuário atualmente autenticado
 */
export async function updateCurrentUserPassword(newPass: string): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Nenhum usuário logado para alterar senha.');
  }
  await updatePassword(auth.currentUser, newPass);
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
export async function updateUserRole(uid: string, newRole: UserRole): Promise<void> {
  await setDoc(doc(db, 'users', uid), { role: newRole, updatedAt: new Date().toISOString() }, { merge: true });
}

