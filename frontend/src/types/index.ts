export interface ColumnSchema {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeignKey?: boolean;
  foreignKeyRef?: { table: string; column: string };
  isNullable?: boolean;
  isNotNull?: boolean;
  isUnique?: boolean;
}

export interface TableSchema {
  name: string;
  rowCount: number;
  columns: ColumnSchema[];
  isView?: boolean;
}

export interface DatabaseSchema {
  name: string;
  tables: TableSchema[];
  isActive?: boolean;
}

export interface StudentMirrorMeta {
  classId: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  sourceTabTitle?: string;
  activeDatabase?: string;
  isLiveSync: boolean;
  lastUpdatedAt?: string;
}

export interface TabItem {
  id: string;
  title: string;
  content: string;
  isDirty?: boolean;
  savedScriptId?: string;
  isProtectedExamTab?: boolean;
  studentMirror?: StudentMirrorMeta;
}

export interface QueryResult {
  statement: string;
  columns: string[];
  rows: Record<string, any>[];
  affectedRows?: number;
  executionTimeMs: number;
  status: 'success' | 'error';
  errorMessage?: string;
  timestamp: string;
  database: string;
  commandIndex?: number;
  startLine?: number;
  endLine?: number;
  isSelectQuery?: boolean;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  status: 'success' | 'error';
  executionTimeMs: number;
  database: string;
  affectedRows?: number;
  errorMessage?: string;
}

export interface ZoomLevels {
  sidebar: number;
  editor: number;
  console: number;
}

export type ThemeMode = 'dark' | 'light' | 'beige' | 'graphite';
export type FontTheme = 'solar' | 'cyber' | 'matrix' | 'synthwave';

export interface ThemeOption {
  id: ThemeMode;
  name: string;
  description: string;
  bgPreview: string;
  surfacePreview: string;
}

export interface FontThemeOption {
  id: FontTheme;
  name: string;
  description: string;
  accentPreview: string;
  secondaryPreview: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Escuro Noturno (Dark Obsidian)',
    description: 'Contraste profundo com preto e cinza escuro para programaÃ§Ã£o noturna.',
    bgPreview: '#0F1117',
    surfacePreview: '#1E222D',
  },
  {
    id: 'light',
    name: 'Claro Alvorada (Light Daylight)',
    description: 'Interface clara e vibrante com alto contraste para ambientes iluminados.',
    bgPreview: '#F4F6F9',
    surfacePreview: '#FFFFFF',
  },
  {
    id: 'beige',
    name: 'Bege Conforto (Warm Sepia)',
    description: 'Tons de sÃ©pia e creme suave que reduzem a fadiga ocular em leituras longas.',
    bgPreview: '#F5EFEB',
    surfacePreview: '#FAF6F1',
  },
  {
    id: 'graphite',
    name: 'Grafite TitÃ¢nio (Slate Charcoal)',
    description: 'Escuro equilibrado e elegante em tons de ardÃ³sia, mais suave que o preto total.',
    bgPreview: '#1E232B',
    surfacePreview: '#2F3642',
  },
];

export const FONT_THEME_OPTIONS: FontThemeOption[] = [
  {
    id: 'solar',
    name: 'Ã‚mbar Solar (PadrÃ£o Antigravity)',
    description: 'Destaques quentes em amarelo e laranja elÃ©trico caracterÃ­sticos da IDE.',
    accentPreview: '#FFE600',
    secondaryPreview: '#FF6B00',
  },
  {
    id: 'cyber',
    name: 'Ciano CibernÃ©tico (Cyber Neon)',
    description: 'Visual futurista neon com tons de azul ciano e azul elÃ©trico cintilante.',
    accentPreview: '#00E5FF',
    secondaryPreview: '#00B0FF',
  },
  {
    id: 'matrix',
    name: 'Esmeralda Matrix (Terminal Hacker)',
    description: 'Estilo clÃ¡ssico de terminal hacker com verdes esmeralda fosforescentes.',
    accentPreview: '#00FF66',
    secondaryPreview: '#00E676',
  },
  {
    id: 'synthwave',
    name: 'PÃºrpura Synthwave (OrquÃ­dea & Violeta)',
    description: 'EstÃ©tica retro-synthwave com degradÃª de magenta e violeta suave.',
    accentPreview: '#E040FB',
    secondaryPreview: '#FF4081',
  },
];

export type ActiveView =
  | 'landing'
  | 'gallery'
  | 'er-model'
  | 'er-diagram'
  | 'workspace'
  | 'history'
  | 'settings'
  | 'guide'
  | 'feedback'
  | 'guide-feedback'
  | 'about'
  | 'profile'
  | 'my-class'
  | 'admin-panel'
  | 'teacher-panel';

export type UserRole = 'admin' | 'professor' | 'aluno';
export type UserStatus = 'active' | 'pending_approval' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status?: UserStatus; // 'active' ou 'pending_approval' (para professores aguardando autorização)
  course?: string;
  turma?: string;
  courseOrClass?: string; // Mantido para compatibilidade retroativa
  registrationNumber?: string;
  phone?: string;
  photoURL?: string;
  classId?: string; // ID da turma vinculada
  className?: string; // Nome da turma vinculada
  classCode?: string; // Código de 6 dígitos da turma
  classStatus?: 'none' | 'pending' | 'approved'; // Status da inscrição na turma
  createdAt: string;
  updatedAt?: string;
  emailVerified: boolean;
  providerId: 'password' | 'google.com' | string;
}

export type ClassroomMode = 'normal' | 'classroom' | 'exam';

export interface ClassItem {
  id: string;
  name: string;
  course: string;
  code: string; // Código de 6 caracteres alfanuméricos (ex: A8F2K9)
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  createdAt: string;
  active: boolean;
  classroomMode?: ClassroomMode; // Modo ativo: 'normal', 'classroom' ou 'exam'
  activeExamSessionId?: string | null; // Identificador único da avaliação ativa para encapsular ocorrências
  activeExamSessionLabel?: string | null; // Rótulo da avaliação ativa (ex.: "Avaliação 22/11 16:30")
  activeExamStartedAt?: string | null; // Timestamp ISO de início da avaliação ativa
  activeExamDurationMinutes?: number | null; // Duração prevista em minutos
  activeExamEndedAt?: string | null; // Timestamp de encerramento manual pelo professor
  lastEndedExamSessionId?: string | null; // Última avaliação encerrada para liberar menu de entregues
  examAutoOpenScriptIds?: string[] | null; // IDs de exemplos e provas selecionados para abrir automaticamente no Modo Avaliação
  chatEnabled?: boolean; // Habilita ou desabilita o chat para os alunos na turma (default true)
  scriptSharingEnabled?: boolean; // Habilita ou desabilita o compartilhamento de scripts entre alunos (default true)
  studentCount?: number;
  description?: string;
  updatedAt?: string;
}

export interface ClassMemberItem {
  id: string;
  classId: string;
  classCode: string;
  className: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  studentRegistration?: string;
  status: 'pending' | 'approved';
  requestedAt: string;
  approvedAt?: string;
}

export type SystemEventType =
  | 'USER_REGISTERED'
  | 'PROFESSOR_APPROVED'
  | 'PROFESSOR_REJECTED'
  | 'CLASS_CREATED'
  | 'CLASS_UPDATED'
  | 'CLASS_DELETED'
  | 'CLASS_STUDENT_REQUESTED'
  | 'CLASS_STUDENT_APPROVED'
  | 'CLASS_STUDENT_REMOVED'
  | 'ROLE_CHANGED'
  | 'USER_DELETED';

export interface SystemEventItem {
  id: string;
  type: SystemEventType;
  authorUid: string;
  authorName: string;
  authorEmail: string;
  targetUid?: string;
  targetName?: string;
  targetEmail?: string;
  details: string;
  timestamp: string;
}

export type DatabasePreset = 'empty' | 'samples' | 'class' | 'teacher_class' | 'exam';

export type SavedScriptCategory =
  | 'student_saved'
  | 'class_database'
  | 'example'
  | 'exercise'
  | 'solution'
  | 'exam'
  | 'exam_submission';

export interface ExamSessionItem {
  id: string;
  classId: string;
  label: string;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  maxScore: number; // sempre 100
  examScriptIds?: string[];
  autoOpenScriptIds?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutoGradeQueryDetail {
  label: string;
  passed: boolean;
  status?: 'correct' | 'partial' | 'wrong';
  maxPoints?: number;
  earnedPoints?: number;
  manualPoints?: number;
  studentSqlClean?: string;
  expectedSqlClean?: string;
  expectedSummary: string;
  actualSummary: string;
  breakdown?: string[];
  error?: string;
}

export interface AutoGradeDetails {
  totalQueries: number;
  passedQueries: number;
  partialQueries?: number;
  maxScore?: number; // 100
  score: number; // 0 a 100
  items: AutoGradeQueryDetail[];
}

export interface SavedScriptItem {
  id: string;
  title: string;
  description?: string;
  content: string;
  authorUid: string;
  authorName: string;
  authorEmail: string;
  authorRole: UserRole;
  category: SavedScriptCategory;
  classIds: string[]; // ['all'] ou lista de IDs das turmas vinculadas
  visibleInNormal?: boolean; // Visível no Modo Normal junto aos materiais gerais da plataforma
  visibleInClassroom?: boolean; // Olho Modo Sala de Aula (default true)
  visibleInExam?: boolean; // Olho Modo Avaliação (default true para 'exam', false para demais)
  answerKeySql?: string; // Gabarito SQL opcional da avaliação para correção automática
  grade?: number; // Nota atribuída (0 a 100) em entregas de avaliação
  teacherFeedback?: string; // Feedback do professor na entrega
  gradedAt?: string;
  gradedBy?: string;
  gradePublished?: boolean; // Se verdadeiro, exibe nota e feedback para o aluno em Minha Classe / Meu Perfil
  autoGradeDetails?: AutoGradeDetails;
  isTemporary?: boolean; // Backup automático antes de iniciar o modo avaliação
  submittedAt?: string; // Data/hora formal da entrega da avaliação
  examSessionId?: string | null; // Vínculo da sessão de prova
  examSessionLabel?: string | null;
  submissionVersion?: number; // Versão sequencial da entrega (1, 2, 3...)
  isLatestSubmission?: boolean; // Indica se é a versão mais recente ativa
  createdAt: string;
  updatedAt: string;
}

export interface ClassPresenceItem {
  id: string; // `${classId}_${uid}`
  classId: string;
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  isOnline: boolean;
  lastSeenAt: string;
  clientUpdatedAtMs?: number;
  activeView?: string;
}

export interface ClassMessageItem {
  id: string;
  classId: string;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  senderPhotoURL?: string;
  recipientUid: string | 'all'; // 'all' para sala inteira ou UID do destinatário
  recipientName?: string;
  text: string;
  type: 'text' | 'script';
  scriptTitle?: string;
  scriptContent?: string;
  createdAt: string;
  readBy: string[];
  archived?: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;
}

export type ExamAlertType =
  | 'tab_switch'
  | 'window_blur'
  | 'copy_paste_attempt'
  | 'extension_detected'
  | 'devtools_or_resize'
  | 'page_exit_attempt';

export interface ExamAlertItem {
  id: string;
  classId: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  type: ExamAlertType;
  details: string;
  createdAt: string;
  acknowledged?: boolean;
  examSessionId?: string | null;
  examSessionLabel?: string | null;
}

export interface StudentLiveTabSnapshot {
  id: string;
  title: string;
  content: string;
}

export interface StudentLiveStateItem {
  id: string; // `${classId}_${studentUid}`
  classId: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  activeTabTitle: string;
  activeTabContent: string;
  tabs: StudentLiveTabSnapshot[];
  activeDatabase: string;
  lastQueryStatus?: 'success' | 'error';
  lastQueryError?: string;
  lastQuerySummary?: string;
  isFrozen?: boolean;
  frozenMessage?: string;
  violationCount: number;
  updatedAt: string;
}

export interface ContextMenuTarget {
  type: 'database' | 'table' | 'schema_explorer';
  dbName?: string;
  tableName?: string;
  columns?: ColumnSchema[];
  x: number;
  y: number;
}

export interface ReviewTargetRange {
  tabId: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface SqlReview {
  originalQuery: string;
  errorsDetected: string[];
  suggestedQuery: string;
  recommendations: string[];
  timestamp: string;
  targetRange?: ReviewTargetRange;
}

export type ConsoleTab = 'data' | 'grid' | 'log' | 'review';

export type DataPreviewLimit = 30 | 100 | null;

export interface TablePreviewData {
  dbName: string;
  tableName: string;
  columns: string[];
  rows: Record<string, any>[];
  totalRows: number;
  isLoading?: boolean;
}


