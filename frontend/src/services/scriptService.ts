import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  getClassroomDbScripts,
  getAvailableSolutions,
  formatSolutionTitle,
} from './scriptsLoader';
import { withFirestoreTimeout } from './firestoreUtils';
export { filterPersonalSavedScripts, computeDatabasesFingerprint } from '../utils/classroomHelpers';
import type { SavedScriptItem, SavedScriptCategory, UserRole, AutoGradeDetails } from '../types';

export const NORMAL_GLOBAL_CLASS_ID = 'normal_global';

/**
 * Normaliza o título de um script para o formato de arquivo kebab-case com extensão .sql.
 * Exemplos:
 *  - "teste" -> "teste.sql"
 *  - "meu teste" -> "meu-teste.sql"
 *  - "meu teste.sql" -> "meu-teste.sql"
 *  - "Aula 03 - Joins & Views!" -> "aula-03-joins-views.sql"
 */
export function formatScriptFileName(input: string): string {
  if (!input) return 'script.sql';
  let val = input.trim();
  // Remove extensão .sql caso já tenha sido informada
  if (val.toLowerCase().endsWith('.sql')) {
    val = val.slice(0, -4).trim();
  }
  // Normaliza caracteres acentuados (remove acentuação)
  val = val.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Converte para minúsculas
  val = val.toLowerCase();
  // Substitui sequências de espaços, underscores ou pontuações por um único hífen
  val = val.replace(/[^a-z0-9]+/g, '-');
  // Remove hifens nas pontas
  val = val.replace(/^-+|-+$/g, '');
  if (!val) {
    val = 'script';
  }
  return val + '.sql';
}

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
    visibleInNormal?: boolean;
    visibleInClassroom?: boolean;
    visibleInExam?: boolean;
    answerKeySql?: string;
    isTemporary?: boolean;
    submittedAt?: string;
    examSessionId?: string | null;
    examSessionLabel?: string | null;
  },
  existingId?: string
): Promise<SavedScriptItem> {
  const now = new Date().toISOString();
  const cleanClassIds = payload.classIds && payload.classIds.length > 0 ? payload.classIds : ['all'];

  const cleanContent = payload.content ?? '';

  if (existingId) {
    const scriptRef = doc(db, 'savedScripts', existingId);
    const updatePayload: Partial<SavedScriptItem> = {
      title: payload.title.trim(),
      description: (payload.description || '').trim(),
      content: cleanContent,
      category: payload.category,
      classIds: cleanClassIds,
      updatedAt: now,
    };
    if (payload.visibleInNormal !== undefined) {
      updatePayload.visibleInNormal = payload.visibleInNormal;
    }
    if (payload.visibleInClassroom !== undefined) {
      updatePayload.visibleInClassroom = payload.visibleInClassroom;
    }
    if (payload.visibleInExam !== undefined) {
      updatePayload.visibleInExam = payload.visibleInExam;
    }
    if (payload.answerKeySql !== undefined) {
      updatePayload.answerKeySql = payload.answerKeySql;
    }
    if (payload.isTemporary !== undefined) {
      updatePayload.isTemporary = payload.isTemporary;
    }
    if (payload.submittedAt) {
      updatePayload.submittedAt = payload.submittedAt;
    }
    await withFirestoreTimeout(
      updateDoc(scriptRef, updatePayload as any),
      12000,
      'atualizar o script no perfil'
    );
    return {
      id: existingId,
      ...payload,
      content: cleanContent,
      classIds: cleanClassIds,
      createdAt: now,
      updatedAt: now,
    };
  }

  const docPayload: any = {
    title: payload.title.trim() || 'Script sem título',
    description: (payload.description || '').trim(),
    content: cleanContent,
    authorUid: payload.authorUid,
    authorName: payload.authorName || 'Usuário',
    authorEmail: payload.authorEmail || '',
    authorRole: payload.authorRole || 'professor',
    category: payload.category,
    classIds: cleanClassIds,
    visibleInNormal: payload.visibleInNormal ?? false,
    visibleInClassroom: payload.visibleInClassroom ?? true,
    visibleInExam: payload.visibleInExam ?? (payload.category === 'exam'),
    isTemporary: Boolean(payload.isTemporary),
    createdAt: now,
    updatedAt: now,
  };

  if (payload.answerKeySql && payload.answerKeySql.trim()) {
    docPayload.answerKeySql = payload.answerKeySql;
  }

  if (payload.submittedAt) {
    docPayload.submittedAt = payload.submittedAt;
  }
  if (payload.examSessionId) {
    docPayload.examSessionId = payload.examSessionId;
  }
  if (payload.examSessionLabel) {
    docPayload.examSessionLabel = payload.examSessionLabel;
  }

  const docRef = await withFirestoreTimeout(
    addDoc(collection(db, 'savedScripts'), docPayload),
    12000,
    'salvar o script no perfil'
  );
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
 * Busca os scripts de uma turma (ou globais com 'all') usando consulta filtrada no servidor
 * para evitar leitura integral da coleção em turmas com muitos alunos.
 */
export async function getClassScripts(
  classId?: string,
  category?: SavedScriptCategory
): Promise<SavedScriptItem[]> {
  try {
    const scriptsRef = collection(db, 'savedScripts');
    const q = classId
      ? query(scriptsRef, where('classIds', 'array-contains-any', [classId, 'all']))
      : category
      ? query(scriptsRef, where('category', '==', category))
      : query(scriptsRef);

    const snap = await withFirestoreTimeout(
      getDocs(q),
      12000,
      'carregar os materiais da turma'
    );
    const scripts: SavedScriptItem[] = [];

    snap.forEach((d) => {
      const data = d.data() as Omit<SavedScriptItem, 'id'>;
      // Não retorna backups temporários de alunos
      if (data.isTemporary) return;

      // Filtro de categoria quando combinado com filtro de turma
      if (category && data.category !== category) return;

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
      if (['class_database', 'example', 'exercise', 'solution', 'exam'].includes(data.category)) {
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
  examSessionId?: string | null;
  examSessionLabel?: string | null;
}): Promise<SavedScriptItem> {
  const now = new Date().toISOString();

  // Busca histórico prévio do aluno para versionamento preservado
  let previousSubmissionsCount = 0;
  try {
    const prevQ = query(
      collection(db, 'savedScripts'),
      where('authorUid', '==', params.studentUid),
      where('category', '==', 'exam_submission')
    );
    const snap = await getDocs(prevQ);
    const classSubs: SavedScriptItem[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<SavedScriptItem, 'id'>;
      if ((data.classIds || []).includes(params.classId)) {
        classSubs.push({ id: d.id, ...data });
      }
    });
    previousSubmissionsCount = classSubs.length;

    // Marca versões anteriores com isLatestSubmission = false
    const batch = writeBatch(db);
    classSubs.forEach((sub) => {
      if (sub.isLatestSubmission !== false) {
        batch.update(doc(db, 'savedScripts', sub.id), { isLatestSubmission: false });
      }
    });
    await batch.commit();
  } catch (err) {
    console.warn('[submitExam] Falha ao consultar envios anteriores para versionamento:', err);
  }

  const nextVersion = previousSubmissionsCount + 1;
  const versionSuffix = nextVersion > 1 ? ` (Versão ${nextVersion})` : '';

  const payload = {
    title: `[Entrega] ${params.examTitle} - ${params.studentName}${versionSuffix}`,
    description: `Resolução da avaliação enviada pelo aluno em ${new Date().toLocaleString('pt-BR')} (Envio v${nextVersion})`,
    content: params.content,
    authorUid: params.studentUid,
    authorName: params.studentName,
    authorEmail: params.studentEmail,
    authorRole: 'aluno' as UserRole,
    category: 'exam_submission' as SavedScriptCategory,
    classIds: [params.classId],
    examSessionId: params.examSessionId || null,
    examSessionLabel: params.examSessionLabel || null,
    submissionVersion: nextVersion,
    isLatestSubmission: true,
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

/**
 * Grava a nota, feedback e relatório de correção automática de uma entrega de avaliação
 */
export async function gradeExamSubmission(
  submissionId: string,
  payload: {
    grade: number;
    teacherFeedback: string;
    gradedBy: string;
    gradePublished: boolean;
    autoGradeDetails?: AutoGradeDetails;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const scriptRef = doc(db, 'savedScripts', submissionId);
  const updateData: Record<string, any> = {
    grade: Math.max(0, Math.min(10, Number(payload.grade) || 0)),
    teacherFeedback: (payload.teacherFeedback || '').trim(),
    gradedBy: payload.gradedBy,
    gradedAt: now,
    gradePublished: Boolean(payload.gradePublished),
    updatedAt: now,
  };
  if (payload.autoGradeDetails) {
    updateData.autoGradeDetails = payload.autoGradeDetails;
  }
  await updateDoc(scriptRef, updateData);
}

/**
 * Busca as entregas de avaliação de um determinado aluno (para visualizar notas publicadas em Minha Classe / Meu Perfil)
 */
export async function getStudentExamSubmissions(studentUid: string): Promise<SavedScriptItem[]> {
  if (!studentUid) return [];
  try {
    const q = query(
      collection(db, 'savedScripts'),
      where('authorUid', '==', studentUid),
      where('category', '==', 'exam_submission')
    );
    const snap = await getDocs(q);
    const list: SavedScriptItem[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<SavedScriptItem, 'id'>) });
    });
    return list.sort((a, b) => (b.submittedAt || b.createdAt || '').localeCompare(a.submittedAt || a.createdAt || ''));
  } catch (err) {
    console.warn('[ScriptService] Erro ao buscar avaliações entregues do aluno:', err);
    return [];
  }
}

/**
 * Retorna os materiais embutidos originais do SQLEditor (BDs de Aula e Soluções da pasta data/).
 * Usado para popular pela primeira vez o card "Geral (Modo Normal)" e como fallback offline.
 */
export function getBuiltInNormalMaterials(): SavedScriptItem[] {
  const bds = getClassroomDbScripts().map((bd) => ({
    id: `builtin-bd-${bd.fileName}`,
    title: formatSolutionTitle(bd.fileName),
    description: bd.fileName,
    content: bd.content,
    authorUid: 'system',
    authorName: 'SQLEditor Oficial',
    authorEmail: '',
    authorRole: 'admin' as UserRole,
    category: 'class_database' as SavedScriptCategory,
    classIds: [NORMAL_GLOBAL_CLASS_ID],
    visibleInNormal: true,
    visibleInClassroom: false,
    visibleInExam: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }));

  const sols = getAvailableSolutions().map((sol) => ({
    id: `builtin-sol-${sol.fileName}`,
    title: sol.displayName,
    description: sol.fileName,
    content: sol.content,
    authorUid: 'system',
    authorName: 'SQLEditor Oficial',
    authorEmail: '',
    authorRole: 'admin' as UserRole,
    category: 'solution' as SavedScriptCategory,
    classIds: [NORMAL_GLOBAL_CLASS_ID],
    visibleInNormal: true,
    visibleInClassroom: false,
    visibleInExam: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }));

  return [...bds, ...sols];
}

/**
 * Busca os materiais públicos do catálogo "Geral (Modo Normal)" no Firestore.
 * Se ainda não houver documentos semeados (ou em fallback offline), retorna os itens embutidos originais.
 */
export async function getNormalGlobalScripts(): Promise<SavedScriptItem[]> {
  try {
    const q = query(
      collection(db, 'savedScripts'),
      where('classIds', 'array-contains', NORMAL_GLOBAL_CLASS_ID)
    );
    const snap = await getDocs(q);
    const scripts: SavedScriptItem[] = [];

    snap.forEach((d) => {
      const data = d.data() as Omit<SavedScriptItem, 'id'>;
      if (data.isTemporary || data.visibleInNormal === false) return;
      scripts.push({ id: d.id, ...data });
    });

    if (scripts.length === 0) {
      return getBuiltInNormalMaterials();
    }

    return scripts.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  } catch (err) {
    console.warn('[ScriptService] Usando catálogo embutido do Modo Normal (fallback):', err);
    return getBuiltInNormalMaterials();
  }
}

/**
 * Garante que o catálogo "Geral (Modo Normal)" no Firestore contenha todos os materiais originais
 * (BDs embutidos + soluções + materiais já existentes com visibleInNormal === true) sem duplicar itens.
 */
export async function ensureNormalGlobalSeeded(adminUser: {
  uid: string;
  displayName: string;
  email: string;
}): Promise<SavedScriptItem[]> {
  const existingQ = query(
    collection(db, 'savedScripts'),
    where('classIds', 'array-contains', NORMAL_GLOBAL_CLASS_ID)
  );
  const existingSnap = await getDocs(existingQ);
  const existingList: SavedScriptItem[] = [];
  existingSnap.forEach((d) => {
    const data = d.data() as Omit<SavedScriptItem, 'id'>;
    if (!data.isTemporary) {
      existingList.push({ id: d.id, ...data });
    }
  });

  // Marca de controle local para não re-semear caso o administrador tenha excluído propositalmente tudo
  const seedFlagKey = 'sqleditor_normal_global_seeded_v1';
  let alreadyInitialized = false;
  try {
    alreadyInitialized = localStorage.getItem(seedFlagKey) === 'true';
  } catch (_) {}

  if (existingList.length === 0 && !alreadyInitialized) {
    const knownKeys = new Set<string>();

    // 1. Vincula materiais já existentes publicados com visibleInNormal === true
    try {
      const allSnap = await getDocs(collection(db, 'savedScripts'));
      for (const d of allSnap.docs) {
        const data = d.data() as Omit<SavedScriptItem, 'id'>;
        if (
          !data.isTemporary &&
          data.visibleInNormal &&
          ['class_database', 'example', 'exercise', 'solution'].includes(data.category)
        ) {
          const nextClassIds = Array.from(new Set([...(data.classIds || []), NORMAL_GLOBAL_CLASS_ID]));
          await updateScript(d.id, { classIds: nextClassIds, visibleInNormal: true });
          const updatedItem: SavedScriptItem = { id: d.id, ...data, classIds: nextClassIds };
          existingList.push(updatedItem);
          knownKeys.add(`${data.category}:${(data.description || data.title).toLowerCase()}`);
          knownKeys.add(`${data.category}:${data.title.toLowerCase()}`);
        }
      }
    } catch (err) {
      console.warn('[ensureNormalGlobalSeeded] Aviso ao vincular materiais existentes:', err);
    }

    // 2. Insere os BDs e Soluções embutidos que ainda não constam no Firestore
    const builtins = getBuiltInNormalMaterials();
    for (const item of builtins) {
      const keyByFile = `${item.category}:${(item.description || '').toLowerCase()}`;
      const keyByTitle = `${item.category}:${item.title.toLowerCase()}`;
      if (knownKeys.has(keyByFile) || knownKeys.has(keyByTitle)) continue;

      const created = await saveScript({
        title: item.title,
        description: item.description,
        content: item.content,
        authorUid: adminUser.uid,
        authorName: adminUser.displayName || 'Administrador',
        authorEmail: adminUser.email || '',
        authorRole: 'admin',
        category: item.category,
        classIds: [NORMAL_GLOBAL_CLASS_ID],
        visibleInNormal: true,
        visibleInClassroom: false,
        visibleInExam: false,
      });
      existingList.push(created);
    }

    try {
      localStorage.setItem(seedFlagKey, 'true');
    } catch (_) {}
  }

  return existingList.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}

/**
 * Restaura materiais embutidos que eventualmente tenham sido removidos do catálogo Geral (Modo Normal),
 * sem duplicar nenhum item já presente.
 */
export async function restoreMissingBuiltInNormalMaterials(adminUser: {
  uid: string;
  displayName: string;
  email: string;
}): Promise<number> {
  const existingQ = query(
    collection(db, 'savedScripts'),
    where('classIds', 'array-contains', NORMAL_GLOBAL_CLASS_ID)
  );
  const snap = await getDocs(existingQ);
  const known = new Set<string>();
  snap.forEach((d) => {
    const data = d.data() as Omit<SavedScriptItem, 'id'>;
    known.add(`${data.category}:${(data.description || data.title).toLowerCase()}`);
    known.add(`${data.category}:${data.title.toLowerCase()}`);
  });

  let restored = 0;
  for (const item of getBuiltInNormalMaterials()) {
    const keyByFile = `${item.category}:${(item.description || '').toLowerCase()}`;
    const keyByTitle = `${item.category}:${item.title.toLowerCase()}`;
    if (known.has(keyByFile) || known.has(keyByTitle)) continue;

    await saveScript({
      title: item.title,
      description: item.description,
      content: item.content,
      authorUid: adminUser.uid,
      authorName: adminUser.displayName || 'Administrador',
      authorEmail: adminUser.email || '',
      authorRole: 'admin',
      category: item.category,
      classIds: [NORMAL_GLOBAL_CLASS_ID],
      visibleInNormal: true,
      visibleInClassroom: false,
      visibleInExam: false,
    });
    restored++;
  }
  return restored;
}

/**
 * Copia materiais selecionados do Modo Normal como cópias independentes para dentro de uma turma.
 */
export async function copyNormalMaterialsToClass(params: {
  materials: SavedScriptItem[];
  classId: string;
  authorUid: string;
  authorName: string;
  authorEmail: string;
  authorRole: UserRole;
}): Promise<SavedScriptItem[]> {
  const copied: SavedScriptItem[] = [];
  for (const mat of params.materials) {
    const created = await saveScript({
      title: mat.title,
      description: mat.description,
      content: mat.content,
      authorUid: params.authorUid,
      authorName: params.authorName,
      authorEmail: params.authorEmail,
      authorRole: params.authorRole,
      category: mat.category,
      classIds: [params.classId],
      visibleInNormal: false,
      visibleInClassroom: true,
      visibleInExam: false,
      answerKeySql: mat.answerKeySql,
    });
    copied.push(created);
  }
  return copied;
}

/**
 * Exclui vários materiais em lote no Firestore e retorna a quantidade removida.
 */
export async function deleteScriptsBatch(ids: string[]): Promise<number> {
  let deleted = 0;
  for (const id of ids) {
    await deleteScript(id);
    deleted++;
  }
  return deleted;
}
