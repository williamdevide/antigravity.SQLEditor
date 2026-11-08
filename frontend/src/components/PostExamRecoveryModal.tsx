import React, { useState } from 'react';
import type { SavedScriptItem } from '../types';
import { deleteUserTemporaryScripts, keepUserTemporaryScripts } from '../services/scriptService';

interface PostExamRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempScripts: SavedScriptItem[];
  userUid: string;
  onRestoreAll: (scripts: SavedScriptItem[]) => void;
  onRefreshUserScripts: () => void;
}

export const PostExamRecoveryModal: React.FC<PostExamRecoveryModalProps> = ({
  isOpen,
  onClose,
  tempScripts,
  userUid,
  onRestoreAll,
  onRefreshUserScripts,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || tempScripts.length === 0) return null;

  const handleRestoreAll = async () => {
    try {
      setIsProcessing(true);
      await keepUserTemporaryScripts(userUid);
      onRestoreAll(tempScripts);
      onRefreshUserScripts();
      onClose();
    } catch (err) {
      console.error('[PostExamRecovery Error]', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeepSavedOnly = async () => {
    try {
      setIsProcessing(true);
      await keepUserTemporaryScripts(userUid);
      onRefreshUserScripts();
      onClose();
    } catch (err) {
      console.error('[PostExamRecovery Error]', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscardAll = async () => {
    if (!window.confirm('Tem certeza de que deseja descartar os scripts de backup temporário? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      setIsProcessing(true);
      await deleteUserTemporaryScripts(userUid);
      onRefreshUserScripts();
      onClose();
    } catch (err) {
      console.error('[PostExamRecovery Error]', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[var(--status-success)]/15 border border-[var(--status-success)]/30 text-[var(--status-success)] flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(0,230,118,0.25)]">
            <span className="material-symbols-outlined text-[32px]">task_alt</span>
          </div>

          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Modo Avaliação Finalizado!
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              Sua turma retornou ao modo normal. Detectamos que você possui{' '}
              <strong className="text-[var(--text-primary)] font-bold">
                {tempScripts.length} guia(s) temporária(s)
              </strong>{' '}
              salva(s) no seu perfil antes do início da prova.
            </p>
          </div>

          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-left max-h-36 overflow-y-auto space-y-1.5 text-xs">
            {tempScripts.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-[var(--text-primary)]">
                <span className="material-symbols-outlined text-[15px] text-[#FF6B00]">description</span>
                <span className="truncate font-mono text-[11px]">{s.title}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[var(--text-muted)]">
            O que você deseja fazer com seus scripts anteriores?
          </p>

          <div className="space-y-2 pt-1">
            <button
              onClick={handleRestoreAll}
              disabled={isProcessing}
              type="button"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8800] text-black font-bold text-xs shadow hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[17px]">tab</span>
              <span>Restaurar & Abrir Todas as Guias</span>
            </button>

            <button
              onClick={handleKeepSavedOnly}
              disabled={isProcessing}
              type="button"
              className="w-full py-2.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[17px] text-[var(--accent-yellow)]">
                bookmark
              </span>
              <span>Manter Salvas no Meu Perfil (sem abrir agora)</span>
            </button>

            <button
              onClick={handleDiscardAll}
              disabled={isProcessing}
              type="button"
              className="w-full py-2 rounded-xl text-[var(--text-muted)] hover:text-red-400 text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
              <span>Descartar Temporários</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
