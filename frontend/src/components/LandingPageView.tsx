import React, { useEffect, useMemo, useState } from 'react';
import { APP_VERSION } from '../config/version';
import { ER_TEMPLATES_CATALOG } from '../data/erTemplatesCatalog';
import { parseLiveSqlSchema } from '../services/liveSqlSchemaParser';
import type { ActiveView, ThemeMode } from '../types';
import { ERThumbnailSvg } from './er/ERThumbnailSvg';
import { HeroInteractiveERCanvas } from './er/HeroInteractiveERCanvas';

interface LandingPageViewProps {
  onOpenEditor: () => void;
  onOpenView: (view: ActiveView) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onInstantiateTemplate?: (templateId: string) => void;
}

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  isLatest?: boolean;
  tag?: string;
  items: string[];
}

const CHANGELOG_HISTORY: ChangelogEntry[] = [
  {
    version: 'v3.2.5',
    date: '02/11/2026',
    title:
      'Navegação Institucional na Raiz, Módulos Especializados (Guia Rápido & Feedback), 10 Backgrounds Futuristas, Desafios com Filtros e Split-View Compacto',
    isLatest: true,
    tag: 'Lançamento Atual • Marco v3.2.5',
    items: [
      'Roteamento Raiz & Inicialização Institucional: Acesso à raiz (/) agora abre sempre a Página Inicial Institucional com changelogs recolhidos por padrão.',
      'Módulos Independentes: Separação de Guia Rápido (#guia) com tutoriais em vídeo legendados a 60 FPS e canal direto de Feedback & Suporte (#feedback) com envio via email.',
      'Identidade Visual & Backgrounds Futuristas: 10 planos de fundo vetoriais neon de alta tecnologia (malhas de dados, circuitos, galáxias relacionais e matriz de código) e logotipos autênticos de tecnologias.',
      'Galeria de Modelos & Prática Guiada: Alternância instantânea de cards para Bancos de Exemplo (ecommerce_db, universidade_db) e novos desafios baseados nas listas das aulas.',
      'SQL Editor & Estúdio DER Otimizados: Resolução de repetição no autocomplete Monaco, navbar 10% mais compacta sem quebra de linha em "SQL ↔ DER", botões de alternância apenas com ícones e dropdown de exportação suspenso sem cortes.',
    ],
  },
  {
    version: 'v3.2.4',
    date: '01/11/2026',
    title:
      'Central da Disciplina de Banco de Dados: Estúdio DER 7 Camadas, Split-View Reativo SQL ↔ DER, Dicionário 1FN–3FN, Linter Pedagógico, Galeria com Desafios Autocorrigíveis e Super-Backup (.sqleditor.json)',
    isLatest: false,
    tag: 'Versão Anterior',
    items: [
      'Estúdio DER Dedicado com Motor SVG de 7 Camadas: rotas ortogonais 90° arredondadas (com opção Bézier), hit-area invisível de 22px, trilha de contraste, Spotlight 22%, fluxo laser direcional FK ➔ PK, alça recursiva "C" para Self-Join, garfo fork-trunk-fork para FKs compostas e notações Pé-de-Galinha, 1:N ou Pinos.',
      'Cards Ricos & Canvas de Modelagem: faixa superior colorida customizável, trava de posição (🔒), colapso inteligente mantendo PK/FK ancoradas, amostra viva de registros (👁️ Live Data Peek), seção de Triggers (⚡), Áreas Temáticas com arraste solidário, Notas Adesivas com canto dobrado e Drag-to-Connect FK.',
      'Split-View Reativo SQL ↔ DER no Laboratório SQL: parser SQL tolerante em tempo real (useDeferredValue) para CREATE TABLE, ALTER TABLE, INSERT INTO e CREATE TRIGGER, além de engenharia direta cirúrgica via Monaco executeEdits preservando Ctrl+Z.',
      'Modelo Lógico, Dicionário 1FN–3FN & Linter Pedagógico: descrições semânticas editáveis por tabela/coluna, checklist interativo 1FN/2FN/3FN, auditoria automática de integridade/normalização em português, compartilhamento zero-backend via link #z. e 5 exportadores (PNG HD, SVG, PDF A4, Mermaid erDiagram e Markdown .md).',
      'Galeria & Prática Guiada + Central de Configurações em 4 Pilares: miniaturas vetoriais vivas (<ERThumbnailSvg />), laboratórios de violação 1FN/2FN/3FN, desafios SQL/DDL com validador local determinístico, Guia Rápido & Report (#guia) e Super-Backup Portátil (.sqleditor.json).',
    ],
  },
  {
    version: 'v3.1.20',
    date: '01/11/2026',
    title:
      'Ciclo Dinâmico de Registros (Limit 30 / 100 / Total), Revisão SQL Cirúrgica In-Place, Confirmação ao Limpar e Contraste de Ícones nos Temas Claros',
    isLatest: false,
    tag: 'Versão Anterior',
    items: [
      'Alternância rápida na aba Dados: clique no badge de limite para alternar entre Limit 30 → Limit 100 → Total → Limit 30, mantendo a escolha ativa ao navegar entre tabelas na sessão.',
      'Contraste aprimorado no Schema Explorer: símbolos de campos convencionais e de chave estrangeira (FK) exibidos em cinza escuro nos temas claros (Light e Bege).',
      'Segurança contra perda acidental no editor: o botão "Limpar" agora solicita confirmação antes de esvaziar o script e preserva o histórico de Desfazer (Ctrl+Z).',
      'Aplicação cirúrgica na Revisão SQL: o botão "Aplicar no Editor" substitui estritamente o comando revisado em sua própria linha/faixa, mantendo todos os demais comandos do script intactos e sem injetar LIMIT 100 forçado.',
    ],
  },
  {
    version: 'v3.1.19',
    date: '01/11/2026',
    title:
      'Inspeção Multi-Comando Sincronizada ao Cursor, Ponto e Vírgula Automático, Retorno Fiel do Último Comando e BD E-Commerce (Semana 09)',
    isLatest: false,
    tag: 'Versão Anterior',
    items: [
      'Novos bancos e soluções de aula incorporados: banco db_ecommerce (Semana 09) e soluções de exercícios da Semana 08 (Pizzaria/Streaming e Escola de Idiomas) 100% compatíveis com o motor local.',
      'Retorno fiel do último comando executado: ao rodar múltiplos comandos, todos são executados em sequência e a guia Retorno exibe estritamente o último comando — inclusive com cabeçalhos preservados ("0 registros retornados") ou card detalhado de Erro SQL.',
      'Inspeção interativa de resultados anteriores: marcadores ✓/✖ na margem do Monaco Editor, barra de pills (#1, #2...) no Retorno e sincronização instantânea ao clicar em qualquer comando anterior do script.',
      'Execução imediata na linha do cursor (Alt+E e botão direito): "Executar esse trecho" posiciona e extrai o comando completo da linha sem exigir seleção de texto.',
      'Inserção inteligente de ponto e vírgula (;): ao iniciar um novo comando principal (SELECT, INSERT, UPDATE, DELETE, CREATE, etc.), o comando anterior não finalizado recebe ";" automaticamente sem afetar subqueries, UNION, CTEs ou cláusulas.',
    ],
  },
  {
    version: 'v3.1.18',
    date: '23/10/2026',
    title:
      'Chaveamento Automático de Banco de Dados via Comando USE e Sincronização Dinâmica por Cursor',
    items: [
      'Chaveamento automático no motor de execução: comandos USE database alteram imediatamente o banco ativo interno e do AlaSQL, garantindo que os comandos subsequentes operem estritamente no banco selecionado.',
      'Suporte a múltiplos comandos USE encadeados: transição fluida entre bancos no mesmo script (ex: USE db1; ... USE db2;), com isolamento e persistência completa das tabelas criadas em cada banco.',
      'Divisão inteligente de statements com ou sem ponto e vírgula: parser reconhece comandos USE em sua própria linha mesmo quando omitido o delimitador ";" antes da quebra de linha.',
      'Sincronização contextual na UI por posição do cursor: movimentar o cursor no Monaco Editor detecta a seção do USE precedente e atualiza o cabeçalho, Schema Explorer e autocomplete em tempo real.',
      'Execução de trecho pontual contextualizada (Alt+E): comandos isolados executam no banco ativo correspondente ao USE precedente mais próximo do script.',
    ],
  },
  {
    version: 'v3.1.17',
    date: '23/10/2026',
    title:
      'Split Button Nova Aba, Confirmação ao Fechar Todas, Recarga Completa de Bancos e Badges de Constraints (PK, FK, NN, UQ)',
    items: [
      'Split button em "+ Nova Aba": o botão principal cria imediatamente uma aba em branco, enquanto a setinha lateral abre o menu de opções existentes (soluções de aula).',
      'Confirmação padronizada em "Fechar Todas": o botão "X Fechar Todas" da barra de abas e do menu de contexto agora exige confirmação do usuário, prevenindo fechamentos acidentais.',
      'Recarga completa dos bancos: o botão "Recarregar Metadados dos Bancos" agora recarrega todos os bancos de dados de forma assíncrona com barras de progresso animadas.',
      'Diferenciação visual de chaves e constraints no Schema Explorer: chave primária com ícone colorido, chaves estrangeiras com chave branca e campos convencionais com ícone branco.',
      'Badges de integridade no Schema Explorer: identificação visual imediata de campos NOT NULL ("NN") e UNIQUE ("UQ") em todas as tabelas.',
    ],
  },
  {
    version: 'v3.1.16',
    date: '23/10/2026',
    title:
      'Execução de Trecho na Linha do Cursor, Dropdown no Botão Executar, Sincronização de Sessão e Suporte a 15 Funções SQL',
    items: [
      'Execução cirúrgica na linha do cursor: o comando "Executar esse trecho" (Alt+E) agora opera perfeitamente apenas com o cursor posicionado na linha, sem necessidade de selecionar a linha toda.',
      'Botão Executar com menu suspenso: adicionada setinha lateral no botão Executar com a opção "Executar esse trecho", idêntica à ergonomia do botão de abas.',
      'Sincronização automática de versão: cada sessão salva a versão do SQLEditor utilizada e, ao carregar uma versão mais recente, atualiza automaticamente os bancos de dados carregados.',
      'Garantia de funcionamento de 15 funções essenciais do MySQL: CONCAT(), CONCAT_WS(), UPPER(), LOWER(), SUBSTRING(), LENGTH(), ROUND(), CEIL(), FLOOR(), NOW(), CURDATE(), DATE_FORMAT(), DATEDIFF(), TIMESTAMPDIFF() e YEAR().',
    ],
  },
  {
    version: 'v3.1.15',
    date: '21/10/2026',
    title: 'Autocompletar Estrito do Banco Ativo, Auto-Capitalização SQL e Cursor Estável Entre Abas',
    items: [
      'Restauração da estabilidade nativa do cursor: desativação completa do mecanismo forçado de seleção entre abas e preservação da posição exata do cursor durante auto-capitalização.',
      'Auto-capitalização em tempo real: comandos e palavras-chave SQL digitados em minúsculas são auto-corrigidos para MAIÚSCULAS instantaneamente (ex: from → FROM, select → SELECT), preservando strings e comentários.',
      'Autocompletar estritamente filtrado pelo banco ativo: sugestões de tabelas e colunas restritas ao esquema atualmente selecionado, sem poluição de outros bancos.',
      'Autocompletar avançado por ponto (Dot Completion): suporte a tabela.coluna e alias.coluna com resolução inteligente de alias da query (ex: FROM clientes c → c.).',
      'Execução cirúrgica por posição do cursor: atalhos Alt+E e menu de contexto executam o comando exato sob o cursor quando não há texto selecionado.',
    ],
  },
  {
    version: 'v3.1.14',
    date: '21/10/2026',
    title: 'Fechamento de Abas em Massa, DER 2D Livre, Favicon Oficial e Funções MySQL Expandidas',
    items: [
      'Menu de contexto nas abas do editor com opções de "Fechar Todas as Abas" e "Fechar Outras Abas".',
      'Diagrama ER com arraste 2D livre dos títulos de relacionamentos e rotas ortogonais sem sobreposição de tabelas.',
      'Favicon vetorial SVG oficial da Milkfed integrado na aba do navegador.',
      'Expansão das funções nativas MySQL no motor local (CONCAT, CONCAT_WS, LENGTH, CHAR_LENGTH, DATEDIFF, TIMEDIFF).',
    ],
  },
  {
    version: 'v3.1.13',
    date: '15/10/2026',
    title: 'Landing Page Estilo DrawDB, Identidade Milkfed, Changelog Expansível e Presets de Exemplo',
    items: [
      'Página Inicial inspirada no drawdb.app com Live Interactive Showcase.',
      'Seção institucional da Milkfed Devs && Reqs Lords com modal de ampliação em alta resolução para o logotipo oficial.',
      'Perfil oficial do Professor William Devidé Komel com biografia técnica e canais de contato profissional.',
      'Changelog interativo em acordeom com histórico completo de evolução.',
    ],
  },
  {
    version: 'v3.1.12',
    date: '14/10/2026',
    title: 'Controles de Layout Estilo VS Code & Conexões DER Dinâmicas 360°',
    items: [
      '3 botões de exibição de painéis na Navbar inspirados no VS Code para alternar a visibilidade de Barra Lateral, Editor e Console.',
      'Conexões ortogonais dinâmicas no Diagrama ER alternando entre laterais esquerda e direita.',
    ],
  },
  {
    version: 'v3.1.11',
    date: '14/10/2026',
    title: 'Modelo ER Formal em Texto (MER Canônico) & Exportação para PDF A4',
    items: [
      'Tela dedicada "Modelo ER" apresentando a especificação relacional canônica do banco com exportação PDF A4.',
      'Persistência individualizada por banco de dados para posições de tabelas.',
    ],
  },
  {
    version: 'v3.1.10',
    date: '14/10/2026',
    title: 'DER Ortogonal 90° com Cantos Arredondados e Algoritmo Anti-Cruzamento Sugiyama',
    items: [
      'Rotas ortogonais em 90 graus com cantos arredondados suavizados e ajuste automático Fit to View.',
    ],
  },
  {
    version: 'v3.1.9',
    date: '14/10/2026',
    title: '4 Temas de Interface, 4 Esquemas de Sintaxe SQL e Renomeação de Abas (F2)',
    items: [
      '4 temas de interface (Dark Obsidian, Claro Alvorada, Bege Conforto e Grafite Titânio) e 4 esquemas de cores SQL.',
      'Atalhos globais Alt+T e Alt+L e renomeação de abas via duplo-clique ou F2.',
    ],
  },
  {
    version: 'v3.1.8',
    date: '14/10/2026',
    title: 'Revisor Heurístico de Digitação & Aba "Dados" com Inspeção Instantânea (LIMIT 30)',
    items: [
      'Motor de diagnóstico sintático heurístico com botão "Revisar SQL" e aba "Dados" no console.',
    ],
  },
  {
    version: 'v3.1.0',
    date: '14/10/2026',
    title: 'Carregamento Assíncrono em Lotes (Chunks) com Progresso Percentual em Tempo Real',
    items: [
      'Carregamento assíncrono em lotes por banco de dados mantendo a interface a 60fps com persistência no IndexedDB.',
    ],
  },
  {
    version: 'v2.5.0',
    date: '13/10/2026',
    title: '3D Flip Cards na Stack Tecnológica & Persistência de Rotas no Navegador (F5)',
    items: [
      'Cards interativos 3D Flip na página Sobre e persistência da tela ativa via hash routing.',
    ],
  },
  {
    version: 'v2.0.0',
    date: '13/10/2026',
    title: 'Central de Configurações, Backup/Exportação SQL e Página Sobre',
    items: [
      'Tela de Configurações, exportação .sql e página institucional Sobre.',
    ],
  },
  {
    version: 'v1.2.0',
    date: '13/10/2026',
    title: 'Funções Nativas MySQL Integradas, Botão Copiar Erro e Sidebar Redimensionável',
    items: [
      'Funções clássicas MySQL no motor AlaSQL e divisor redimensionável para o Schema Explorer.',
    ],
  },
  {
    version: 'v1.1.0',
    date: '13/10/2026',
    title: 'Zoom Fluido, Suporte a Tema Claro, Botão + Novo Banco e Menu de Contexto',
    items: [
      'Controles de zoom fluidos, modal "+ Novo Banco" e autocomplete enriquecido no Monaco.',
    ],
  },
  {
    version: 'v1.0.0',
    date: '13/10/2026',
    title: 'Lançamento Inicial do SQLEditor • Marco Zero',
    items: [
      'Arquitetura React 19 + TypeScript + Vite + Tailwind CSS + AlaSQL + Dexie.js + Monaco Editor.',
    ],
  },
];

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenEditor,
  onOpenView,
  theme,
  onToggleTheme,
  onInstantiateTemplate,
}) => {
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<
    'diagram' | 'split' | 'data' | 'model'
  >('diagram');
  const [showcaseLimitLabel, setShowcaseLimitLabel] = useState<'LIMIT 30' | 'LIMIT 100' | 'TOTAL'>(
    'LIMIT 30'
  );
  const [copiedTerminal, setCopiedTerminal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});

  // Suporte a fechar modal do logo com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLogoModalOpen(false);
      }
    };
    if (isLogoModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isLogoModalOpen]);

  // Miniaturas vetoriais vivas dos 3 primeiros templates curados para vitrine da Home
  const featuredTemplates = useMemo(() => {
    return ER_TEMPLATES_CATALOG.slice(0, 3).map((tpl) => {
      const parsed = parseLiveSqlSchema(tpl.ddlSql, {
        inferImplicitForeignKeys: true,
      });
      return {
        ...tpl,
        tables: parsed.tables,
        relationships: parsed.relationships,
      };
    });
  }, []);

  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) => ({
      ...prev,
      [version]: !prev[version],
    }));
  };

  const expandAllVersions = () => {
    const allExpanded: Record<string, boolean> = {};
    CHANGELOG_HISTORY.forEach((entry) => {
      allExpanded[entry.version] = true;
    });
    setExpandedVersions(allExpanded);
  };

  const collapseAllVersions = () => {
    setExpandedVersions({});
  };

  const terminalCommand =
    'git clone https://github.com/williamdevide/antigravity.SQLEditor\ncd antigravity.SQLEditor/frontend\nnpm install && npm run dev';

  const handleCopyTerminal = () => {
    navigator.clipboard.writeText(terminalCommand);
    setCopiedTerminal(true);
    setTimeout(() => setCopiedTerminal(false), 2200);
  };

  const cycleShowcaseLimit = () => {
    setShowcaseLimitLabel((prev) =>
      prev === 'LIMIT 30' ? 'LIMIT 100' : prev === 'LIMIT 100' ? 'TOTAL' : 'LIMIT 30'
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[#FF6B00] selection:text-white transition-colors duration-300 relative overflow-x-hidden">
      {/* Modal Ampliado do Logo Milkfed (Identico ao da Pagina Sobre) */}
      {isLogoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsLogoModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl w-full p-6 sm:p-8 bg-[var(--bg-secondary)] border border-[#FF6B00]/40 rounded-2xl shadow-2xl shadow-black/80 flex flex-col items-center cursor-default animate-in zoom-in-95 duration-200"
          >
            {/* Botão de Fechar */}
            <button
              onClick={() => setIsLogoModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[var(--bg-surface)] hover:bg-[#FF6B00] text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)] flex items-center justify-center transition-all cursor-pointer shadow-md"
              title="Fechar (Esc)"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* Logo da Milkfed em Alta Definição */}
            <div className="p-4 my-2 flex items-center justify-center">
              <img
                src="/logo-milkfed.png"
                alt="Milkfed Devs && Reqs Lords Logo Ampliado"
                className="max-h-[55vh] max-w-full object-contain drop-shadow-[0_10px_35px_rgba(255,107,0,0.45)] select-none"
              />
            </div>

            {/* Informações no Modal */}
            <div className="text-center mt-3 space-y-1">
              <h3 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Milkfed Devs <span className="text-[#FF6B00]">&amp;&amp;</span> Reqs Lords
              </h3>
              <p className="text-xs text-[var(--accent-yellow)] font-mono">
                Software House • Requirements Mastery • AI Architecture
              </p>
              <p className="text-[11px] text-[var(--text-muted)] pt-2">
                Clique fora deste modal ou pressione <kbd className="px-1.5 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-[10px] font-mono">Esc</kbd> para fechar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Background Decorativo com Grid Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FF6B00]/10 via-[var(--bg-primary)] to-[var(--bg-primary)] pointer-events-none -z-10" />
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none -z-10"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* 1. Header / Navbar Flutuante em Pílula */}
      <header className="sticky top-0 z-50 pt-4 px-4 sm:px-8 max-w-7xl mx-auto">
        <nav className="bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full px-5 py-2.5 flex items-center justify-between transition-all">
          <div
            onClick={onOpenEditor}
            className="flex items-center gap-2 cursor-pointer group"
            title="Abrir Laboratório SQL"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF6B00] to-[#FFE600] flex items-center justify-center shadow-[0_0_12px_rgba(255,107,0,0.4)] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-black font-bold text-[19px]">
                bolt
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
                SQL<span className="text-[#FF6B00]">Editor</span>
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] text-[10px] font-mono font-semibold border border-[var(--accent-yellow)]/20">
                v{APP_VERSION}
              </span>
            </div>
          </div>

          {/* Links Centrais da Central de Banco de Dados */}
          <div className="hidden lg:flex items-center gap-5 text-xs font-semibold text-[var(--text-secondary)]">
            <a href="#trilha" className="hover:text-[var(--text-primary)] transition-colors">
              5 Etapas de BD
            </a>
            <button
              type="button"
              onClick={() => onOpenView('gallery')}
              className="hover:text-[#FF6B00] transition-colors cursor-pointer"
            >
              Galeria &amp; Prática
            </button>
            <button
              type="button"
              onClick={() => onOpenView('er-diagram')}
              className="hover:text-[#FF6B00] transition-colors cursor-pointer"
            >
              Estúdio DER
            </button>
            <button
              type="button"
              onClick={() => onOpenView('er-model')}
              className="hover:text-[#FF6B00] transition-colors cursor-pointer"
            >
              Dicionário 1FN–3FN
            </button>
            <a href="#recursos" className="hover:text-[var(--text-primary)] transition-colors">
              Recursos
            </a>
            <a href="#changelog" className="hover:text-[var(--text-primary)] transition-colors">
              Changelog
            </a>
            <a href="#institucional" className="hover:text-[#FF6B00] transition-colors">
              Milkfed &amp; Criador
            </a>
          </div>

          {/* Ações da Direita */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenView('guide')}
              className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-[var(--text-secondary)] hover:text-[#29B6F6] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-color)] transition-colors cursor-pointer"
              title="Guia Rápido & Treinamentos em Vídeo"
            >
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenView('feedback')}
              className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-[var(--text-secondary)] hover:text-[#00E676] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-color)] transition-colors cursor-pointer"
              title="Feedback & Suporte ao Desenvolvedor"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FFE600] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-color)] transition-colors cursor-pointer"
              title="Alternar Tema (Dark, Light, Bege, Grafite)"
              aria-label="Alternar Tema"
            >
              <span className="material-symbols-outlined text-[18px]">
                {theme === 'dark'
                  ? 'dark_mode'
                  : theme === 'light'
                  ? 'light_mode'
                  : theme === 'beige'
                  ? 'coffee'
                  : 'contrast'}
              </span>
            </button>

            <button
              onClick={onOpenEditor}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#FF6B00] hover:from-[#FF8533] to-[#FFA726] text-white text-xs font-bold shadow-[0_0_18px_rgba(255,107,0,0.4)] hover:shadow-[0_0_24px_rgba(255,107,0,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              type="button"
            >
              <span>Abrir Central</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="Abrir Menu"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </nav>

        {/* Menu Mobile */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-2 p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xl flex flex-col gap-2.5 text-sm">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenView('gallery');
              }}
              className="px-3 py-2 text-left rounded-lg hover:bg-[var(--bg-hover)] font-semibold text-[#FF6B00]"
            >
              Galeria &amp; Prática Guiada
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenView('er-diagram');
              }}
              className="px-3 py-2 text-left rounded-lg hover:bg-[var(--bg-hover)] font-medium text-[#29B6F6]"
            >
              Estúdio DER Interativo
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenView('er-model');
              }}
              className="px-3 py-2 text-left rounded-lg hover:bg-[var(--bg-hover)] font-medium text-[var(--accent-yellow)]"
            >
              Modelo Lógico &amp; Dicionário (1FN–3FN)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenView('guide-feedback');
              }}
              className="px-3 py-2 text-left rounded-lg hover:bg-[var(--bg-hover)] font-medium"
            >
              Guia Rápido, Atalhos &amp; Feedback
            </button>
            <a
              href="#changelog"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] font-medium"
            >
              Changelog
            </a>
            <a
              href="#institucional"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] font-medium text-[#FF6B00]"
            >
              Milkfed &amp; Criador
            </a>
          </div>
        )}
      </header>

      {/* 2. Hero Section com Background Futurista de Malha Vetorial */}
      <section
        style={{ backgroundImage: "url('/backgrounds/bg-database-mesh.svg')" }}
        className="pt-14 pb-12 px-4 sm:px-6 max-w-5xl mx-auto text-center relative bg-cover bg-center rounded-3xl my-6 border border-[var(--border-color)]/60 shadow-xl"
      >
        {/* Barra superior de status e Logo Milkfed com fundo semi-transparente */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-surface)]/80 backdrop-blur-md border border-[var(--border-color)] shadow-sm text-xs font-mono font-medium text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse shadow-[0_0_8px_#00E676]" />
            <span>v{APP_VERSION} · Central da Disciplina de Banco de Dados · 100% Offline-First</span>
          </div>

          {/* Logo Milkfed com Fundo Semi-Transparente na Seção Hero */}
          <button
            type="button"
            onClick={() => setIsLogoModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 hover:bg-black/60 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70 backdrop-blur-md border border-white/10 hover:border-[#FF6B00]/70 text-xs font-mono text-[var(--text-primary)] shadow-md hover:shadow-[0_0_15px_rgba(255,107,0,0.35)] transition-all cursor-zoom-in group"
            title="Desenvolvido por Milkfed Devs && Reqs Lords • Clique para ver detalhes institucionais"
          >
            <div className="w-5 h-5 rounded-full bg-white/10 p-0.5 flex items-center justify-center overflow-hidden">
              <img
                src="/logo-milkfed.png"
                alt="Milkfed Devs && Reqs Lords"
                className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(255,107,0,0.5)] group-hover:scale-110 transition-transform"
              />
            </div>
            <span className="text-[11px] font-semibold text-zinc-300 group-hover:text-white transition-colors">
              Milkfed <span className="text-[#FF6B00]">&amp;&amp;</span> Reqs Lords
            </span>
            <span className="material-symbols-outlined text-[13px] text-[#FF6B00]">zoom_in</span>
          </button>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.08] mb-6">
          Modele o DER. Audite 3FN. <br />
          <span className="bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FFE600] bg-clip-text text-transparent">
            Execute SQL Ao Vivo no Navegador.
          </span>
        </h1>

        <p className="text-base sm:text-lg lg:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed mb-8">
          A plataforma educacional e profissional completa para praticar todas as etapas de Banco de Dados: Estúdio DER ortogonal 90° de 7 camadas, sincronia reativa{' '}
          <strong className="text-[var(--text-primary)]">SQL ↔ DER</strong>, Dicionário de Dados com Linter{' '}
          <strong className="text-[var(--text-primary)]">1FN–3FN</strong> e desafios práticos autocorrigíveis.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <button
            onClick={onOpenEditor}
            className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#FF6B00] hover:bg-[#FF8533] text-white text-sm font-bold shadow-[0_0_24px_rgba(255,107,0,0.45)] hover:shadow-[0_0_32px_rgba(255,107,0,0.7)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            type="button"
          >
            <span>Abrir Laboratório SQL</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>

          <button
            onClick={() => onOpenView('er-diagram')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] text-sm font-semibold transition-all hover:border-[#29B6F6]/60 cursor-pointer shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#29B6F6]">
              account_tree
            </span>
            <span>Estúdio DER</span>
          </button>

          <button
            onClick={() => onOpenView('gallery')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] text-sm font-semibold transition-all hover:border-[var(--status-success)]/60 cursor-pointer shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[var(--status-success)]">
              school
            </span>
            <span>Galeria &amp; Desafios</span>
          </button>
        </div>

        {/* Links Rápidos para Guia Rápido e Feedback */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10 text-xs">
          <button
            type="button"
            onClick={() => onOpenView('guide')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-surface)]/80 hover:bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#29B6F6] text-[var(--text-secondary)] hover:text-[#29B6F6] transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-[#29B6F6]">menu_book</span>
            <span className="font-semibold">Guia Rápido &amp; Vídeos de Treinamento</span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">#guia</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenView('feedback')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-surface)]/80 hover:bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#00E676] text-[var(--text-secondary)] hover:text-[#00E676] transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-[#00E676]">send</span>
            <span className="font-semibold">Feedback &amp; Canal Direto</span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">#feedback</span>
          </button>
        </div>

        {/* Indicadores Rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto pt-4 border-t border-[var(--border-color)]">
          <div>
            <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">5 Etapas</div>
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider mt-0.5">
              Jornada Completa de BD
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#00E676]">0ms</div>
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider mt-0.5">
              Zero Backend / Offline
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#FF8533]">1FN–3FN</div>
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider mt-0.5">
              Linter Pedagógico PT-BR
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#FFE600]">90° SVG</div>
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider mt-0.5">
              7 Camadas Interativas
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Interactive Showcase com Canvas Real Arrastável a 60fps */}
      <section style={{ backgroundImage: "url('/backgrounds/bg-sql-laboratory.svg')" }} className="px-4 sm:px-8 max-w-6xl mx-auto pb-16 bg-cover bg-center rounded-3xl relative my-6">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-3 sm:p-5 shadow-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
            <div className="hidden sm:flex items-center gap-1.5 px-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
              <span className="ml-2 text-xs font-mono text-[var(--text-muted)]">
                sqleditor.central-bd
              </span>
            </div>

            <div className="inline-flex flex-wrap items-center p-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-xs font-semibold gap-0.5">
              {[
                { id: 'diagram' as const, icon: 'account_tree', label: 'DER Arrastável Ao Vivo' },
                { id: 'split' as const, icon: 'vertical_split', label: 'Split-View SQL ↔ DER' },
                { id: 'data' as const, icon: 'dataset', label: 'Grade & Limit Dinâmico' },
                { id: 'model' as const, icon: 'menu_book', label: 'Dicionário 1FN–3FN' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveShowcaseTab(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                    activeShowcaseTab === t.id
                      ? 'bg-[#FF6B00] text-white shadow-md'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                onOpenView(
                  activeShowcaseTab === 'diagram'
                    ? 'er-diagram'
                    : activeShowcaseTab === 'model'
                    ? 'er-model'
                    : 'workspace'
                )
              }
              className="text-xs font-mono font-semibold text-[#FF8533] hover:text-[#FFE600] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Abrir Módulo Real</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </button>
          </div>

          <div className="relative h-[490px] sm:h-[520px] bg-[var(--bg-primary)] rounded-2xl overflow-hidden mt-4 border border-[var(--border-color)]">
            {/* Aba 1: Mini-Canvas Real 60fps Arrastável */}
            {activeShowcaseTab === 'diagram' && <HeroInteractiveERCanvas />}

            {/* Aba 2: Demonstração Split-View Reativo SQL ↔ DER */}
            {activeShowcaseTab === 'split' && (
              <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-color)]">
                <div className="p-4 flex flex-col font-mono text-xs bg-[var(--bg-surface)]/40">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border-color)]">
                    <span className="text-[var(--accent-yellow)] font-bold">
                      modelagem_ao_vivo.sql
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#00E676]/15 text-[#00E676] text-[10px] font-bold">
                      Sincronia Instantânea
                    </span>
                  </div>
                  <pre className="flex-1 overflow-auto leading-relaxed text-[12px] text-[var(--text-primary)]">
{`CREATE TABLE categorias (
  id INT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL
);

CREATE TABLE produtos (
  id INT PRIMARY KEY,
  categoria_id INT NOT NULL,
  nome VARCHAR(140) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (categoria_id)
    REFERENCES categorias(id)
);

CREATE TABLE itens_pedido (
  id INT PRIMARY KEY,
  pedido_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade INT NOT NULL,
  FOREIGN KEY (produto_id)
    REFERENCES produtos(id)
);`}
                  </pre>
                </div>

                <div className="relative flex flex-col bg-[var(--bg-primary)]">
                  <div className="px-3 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#FF6B00] font-bold">
                      ⚡ Fonte: Script Ao Vivo (useDeferredValue)
                    </span>
                    <span className="text-[var(--status-success)]">✓ Linter: 100% Íntegro</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ERThumbnailSvg
                      tables={featuredTemplates[0].tables}
                      relationships={featuredTemplates[0].relationships}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Aba 3: Grade de Dados com Ciclo Dinâmico Limit 30 / 100 / Total */}
            {activeShowcaseTab === 'data' && (
              <div className="w-full h-full p-4 flex flex-col font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)]">
                      Tabela: tb_funcionarios
                    </span>
                    <button
                      type="button"
                      onClick={cycleShowcaseLimit}
                      title="Clique para testar a alternância Limit 30 -> Limit 100 -> Total"
                      className="px-2.5 py-0.5 rounded-full bg-[#FF6B00]/20 hover:bg-[#FF6B00] text-[#FF8533] hover:text-white border border-[#FF6B00]/40 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      {showcaseLimitLabel} ↻
                    </button>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Inspeção multi-comando (#1, #2, #3) sincronizada ao cursor • 1.1ms
                  </div>
                </div>

                <div className="flex-1 overflow-auto mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-hover)] text-[var(--text-muted)] border-b border-[var(--border-color)] text-[11px]">
                        <th className="p-2.5">#</th>
                        <th className="p-2.5 text-[var(--accent-yellow)]">id_funcionario [PK]</th>
                        <th className="p-2.5">nome</th>
                        <th className="p-2.5 text-[#FF8533]">departamento</th>
                        <th className="p-2.5 text-[#29B6F6]">cargo</th>
                        <th className="p-2.5 text-right">salario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] text-xs">
                      <tr className="hover:bg-[var(--bg-hover)]/60">
                        <td className="p-2.5 text-[var(--text-muted)]">1</td>
                        <td className="p-2.5 font-bold text-[var(--accent-yellow)]">101</td>
                        <td className="p-2.5 font-semibold">Carlos Eduardo Silva</td>
                        <td className="p-2.5">Engenharia de Software</td>
                        <td className="p-2.5">Tech Lead Senior</td>
                        <td className="p-2.5 text-right font-bold text-[#00E676]">R$ 14.850,00</td>
                      </tr>
                      <tr className="hover:bg-[var(--bg-hover)]/60">
                        <td className="p-2.5 text-[var(--text-muted)]">2</td>
                        <td className="p-2.5 font-bold text-[var(--accent-yellow)]">102</td>
                        <td className="p-2.5 font-semibold">Mariana Souza Castro</td>
                        <td className="p-2.5">Dados &amp; Analytics</td>
                        <td className="p-2.5">Engenheira de Dados</td>
                        <td className="p-2.5 text-right font-bold text-[#00E676]">R$ 11.400,00</td>
                      </tr>
                      <tr className="hover:bg-[var(--bg-hover)]/60">
                        <td className="p-2.5 text-[var(--text-muted)]">3</td>
                        <td className="p-2.5 font-bold text-[var(--accent-yellow)]">103</td>
                        <td className="p-2.5 font-semibold">Lucas Gabriel Ferreira</td>
                        <td className="p-2.5">Infraestrutura Cloud</td>
                        <td className="p-2.5">DevOps Architect</td>
                        <td className="p-2.5 text-right font-bold text-[#00E676]">R$ 12.900,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Aba 4: Modelo Lógico, Dicionário de Dados & Checklist 1FN-3FN */}
            {activeShowcaseTab === 'model' && (
              <div className="w-full h-full p-4 flex flex-col font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)]">
                      DICIONÁRIO DE DADOS &amp; AUDITORIA 1FN–3FN
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[var(--status-success)]/15 text-[var(--status-success)] text-[10px] font-bold">
                      ✓ 1FN • ✓ 2FN • ✓ 3FN
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenView('er-model')}
                      className="px-3 py-1 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold cursor-pointer"
                    >
                      Exportar .MD / Mermaid / PDF
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-color)] overflow-auto mt-3 leading-relaxed space-y-2">
                  <div className="text-[var(--text-muted)]">
                    -- Descrição Semântica: Colaboradores ativos vinculados a cargos e departamentos em 3FN.
                  </div>
                  <div className="text-[#FF6B00] font-bold">TB_FUNCIONARIOS (</div>
                  <div className="pl-6 text-[var(--accent-yellow)]">
                    id_funcionario INT [PK] -- Identificador único surrogado do colaborador,
                  </div>
                  <div className="pl-6">
                    nome VARCHAR(100) [NOT NULL] -- Nome civil completo,
                  </div>
                  <div className="pl-6 text-[#29B6F6]">
                    departamento_id INT [FK ➔ TB_DEPARTAMENTOS(id_depto)],
                  </div>
                  <div className="pl-6 text-[#29B6F6]">
                    cargo_id INT [FK ➔ TB_CARGOS(id_cargo)],
                  </div>
                  <div className="pl-6 text-[#00E676]">
                    salario DECIMAL(10,2) -- Remuneração base mensal
                  </div>
                  <div className="text-[#FF6B00] font-bold">);</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Trilha Interativa das 5 Etapas da Disciplina de Banco de Dados */}
      <section
        id="trilha"
        style={{ backgroundImage: "url('/backgrounds/bg-cyber-grid.svg')" }}
        className="px-4 sm:px-8 max-w-6xl mx-auto py-16 border-t border-[var(--border-color)] bg-cover bg-center rounded-3xl relative my-6"
      >
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="text-xs font-mono font-semibold text-[#FF6B00] uppercase tracking-wider mb-2">
            Jornada Pedagógica Integrada
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Pratique as <span className="text-[#FF6B00]">5 Etapas da Disciplina</span> em um Único Lugar
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Do levantamento de regras de negócio até junções complexas e agregações analíticas, cada módulo foi desenhado para conectar teoria e prática sem sair do navegador.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              step: 'Etapa 01',
              icon: 'sticky_note_2',
              color: '#FFE600',
              title: 'Requisitos & Domínios',
              desc: 'Estruture Áreas Temáticas e fixe Notas Post-it com regras de negócio diretamente no canvas.',
              view: 'er-diagram' as ActiveView,
              action: 'Estúdio DER',
            },
            {
              step: 'Etapa 02',
              icon: 'account_tree',
              color: '#FF6B00',
              title: 'Modelagem Conceitual/Física',
              desc: 'Desenhe entidades, conecte FKs por arraste e visualize cardinalidades Pé-de-Galinha ou 1:N.',
              view: 'er-diagram' as ActiveView,
              action: 'Modelar DER',
            },
            {
              step: 'Etapa 03',
              icon: 'verified_user',
              color: '#00E676',
              title: 'Normalização 1FN–3FN',
              desc: 'Detecte grupos repetitivos e dependências parciais/transitivas com o Linter Pedagógico PT-BR.',
              view: 'er-model' as ActiveView,
              action: 'Auditar 1FN–3FN',
            },
            {
              step: 'Etapa 04',
              icon: 'vertical_split',
              color: '#29B6F6',
              title: 'Implementação DDL',
              desc: 'Escreva CREATE e ALTER TABLE no Split-View assistindo ao diagrama nascer a cada tecla.',
              view: 'workspace' as ActiveView,
              action: 'Laboratório SQL',
            },
            {
              step: 'Etapa 05',
              icon: 'emoji_events',
              color: '#FFA726',
              title: 'Consultas DQL & Desafios',
              desc: 'Domine WHERE, JOIN e GROUP BY resolvendo desafios práticos com validação automática.',
              view: 'gallery' as ActiveView,
              action: 'Resolver Desafios',
            },
          ].map((item) => (
            <div
              key={item.step}
              onClick={() => onOpenView(item.view)}
              className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#FF6B00] transition-all flex flex-col justify-between cursor-pointer group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">
                    {item.step}
                  </span>
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ color: item.color }}
                  >
                    {item.icon}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-[var(--border-color)] text-[11px] font-mono font-bold text-[#FF6B00] group-hover:translate-x-0.5 transition-transform">
                {item.action} →
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Bento Grid Expandido de 12 Recursos Profissionais */}
      <section
        id="recursos"
        style={{ backgroundImage: "url('/backgrounds/bg-circuit-board.svg')" }}
        className="px-4 sm:px-8 max-w-6xl mx-auto py-16 border-t border-[var(--border-color)] bg-cover bg-center rounded-3xl relative my-6"
      >
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-mono font-semibold text-[#FF6B00] uppercase tracking-wider mb-2">
            Arquitetura v{APP_VERSION}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            12 Pilares de Engenharia para <span className="text-[#FF8533]">Aprender e Projetar</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[
            {
              icon: 'turn_sharp_right',
              color: '#FF6B00',
              title: 'Motor SVG 90° de 7 Camadas',
              desc: 'Linhas ortogonais arredondadas atrás dos cards em repouso e em primeiro plano no hover, com hit-area de 22px, Spotlight 22%, Self-Join "C" e FKs compostas.',
            },
            {
              icon: 'vertical_split',
              color: '#29B6F6',
              title: 'Split-View Reativo SQL ↔ DER',
              desc: 'Alterne entre Banco Ativo (AlaSQL) e Script Ao Vivo. Crie tabelas visualmente no DER com edição cirúrgica que preserva o Ctrl+Z do Monaco.',
            },
            {
              icon: 'visibility',
              color: '#FFE600',
              title: 'Cards Ricos com Live Data Peek',
              desc: 'Espie registros reais dentro do próprio card do DER (👁️), visualize Triggers (⚡), aplique colapso inteligente de colunas e trave posições (🔒).',
            },
            {
              icon: 'verified_user',
              color: '#00E676',
              title: 'Linter Pedagógico 1FN–3FN',
              desc: 'Diagnóstico em português para ausência de PK, FK órfã, incompatibilidade de tipos, ciclos referenciais e anomalias de 1ª, 2ª e 3ª Formas Normais.',
            },
            {
              icon: 'menu_book',
              color: '#FF8533',
              title: 'Dicionário de Dados & Checklist',
              desc: 'Documente a semântica de cada tabela e coluna, marque auditoria 1FN/2FN/3FN e exporte documentação pronta para TCC e projetos integradores.',
            },
            {
              icon: 'download',
              color: '#29B6F6',
              title: '5 Exportadores + Link #z.',
              desc: 'Exporte em PNG HD (2x), SVG Vetorial, PDF A4 Paisagem, Mermaid erDiagram e Markdown (.md), ou compartilhe via URL #z. comprimida sem servidor.',
            },
            {
              icon: 'emoji_events',
              color: '#00E676',
              title: 'Desafios Autocorrigíveis',
              desc: 'Exercícios graduados de DDL, Normalização, WHERE, JOIN e GROUP BY corrigidos localmente pelo motor determinístico AlaSQL.',
            },
            {
              icon: 'dashboard_customize',
              color: '#FFE600',
              title: 'Áreas Temáticas & Notas Post-it',
              desc: 'Agrupe entidades por subdomínio com arraste solidário e registre requisitos funcionais com notas adesivas vetoriais.',
            },
            {
              icon: 'terminal',
              color: '#FF6B00',
              title: 'Monaco Editor & Inspeção Multi-Query',
              desc: 'Execução na linha do cursor (Alt+E), inserção inteligente de ";", autocomplete contextual por USE e histórico clicável por comando (#1, #2...).',
            },
            {
              icon: 'smart_toy',
              color: '#00E676',
              title: 'Revisão SQL Cirúrgica In-Place',
              desc: 'Diagnóstico heurístico de erros de digitação com substituição cirúrgica apenas na linha do comando analisado, preservando todo o restante do script.',
            },
            {
              icon: 'tune',
              color: '#29B6F6',
              title: 'Configurações em 4 Pilares & Modo Lab',
              desc: 'Controle automações do editor, notações do DER e Modo Leve para computadores de laboratório, além de ciclo rápido Limit 30 / 100 / Total.',
            },
            {
              icon: 'archive',
              color: '#FFA726',
              title: 'Super-Backup Portátil (.sqleditor.json)',
              desc: 'Exporte e restaure em 1 arquivo todos os seus bancos, abas de scripts, layouts DER, dicionários 1FN–3FN, notas e progresso nos exercícios.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 hover:border-[#FF6B00]/60 transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: `${card.color}20`,
                    color: card.color,
                  }}
                >
                  <span className="material-symbols-outlined text-[22px]">{card.icon}</span>
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1.5">
                  {card.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Vitrine Viva de Templates DER & Bancos de Aula */}
      <section
        id="bancos"
        className="px-4 sm:px-8 max-w-6xl mx-auto py-16 border-t border-[var(--border-color)] space-y-12"
      >
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00E676]/10 text-[#00E676] text-xs font-mono font-semibold uppercase tracking-wider mb-3 border border-[#00E676]/20">
              <span className="material-symbols-outlined text-[15px]">database</span>
              <span>Templates Vetoriais &amp; Bancos de Aula</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Clone um Esquema em 1 Clique
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenView('gallery')}
            className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Explorar Galeria Completa</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>

        {/* Miniaturas Vetoriais Vivas (<ERThumbnailSvg />) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {featuredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#FF6B00] overflow-hidden flex flex-col shadow-sm transition-all"
            >
              <div className="h-44 border-b border-[var(--border-color)] relative">
                <ERThumbnailSvg
                  tables={tpl.tables}
                  relationships={tpl.relationships}
                  className="w-full h-full"
                />
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-[var(--bg-surface)]/90 border border-[var(--border-color)] text-[10px] font-mono font-bold text-[var(--accent-yellow)]">
                  {tpl.badge}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {tpl.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {tpl.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onInstantiateTemplate
                      ? onInstantiateTemplate(tpl.id)
                      : onOpenView('gallery')
                  }
                  className="w-full py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[#FF6B00] hover:text-white border border-[var(--border-color)] text-xs font-bold transition-colors cursor-pointer"
                >
                  Clonar e Abrir no Estúdio DER →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Banner Educativo de Persistência Local Offline-First & Super-Backup */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#FF6B00]/12 via-[var(--bg-surface)] to-[var(--bg-surface)] border border-[#FF6B00]/35 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">shield_lock</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Privacidade 100% Local (IndexedDB) + Portabilidade Entre Máquinas de Laboratório
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed max-w-3xl">
                Seus bancos, scripts, posições do DER e checklists 1FN–3FN ficam salvos exclusivamente no navegador desta máquina. Vai trocar de computador no laboratório? Exporte seu{' '}
                <strong className="text-[var(--accent-yellow)] font-mono">.sqleditor.json</strong> nas Configurações e leve todo o seu progresso no pendrive ou nuvem!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenView('settings')}
            className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-bold text-[var(--accent-yellow)] shrink-0 cursor-pointer"
          >
            Gerenciar Super-Backup →
          </button>
        </div>
      </section>

      {/* 7. Roadmap Pedagógico */}
      <section
        id="features"
        className="px-4 sm:px-8 max-w-6xl mx-auto py-16 border-t border-[var(--border-color)]"
      >
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] text-xs font-mono font-semibold uppercase tracking-wider mb-4 border border-[#FF6B00]/30">
            <span className="material-symbols-outlined text-[16px]">upcoming</span>
            <span>Próximos Passos • Roadmap Cloud</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
            Evolução Colaborativa para Turmas
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <span className="material-symbols-outlined text-2xl text-[#FF6B00] mb-3">
              manage_accounts
            </span>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1.5">
              Perfis de Alunos &amp; Professores
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Autenticação opcional em nuvem para sincronização multi-dispositivo e criação de cadernos customizados pelo docente.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <span className="material-symbols-outlined text-2xl text-[#29B6F6] mb-3">
              groups
            </span>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1.5">
              Gestão de Turmas por Convite
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Acompanhamento de entregas por semestre e telemetria pedagógica das dificuldades mais comuns da turma.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <span className="material-symbols-outlined text-2xl text-[#00E676] mb-3">
              cloud_done
            </span>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1.5">
              Submissão Avaliativa Integrada
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Envio direto de listas avaliativas com pré-validação local e feedback estruturado do professor.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Changelog Interativo Completo */}
      <section
        id="changelog"
        style={{ backgroundImage: "url('/backgrounds/bg-matrix-code.svg')" }}
        className="px-4 sm:px-8 max-w-5xl mx-auto py-20 border-t border-[var(--border-color)] bg-cover bg-center rounded-3xl relative my-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] text-xs font-mono font-semibold uppercase tracking-wider mb-2 border border-[var(--accent-yellow)]/20">
              <span className="material-symbols-outlined text-[15px]">history</span>
              <span>Histórico Completo de Versões</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Changelog do SQLEditor
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Todos os marcos desenvolvidos desde 13/10/2026 até a Central v{APP_VERSION}.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={expandAllVersions}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">unfold_more</span>
              <span>Expandir Todos</span>
            </button>
            <button
              onClick={collapseAllVersions}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">unfold_less</span>
              <span>Recolher</span>
            </button>
          </div>
        </div>

        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[var(--border-color)]">
          {CHANGELOG_HISTORY.map((entry) => {
            const isExpanded = !!expandedVersions[entry.version];
            return (
              <div key={entry.version} className="relative pl-9">
                <span
                  className={`absolute left-1.5 top-4 w-4 h-4 rounded-full border-4 border-[var(--bg-primary)] transition-all ${
                    entry.isLatest
                      ? 'bg-[#FF6B00] shadow-[0_0_10px_#FF6B00]'
                      : isExpanded
                      ? 'bg-[var(--accent-yellow)]'
                      : 'bg-[var(--border-color)]'
                  }`}
                />
                <div
                  onClick={() => toggleVersion(entry.version)}
                  className={`rounded-2xl border transition-all cursor-pointer shadow-sm ${
                    entry.isLatest
                      ? 'bg-[var(--bg-surface)] border-[#FF6B00]/40 hover:border-[#FF6B00]'
                      : isExpanded
                      ? 'bg-[var(--bg-surface)] border-[var(--accent-yellow)]/40 hover:border-[var(--accent-yellow)]'
                      : 'bg-[var(--bg-surface)]/70 hover:bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--text-secondary)]'
                  }`}
                >
                  <div className="p-4 sm:p-5 flex items-start justify-between gap-3 select-none">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span
                          className={`font-mono text-sm font-bold ${
                            entry.isLatest
                              ? 'text-[#FF6B00]'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {entry.version}
                        </span>
                        <span className="text-xs font-mono text-[var(--text-muted)]">
                          • {entry.date}
                        </span>
                        {entry.tag && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30 uppercase">
                            {entry.tag}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                        {entry.title}
                      </h4>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 mt-1">
                      <span className="material-symbols-outlined text-[20px]">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 border-t border-[var(--border-color)]/60">
                      <ul className="text-xs sm:text-sm text-[var(--text-secondary)] space-y-2 list-disc list-inside leading-relaxed mt-2">
                        {entry.items.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. Seção Institucional Preservada Integralmente: Milkfed Devs && Reqs Lords & Prof. William Devidé Komel */}
      <section
        id="institucional"
        style={{ backgroundImage: "url('/backgrounds/bg-neural-flow.svg')" }}
        className="px-4 sm:px-8 max-w-6xl mx-auto py-20 border-t border-[var(--border-color)] bg-cover bg-center rounded-3xl relative my-6"
      >
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] text-xs font-mono font-semibold uppercase tracking-wider mb-4 border border-[#FF6B00]/30">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Engenharia &amp; Autoria</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-[var(--text-primary)] tracking-tight mb-4">
            Milkfed Devs <span className="text-[#FF6B00]">&amp;&amp;</span> Reqs Lords
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Desenvolvido sob os mais rigorosos padrões de engenharia de software, requisitos refinados e orquestração autônoma com Inteligência Artificial.
          </p>
        </div>

        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[var(--accent-yellow)]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 relative z-10">
            <div className="flex flex-col items-center shrink-0">
              <div
                onClick={() => setIsLogoModalOpen(true)}
                className="w-48 h-48 sm:w-56 sm:h-56 p-4 rounded-3xl bg-[var(--bg-surface)] border-2 border-[#FF6B00]/40 hover:border-[#FF6B00] shadow-[0_0_30px_rgba(255,107,0,0.25)] hover:shadow-[0_0_40px_rgba(255,107,0,0.5)] transition-all cursor-zoom-in group flex flex-col items-center justify-center relative"
                title="Clique para ampliar o logo da Milkfed"
              >
                <img
                  src="/logo-milkfed.png"
                  alt="Milkfed Devs && Reqs Lords"
                  className="w-full h-full object-contain drop-shadow-[0_4px_16px_rgba(255,107,0,0.4)] group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono text-zinc-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[12px]">zoom_in</span>
                  <span>Clique para ampliar</span>
                </div>
              </div>
              <span className="mt-3 text-xs font-mono font-semibold text-[var(--accent-yellow)] text-center">
                Milkfed Devs &amp;&amp; Reqs Lords
              </span>
            </div>

            <div className="flex-1 space-y-4 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 uppercase">
                  Software House &amp; Tech Consulting
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/20">
                  Engineering &amp; Requirements Mastery
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Engenharia de Software de Alta Precisão &amp; Soluções Guiadas por IA
              </h3>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                A <strong>Milkfed Devs &amp;&amp; Reqs Lords</strong> nasceu da convicção de que o verdadeiro diferencial em tecnologia reside no equilíbrio perfeito entre código de alto padrão (<em>Devs</em>) e a maestria profunda na especificação de regras de negócio e requisitos (<em>Reqs Lords</em>).
              </p>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Especializada no desenvolvimento de sistemas complexos, ferramentas avançadas de produtividade para desenvolvedores e plataformas educacionais inovadoras — como o ecossistema <strong>SQLEditor</strong> —, nossa atuação combina arquiteturas offline-first, bancos em memória, modelagem visual e agentes de IA para criar soluções elegantes, rápidas e sem dependências desnecessárias.
              </p>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[18px] text-[#FF6B00]">
                    verified_user
                  </span>
                  <span className="text-[var(--text-primary)] font-medium">
                    Engenharia de Requisitos &amp; Domínio de Negócio
                  </span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[18px] text-[#00E676]">
                    speed
                  </span>
                  <span className="text-[var(--text-primary)] font-medium">
                    Aplicações Offline-First &amp; Performance Extrema
                  </span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[18px] text-[#FFE600]">
                    smart_toy
                  </span>
                  <span className="text-[var(--text-primary)] font-medium">
                    Inteligência Artificial Generativa &amp; Agentes Autônomos
                  </span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[18px] text-[#29B6F6]">
                    hub
                  </span>
                  <span className="text-[var(--text-primary)] font-medium">
                    Sistemas Distribuídos &amp; Ecossistemas de Dados
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Perfil do Criador (Professor William Devidé Komel) */}
          <div className="mt-10 pt-8 border-t border-[var(--border-color)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#FF6B00] via-[#FFE600] to-[#00E676] p-0.5 shadow-lg shrink-0 overflow-hidden">
                <img
                  src="/foto-william.jpg"
                  alt="Professor William Devidé Komel"
                  className="w-full h-full rounded-full object-cover shadow-inner"
                />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 uppercase tracking-wider">
                  Desenvolvedor &amp; Idealizador
                </span>
                <h4 className="text-lg font-bold text-[var(--text-primary)] mt-1">
                  Professor William Devidé Komel
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Engenheiro de Software • Educador de Tecnologia • Especialista em IA
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="mailto:williamdevide@gmail.com"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--accent-yellow)] text-xs font-semibold transition-all cursor-pointer font-mono"
              >
                <span className="material-symbols-outlined text-[16px] text-[var(--accent-yellow)]">
                  mail
                </span>
                <span>williamdevide@gmail.com</span>
              </a>

              <a
                href="https://www.linkedin.com/in/williamdevide"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A66C2]/15 hover:bg-[#0A66C2] text-[#0A66C2] hover:text-white border border-[#0A66C2]/40 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                <span>LinkedIn Profile</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Quickstart / Terminal Local */}
      <section className="px-4 sm:px-8 max-w-4xl mx-auto py-16 border-t border-[var(--border-color)]">
        <div className="text-center mb-8">
          <div className="text-xs font-mono font-semibold text-[#FF6B00] uppercase tracking-wider mb-2">
            Execução Local
          </div>
          <h2 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Execute na sua máquina em 30 segundos
          </h2>
        </div>

        <div className="bg-[#0B0D13] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-4 py-3 bg-[#141722] border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
              <span className="ml-2 font-mono text-xs text-zinc-400">
                Terminal Bash / PowerShell
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyTerminal}
              className="text-xs font-mono flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#202536] hover:bg-[#2A3147] text-zinc-300 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copiedTerminal ? 'check' : 'content_copy'}
              </span>
              <span>{copiedTerminal ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
          <pre className="p-5 font-mono text-xs sm:text-sm text-zinc-200 overflow-x-auto leading-relaxed">
            <span className="text-zinc-500"># 1. Clone o repositório do SQLEditor</span>
            {'\n'}
            <span className="text-[#00E676]">$</span> git clone https://github.com/williamdevide/antigravity.SQLEditor
            {'\n'}
            <span className="text-zinc-500"># 2. Acesse a pasta do frontend e instale as dependências</span>
            {'\n'}
            <span className="text-[#00E676]">$</span> cd antigravity.SQLEditor/frontend &amp;&amp; npm install
            {'\n'}
            <span className="text-zinc-500"># 3. Inicie o servidor de desenvolvimento</span>
            {'\n'}
            <span className="text-[#00E676]">$</span> npm run dev
            {'\n'}
            <span className="text-zinc-500"># → Disponível instantaneamente em http://localhost:5173</span>
          </pre>
        </div>
      </section>

      {/* 11. CTA Final */}
      <section className="px-4 sm:px-8 max-w-5xl mx-auto py-16 text-center">
        <div className="bg-gradient-to-b from-[#FF6B00]/15 to-[var(--bg-surface)] border border-[#FF6B00]/30 rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden">
          <h2 className="text-3xl sm:text-5xl font-black text-[var(--text-primary)] tracking-tight mb-4">
            Pronto para dominar Banco de Dados?
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Comece pela Galeria de Modelos, desenhe no Estúdio DER ou abra o Laboratório SQL com Split-View ao vivo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenEditor}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FFA726] text-white text-base font-extrabold shadow-[0_0_30px_rgba(255,107,0,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              type="button"
            >
              Abrir Laboratório SQL →
            </button>
            <button
              onClick={() => onOpenView('gallery')}
              className="px-7 py-4 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-base font-bold transition-all cursor-pointer"
              type="button"
            >
              Explorar Galeria &amp; Desafios
            </button>
          </div>
        </div>
      </section>

      {/* 12. Footer */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-surface)] py-10 px-4 sm:px-8 text-xs text-[var(--text-muted)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FF6B00] text-[20px]">bolt</span>
            <span className="font-bold text-sm text-[var(--text-primary)]">SQLEditor</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              v{APP_VERSION}
            </span>
            <span>• Milkfed Devs &amp;&amp; Reqs Lords</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => onOpenView('gallery')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Galeria &amp; Prática
            </button>
            <button
              type="button"
              onClick={() => onOpenView('er-diagram')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Estúdio DER
            </button>
            <button
              type="button"
              onClick={() => onOpenView('er-model')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Dicionário 1FN–3FN
            </button>
            <button
              type="button"
              onClick={onOpenEditor}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Laboratório SQL
            </button>
            <button
              type="button"
              onClick={() => onOpenView('guide-feedback')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Guia &amp; Atalhos
            </button>
            <button
              type="button"
              onClick={() => onOpenView('about')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Sobre
            </button>
          </div>

          <div>
            © {new Date().getFullYear()} SQLEditor • Professor William Devidé Komel.
          </div>
        </div>
      </footer>
    </div>
  );
};
