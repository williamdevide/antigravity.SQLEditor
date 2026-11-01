import type { DataPreviewLimit } from './index';

// ============================================================================
// CONTRATO DE PREFERÊNCIAS GLOBAIS DA CENTRAL (4 PILARES - v3.2+)
// ============================================================================

export type ERLineStyle = 'orthogonal' | 'bezier';
export type ERCardinalityNotation = 'crowsfoot' | '1:N' | 'pins';
export type ERLabelVisibility = 'hover' | 'always';
export type ERGridMode = 'dots' | 'lines' | 'none';
export type LinterStrictness = 'strict' | 'flexible';

export interface UIPreferences {
  /** Tamanho base da fonte do editor SQL em pixels (12 a 22) */
  editorFontSize: number;
  /** Zoom inicial padrão do canvas DER em porcentagem (60 a 150) */
  defaultErZoom: number;
  /** Exibir barra de Pills Rápidas das etapas da disciplina no Header */
  showQuickModulePills: boolean;
  /** Modo Leve para Laboratório: desativa filtros blur pesados e animações contínuas */
  reducedMotionAndGlow: boolean;
}

export interface EditorAutomationPreferences {
  /** Auto-capitalizar palavras-chave SQL em tempo real (select -> SELECT) */
  autoUppercaseKeywords: boolean;
  /** Auto-inserir ponto-e-vírgula (;) no comando anterior não finalizado */
  autoInsertSemicolon: boolean;
  /** Sincronizar banco ativo ao mover o cursor entre blocos USE */
  syncDatabaseWithCursorUse: boolean;
  /** Limite inicial padrão na aba Dados (30, 100 ou null = Total) */
  defaultDataPreviewLimit: DataPreviewLimit;
  /** Proporção inicial do Split-View no Laboratório SQL (50/50 ou 60/40) */
  defaultSplitRatio: 50 | 60;
  /** Solicitar confirmação antes de limpar o script ativo */
  confirmBeforeClear: boolean;
  /** Solicitar confirmação antes de fechar todas as abas */
  confirmBeforeCloseAllTabs: boolean;
}

export interface ERStudioPreferences {
  /** Geometria das linhas: Ortogonal 90° Arredondada (padrão autoral) ou Curva Bézier */
  lineStyle: ERLineStyle;
  /** Notação de cardinalidade nas extremidades */
  cardinalityNotation: ERCardinalityNotation;
  /** Visibilidade das etiquetas de relacionamento (sob demanda no foco/hover ou sempre visíveis) */
  labelVisibility: ERLabelVisibility;
  /** Fluxo animado direcional FK -> PK nas linhas de relacionamento */
  animateLaserFlow: boolean;
  /** Estilo da malha de fundo do canvas */
  gridMode: ERGridMode;
  /** Imã de alinhamento em grade de 24px ao arrastar cards */
  snapToGrid: boolean;
  /** Inferir chaves estrangeiras implícitas por nomenclatura (id_*, *_id) com distinção visual */
  inferImplicitForeignKeys: boolean;
}

export interface PedagogyPreferences {
  /** Rigor do Linter de Esquema (Estrito Acadêmico vs Flexível) */
  linterStrictness: LinterStrictness;
}

export interface AppPreferences {
  ui: UIPreferences;
  editor: EditorAutomationPreferences;
  er: ERStudioPreferences;
  pedagogy: PedagogyPreferences;
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  ui: {
    editorFontSize: 14,
    defaultErZoom: 100,
    showQuickModulePills: true,
    reducedMotionAndGlow: false,
  },
  editor: {
    autoUppercaseKeywords: true,
    autoInsertSemicolon: true,
    syncDatabaseWithCursorUse: true,
    defaultDataPreviewLimit: 30,
    defaultSplitRatio: 50,
    confirmBeforeClear: true,
    confirmBeforeCloseAllTabs: true,
  },
  er: {
    lineStyle: 'orthogonal',
    cardinalityNotation: 'crowsfoot',
    labelVisibility: 'hover',
    animateLaserFlow: true,
    gridMode: 'dots',
    snapToGrid: false,
    inferImplicitForeignKeys: true,
  },
  pedagogy: {
    linterStrictness: 'strict',
  },
};

