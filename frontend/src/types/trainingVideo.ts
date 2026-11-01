export interface SubtitleCue {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  emphasis?: string;
}

export type VideoPillarId =
  | 'editor-sql'
  | 'er-studio'
  | 'split-view'
  | 'normalization'
  | 'gallery-backup';

export interface SimulatedSceneStep {
  atSec: number;
  actionTitle: string;
  cursorX?: number; // porcentagem 0-100
  cursorY?: number; // porcentagem 0-100
  cursorClick?: boolean;
  activeElementId?: string;
  screenContent: {
    badge?: string;
    headline?: string;
    snippetSql?: string;
    tablesVisible?: Array<{
      name: string;
      columns: string[];
      highlightCol?: string;
      x: number;
      y: number;
    }>;
    connectedLine?: boolean;
    inspectorOpen?: boolean;
    inspectorField?: string;
    splitMode?: boolean;
    linterActive?: boolean;
    progressBarPct?: number;
    toastText?: string;
  };
}

export interface TrainingVideoItem {
  id: VideoPillarId;
  title: string;
  subtitle: string;
  targetView: 'workspace' | 'er-diagram' | 'er-model' | 'gallery' | 'settings';
  targetViewLabel: string;
  icon: string;
  durationSec: number;
  badge: string;
  color: string;
  summary: string;
  subtitles: SubtitleCue[];
  scenes: SimulatedSceneStep[];
}
