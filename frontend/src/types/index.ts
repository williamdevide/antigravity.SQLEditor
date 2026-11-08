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

export interface TabItem {
  id: string;
  title: string;
  content: string;
  isDirty?: boolean;
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
  studentCount?: number;
  description?: string;
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
  | 'exam'
  | 'exam_submission';

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
  isTemporary?: boolean; // Backup automático antes de iniciar o modo avaliação
  submittedAt?: string; // Data/hora formal da entrega da avaliação
  createdAt: string;
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


