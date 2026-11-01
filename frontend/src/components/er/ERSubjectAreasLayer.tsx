import React from 'react';
import type { ERSubjectArea } from '../../types/erStudio';

interface ERSubjectAreasLayerProps {
  areas: ERSubjectArea[];
  selectedAreaId: string | null;
  isPresentationMode?: boolean;
  onSelectArea: (areaId: string) => void;
  onStartDragArea: (areaId: string, e: React.MouseEvent) => void;
  onStartResizeArea: (areaId: string, e: React.MouseEvent) => void;
  onToggleCollapseArea: (areaId: string) => void;
  onDeleteArea?: (areaId: string) => void;
}

export const ERSubjectAreasLayer: React.FC<ERSubjectAreasLayerProps> = ({
  areas,
  selectedAreaId,
  isPresentationMode = false,
  onSelectArea,
  onStartDragArea,
  onStartResizeArea,
  onToggleCollapseArea,
  onDeleteArea,
}) => {
  if (!areas || areas.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[2]">
      {areas.map((area) => {
        const isSelected = selectedAreaId === area.id;
        const displayHeight = area.collapsed ? 38 : area.height;

        return (
          <div
            key={area.id}
            style={{
              position: 'absolute',
              left: `${area.x}px`,
              top: `${area.y}px`,
              width: `${area.width}px`,
              height: `${displayHeight}px`,
              borderColor: area.color,
              backgroundColor: `${area.color}12`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectArea(area.id);
            }}
            className={`rounded-xl border-2 border-dashed transition-shadow pointer-events-auto flex flex-col justify-between ${
              isSelected ? 'ring-2 ring-[var(--accent-yellow)]/50 shadow-lg' : ''
            }`}
          >
            {/* Barra de Título da Área Temática (arrasta solidariamente as tabelas internas) */}
            <div
              onMouseDown={(e) => {
                if (!isPresentationMode) {
                  e.stopPropagation();
                  onStartDragArea(area.id, e);
                }
              }}
              style={{ backgroundColor: `${area.color}24`, borderBottomColor: `${area.color}40` }}
              className={`h-9 px-3 rounded-t-[10px] border-b flex items-center justify-between gap-2 ${
                isPresentationMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="material-symbols-outlined text-[15px] shrink-0"
                  style={{ color: area.color }}
                >
                  workspaces
                </span>
                <span className="font-sans font-bold text-xs text-[var(--text-primary)] truncate uppercase tracking-wider">
                  {area.title}
                </span>
              </div>

              {!isPresentationMode && (
                <div
                  className="flex items-center gap-1 shrink-0"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onToggleCollapseArea(area.id)}
                    title={area.collapsed ? 'Expandir área temática' : 'Recolher área temática'}
                    className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {area.collapsed ? 'expand_more' : 'expand_less'}
                    </span>
                  </button>
                  {onDeleteArea && (
                    <button
                      type="button"
                      onClick={() => onDeleteArea(area.id)}
                      title="Remover área temática (mantém as tabelas)"
                      className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[#FF3366] hover:bg-[#FF3366]/15 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Alça de Redimensionamento Inferior Direita */}
            {!area.collapsed && !isPresentationMode && (
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onStartResizeArea(area.id, e);
                }}
                title="Arraste para redimensionar esta Área Temática"
                className="self-end w-5 h-5 cursor-nwse-resize flex items-end justify-end p-1 opacity-70 hover:opacity-100"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M9 1L1 9M9 5L5 9M9 8.5L8.5 9"
                    stroke={area.color}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

