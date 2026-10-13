import React, { useEffect, useRef } from 'react';
import type { ContextMenuTarget, DatabasePreset } from '../types';
import { dbEngine } from '../services/dbEngine';

interface ContextMenuProps {
  target: ContextMenuTarget | null;
  onClose: () => void;
  onAction: (sql: string) => void;
  onSelectPreset?: (preset: DatabasePreset) => void;
  currentPreset?: DatabasePreset;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  target,
  onClose,
  onAction,
  onSelectPreset,
  currentPreset,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') onClose();
    });
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  if (!target) return null;

  // Garante que o menu não saia da tela
  const style: React.CSSProperties = {
    top: Math.min(target.y, window.innerHeight - 340),
    left: Math.min(target.x, window.innerWidth - 240),
  };

  if (target.type === 'schema_explorer') {
    return (
      <div
        ref={menuRef}
        style={style}
        className="fixed z-50 min-w-[220px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)] flex items-center justify-between">
          <span>Opções do Schema Explorer</span>
          {currentPreset && (
            <span className="text-[9px] font-mono px-1 rounded bg-[var(--bg-hover)] text-[var(--accent-yellow)]">
              {currentPreset === 'empty' ? 'Vazio' : currentPreset === 'samples' ? 'Exemplos' : 'BDs Aula'}
            </span>
          )}
        </div>

        <button
          onClick={() => {
            onSelectPreset?.('empty');
            onClose();
          }}
          className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2.5 transition-colors cursor-pointer group ${
            currentPreset === 'empty' ? 'bg-[var(--bg-hover)]/40 font-semibold' : ''
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-[17px] text-[#FF3366] group-hover:scale-110 transition-transform">
            database_off
          </span>
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[var(--text-primary)]">Carregar vazio</span>
            <span className="text-[10px] text-[var(--text-muted)]">Nenhum banco de dados ativo</span>
          </div>
        </button>

        <button
          onClick={() => {
            onSelectPreset?.('samples');
            onClose();
          }}
          className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2.5 transition-colors cursor-pointer group ${
            currentPreset === 'samples' ? 'bg-[var(--bg-hover)]/40 font-semibold' : ''
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-[17px] text-[var(--accent-yellow)] group-hover:scale-110 transition-transform">
            inventory_2
          </span>
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[var(--text-primary)]">Carregar BDs de exemplo</span>
            <span className="text-[10px] text-[var(--text-muted)]">ecommerce_db e universidade_db</span>
          </div>
        </button>

        <button
          onClick={() => {
            onSelectPreset?.('class');
            onClose();
          }}
          className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2.5 transition-colors cursor-pointer group ${
            currentPreset === 'class' ? 'bg-[var(--bg-hover)]/40 font-semibold' : ''
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-[17px] text-[var(--status-success)] group-hover:scale-110 transition-transform">
            school
          </span>
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[var(--text-primary)]">Carregar BDs Aula</span>
            <span className="text-[10px] text-[var(--text-muted)]">Bancos enviados pelo professor</span>
          </div>
        </button>
      </div>
    );
  }

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const handleItemClick = async (action: string) => {
    const db = target.dbName || '';
    const table = target.tableName;
    const cols = target.columns || [];

    if (action === 'export_sql_db' && db) {
      const sql = await dbEngine.exportDatabaseSQL(db);
      downloadFile(`${db}.sql`, sql);
      onClose();
      return;
    }

    if (action === 'show_full_script_db' && db) {
      const sql = await dbEngine.exportDatabaseSQL(db);
      onAction(sql);
      onClose();
      return;
    }

    if (action === 'export_sql_table' && db && table) {
      const sql = await dbEngine.exportTableSQL(db, table);
      downloadFile(`${table}.sql`, sql);
      onClose();
      return;
    }

    if (action === 'show_full_script_table' && db && table) {
      const sql = await dbEngine.exportTableSQL(db, table);
      onAction(sql);
      onClose();
      return;
    }

    let sql = '';
    if (target.type === 'database') {
      if (action === 'create') {
        sql = `-- Criar novo banco de dados\nCREATE DATABASE novo_banco;\nUSE novo_banco;\n`;
      } else if (action === 'drop') {
        sql = `-- ATENÇÃO: Excluir banco de dados\nDROP DATABASE \`${db}\`;\n`;
      }
    } else if (target.type === 'table' && table) {
      if (action === 'select') {
        sql = `-- Consultar registros da tabela ${table}\nUSE \`${db}\`;\nSELECT * FROM \`${table}\` LIMIT 100;\n`;
      } else if (action === 'insert') {
        const insertCols = cols.length > 0 ? cols.map(c => `\`${c.name}\``).join(', ') : 'coluna1, coluna2';
        const sampleVals = cols.length > 0 ? cols.map(c => c.type.includes('INT') ? '1' : "'valor'").join(', ') : '1, \'teste\'';
        sql = `-- Inserir registro na tabela ${table}\nUSE \`${db}\`;\nINSERT INTO \`${table}\` (${insertCols})\nVALUES (${sampleVals});\n`;
      } else if (action === 'update') {
        const firstCol = cols.find(c => !c.isPrimary)?.name || 'coluna';
        const pkCol = cols.find(c => c.isPrimary)?.name || 'id';
        sql = `-- Atualizar registros na tabela ${table}\nUSE \`${db}\`;\nUPDATE \`${table}\`\nSET \`${firstCol}\` = 'novo_valor'\nWHERE \`${pkCol}\` = 1;\n`;
      } else if (action === 'delete') {
        const pkCol = cols.find(c => c.isPrimary)?.name || 'id';
        sql = `-- Deletar registros da tabela ${table}\nUSE \`${db}\`;\nDELETE FROM \`${table}\`\nWHERE \`${pkCol}\` = 1;\n`;
      } else if (action === 'alter') {
        sql = `-- Adicionar nova coluna na tabela ${table}\nUSE \`${db}\`;\nALTER TABLE \`${table}\` ADD COLUMN nova_coluna VARCHAR(100);\n`;
      } else if (action === 'drop') {
        sql = `-- ATENÇÃO: Remover a tabela ${table}\nUSE \`${db}\`;\nDROP TABLE \`${table}\`;\n`;
      }
    }

    onAction(sql);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed z-50 w-56 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.35)] py-1.5 text-xs select-none backdrop-blur-md"
    >
      <div className="px-3 py-1.5 text-[11px] font-mono text-[var(--accent-yellow)] border-b border-[var(--border-color)] mb-1 font-semibold truncate flex items-center justify-between">
        <span>{target.type === 'database' ? `Banco: ${target.dbName}` : `Tabela: ${target.tableName}`}</span>
        <span className="text-[10px] opacity-60 uppercase">{target.type}</span>
      </div>

      {target.type === 'database' ? (
        <>
          <button
            onClick={() => handleItemClick('show_full_script_db')}
            className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors font-medium"
            type="button"
          >
            <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">code</span>
            <span>Exibir Script Completo</span>
          </button>
          <button
            onClick={() => handleItemClick('export_sql_db')}
            className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors font-medium"
            type="button"
          >
            <span className="material-symbols-outlined text-[15px] text-[#00E676]">download</span>
            <span>Exportar .sql</span>
          </button>

          <div className="h-px bg-[var(--border-color)] my-1" />

          <button
            onClick={() => handleItemClick('create')}
            className="w-full text-left px-3 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">add_circle</span>
            <span>Criar Script (CREATE DB)</span>
          </button>
          <div className="h-px bg-[var(--border-color)] my-1" />
          <button
            onClick={() => handleItemClick('drop')}
            className="w-full text-left px-3 py-1.5 text-[#FF3366] hover:bg-[#FF3366]/10 flex items-center gap-2 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">delete_forever</span>
            <span>Excluir Banco (DROP DB)</span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => handleItemClick('show_full_script_table')}
            className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors font-medium"
            type="button"
          >
            <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">code</span>
            <span>Exibir Script Completo</span>
          </button>
          <button
            onClick={() => handleItemClick('export_sql_table')}
            className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors font-medium"
            type="button"
          >
            <span className="material-symbols-outlined text-[15px] text-[#00E676]">download</span>
            <span>Exportar .sql</span>
          </button>

          <div className="h-px bg-[var(--border-color)] my-1" />

          <button
            onClick={() => handleItemClick('select')}
            className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors font-medium"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px] text-[#00E676]">play_arrow</span>
            <span>SELECT * FROM ...</span>
          </button>
          <button
            onClick={() => handleItemClick('insert')}
            className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px] text-[var(--accent-yellow)]">add</span>
            <span>INSERT INTO ...</span>
          </button>
          <button
            onClick={() => handleItemClick('update')}
            className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px] text-[#FF9900]">edit</span>
            <span>UPDATE ...</span>
          </button>
          <button
            onClick={() => handleItemClick('delete')}
            className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px] text-[#FF3366]">remove</span>
            <span>DELETE FROM ...</span>
          </button>
          <div className="h-px bg-[var(--border-color)] my-1" />
          <button
            onClick={() => handleItemClick('alter')}
            className="w-full text-left px-3 py-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">table_rows</span>
            <span>ALTER TABLE ...</span>
          </button>
          <button
            onClick={() => handleItemClick('drop')}
            className="w-full text-left px-3 py-1.5 text-[#FF3366] hover:bg-[#FF3366]/10 flex items-center gap-2 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">delete</span>
            <span>DROP TABLE ...</span>
          </button>
        </>
      )}
    </div>
  );
};

