import React, { useEffect, useRef } from 'react';
import type { ContextMenuTarget } from '../types';
import { dbEngine } from '../services/dbEngine';

interface ContextMenuProps {
  target: ContextMenuTarget | null;
  onClose: () => void;
  onAction: (sql: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ target, onClose, onAction }) => {
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
    const db = target.dbName;
    const table = target.tableName;
    const cols = target.columns || [];

    if (action === 'export_sql_db') {
      const sql = await dbEngine.exportDatabaseSQL(db);
      downloadFile(`${db}.sql`, sql);
      onClose();
      return;
    }

    if (action === 'show_full_script_db') {
      const sql = await dbEngine.exportDatabaseSQL(db);
      onAction(sql);
      onClose();
      return;
    }

    if (action === 'export_sql_table' && table) {
      const sql = await dbEngine.exportTableSQL(db, table);
      downloadFile(`${table}.sql`, sql);
      onClose();
      return;
    }

    if (action === 'show_full_script_table' && table) {
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

