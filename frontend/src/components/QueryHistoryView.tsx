import React, { useState, useEffect } from 'react';
import { dbStorage } from '../services/storage';
import type { QueryHistoryItem } from '../types';

interface QueryHistoryViewProps {
  onLoadQueryIntoNewTab: (query: string) => void;
}

export const QueryHistoryView: React.FC<QueryHistoryViewProps> = ({
  onLoadQueryIntoNewTab,
}) => {
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);
  const [filterText, setFilterText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadHistory = async () => {
    const items = await dbStorage.history.reverse().toArray();
    setHistoryItems(items);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico de consultas?')) {
      await dbStorage.history.clear();
      setHistoryItems([]);
    }
  };

  const handleCopy = (id: string, query: string) => {
    navigator.clipboard.writeText(query);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = historyItems.filter(h =>
    h.query.toLowerCase().includes(filterText.toLowerCase()) ||
    h.database.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] p-6 overflow-y-auto transition-colors">
      {/* Cabeçalho da Visão */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--accent-yellow)] text-[24px]">
              history
            </span>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Histórico de Consultas
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Registro de todas as queries executadas com status, tempo de resposta e banco ativo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[var(--bg-secondary)] px-3 py-1.5 rounded border border-[var(--border-color)] shadow-sm">
            <span className="material-symbols-outlined text-[15px] text-[var(--text-muted)] mr-2">search</span>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Buscar histórico..."
              className="bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none w-48 font-mono"
            />
          </div>

          <button
            onClick={handleClearHistory}
            disabled={historyItems.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3366]/10 hover:bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/30 text-xs font-semibold rounded transition-colors disabled:opacity-40 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
            <span>Limpar Histórico</span>
          </button>
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="space-y-3 font-mono">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)] text-xs font-sans">
            <span className="material-symbols-outlined text-[40px] text-[var(--border-color)] block mb-2">manage_search</span>
            Nenhuma consulta registrada no histórico.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#FF6B00]/60 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] border-b border-[var(--border-color)] pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.status === 'success'
                        ? 'bg-[var(--status-success)] shadow-[0_0_6px_var(--status-success)]'
                        : 'bg-[#FF3366] shadow-[0_0_6px_#FF3366]'
                    }`}
                  ></span>
                  <span className="text-[var(--status-success)] font-semibold">[{item.database}]</span>
                  <span>{item.timestamp}</span>
                  <span className="text-[var(--text-muted)]">•</span>
                  <span>{item.executionTimeMs} ms</span>
                  {item.affectedRows !== undefined && (
                    <>
                      <span className="text-[var(--text-muted)]">•</span>
                      <span>{item.affectedRows} linha(s)</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(item.id, item.query)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-yellow)] border border-[var(--border-color)] rounded text-[11px] transition-colors cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedId === item.id ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedId === item.id ? 'Copiado!' : 'Copiar'}</span>
                  </button>

                  <button
                    onClick={() => onLoadQueryIntoNewTab(item.query)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#FF6B00]/15 hover:bg-[#FF6B00] text-[#FF8533] hover:text-white border border-[#FF6B00]/40 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    <span>Abrir no Editor</span>
                  </button>
                </div>
              </div>

              {/* Consulta */}
              <pre className="text-xs text-[var(--accent-yellow)] overflow-x-auto p-2.5 bg-[var(--bg-surface)] rounded border border-[var(--border-color)] whitespace-pre-wrap font-bold">
                {item.query}
              </pre>

              {item.errorMessage && (
                <div className="mt-2 text-xs text-[#FF3366] font-semibold">
                  ✖ {item.errorMessage}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
