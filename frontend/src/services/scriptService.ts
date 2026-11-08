import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SavedScriptItem, SavedScriptCategory, UserRole } from '../types';

/**
 * Salva um novo script ou atualiza um script existente no Firestore
 */
export async function saveScript(
  payload: {
    title: string;
    description?: string;
    content: string;
    authorUid: string;
    authorName: string;
    authorEmail: string;
    authorRole: UserRole;
    category: SavedScriptCategory;
    classIds?: string[];
    isTemporary?: boolean;
    submittedAt?: string;
  },
  existingId?: string
): Promise<SavedScriptItem> {
  const now = new Date().toISOString();
  const cleanClassIds = payload.classIds && payload.classIds.length > 0 ? payload.classIds : ['all'];

  if (existingId) {
    const scriptRef = doc(db, 'savedScripts', existingId);
    const updatePayload: Partial<SavedScriptItem> = {
      title: payload.title.trim(),
      description: (payload.description || '').trim(),
      content: payload.content,
      category: payload.category,
      classIds: cleanClassIds,
      updatedAt: now,
    };
    if (payload.isTemporary !== undefined) {
      updatePayload.isTemporary = payload.isTemporary;
    }
    if (payload.submittedAt) {
      updatePayload.submittedAt = payload.submittedAt;
    }
    await updateDoc(scriptRef, updatePayload as any);
    return {
      id: existingId,
      ...payload,
      classIds: cleanClassIds,
      createdAt: now,
      updatedAt: now,
    };
  }

  const docPayload = {
    title: payload.title.trim() || 'Script sem título',
    description: (payload.description || '').trim(),
    content: payload.content,
    authorUid: payload.authorUid,
    authorName: payload.authorName || 'Usuário',
    authorEmail: payload.authorEmail || '',
    authorRole: payload.authorRole,
    category: payload.category,
    classIds: cleanClassIds,
    isTemporary: Boolean(payload.isTemporary),
    submittedAt: payload.submittedAt || null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, 'savedScripts'), docPayload);
  return {
    id: docRef.id,
    ...docPayload,
    isTemporary: docPayload.isTemporary,
    submittedAt: docPayload.submittedAt || undefined,
  };
}

/**
 * Busca todos os scripts salvos pelo próprio usuário (exibidos no "Meu Perfil" e no menu "Carregar Scripts Salvos")
 * Ordenação em memória para não depender de índices compostos
 */
export async function getUserSavedScripts(authorUid: string): Promise<SavedScriptItem[]> {
  try {
    const q = query(
      collection(db, 'savedScripts'),
      where('authorUid', '==', authorUid)
    );
    const snap = await getDocs(q);
    const scripts: SavedScriptItem[] = [];
    snap.forEach((d) => {
      scripts.push({ id: d.id, ...(d.data() as Omit<SavedScriptItem, 'id'>) });
    });
    return scripts.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
  } catch (err) {
    console.warn('[ScriptService] Erro ao buscar scripts salvos do usuário:', err);
    return [];
  }
}

/**
 * Busca os scripts de uma turma (ou globais com 'all') disponibilizados pelo professor
 * Categorias: 'class_database', 'example', 'exercise', 'exam'
 */
export async function getClassScripts(
  classId?: string,
  category?: SavedScriptCategory
): Promise<SavedScriptItem[]> {
  try {
    const snap = await getDocs(collection(db, 'savedScripts'));
    const scripts: SavedScriptItem[] = [];

    snap.forEach((d) => {
      const data = d.data() as Omit<SavedScriptItem, 'id'>;
      // Não retorna backups temporários de alunos
      if (data.isTemporary) return;

      // Filtro de categoria
      if (category && data.category !== category) return;

      // Filtro de turmas
      if (classId) {
        const belongsToClass = (data.classIds || []).includes(classId) || (data.classIds || []).includes('all');
        if (!belongsToClass) return;
      }

      scripts.push({ id: d.id, ...data });
    });

    return scripts.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
  } catch (err) {
    console.warn('[ScriptService] Erro ao buscar scripts da turma:', err);
    return [];
  }
}

/**
 * Busca todos os scripts criados pelo professor/admin (para gestão na aba Materiais & Provas do Painel)
 */
export async function getTeacherPublishedScripts(teacherUid: string): Promise<SavedScriptItem[]> {
  try {
    const q = query(
      collection(db, 'savedScripts'),
      where('authorUid', '==', teacherUid)
    );
    const snap = await getDocs(q);
    const scripts: SavedScriptItem[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<SavedScriptItem, 'id'>;
      // Apenas scripts pedagógicos do professor (não entregas ou temporários)
      if (['class_database', 'example', 'exercise', 'exam'].includes(data.category)) {
        scripts.push({ id: d.id, ...data });
      }
    });
    return scripts.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
  } catch (err) {
    console.warn('[ScriptService] Erro ao buscar scripts publicados do professor:', err);
    return [];
  }
}

/**
 * Atualiza campos de um script salvo (renomear, alterar código, turmas, etc.)
 */
export async function updateScript(
  id: string,
  updates: Partial<SavedScriptItem>
): Promise<void> {
  const scriptRef = doc(db, 'savedScripts', id);
  await updateDoc(scriptRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Exclui permanentemente um script salvo
 */
export async function deleteScript(id: string): Promise<void> {
  await deleteDoc(doc(db, 'savedScripts', id));
}

/**
 * Remove todos os scripts marcados como temporários de um determinado usuário (limpeza pós-avaliação)
 */
export async function deleteUserTemporaryScripts(authorUid: string): Promise<number> {
  const scripts = await getUserSavedScripts(authorUid);
  const temps = scripts.filter((s) => s.isTemporary);
  for (const t of temps) {
    await deleteDoc(doc(db, 'savedScripts', t.id));
  }
  return temps.length;
}

/**
 * Converte os scripts temporários do usuário em scripts permanentes
 */
export async function keepUserTemporaryScripts(authorUid: string): Promise<number> {
  const scripts = await getUserSavedScripts(authorUid);
  const temps = scripts.filter((s) => s.isTemporary);
  for (const t of temps) {
    await updateDoc(doc(db, 'savedScripts', t.id), {
      isTemporary: false,
      updatedAt: new Date().toISOString(),
    });
  }
  return temps.length;
}

/**
 * Envia / entrega formalmente a resolução de uma avaliação pelo aluno
 */
export async function submitExam(params: {
  studentUid: string;
  studentName: string;
  studentEmail: string;
  classId: string;
  className?: string;
  examId?: string;
  examTitle: string;
  content: string;
}): Promise<SavedScriptItem> {
  const now = new Date().toISOString();
  const payload = {
    title: `[Entrega] ${params.examTitle} - ${params.studentName}`,
    description: `Resolução da avaliação enviada pelo aluno em ${new Date().toLocaleString('pt-BR')}`,
    content: params.content,
    authorUid: params.studentUid,
    authorName: params.studentName,
    authorEmail: params.studentEmail,
    authorRole: 'aluno' as UserRole,
    category: 'exam_submission' as SavedScriptCategory,
    classIds: [params.classId],
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, 'savedScripts'), payload);
  return {
    id: docRef.id,
    ...payload,
  };
}

/**
 * Busca todas as entregas de avaliação de uma turma para o professor corrigir
 */
export async function getExamSubmissions(classId: string): Promise<SavedScriptItem[]> {
  try {
    const q = query(
      collection(db, 'savedScripts'),
      where('category', '==', 'exam_submission')
    );
    const snap = await getDocs(q);
    const submissions: SavedScriptItem[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<SavedScriptItem, 'id'>;
      if ((data.classIds || []).includes(classId)) {
        submissions.push({ id: d.id, ...data });
      }
    });
    return submissions.sort((a, b) => (b.submittedAt || b.createdAt || '').localeCompare(a.submittedAt || a.createdAt || ''));
  } catch (err) {
    console.warn('[ScriptService] Erro ao buscar entregas de avaliações:', err);
    return [];
  }
}
