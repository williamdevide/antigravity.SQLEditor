import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { ActiveView } from '../types';

interface NavigationHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: ActiveView) => void;
}

export const NavigationHubModal: React.FC<NavigationHubModalProps> = ({
  isOpen,
  onClose,
  onSelectView,
}) => {
  const { userProfile, isAdmin, isProfessor, isTeacherApproved } = useAuth();

  // Fecha no Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNavigate = (view: ActiveView) => {
    onSelectView(view);
    onClose();
  };

  const displayName = userProfile?.displayName || 'Estudante';
  const roleLabel = isAdmin ? 'Administrador' : isProfessor ? 'Professor' : 'Aluno';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-modal-title"
    >
      <div
        className="w-full max-w-4xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col gap-5 text-[var(--text-primary)] relative overflow-hidden max-h-[92vh] overflow-y-auto animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Efeito sutil de iluminação no topo do modal */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FF6B00] via-[#FFE600] to-[#0288D1]" />

        {/* 1. Cabeçalho Centralizado com Boas-Vindas e Fechar */}
        <div className="flex items-start justify-between gap-4 pb-2 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FF8533] text-white flex items-center justify-center shadow-[0_0_16px_rgba(255,107,0,0.35)] shrink-0">
              <span className="material-symbols-outlined text-[24px]">hub</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="hub-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  Central de Início • SQLEditor
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                    isAdmin
                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                      : isProfessor
                      ? 'bg-[#0288D1]/15 text-[#29B6F6] border-[#0288D1]/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Olá, <strong className="text-[var(--text-primary)]">{displayName}</strong>! Escolha para onde deseja navegar no ecossistema:
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-color)] transition-colors cursor-pointer shrink-0"
            aria-label="Fechar Central"
            title="Ir para o Laboratório SQL (Esc)"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* 2. Quatro Grandes Botões Principais em Grade 2x2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Card 1: Laboratório SQL (Editor) */}
          <button
            type="button"
            onClick={() => handleNavigate('workspace')}
            className="group p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:border-[#FF6B00] transition-all text-left flex items-start gap-4 shadow-sm hover:shadow-[0_8px_24px_rgba(255,107,0,0.2)] cursor-pointer relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B00]/20 to-[#FF6B00]/5 border border-[#FF6B00]/30 text-[#FF6B00] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-[#FF6B00] group-hover:text-white transition-all shadow-sm">
              <span className="material-symbols-outlined text-[26px]">terminal</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-[#FF6B00] transition-colors">
                  Laboratório SQL (Editor)
                </h3>
                <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)] group-hover:text-[#FF6B00] group-hover:translate-x-1 transition-all">
                  arrow_forward
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Escreva scripts, execute comandos DDL/DML, acerte consultas e explore resultados no console em abas.
              </p>
            </div>
          </button>

          {/* Card 2: Estúdio DER */}
          <button
            type="button"
            onClick={() => handleNavigate('er-diagram')}
            className="group p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:border-[#0288D1] transition-all text-left flex items-start gap-4 shadow-sm hover:shadow-[0_8px_24px_rgba(2,136,209,0.2)] cursor-pointer relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0288D1]/20 to-[#0288D1]/5 border border-[#0288D1]/30 text-[#29B6F6] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-[#0288D1] group-hover:text-white transition-all shadow-sm">
              <span className="material-symbols-outlined text-[26px]">schema</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-[#29B6F6] transition-colors">
                  Estúdio DER
                </h3>
                <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)] group-hover:text-[#29B6F6] group-hover:translate-x-1 transition-all">
                  arrow_forward
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Modele diagramas Entidade-Relacionamento visuais, relacione tabelas e gere código SQL em tempo real.
              </p>
            </div>
          </button>

          {/* Card 3: Modelo Lógico & Dicionário */}
          <button
            type="button"
            onClick={() => handleNavigate('er-model')}
            className="group p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:border-[#00E676] transition-all text-left flex items-start gap-4 shadow-sm hover:shadow-[0_8px_24px_rgba(0,230,118,0.2)] cursor-pointer relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00E676]/20 to-[#00E676]/5 border border-[#00E676]/30 text-[#00E676] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-[#00E676] group-hover:text-black transition-all shadow-sm">
              <span className="material-symbols-outlined text-[26px]">table_chart</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-[#00E676] transition-colors">
                  Modelo Lógico &amp; Dicionário
                </h3>
                <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)] group-hover:text-[#00E676] group-hover:translate-x-1 transition-all">
                  arrow_forward
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Consulte o dicionário de dados relacional, chaves primárias (PK), estrangeiras (FK) e índices.
              </p>
            </div>
          </button>

          {/* Card 4: Galeria & Prática Guiada */}
          <button
            type="button"
            onClick={() => handleNavigate('gallery')}
            className="group p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:border-[#FFE600] transition-all text-left flex items-start gap-4 shadow-sm hover:shadow-[0_8px_24px_rgba(255,230,0,0.2)] cursor-pointer relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFE600]/20 to-[#FFE600]/5 border border-[#FFE600]/30 text-[#FFE600] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-[#FFE600] group-hover:text-black transition-all shadow-sm">
              <span className="material-symbols-outlined text-[26px]">school</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-[#FFE600] transition-colors">
                  Galeria &amp; Prática Guiada
                </h3>
                <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)] group-hover:text-[#FFE600] group-hover:translate-x-1 transition-all">
                  arrow_forward
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Resolva desafios práticos com validação inteligente de IA e carregue bancos de aula pré-configurados.
              </p>
            </div>
          </button>
        </div>

        {/* 3. Cinco Botões Menores em uma Linha */}
        <div className="pt-2 border-t border-[var(--border-color)]">
          <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
            Ferramentas e Acesso Rápido
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* 1. Meu Perfil */}
            <button
              type="button"
              onClick={() => handleNavigate('profile')}
              className="px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:border-[#FF6B00] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
              title="Acessar dados cadastrais e turma"
            >
              <span className="material-symbols-outlined text-[17px] text-[#FF6B00] group-hover:scale-110 transition-transform">
                account_circle
              </span>
              <span className="truncate">Meu Perfil</span>
            </button>

            {/* 2. Configurações */}
            <button
              type="button"
              onClick={() => handleNavigate('settings')}
              className="px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:border-[#0288D1] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
              title="Ajustar temas, fontes e preferências"
            >
              <span className="material-symbols-outlined text-[17px] text-[#0288D1] group-hover:scale-110 transition-transform">
                settings
              </span>
              <span className="truncate">Configurações</span>
            </button>

            {/* 3. Guia Rápido & Treinamentos */}
            <button
              type="button"
              onClick={() => handleNavigate('guide')}
              className="px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:border-[#00E676] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
              title="Ver atalhos, comandos SQL e guias didáticos"
            >
              <span className="material-symbols-outlined text-[17px] text-[#00E676] group-hover:scale-110 transition-transform">
                menu_book
              </span>
              <span className="truncate">Guia Rápido &amp; Treinamentos</span>
            </button>

            {/* 4. Feedback & Canal Direto */}
            <button
              type="button"
              onClick={() => handleNavigate('feedback')}
              className="px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:border-[#FFE600] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
              title="Enviar sugestões, dúvidas ou reportar problemas"
            >
              <span className="material-symbols-outlined text-[17px] text-[#FFE600] group-hover:scale-110 transition-transform">
                chat
              </span>
              <span className="truncate">Feedback &amp; Canal Direto</span>
            </button>

            {/* 5. Sobre o Projeto */}
            <button
              type="button"
              onClick={() => handleNavigate('about')}
              className="px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:border-[#AB47BC] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer group col-span-2 sm:col-span-1"
              title="Informações sobre o SQLEditor e a equipe SENAI"
            >
              <span className="material-symbols-outlined text-[17px] text-[#AB47BC] group-hover:scale-110 transition-transform">
                info
              </span>
              <span className="truncate">Sobre o Projeto</span>
            </button>
          </div>
        </div>

        {/* 4. Botões Médios Exclusivos por Papel (Administrador e Professor) */}
        {(isAdmin || (isProfessor && isTeacherApproved)) && (
          <div className="pt-2 border-t border-[var(--border-color)]">
            <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#0288D1]">admin_panel_settings</span>
              <span>Gestão Acadêmica &amp; Governança</span>
            </p>

            <div className={`grid gap-2.5 ${isAdmin ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Botão Painel do Administrador (apenas Administrador) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNavigate('admin-panel')}
                  className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-[var(--text-primary)] flex items-center justify-between gap-3 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-xs sm:text-sm text-red-400">
                        Painel do Administrador
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">
                        Gerenciar todos os alunos, autorizar docentes e auditar eventos
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-red-400 shrink-0 group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </button>
              )}

              {/* Botão Minhas Turmas (Administrador e Professor) */}
              <button
                type="button"
                onClick={() => handleNavigate('teacher-panel')}
                className="p-3.5 rounded-xl border border-[#0288D1]/30 bg-[#0288D1]/10 hover:bg-[#0288D1]/15 text-[var(--text-primary)] flex items-center justify-between gap-3 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0288D1]/20 text-[#29B6F6] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">groups</span>
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-xs sm:text-sm text-[#29B6F6]">
                      Minhas Turmas
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">
                      Criar turmas, gerenciar códigos de 6 dígitos e admitir alunos
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[#29B6F6] shrink-0 group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

