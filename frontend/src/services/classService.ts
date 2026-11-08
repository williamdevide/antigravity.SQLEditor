import {
  collection,
  doc,
  addDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { logSystemEvent } from './auditService';
import type { ClassItem, ClassMemberItem, UserProfile } from '../types';

/**
 * Gera um código de acesso de 6 caracteres único e legível para a turma
 * (exclui caracteres ambíguos como 0, O, 1, I)
 */
export function generateClassCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Cria uma nova turma / classe no Firestore
 */
export async function createClass(params: {
  name: string;
  course: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
}): Promise<ClassItem> {
  const code = generateClassCode();
  const newClassPayload: Omit<ClassItem, 'id'> = {
    name: params.name.trim(),
    course: params.course.trim(),
    description: (params.description || '').trim(),
    code,
    teacherId: params.teacherId,
    teacherName: params.teacherName,
    teacherEmail: params.teacherEmail,
    createdAt: new Date().toISOString(),
    active: true,
    studentCount: 0,
  };

  const docRef = await addDoc(collection(db, 'classes'), newClassPayload);

  // Registra no log de auditoria de forma assíncrona e resiliente
  try {
    await logSystemEvent({
      type: 'CLASS_CREATED',
      authorUid: params.teacherId,
      authorName: params.teacherName,
      authorEmail: params.teacherEmail,
      details: `Turma criada: "${params.name}" (${params.course}) com código de acesso [${code}].`,
    });
  } catch (auditErr) {
    console.warn('[ClassService] Aviso ao registrar auditoria de turma criada:', auditErr);
  }

  return {
    id: docRef.id,
    ...newClassPayload,
  };
}

/**
 * Lista as turmas criadas por um determinado professor
 * Ordenação em memória para não depender de índices compostos no Firestore
 */
export async function getClassesByTeacher(teacherId: string): Promise<ClassItem[]> {
  try {
    const q = query(
      collection(db, 'classes'),
      where('teacherId', '==', teacherId)
    );
    const snap = await getDocs(q);
    const classes: ClassItem[] = [];
    snap.forEach((d) => {
      classes.push({ id: d.id, ...(d.data() as Omit<ClassItem, 'id'>) });
    });
    return classes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.warn('[ClassService] Erro ao listar turmas do professor:', err);
    return [];
  }
}

/**
 * Lista todas as turmas cadastradas na plataforma (Visão do Administrador)
 * Ordenação em memória para não depender de índices compostos no Firestore
 */
export async function getAllClasses(): Promise<ClassItem[]> {
  try {
    const snap = await getDocs(collection(db, 'classes'));
    const classes: ClassItem[] = [];
    snap.forEach((d) => {
      classes.push({ id: d.id, ...(d.data() as Omit<ClassItem, 'id'>) });
    });
    return classes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.warn('[ClassService] Erro ao listar todas as turmas:', err);
    return [];
  }
}

/**
 * Busca uma turma ativa pelo código de acesso de 6 caracteres
 */
export async function getClassByCode(code: string): Promise<ClassItem | null> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return null;

  try {
    const q = query(
      collection(db, 'classes'),
      where('code', '==', cleanCode),
      where('active', '==', true)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const first = snap.docs[0];
      return { id: first.id, ...(first.data() as Omit<ClassItem, 'id'>) };
    }
  } catch (err) {
    console.warn('[ClassService] Erro ao buscar turma por código:', err);
  }
  return null;
}

/**
 * O aluno solicita entrada em uma turma utilizando o código de acesso
 */
export async function requestJoinClass(params: {
  classItem: ClassItem;
  student: UserProfile;
}): Promise<void> {
  const memberDocId = `${params.classItem.id}_${params.student.uid}`;
  const memberPayload: ClassMemberItem = {
    id: memberDocId,
    classId: params.classItem.id,
    classCode: params.classItem.code,
    className: params.classItem.name,
    studentUid: params.student.uid,
    studentName: params.student.displayName,
    studentEmail: params.student.email,
    studentRegistration: params.student.registrationNumber || '',
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  // 1. Grava o registro do membro
  await setDoc(doc(db, 'class_members', memberDocId), memberPayload);

  // 2. Atualiza o perfil do aluno
  await updateDoc(doc(db, 'users', params.student.uid), {
    classId: params.classItem.id,
    className: params.classItem.name,
    classCode: params.classItem.code,
    classStatus: 'pending',
    turma: params.classItem.name,
    updatedAt: new Date().toISOString(),
  });

  // 3. Auditoria
  await logSystemEvent({
    type: 'CLASS_STUDENT_REQUESTED',
    authorUid: params.student.uid,
    authorName: params.student.displayName,
    authorEmail: params.student.email,
    targetUid: params.classItem.teacherId,
    targetName: params.classItem.name,
    details: `Aluno ${params.student.displayName} solicitou entrada na turma "${params.classItem.name}" via código [${params.classItem.code}].`,
  });
}

/**
 * O professor admite diretamente um aluno na turma pelo endereço de e-mail
 */
export async function admitStudentByEmail(params: {
  classItem: ClassItem;
  studentEmail: string;
  teacher: UserProfile;
}): Promise<void> {
  const cleanEmail = params.studentEmail.trim().toLowerCase();

  // 1. Localiza o aluno pelo e-mail
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', cleanEmail));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error(`Nenhum aluno cadastrado no SQLEditor com o e-mail "${cleanEmail}". Peça ao aluno para criar a conta primeiro.`);
  }

  const studentDoc = snap.docs[0];
  const student = studentDoc.data() as UserProfile;

  const memberDocId = `${params.classItem.id}_${student.uid}`;
  const now = new Date().toISOString();

  const memberPayload: ClassMemberItem = {
    id: memberDocId,
    classId: params.classItem.id,
    classCode: params.classItem.code,
    className: params.classItem.name,
    studentUid: student.uid,
    studentName: student.displayName,
    studentEmail: student.email,
    studentRegistration: student.registrationNumber || '',
    status: 'approved',
    requestedAt: now,
    approvedAt: now,
  };

  // 2. Grava membro aprovado
  await setDoc(doc(db, 'class_members', memberDocId), memberPayload);

  // 3. Atualiza o perfil do aluno
  await updateDoc(doc(db, 'users', student.uid), {
    classId: params.classItem.id,
    className: params.classItem.name,
    classCode: params.classItem.code,
    classStatus: 'approved',
    turma: params.classItem.name,
    updatedAt: now,
  });

  // 4. Incrementa contador da turma
  await updateDoc(doc(db, 'classes', params.classItem.id), {
    studentCount: increment(1),
  });

  // 5. Auditoria
  await logSystemEvent({
    type: 'CLASS_STUDENT_APPROVED',
    authorUid: params.teacher.uid,
    authorName: params.teacher.displayName,
    authorEmail: params.teacher.email,
    targetUid: student.uid,
    targetName: student.displayName,
    targetEmail: student.email,
    details: `Professor(a) ${params.teacher.displayName} admitiu diretamente o aluno ${student.displayName} na turma "${params.classItem.name}".`,
  });
}

/**
 * O professor aprova a solicitação pendente de um aluno que entrou pelo código da turma
 */
export async function approveStudentRequest(params: {
  memberId: string;
  classItem: ClassItem;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  teacher: UserProfile;
}): Promise<void> {
  const now = new Date().toISOString();

  // 1. Atualiza status do membro
  await updateDoc(doc(db, 'class_members', params.memberId), {
    status: 'approved',
    approvedAt: now,
  });

  // 2. Atualiza perfil do aluno
  await updateDoc(doc(db, 'users', params.studentUid), {
    classStatus: 'approved',
    updatedAt: now,
  });

  // 3. Incrementa contador da turma
  await updateDoc(doc(db, 'classes', params.classItem.id), {
    studentCount: increment(1),
  });

  // 4. Auditoria
  await logSystemEvent({
    type: 'CLASS_STUDENT_APPROVED',
    authorUid: params.teacher.uid,
    authorName: params.teacher.displayName,
    authorEmail: params.teacher.email,
    targetUid: params.studentUid,
    targetName: params.studentName,
    targetEmail: params.studentEmail,
    details: `Professor(a) ${params.teacher.displayName} aprovou a solicitação de ${params.studentName} na turma "${params.classItem.name}".`,
  });
}

/**
 * O professor remove um aluno de uma turma (o aluno NÃO é excluído da plataforma)
 */
export async function removeStudentFromClass(params: {
  memberId: string;
  classItem: ClassItem;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  teacher: UserProfile;
}): Promise<void> {
  // 1. Remove documento de vínculo
  await deleteDoc(doc(db, 'class_members', params.memberId));

  // 2. Reseta campos de turma no perfil do aluno (permanece ativo na plataforma)
  try {
    await updateDoc(doc(db, 'users', params.studentUid), {
      classId: '',
      className: '',
      classCode: '',
      classStatus: 'none',
      turma: '',
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[ClassService] Aviso ao resetar perfil do aluno:', e);
  }

  // 3. Decrementa contador se for maior que zero
  try {
    await updateDoc(doc(db, 'classes', params.classItem.id), {
      studentCount: increment(-1),
    });
  } catch (e) {
    console.warn('[ClassService] Aviso ao decrementar turma:', e);
  }

  // 4. Auditoria
  await logSystemEvent({
    type: 'CLASS_STUDENT_REMOVED',
    authorUid: params.teacher.uid,
    authorName: params.teacher.displayName,
    authorEmail: params.teacher.email,
    targetUid: params.studentUid,
    targetName: params.studentName,
    targetEmail: params.studentEmail,
    details: `Professor(a) ${params.teacher.displayName} removeu o aluno ${params.studentName} da turma "${params.classItem.name}". O aluno permanece ativo na plataforma.`,
  });
}

/**
 * Atualiza os dados de uma turma existente (nome, curso, descrição, status ativo)
 */
export async function updateClass(params: {
  classId: string;
  name: string;
  course: string;
  description?: string;
  active?: boolean;
  teacher: UserProfile;
}): Promise<void> {
  const cleanName = params.name.trim();
  const cleanCourse = params.course.trim();
  const cleanDescription = (params.description || '').trim();
  const active = params.active !== undefined ? params.active : true;

  if (!cleanName) {
    throw new Error('O nome da turma não pode ficar em branco.');
  }
  if (!cleanCourse) {
    throw new Error('O curso da turma não pode ficar em branco.');
  }

  // 1. Atualiza documento da turma no Firestore
  await updateDoc(doc(db, 'classes', params.classId), {
    name: cleanName,
    course: cleanCourse,
    description: cleanDescription,
    active,
  });

  // 2. Auditoria
  try {
    await logSystemEvent({
      type: 'CLASS_UPDATED',
      authorUid: params.teacher.uid,
      authorName: params.teacher.displayName,
      authorEmail: params.teacher.email,
      targetUid: params.classId,
      targetName: cleanName,
      details: `Professor(a) ${params.teacher.displayName} atualizou os dados da turma "${cleanName}" (${cleanCourse}).`,
    });
  } catch (auditErr) {
    console.warn('[ClassService] Aviso ao registrar auditoria de turma atualizada:', auditErr);
  }
}

/**
 * Exclui uma turma permanentemente do Firestore.
 * Conforme diretrizes acadêmicas SENAI:
 * - Todos os vínculos em class_members são removidos.
 * - Os perfis dos alunos vinculados têm os campos de turma resetados (classId, className, classCode, classStatus, turma).
 * - Os alunos NUNCA são excluídos da plataforma (apenas o Administrador pode excluir usuários).
 * - O documento da turma é excluído ao final.
 */
export async function deleteClass(params: {
  classItem: ClassItem;
  teacher: UserProfile;
}): Promise<void> {
  // 1. Busca todos os membros vinculados à turma
  const members = await getClassMembers(params.classItem.id);

  // 2. Para cada aluno, reseta os campos no perfil de usuário e remove o vínculo em class_members
  // IMPORTANTE: isso é feito ANTES de excluir a turma para que as regras do Firestore (isTeacherOfUserClass / isClassTeacher) continuem válidas
  for (const member of members) {
    try {
      await updateDoc(doc(db, 'users', member.studentUid), {
        classId: '',
        className: '',
        classCode: '',
        classStatus: 'none',
        turma: '',
        updatedAt: new Date().toISOString(),
      });
    } catch (userErr) {
      console.warn(`[ClassService] Aviso ao desvincular aluno ${member.studentUid} do perfil:`, userErr);
    }

    try {
      await deleteDoc(doc(db, 'class_members', member.id));
    } catch (memberErr) {
      console.warn(`[ClassService] Aviso ao remover documento do membro ${member.id}:`, memberErr);
    }
  }

  // 3. Exclui o documento da turma
  await deleteDoc(doc(db, 'classes', params.classItem.id));

  // 4. Registra no log de auditoria
  try {
    await logSystemEvent({
      type: 'CLASS_DELETED',
      authorUid: params.teacher.uid,
      authorName: params.teacher.displayName,
      authorEmail: params.teacher.email,
      targetUid: params.classItem.id,
      targetName: params.classItem.name,
      details: `Turma "${params.classItem.name}" [${params.classItem.code}] excluída por ${params.teacher.displayName}. ${members.length} aluno(s) desvinculados com sucesso e mantidos na plataforma.`,
    });
  } catch (auditErr) {
    console.warn('[ClassService] Aviso ao registrar auditoria de turma excluída:', auditErr);
  }
}

/**
 * Retorna todos os membros (aprovados e pendentes) de uma turma
 * Ordenação em memória para não depender de índices compostos no Firestore
 */
export async function getClassMembers(classId: string): Promise<ClassMemberItem[]> {
  try {
    const q = query(
      collection(db, 'class_members'),
      where('classId', '==', classId)
    );
    const snap = await getDocs(q);
    const members: ClassMemberItem[] = [];
    snap.forEach((d) => {
      members.push({ id: d.id, ...(d.data() as Omit<ClassMemberItem, 'id'>) });
    });
    return members.sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''));
  } catch (err) {
    console.warn('[ClassService] Erro ao buscar membros da turma:', err);
    return [];
  }
}
