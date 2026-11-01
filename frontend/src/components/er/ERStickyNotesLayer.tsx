import React from 'react';
import type { ERStickyNote } from '../../types/erStudio';

interface ERStickyNotesLayerProps {
  notes: ERStickyNote[];
  selectedNoteId: string | null;
  isPresentationMode?: boolean;
  onSelectNote: (noteId: string) => void;
  onStartDragNote: (noteId: string, e: React.MouseEvent) => void;
  onUpdateNote: (noteId: string, patch: Partial<ERStickyNote>) => void;
  onDeleteNote?: (noteId: string) => void;
}

export const ERStickyNotesLayer: React.FC<ERStickyNotesLayerProps> = ({
  notes,
  selectedNoteId,
  isPresentationMode = false,
  onSelectNote,
  onStartDragNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  if (!notes || notes.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[15]">
      {notes.map((note) => {
        const isSelected = selectedNoteId === note.id;

        return (
          <div
            key={note.id}
            style={{
              position: 'absolute',
              left: `${note.x}px`,
              top: `${note.y}px`,
              width: `${note.width}px`,
              minHeight: `${note.height}px`,
              borderColor: isSelected ? note.color : 'var(--border-color)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNote(note.id);
            }}
            className="pointer-events-auto rounded-lg bg-[var(--bg-surface)] border shadow-md flex flex-col overflow-hidden relative"
          >
            {/* Canto Dobrado SVG Autoral */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              className="absolute top-0 right-0 pointer-events-none"
            >
              <polygon points="0,0 18,18 0,18" fill={note.color} opacity="0.85" />
              <polygon points="0,0 18,0 18,18" fill="var(--bg-primary)" />
            </svg>

            {/* Cabeçalho da Nota Adesiva */}
            <div
              onMouseDown={(e) => {
                if (!isPresentationMode) {
                  e.stopPropagation();
                  onStartDragNote(note.id, e);
                }
              }}
              style={{ borderLeft: `4px solid ${note.color}` }}
              className={`px-2.5 py-1.5 pr-6 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between gap-1 ${
                isPresentationMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span
                  className="material-symbols-outlined text-[14px] shrink-0"
                  style={{ color: note.color }}
                >
                  sticky_note_2
                </span>
                {isPresentationMode ? (
                  <span className="font-sans font-bold text-[11px] text-[var(--text-primary)] truncate">
                    {note.title}
                  </span>
                ) : (
                  <input
                    type="text"
                    value={note.title}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdateNote(note.id, { title: e.target.value })}
                    placeholder="Requisito / Regra de Negócio"
                    className="w-full bg-transparent text-[11px] font-bold text-[var(--text-primary)] focus:outline-none truncate"
                  />
                )}
              </div>

              {!isPresentationMode && onDeleteNote && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => onDeleteNote(note.id)}
                  title="Excluir nota adesiva"
                  className="w-4 h-4 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[#FF3366] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              )}
            </div>

            {/* Corpo de Texto do Requisito / Observação */}
            <div
              className="p-2.5 flex-1 flex flex-col"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {isPresentationMode ? (
                <p className="text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              ) : (
                <textarea
                  value={note.content}
                  onChange={(e) => onUpdateNote(note.id, { content: e.target.value })}
                  placeholder="Descreva regras de negócio, restrições ou observações da modelagem..."
                  rows={3}
                  className="w-full flex-1 bg-transparent text-[11px] text-[var(--text-secondary)] focus:text-[var(--text-primary)] resize-y focus:outline-none leading-relaxed font-sans"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

