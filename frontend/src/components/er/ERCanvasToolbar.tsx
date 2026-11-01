import React from 'react';
import type {
  ERCardinalityNotation,
  ERStudioPreferences,
} from '../../types/preferences';

interface ERCanvasToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToView: () => void;
  onAutoLayout: () => void;
  isAutoLayoutActive?: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  erPreferences: ERStudioPreferences;
  onUpdateErPreferences?: (patch: Partial<ERStudioPreferences>) => void;
  isPresentationMode: boolean;
  onTogglePresentationMode: () => void;
  compact?: boolean;
}

const NOTATION_LABELS: Record<ERCardinalityNotation, string> = {
  crowsfoot: 'Pé-de-Galinha',
  '1:N': '1 : N',
  pins: 'Pinos',
};

export const ERCanvasToolbar: React.FC<ERCanvasToolbarProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToView,
  onAutoLayout,
  isAutoLayoutActive = false,
  searchQuery,
  onSearchChange,
  erPreferences,
  onUpdateErPreferences,
  isPresentationMode,
  onTogglePresentationMode,
  compact = false,
}) => {
  const cycleNotation = () => {
    if (!onUpdateErPreferences) return;
    const order: ERCardinalityNotation[] = ['crowsfoot', '1:N', 'pins'];
    const next = order[(order.indexOf(erPreferences.cardinalityNotation) + 1) % order.length];
    onUpdateErPreferences({ cardinalityNotation: next });
  };

  return (
    <>
      {/* Barra de Busca Flutuante Superior Esquerda no Canvas */}
      <div
        data-print-hide
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute top-3 left-3 z-40 flex items-center gap-2"
      >
        <div className="flex items-center bg-[var(--bg-surface)]/95 border border-[var(--border-color)] rounded-lg px-2.5 py-1 shadow-lg">
          <span className="material-symbols-outlined text-[15px] text-[var(--text-muted)] mr-1.5">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={compact ? 'Buscar tabela...' : 'Localizar tabela ou coluna...'}
            className="bg-transparent text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none w-36 sm:w-48"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">close</span>
            </button>
          )}
        </div>

        {isPresentationMode && (
          <button
            type="button"
            onClick={onTogglePresentationMode}
            className="px-3 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">fullscreen_exit</span>
            <span>Sair da Apresentação (Esc)</span>
          </button>
        )}
      </div>

      {/* Dock Flutuante Inferior Direito (Estilo FloatingControls limpo com identidade SQLEditor) */}
      <div
        data-print-hide
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute bottom-3 right-3 z-40 flex flex-wrap items-center gap-1.5 bg-[var(--bg-surface)]/95 border border-[var(--border-color)] rounded-lg p-1.5 shadow-xl"
      >
        {/* Controles de Zoom */}
        <div className="flex items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            title="Diminuir Zoom (Ctrl + Roda)"
            className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">remove</span>
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            title="Restaurar Zoom (100%)"
            className="px-1.5 text-[11px] font-mono font-semibold text-[var(--text-primary)] hover:text-[var(--accent-yellow)] min-w-[44px] text-center cursor-pointer"
          >
            {zoom}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            title="Aumentar Zoom (Ctrl + Roda)"
            className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
          </button>
        </div>

        {/* Ajustar à Tela */}
        <button
          type="button"
          onClick={onFitToView}
          title="Centralizar e ajustar todas as tabelas à tela"
          className="h-7 px-2 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">
            fit_screen
          </span>
          {!compact && <span className="hidden sm:inline">Ajustar</span>}
        </button>

        {/* Auto-Layout 16:9 / Restaurar Posições Salvas */}
        <button
          type="button"
          onClick={onAutoLayout}
          title={
            isAutoLayoutActive
              ? 'Retornar à última posição salva que você arrumou (Desfazer Organizar)'
              : 'Reorganizar layout topológico 16:9 sem sobreposições'
          }
          className={`h-7 px-2 rounded border text-xs font-medium flex items-center gap-1 cursor-pointer transition-all ${
            isAutoLayoutActive
              ? 'bg-[var(--accent-orange)]/15 hover:bg-[var(--accent-orange)]/25 border-[var(--accent-orange)]/50 text-[var(--accent-orange)] shadow-sm'
              : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-primary)]'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[15px] ${
              isAutoLayoutActive
                ? 'text-[var(--accent-orange)]'
                : 'text-[var(--status-success)]'
            }`}
          >
            {isAutoLayoutActive ? 'restore' : 'auto_awesome'}
          </span>
          {!compact && (
            <span className="hidden sm:inline">
              {isAutoLayoutActive ? 'Restaurar' : 'Organizar'}
            </span>
          )}
        </button>

        {/* Toggles Rápidos Espelhados com Configurações (Pilar 3) */}
        {onUpdateErPreferences && !compact && (
          <>
            <div className="w-px h-4 bg-[var(--border-color)] mx-0.5" />

            {/* Geometria: 90° Ortogonal vs Bézier */}
            <button
              type="button"
              onClick={() =>
                onUpdateErPreferences({
                  lineStyle:
                    erPreferences.lineStyle === 'orthogonal' ? 'bezier' : 'orthogonal',
                })
              }
              title={`Geometria das linhas: ${
                erPreferences.lineStyle === 'orthogonal'
                  ? 'Ortogonal 90° Arredondada (Padrão)'
                  : 'Curva Bézier Suave'
              }`}
              className="h-7 px-2 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px] text-[#FF6B00]">
                {erPreferences.lineStyle === 'orthogonal' ? 'turn_sharp_right' : 'gesture'}
              </span>
              <span className="hidden md:inline">
                {erPreferences.lineStyle === 'orthogonal' ? '90°' : 'Bézier'}
              </span>
            </button>

            {/* Cardinalidade: Pé-de-Galinha / 1:N / Pinos */}
            <button
              type="button"
              onClick={cycleNotation}
              title="Alternar notação de cardinalidade (Pé-de-Galinha / 1:N / Pinos)"
              className="h-7 px-2 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px] text-[var(--accent-yellow)]">
                conversion_path
              </span>
              <span className="hidden lg:inline">
                {NOTATION_LABELS[erPreferences.cardinalityNotation]}
              </span>
            </button>

            {/* Etiquetas: Hover vs Sempre */}
            <button
              type="button"
              onClick={() =>
                onUpdateErPreferences({
                  labelVisibility:
                    erPreferences.labelVisibility === 'hover' ? 'always' : 'hover',
                })
              }
              title={
                erPreferences.labelVisibility === 'hover'
                  ? 'Rótulos sob demanda no foco (clique para exibir todos)'
                  : 'Rótulos sempre visíveis (clique para modo limpo sob demanda)'
              }
              className={`h-7 px-2 rounded border text-[11px] font-mono flex items-center gap-1 cursor-pointer ${
                erPreferences.labelVisibility === 'always'
                  ? 'bg-[#FF6B00]/15 border-[#FF6B00]/50 text-[var(--accent-yellow)]'
                  : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-secondary)]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">label</span>
            </button>

            {/* Snap-to-Grid 24px */}
            <button
              type="button"
              onClick={() =>
                onUpdateErPreferences({ snapToGrid: !erPreferences.snapToGrid })
              }
              title={
                erPreferences.snapToGrid
                  ? 'Alinhamento à grade 24px: ATIVO'
                  : 'Alinhamento à grade 24px: DESATIVADO'
              }
              className={`h-7 px-2 rounded border text-[11px] font-mono flex items-center gap-1 cursor-pointer ${
                erPreferences.snapToGrid
                  ? 'bg-[var(--status-success)]/15 border-[var(--status-success)]/50 text-[var(--status-success)]'
                  : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-secondary)]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">grid_4x4</span>
            </button>
          </>
        )}

        {/* Modo Apresentação Tela Cheia */}
        <button
          type="button"
          onClick={onTogglePresentationMode}
          title={
            isPresentationMode
              ? 'Sair do Modo Apresentação (Esc)'
              : 'Modo Apresentação em Tela Cheia para Projetor / Sala de Aula'
          }
          className={`h-7 px-2 rounded border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
            isPresentationMode
              ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
              : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-primary)]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">
            {isPresentationMode ? 'fullscreen_exit' : 'present_to_all'}
          </span>
        </button>
      </div>
    </>
  );
};

