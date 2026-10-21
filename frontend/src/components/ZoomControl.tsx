import React from 'react';

interface ZoomControlProps {
  level: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export const ZoomControl: React.FC<ZoomControlProps> = ({
  level,
  onZoomIn,
  onZoomOut,
  onReset
}) => {
  return (
    <div className="flex items-center bg-[var(--bg-primary)]/80 rounded border border-[var(--border-color)] px-1 py-0.5 gap-0.5 select-none transition-colors">
      <button
        onClick={onZoomOut}
        title="Reduzir Zoom (-10%)"
        disabled={level <= 50}
        className="w-4 h-4 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-yellow)] hover:bg-[var(--bg-hover)] rounded text-[11px] font-mono leading-none transition-colors disabled:opacity-30 disabled:pointer-events-none"
        type="button"
      >
        -
      </button>
      <button
        onClick={onReset}
        title="Resetar Zoom (100%)"
        className="font-mono text-[var(--text-secondary)] hover:text-[var(--accent-yellow)] px-1 text-[10px] cursor-pointer"
        type="button"
      >
        {level}%
      </button>
      <button
        onClick={onZoomIn}
        title="Aumentar Zoom (+10%)"
        disabled={level >= 250}
        className="w-4 h-4 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-yellow)] hover:bg-[var(--bg-hover)] rounded text-[11px] font-mono leading-none transition-colors disabled:opacity-30 disabled:pointer-events-none"
        type="button"
      >
        +
      </button>
    </div>
  );
};
