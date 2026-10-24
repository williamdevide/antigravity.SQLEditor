import React, { useState } from 'react';
import type { ActiveView, ThemeMode } from '../types';
import { APP_VERSION } from '../config/version';

interface LandingPageViewProps {
  onOpenEditor: () => void;
  onOpenView: (view: ActiveView) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
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
    version: 'v3.1.16',
    date: '23/10/2026',
    title: 'Execução de Trecho na Linha do Cursor, Dropdown no Botão Executar, Sincronização de Sessão e Suporte a 15 Funções SQL',
    isLatest: true,
    tag: 'Lançamento Atual',
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
    isLatest: false,
    tag: 'Versão Anterior',
    items: [
      'Restauração da estabilidade nativa do cursor: desativação completa do mecanismo forçado de seleção entre abas e preservação da posição exata do cursor durante auto-capitalização.',
      'Auto-capitalização em tempo real: comandos e palavras-chave SQL digitados em minúsculas são auto-corrigidos para MAIÚSCULAS instantaneamente (ex: from → FROM, select → SELECT), preservando strings e comentários.',
      'Autocompletar estritamente filtrado pelo banco ativo: sugestões de tabelas e colunas restritas ao esquema atualmente selecionado, sem poluição de outros bancos.',
      'Autocompletar avançado por ponto (Dot Completion): suporte a tabela.coluna e alias.coluna com resolução inteligente de alias da query (ex: FROM clientes c → c.).',
      'Execução cirúrgica por posição do cursor: atalhos Alt+E e menu de contexto executam o comando exato sob o cursor quando não há texto selecionado.',
      'Desativação de sugestões genéricas baseadas em palavras avulsas de outros documentos abertos (wordBasedSuggestions desativado).',
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
      'Novos scripts de exercícios e soluções didáticas para aulas de Banco de Dados.',
      'Controles de zoom ampliados com faixa de 50% até 250% em todos os módulos.',
    ],
  },
  {
    version: 'v3.1.13',
    date: '15/10/2026',
    title: 'Landing Page Estilo DrawDB, Identidade Milkfed, Changelog Expansível e Presets de Exemplo',
    items: [
      'Página Inicial sensacional inspirada no drawdb.app com Live Interactive Showcase (Diagrama ER, Monaco SQL, Dados e Modelo ER).',
      'Seção institucional da Milkfed Devs && Reqs Lords com modal de ampliação em alta resolução para o logotipo oficial.',
      'Perfil oficial do Professor William Devidé Komel com biografia técnica e canais de contato profissional.',
      'Ajuste dos bancos de exemplo didáticos oficiais: ecommerce_db e universidade_db para experimentação imediata.',
      'Changelog interativo em acordeom com histórico completo de evolução desde o primeiro dia de desenvolvimento.',
      'Seção de Roadmap com planejamento de contas segregadas para Alunos e Professores, turmas e entrega de exercícios.',
      'Roteamento por hash sincronizado suportando as rotas #landing e #editor.',
    ],
  },
  {
    version: 'v3.1.12',
    date: '14/10/2026',
    title: 'Controles de Layout Estilo VS Code & Conexões DER Dinâmicas 360°',
    items: [
      '3 botões de exibição de painéis na Navbar inspirados no VS Code para alternar a visibilidade de Barra Lateral, Editor e Console.',
      'Conexões ortogonais dinâmicas no Diagrama ER: os pontos de ancoragem alternam automaticamente entre laterais esquerda e direita para nunca cobrir as tabelas.',
      'Navbar contextual adaptativa: botões de execução e comandos de abas são exibidos estritamente na visão Workspace.',
    ],
  },
  {
    version: 'v3.1.11',
    date: '14/10/2026',
    title: 'Modelo ER Formal em Texto (MER Canônico) & Exportação para PDF A4',
    items: [
      'Nova tela dedicada "Modelo ER" apresentando a especificação relacional canônica do banco com dicionário de atributos e regras de integridade.',
      'Exportação para documento PDF A4 em alta definição com estilos CSS otimizados para impressão.',
      'Persistência individualizada por banco de dados para posições de tabelas e ajustes manuais das linhas de relacionamento.',
      'Remoção de restrição no limite esquerdo do canvas do DER, permitindo posicionar tabelas encostadas na margem.',
    ],
  },
  {
    version: 'v3.1.10',
    date: '14/10/2026',
    title: 'DER Ortogonal 90° com Cantos Arredondados e Algoritmo Anti-Cruzamento Sugiyama',
    items: [
      'Substituição de curvas Bézier por rotas ortogonais em 90 graus com cantos arredondados suavizados.',
      'Algoritmo estratificado baseado no método de Sugiyama para posicionar tabelas reduzindo ou eliminando cruzamento de arestas.',
      'Etiquetas centrais nas conexões exibindo o nome formal da relação em vez de cardinalidade simples.',
      'Sincronização bidirecional do seletor de bancos de dados dentro da tela do Diagrama ER com o Workspace.',
      'Função de ajuste automático à tela (Fit to View) para enquadrar perfeitamente o esquema no viewport.',
    ],
  },
  {
    version: 'v3.1.9',
    date: '14/10/2026',
    title: '4 Temas de Interface, 4 Esquemas de Sintaxe SQL e Renomeação de Abas (F2)',
    items: [
      '4 temas de interface: Escuro Noturno (Dark Obsidian), Claro Alvorada, Bege Conforto (Warm Sepia) e Grafite Titânio.',
      '4 esquemas de cores para código SQL: Âmbar Solar, Ciano Cyber, Esmeralda Matrix e Púrpura Synthwave.',
      'Atalhos globais de teclado Alt+T (ciclar tema de interface) e Alt+L (ciclar tema de sintaxe/letras).',
      'Renomeação de abas de script via duplo-clique ou atalho F2, selecionando automaticamente apenas o nome base sem a extensão .sql.',
      'Customização do menu de contexto do script com atalho dedicado para Exportar Script .sql (Ctrl+S).',
    ],
  },
  {
    version: 'v3.1.8',
    date: '14/10/2026',
    title: 'Revisor Heurístico de Digitação & Aba "Dados" com Inspeção Instantânea (LIMIT 30)',
    items: [
      'Motor de diagnóstico sintático heurístico com dicionário de digitação (correção automática de erros comuns como FRM -> FROM).',
      'Botão "Revisar SQL" diretamente nas mensagens de erro do Log de Execução para diagnóstico em 1 clique.',
      'Preservação contínua da seleção de texto e posição do cursor ao alternar entre abas de scripts no Monaco Editor.',
      'Nova aba "Dados" no painel de console exibindo as colunas e as 30 primeiras linhas da tabela selecionada via LIMIT 30.',
    ],
  },
  {
    version: 'v3.1.0',
    date: '14/10/2026',
    title: 'Carregamento Assíncrono em Lotes (Chunks) com Progresso Percentual em Tempo Real',
    items: [
      'Carregamento assíncrono em lotes por banco de dados intercalado por pequenos atrasos para manter a interface a 60fps.',
      'Barras individuais de progresso com porcentagem em tempo real (0% a 100%) por banco de dados durante a carga dos scripts do Modo Aula.',
      'Correção de conflito de construtores de tipos DATE no AlaSQL, viabilizando o carregamento seguro de todas as linhas de datas em tabelas corporativas.',
      'Persistência imediata de cada banco no IndexedDB após o processamento de seu lote de statements.',
    ],
  },
  {
    version: 'v2.5.0',
    date: '13/10/2026',
    title: '3D Flip Cards na Stack Tecnológica & Persistência de Rotas no Navegador (F5)',
    items: [
      'Cards interativos com efeito 3D Flip (perspectiva 1000px) detalhando especificações de React, AlaSQL, Dexie, Monaco e Tailwind.',
      'Modal de zoom em alta resolução com backdrop escuro para fotos de perfil e logotipos.',
      'Persistência da aba e tela ativa ao atualizar a página (F5) sincronizada com localStorage e hash routing nativo.',
      'Auditoria de segurança client-side e conformidade estrita de privacidade 100% offline-first.',
    ],
  },
  {
    version: 'v2.0.0',
    date: '13/10/2026',
    title: 'Central de Configurações, Backup/Exportação SQL e Página Sobre',
    items: [
      'Tela completa de Configurações com opções de temas, tamanho de fontes, comportamento de execução e atalhos de teclado.',
      'Exportação e download de esquemas e dados completos em arquivo .sql.',
      'Restauração de banco de dados e reset semente para os bancos iniciais.',
      'Página institucional "Sobre" apresentando a arquitetura do sistema e autoria do projeto.',
    ],
  },
  {
    version: 'v1.2.0',
    date: '13/10/2026',
    title: 'Funções Nativas MySQL Integradas, Botão Copiar Erro e Sidebar Redimensionável',
    items: [
      'Implementação de funções clássicas de data e texto do MySQL (DATE_FORMAT, NOW, CURDATE, DATEDIFF, CONCAT_WS) no motor AlaSQL.',
      'Botão "Copiar Erro" dedicado em cada mensagem de erro do Log de Execução para cópia instantânea.',
      'Divisor redimensionável com arraste suave e responsivo para o Schema Explorer com persistência de largura no IndexedDB.',
    ],
  },
  {
    version: 'v1.1.0',
    date: '13/10/2026',
    title: 'Zoom Fluido, Suporte a Tema Claro, Botão + Novo Banco e Menu de Contexto',
    items: [
      'Controles de zoom fluidos na barra lateral de tabelas e na grade de resultados de dados.',
      'Compatibilidade total com o Tema Claro em todos os módulos da interface.',
      'Botão "+ Novo Banco" no rodapé do Schema Explorer com modal para criação de bancos locais.',
      'Menu de contexto com atalhos para executar trecho selecionado (Alt+E) e revisar (Alt+R).',
      'Provedor de autocompletar do Monaco enriquecido com nomes de tabelas e colunas.',
    ],
  },
  {
    version: 'v1.0.0',
    date: '13/10/2026',
    title: 'Lançamento Inicial do SQLEditor • Marco Zero',
    items: [
      'Arquitetura moderna construída com React 19, TypeScript, Vite e Tailwind CSS.',
      'Motor de banco de dados em memória AlaSQL com sintaxe MySQL completa (CREATE DATABASE, USE, CREATE TABLE, INSERT, SELECT, JOIN).',
      'Persistência 100% offline-first no navegador utilizando Dexie.js e IndexedDB.',
      'Integração com Monaco Editor (o mesmo editor do VS Code) com realce de sintaxe e autocomplete.',
      'Bancos didáticos semente de exemplo pré-carregados para prática imediata: ecommerce_db e universidade_db.',
    ],
  },
];

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenEditor,
  onOpenView,
  theme,
  onToggleTheme,
}) => {
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'diagram' | 'sql' | 'data' | 'model'>('diagram');
  const [copiedTerminal, setCopiedTerminal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  
  // Estado para acordeom do Changelog: por padrão v3.1.16 começa expandido
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({
    'v3.1.16': true,
  });

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

  const terminalCommand = 'git clone https://github.com/williamdevide/antigravity.SQLEditor\ncd antigravity.SQLEditor/frontend\nnpm install && npm run dev';

  const handleCopyTerminal = () => {
    navigator.clipboard.writeText(terminalCommand);
    setCopiedTerminal(true);
    setTimeout(() => setCopiedTerminal(false), 2200);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[#FF6B00] selection:text-white transition-colors duration-300 relative overflow-x-hidden">
      {/* Modal Ampliado do Logo Milkfed */}
      {isLogoModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsLogoModalOpen(false)}
        >
          <div
            className="relative max-w-xl w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsLogoModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors border border-[var(--border-color)] cursor-pointer"
              aria-label="Fechar"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="w-44 h-44 sm:w-56 sm:h-56 p-4 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-inner flex items-center justify-center my-2">
              <img
                src="/logo-milkfed.png"
                alt="Milkfed Devs && Reqs Lords Logo"
                className="w-full h-full object-contain drop-shadow-[0_8px_24px_rgba(255,107,0,0.45)]"
              />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight mt-3">
              Milkfed Devs <span className="text-[#FF6B00]">&amp;&amp;</span> Reqs Lords
            </h3>
            <p className="text-xs sm:text-sm text-[var(--accent-yellow)] font-mono font-medium mt-1">
              Software House &amp; Tech Consulting • Engineering &amp; Requirements Mastery
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-3 leading-relaxed max-w-md">
              Engenharia de software de precisão, arquiteturas offline-first resilientes e soluções de dados orquestradas com Inteligência Artificial.
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-4">
              Clique fora do card ou no botão fechar para voltar à página inicial.
            </p>
          </div>
        </div>
      )}

      {/* Background Decorativo com Grid Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FF6B00]/10 via-[var(--bg-primary)] to-[var(--bg-primary)] pointer-events-none -z-10" />
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none -z-10" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '28px 28px'
        }}
      />

      {/* 1. Header / Navbar Flutuante em Pílula (Estilo Moderno DrawDB) */}
      <header className="sticky top-0 z-50 pt-4 px-4 sm:px-8 max-w-7xl mx-auto">
        <nav className="bg-[var(--bg-surface)]/85 backdrop-blur-md border border-[var(--border-color)] shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full px-5 py-2.5 flex items-center justify-between transition-all">
          {/* Logo e Nome */}
          <div 
            onClick={onOpenEditor} 
            className="flex items-center gap-2 cursor-pointer group"
            title="Abrir SQLEditor"
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

          {/* Links Centrais de Navegação */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-[var(--text-secondary)]">
            <a href="#recursos" className="hover:text-[var(--text-primary)] transition-colors">
              Recursos
            </a>
            <button 
              onClick={() => onOpenView('er-diagram')} 
              className="hover:text-[#FF6B00] transition-colors cursor-pointer"
            >
              Diagrama ER
            </button>
            <button 
              onClick={() => onOpenView('er-model')} 
              className="hover:text-[#FF6B00] transition-colors cursor-pointer"
            >
              Modelo ER
            </button>
            <a href="#bancos" className="hover:text-[var(--text-primary)] transition-colors">
              Bancos
            </a>
            <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">
              Roadmap
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
            {/* Alternador de Tema */}
            <button
              onClick={onToggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FFE600] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-color)] transition-colors cursor-pointer"
              title="Alternar Tema (Dark, Light, Bege, Grafite)"
              aria-label="Alternar Tema"
            >
              <span className="material-symbols-outlined text-[18px]">
                {theme === 'dark' ? 'dark_mode' : theme === 'light' ? 'light_mode' : theme === 'beige' ? 'coffee' : 'contrast'}
              </span>
            </button>

            {/* Botão de Destaque "Teste você mesmo" */}
            <button
              onClick={onOpenEditor}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#FF6B00] hover:from-[#FF8533] to-[#FFA726] text-white text-xs font-bold shadow-[0_0_18px_rgba(255,107,0,0.4)] hover:shadow-[0_0_24px_rgba(255,107,0,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              type="button"
            >
              <span>Teste você mesmo</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>

            {/* Menu Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="Abrir Menu"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </nav>

        {/* Menu Dropdown Mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-2 p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xl flex flex-col gap-3 text-sm animate-in fade-in duration-150">
            <a 
              href="#recursos" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] font-medium"
            >
              Recursos
            </a>
            <button 
              onClick={() => { setIsMobileMenuOpen(false); onOpenView('er-diagram'); }}
              className="px-3 py-2 text-left rounded-lg hover:bg-[var(--bg-hover)] font-medium text-[#29B6F6]"
            >
              Diagrama ER
            </button>
            <button 
              onClick={() => { setIsMobileMenuOpen(false); onOpenView('er-model'); }}
              className="px-3 py-2 text-left rounded-lg hover:bg-[var(--bg-hover)] font-medium text-[#AB47BC]"
            >
              Modelo ER (Texto)
            </button>
            <a 
              href="#bancos" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] font-medium"
            >
              Bancos Didáticos &amp; Exemplos
            </a>
            <a 
              href="#features" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] font-medium"
            >
              Roadmap (Futuras Features)
            </a>
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
            <button 
              onClick={() => { setIsMobileMenuOpen(false); onOpenView('about'); }}
              className="px-3 py-2 text-left rounded-lg hover:bg-[var(--bg-hover)] font-medium"
            >
              Sobre
            </button>
          </div>
        )}
      </header>

      {/* 2. Hero Section (Inspirado no DrawDB: "Think it. Draw it. Ship it.") */}
      <section className="pt-20 pb-14 px-4 sm:px-6 max-w-5xl mx-auto text-center relative">
        {/* Badge Flutuante no Topo */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm text-xs font-mono font-medium text-[var(--text-secondary)] mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse shadow-[0_0_8px_#00E676]" />
          <span>v{APP_VERSION} · 100% Offline-First · Zero Cadastro · Execução Local no Navegador</span>
        </div>

        {/* Título Principal de Alto Impacto */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-6">
          Pense. Modele. <br />
          <span className="bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FFE600] bg-clip-text text-transparent">
            Execute SQL no Navegador.
          </span>
        </h1>

        {/* Subtítulo Descritivo e Claro */}
        <p className="text-base sm:text-lg lg:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed mb-8">
          O estúdio completo de banco de dados moderno: consultas em tempo real com motor AlaSQL, diagramas entidade-relacionamento (DER) ortogonais inteligentes sem cruzamento de linhas, modelo relacional formal em texto e revisão de código com inteligência local.
        </p>

        {/* Botões de Ação do Hero */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-12">
          <button
            onClick={onOpenEditor}
            className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#FF6B00] hover:bg-[#FF8533] text-white text-sm font-bold shadow-[0_0_24px_rgba(255,107,0,0.45)] hover:shadow-[0_0_32px_rgba(255,107,0,0.7)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            type="button"
          >
            <span>Teste você mesmo (Abrir Editor)</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>

          <button
            onClick={() => onOpenView('er-diagram')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] text-sm font-semibold transition-all hover:border-[#FF6B00]/60 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#29B6F6]">schema</span>
            <span>Ver Diagrama ER</span>
          </button>

          <button
            onClick={() => onOpenView('er-model')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] text-sm font-semibold transition-all hover:border-[#AB47BC]/60 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#AB47BC]">article</span>
            <span>Modelo ER (Texto)</span>
          </button>
        </div>

        {/* Estatísticas e Pilares do Ecossistema */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto pt-4 border-t border-[var(--border-color)]">
          <div>
            <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">100%</div>
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider mt-0.5">Offline &amp; Seguro</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#00E676]">0ms</div>
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider mt-0.5">Latência de Servidor</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#FF8533]">4 BDs</div>
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider mt-0.5">Prontos p/ Prática</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[#FFE600]">90°</div>
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider mt-0.5">Linhas Ortogonais</div>
          </div>
        </div>
      </section>

      {/* 3. Live Interactive Showcase (A Vitrine Interativa Estilo DrawDB) */}
      <section className="px-4 sm:px-8 max-w-6xl mx-auto pb-20">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-3 sm:p-5 shadow-2xl relative overflow-hidden">
          {/* Seletor de Abas de Demonstração Interativa */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
            {/* Pontos macOS no canto esquerdo */}
            <div className="hidden sm:flex items-center gap-1.5 px-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
              <span className="ml-2 text-xs font-mono text-[var(--text-muted)]">sqleditor.workspace</span>
            </div>

            {/* Pílulas de Seleção de Modo */}
            <div className="inline-flex items-center p-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-xs font-semibold">
              <button
                onClick={() => setActiveShowcaseTab('diagram')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                  activeShowcaseTab === 'diagram'
                    ? 'bg-[#FF6B00] text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">schema</span>
                <span>Diagrama ER</span>
              </button>

              <button
                onClick={() => setActiveShowcaseTab('sql')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                  activeShowcaseTab === 'sql'
                    ? 'bg-[#FF6B00] text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">code</span>
                <span>Editor SQL</span>
              </button>

              <button
                onClick={() => setActiveShowcaseTab('data')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                  activeShowcaseTab === 'data'
                    ? 'bg-[#FF6B00] text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">dataset</span>
                <span>Retorno &amp; Dados</span>
              </button>

              <button
                onClick={() => setActiveShowcaseTab('model')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                  activeShowcaseTab === 'model'
                    ? 'bg-[#FF6B00] text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">article</span>
                <span>Modelo ER (Texto)</span>
              </button>
            </div>

            {/* Botão de Ação Rápida */}
            <button
              onClick={onOpenEditor}
              className="text-xs font-mono font-semibold text-[#FF8533] hover:text-[#FFE600] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Abrir no Editor Real</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </button>
          </div>

          {/* Área de Visualização Interativa do Showcase */}
          <div className="relative h-[480px] sm:h-[520px] bg-[var(--bg-primary)] rounded-2xl overflow-hidden mt-4 border border-[var(--border-color)]">
            {/* Visualização 1: Diagrama ER com Linhas Ortogonais */}
            {activeShowcaseTab === 'diagram' && (
              <div className="w-full h-full p-6 relative overflow-hidden select-none">
                {/* SVG de Linhas Ortogonais com Cantos Arredondados */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  {/* Linha 1: tb_funcionarios (departamento_id) -> tb_departamentos (id_depto) */}
                  <path
                    d="M 330 185 L 430 185 Q 440 185, 440 195 L 440 260 Q 440 270, 450 270 L 520 270"
                    fill="none"
                    stroke="#FFE600"
                    strokeWidth="2.5"
                    opacity="0.9"
                  />
                  <circle cx="330" cy="185" r="4.5" fill="#FF8533" stroke="#FFF" strokeWidth="1.5" />
                  <circle cx="520" cy="270" r="4.5" fill="#00E676" stroke="#FFF" strokeWidth="1.5" />

                  {/* Linha 2: tb_funcionarios (cargo_id) -> tb_cargos (id_cargo) */}
                  <path
                    d="M 330 220 L 410 220 Q 420 220, 420 210 L 420 115 Q 420 105, 430 105 L 520 105"
                    fill="none"
                    stroke="#FFE600"
                    strokeWidth="2.5"
                    opacity="0.9"
                  />
                  <circle cx="330" cy="220" r="4.5" fill="#FF8533" stroke="#FFF" strokeWidth="1.5" />
                  <circle cx="520" cy="105" r="4.5" fill="#00E676" stroke="#FFF" strokeWidth="1.5" />

                  {/* Etiqueta Central 1 */}
                  <g transform="translate(400, 220)">
                    <rect x="0" y="0" width="130" height="22" rx="6" fill="#1A1D26" stroke="#FF6B00" strokeWidth="1.2" />
                    <text x="65" y="15" textAnchor="middle" fill="#FFE600" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="bold">
                      departamento_id ➔ tb_dep...
                    </text>
                  </g>

                  {/* Etiqueta Central 2 */}
                  <g transform="translate(390, 150)">
                    <rect x="0" y="0" width="105" height="22" rx="6" fill="#1A1D26" stroke="#FF6B00" strokeWidth="1.2" />
                    <text x="52" y="15" textAnchor="middle" fill="#FFE600" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="bold">
                      cargo_id ➔ tb_cargos
                    </text>
                  </g>
                </svg>

                {/* Tabela 1: tb_funcionarios */}
                <div className="absolute left-10 top-16 w-[270px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xl z-20 hover:border-[#FF6B00] transition-colors cursor-move">
                  <div className="px-3.5 py-2.5 bg-[#FF6B00]/15 border-b border-[var(--border-color)] flex items-center justify-between rounded-t-xl">
                    <span className="font-bold text-xs font-mono text-[var(--accent-orange)]">tb_funcionarios</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">500 linhas</span>
                  </div>
                  <div className="divide-y divide-[var(--border-color)] text-xs font-mono">
                    <div className="px-3 py-1.5 flex justify-between items-center text-[var(--status-success)]">
                      <span className="flex items-center gap-1.5">🔑 id_funcionario</span>
                      <span className="text-[10px] text-[var(--text-muted)]">INT [PK]</span>
                    </div>
                    <div className="px-3 py-1.5 flex justify-between items-center">
                      <span>nome</span>
                      <span className="text-[10px] text-[var(--text-muted)]">VARCHAR(100)</span>
                    </div>
                    <div className="px-3 py-1.5 flex justify-between items-center text-[#FF8533]">
                      <span className="flex items-center gap-1.5">🔗 departamento_id</span>
                      <span className="text-[10px] text-[var(--text-muted)]">INT [FK]</span>
                    </div>
                    <div className="px-3 py-1.5 flex justify-between items-center text-[#FF8533]">
                      <span className="flex items-center gap-1.5">🔗 cargo_id</span>
                      <span className="text-[10px] text-[var(--text-muted)]">INT [FK]</span>
                    </div>
                    <div className="px-3 py-1.5 flex justify-between items-center">
                      <span>salario</span>
                      <span className="text-[10px] text-[var(--text-muted)]">DECIMAL(10,2)</span>
                    </div>
                  </div>
                </div>

                {/* Tabela 2: tb_cargos */}
                <div className="absolute left-[520px] top-10 w-[240px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xl z-20 hover:border-[#00E676] transition-colors cursor-move">
                  <div className="px-3.5 py-2.5 bg-[#00E676]/15 border-b border-[var(--border-color)] flex items-center justify-between rounded-t-xl">
                    <span className="font-bold text-xs font-mono text-[#00E676]">tb_cargos</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">12 linhas</span>
                  </div>
                  <div className="divide-y divide-[var(--border-color)] text-xs font-mono">
                    <div className="px-3 py-1.5 flex justify-between items-center text-[var(--status-success)]">
                      <span className="flex items-center gap-1.5">🔑 id_cargo</span>
                      <span className="text-[10px] text-[var(--text-muted)]">INT [PK]</span>
                    </div>
                    <div className="px-3 py-1.5 flex justify-between items-center">
                      <span>titulo_cargo</span>
                      <span className="text-[10px] text-[var(--text-muted)]">VARCHAR(60)</span>
                    </div>
                    <div className="px-3 py-1.5 flex justify-between items-center">
                      <span>nivel</span>
                      <span className="text-[10px] text-[var(--text-muted)]">VARCHAR(20)</span>
                    </div>
                  </div>
                </div>

                {/* Tabela 3: tb_departamentos */}
                <div className="absolute left-[520px] top-56 w-[240px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xl z-20 hover:border-[#29B6F6] transition-colors cursor-move">
                  <div className="px-3.5 py-2.5 bg-[#29B6F6]/15 border-b border-[var(--border-color)] flex items-center justify-between rounded-t-xl">
                    <span className="font-bold text-xs font-mono text-[#29B6F6]">tb_departamentos</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">8 linhas</span>
                  </div>
                  <div className="divide-y divide-[var(--border-color)] text-xs font-mono">
                    <div className="px-3 py-1.5 flex justify-between items-center text-[var(--status-success)]">
                      <span className="flex items-center gap-1.5">🔑 id_departamento</span>
                      <span className="text-[10px] text-[var(--text-muted)]">INT [PK]</span>
                    </div>
                    <div className="px-3 py-1.5 flex justify-between items-center">
                      <span>nome_depto</span>
                      <span className="text-[10px] text-[var(--text-muted)]">VARCHAR(80)</span>
                    </div>
                    <div className="px-3 py-1.5 flex justify-between items-center">
                      <span>orcamento</span>
                      <span className="text-[10px] text-[var(--text-muted)]">DECIMAL(12,2)</span>
                    </div>
                  </div>
                </div>

                {/* Floating Hint */}
                <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between bg-[var(--bg-surface)]/90 backdrop-blur-sm border border-[var(--border-color)] rounded-xl px-4 py-2 text-xs text-[var(--text-muted)]">
                  <span>💡 Arraste tabelas e rotas ortogonais com 90° e cantos arredondados sem sobreposição.</span>
                  <span className="font-mono text-[#FFE600] font-semibold">db_rh • DER Ativo</span>
                </div>
              </div>
            )}

            {/* Visualização 2: Editor SQL Monaco */}
            {activeShowcaseTab === 'sql' && (
              <div className="w-full h-full p-4 flex flex-col font-mono text-xs">
                {/* Abas de Script Simuladas */}
                <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2 mb-3">
                  <div className="px-3 py-1 rounded-t-lg bg-[var(--bg-surface)] text-[#FFE600] border-b-2 border-[#FFE600] font-semibold flex items-center gap-1.5">
                    <span>relatorio_rh.sql</span>
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </div>
                  <div className="px-3 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                    analise_vendas.sql
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#00E676]/20 text-[#00E676] text-[10px] font-bold">
                      Ctrl+Enter p/ Executar
                    </span>
                  </div>
                </div>

                {/* Código com Syntax Highlight */}
                <div className="flex-1 bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-color)] overflow-auto text-sm leading-relaxed">
                  <div className="text-[var(--text-muted)]">-- Consulta analítica de folha e desempenho</div>
                  <div><span className="text-[#E040FB] font-bold">USE</span> <span className="text-[#FFE600]">`db_rh`</span>;</div>
                  <br />
                  <div><span className="text-[#E040FB] font-bold">SELECT</span></div>
                  <div className="pl-6">f.id_funcionario,</div>
                  <div className="pl-6">f.nome <span className="text-[#E040FB] font-bold">AS</span> funcionario,</div>
                  <div className="pl-6">d.nome_depto <span className="text-[#E040FB] font-bold">AS</span> departamento,</div>
                  <div className="pl-6">c.titulo_cargo <span className="text-[#E040FB] font-bold">AS</span> cargo,</div>
                  <div className="pl-6">f.salario</div>
                  <div><span className="text-[#E040FB] font-bold">FROM</span> tb_funcionarios f</div>
                  <div><span className="text-[#E040FB] font-bold">INNER JOIN</span> tb_departamentos d <span className="text-[#E040FB] font-bold">ON</span> f.departamento_id = d.id_departamento</div>
                  <div><span className="text-[#E040FB] font-bold">INNER JOIN</span> tb_cargos c <span className="text-[#E040FB] font-bold">ON</span> f.cargo_id = c.id_cargo</div>
                  <div><span className="text-[#E040FB] font-bold">WHERE</span> f.salario &gt; <span className="text-[#00E676]">4500.00</span></div>
                  <div><span className="text-[#E040FB] font-bold">ORDER BY</span> f.salario <span className="text-[#E040FB] font-bold">DESC</span></div>
                  <div><span className="text-[#E040FB] font-bold">LIMIT</span> <span className="text-[#00E676]">30</span>;</div>
                </div>

                {/* Barra de Status */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)] px-1">
                  <span>Ln 14, Col 12 • UTF-8 • Dialeto MySQL / AlaSQL</span>
                  <span className="text-[#00E676]">✓ Sintaxe válida (0 erros)</span>
                </div>
              </div>
            )}

            {/* Visualização 3: Retorno e Grade de Dados */}
            {activeShowcaseTab === 'data' && (
              <div className="w-full h-full p-4 flex flex-col font-mono text-xs">
                {/* Cabeçalho da Grade */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)]">Tabela: tb_funcionarios</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FF8533]/20 text-[#FF8533] text-[10px] font-bold">
                      LIMIT 30
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Exibindo 3 de 500 registros • 1.1ms
                  </div>
                </div>

                {/* Tabela de Dados */}
                <div className="flex-1 overflow-auto mt-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-hover)] text-[var(--text-muted)] border-b border-[var(--border-color)] text-[11px]">
                        <th className="p-2.5">#</th>
                        <th className="p-2.5 text-[#00E676]">id_funcionario [PK]</th>
                        <th className="p-2.5">nome</th>
                        <th className="p-2.5 text-[#FF8533]">departamento</th>
                        <th className="p-2.5 text-[#29B6F6]">cargo</th>
                        <th className="p-2.5 text-right">salario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] text-xs">
                      <tr className="hover:bg-[var(--bg-hover)]/60">
                        <td className="p-2.5 text-[var(--text-muted)]">1</td>
                        <td className="p-2.5 font-bold text-[#00E676]">101</td>
                        <td className="p-2.5 font-semibold">Carlos Eduardo Silva</td>
                        <td className="p-2.5">Engenharia de Software</td>
                        <td className="p-2.5">Tech Lead Senior</td>
                        <td className="p-2.5 text-right font-bold text-[#00E676]">R$ 14.850,00</td>
                      </tr>
                      <tr className="hover:bg-[var(--bg-hover)]/60">
                        <td className="p-2.5 text-[var(--text-muted)]">2</td>
                        <td className="p-2.5 font-bold text-[#00E676]">102</td>
                        <td className="p-2.5 font-semibold">Mariana Souza Castro</td>
                        <td className="p-2.5">Dados &amp; Analytics</td>
                        <td className="p-2.5">Engenheira de Dados</td>
                        <td className="p-2.5 text-right font-bold text-[#00E676]">R$ 11.400,00</td>
                      </tr>
                      <tr className="hover:bg-[var(--bg-hover)]/60">
                        <td className="p-2.5 text-[var(--text-muted)]">3</td>
                        <td className="p-2.5 font-bold text-[#00E676]">103</td>
                        <td className="p-2.5 font-semibold">Lucas Gabriel Ferreira</td>
                        <td className="p-2.5">Infraestrutura Cloud</td>
                        <td className="p-2.5">DevOps Architect</td>
                        <td className="p-2.5 text-right font-bold text-[#00E676]">R$ 12.900,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>Dica: Clique nos cabeçalhos para ordenar ascendentemente ou descendentemente.</span>
                  <span className="text-[#FF8533] font-semibold cursor-pointer">Exportar para .CSV</span>
                </div>
              </div>
            )}

            {/* Visualização 4: Modelo ER Formal em Texto (MER) */}
            {activeShowcaseTab === 'model' && (
              <div className="w-full h-full p-4 flex flex-col font-mono text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)]">MODELO ER (MER) - ESPECIFICAÇÃO FORMAL</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#AB47BC]/20 text-[#AB47BC] text-[10px] font-bold">
                      NOTATION 1:N
                    </span>
                  </div>
                  <button 
                    onClick={() => onOpenView('er-model')}
                    className="px-3 py-1 rounded bg-[#AB47BC] hover:bg-[#AB47BC]/80 text-white font-semibold cursor-pointer"
                  >
                    Exportar PDF
                  </button>
                </div>

                <div className="flex-1 bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-color)] overflow-auto mt-2 leading-relaxed">
                  <div className="text-[var(--text-muted)]">================================================================================</div>
                  <div className="text-[var(--text-primary)] font-bold">MODELO ENTIDADE-RELACIONAMENTO (MER) - ESPECIFICAÇÃO TEXTUAL CANÔNICA</div>
                  <div className="text-[var(--text-muted)]">Banco de Dados: db_rh • Gerado em tempo real</div>
                  <div className="text-[var(--text-muted)]">================================================================================</div>
                  <br />
                  <div className="text-[#FF8533] font-bold">TB_FUNCIONARIOS (</div>
                  <div className="pl-6 text-[#00E676]">id_funcionario [PK],</div>
                  <div className="pl-6">nome,</div>
                  <div className="pl-6 text-[#29B6F6]">departamento_id [FK ➔ TB_DEPARTAMENTOS.id_departamento],</div>
                  <div className="pl-6 text-[#29B6F6]">cargo_id [FK ➔ TB_CARGOS.id_cargo],</div>
                  <div className="pl-6">salario,</div>
                  <div className="pl-6">data_admissao</div>
                  <div className="text-[#FF8533] font-bold">);</div>
                  <br />
                  <div className="text-[#FF8533] font-bold">TB_DEPARTAMENTOS ( <span className="text-[#00E676]">id_departamento [PK]</span>, nome_depto, orcamento );</div>
                  <div className="text-[#FF8533] font-bold">TB_CARGOS ( <span className="text-[#00E676]">id_cargo [PK]</span>, titulo_cargo, nivel );</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Bento Grid de Recursos Exclusivos (O que torna o SQLEditor Único) */}
      <section id="recursos" className="px-4 sm:px-8 max-w-6xl mx-auto py-16 border-t border-[var(--border-color)]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-mono font-semibold text-[#FF6B00] uppercase tracking-wider mb-2">
            Engenharia de Software Completa
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Tudo o que você precisa para <br className="hidden sm:inline" />
            <span className="text-[#FF8533]">projetar, consultar e aprender</span>
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Construído para desenvolvedores, analistas de dados, estudantes e instrutores com as melhores ferramentas visuais e de código em uma única aplicação.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: DER Ortogonal (2x1) */}
          <div className="md:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 hover:border-[#FF6B00]/70 transition-all flex flex-col justify-between group shadow-sm">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] mb-4">
                <span className="material-symbols-outlined text-[24px]">schema</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                Diagramas ER Ortogonais Anti-Cruzamento
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">
                Rotas de relacionamento com quebras em 90 graus e cantos arredondados suavizados. As conexões alternam automaticamente de lado conforme você move a tabela pela tela, garantindo que nenhuma linha cruze por cima de dados ou estruturas.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
              <span>● Arraste livre de tabelas e rotas</span>
              <span className="text-[#00E676] font-bold">Auto Fit to View</span>
            </div>
          </div>

          {/* Card 2: Modelo ER (MER) Formal */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 hover:border-[#AB47BC]/70 transition-all flex flex-col justify-between group shadow-sm">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#AB47BC]/15 flex items-center justify-center text-[#AB47BC] mb-4">
                <span className="material-symbols-outlined text-[24px]">article</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                Modelo ER Formal &amp; Exportação PDF
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Versão textual canônica do seu modelo com dicionário de atributos, chaves primárias, mapeamento de integridade referencial e exportação profissional para PDF.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border-color)] text-xs font-mono text-[#AB47BC] font-semibold">
              Pronto para documentação acadêmica
            </div>
          </div>

          {/* Card 3: Monaco Editor */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 hover:border-[#FFE600]/70 transition-all flex flex-col justify-between group shadow-sm">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#FFE600]/15 flex items-center justify-center text-[#FFE600] mb-4">
                <span className="material-symbols-outlined text-[24px]">terminal</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                Editor Monaco Profissional
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                O mesmo editor que move o VS Code: autocompletar inteligente, atalhos clássicos (Ctrl+Enter, Alt+E, F2 para renomear abas) e exportação rápida para scripts `.sql`.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border-color)] text-xs font-mono text-[var(--text-muted)]">
              Multi-abas com persistência
            </div>
          </div>

          {/* Card 4: Revisão SQL Inteligente */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 hover:border-[#00E676]/70 transition-all flex flex-col justify-between group shadow-sm">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#00E676]/15 flex items-center justify-center text-[#00E676] mb-4">
                <span className="material-symbols-outlined text-[24px]">smart_toy</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                Revisão SQL com IA Integrada
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Análise sintática e semântica com explicações didáticas em português e botão de aplicação de correções diretamente na aba com um único clique.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border-color)] text-xs font-mono text-[#00E676] font-semibold">
              Educação e boas práticas
            </div>
          </div>

          {/* Card 5: 4 Temas & Tipografia */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 hover:border-[#FF6B00]/70 transition-all flex flex-col justify-between group shadow-sm">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#FF8533]/15 flex items-center justify-center text-[#FF8533] mb-4">
                <span className="material-symbols-outlined text-[24px]">palette</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                4 Temas de Interface + 4 Temas de Código
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Personalize com Dark Obsidian, Light Alvorada, Bege Acolhedor e Grafite Suave. Alterne rapidamente via menu ou atalhos de teclado (<kbd className="px-1 py-0.5 rounded bg-[var(--bg-primary)] font-mono text-[10px]">Alt+T</kbd> e <kbd className="px-1 py-0.5 rounded bg-[var(--bg-primary)] font-mono text-[10px]">Alt+L</kbd>).
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border-color)] text-xs font-mono text-[var(--text-muted)]">
              Conforto visual para longas sessões
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bancos Didáticos & Exemplos para Prática Instantânea */}
      <section id="bancos" className="px-4 sm:px-8 max-w-6xl mx-auto py-20 border-t border-[var(--border-color)]">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00E676]/10 text-[#00E676] text-xs font-mono font-semibold uppercase tracking-wider mb-3 border border-[#00E676]/20">
              <span className="material-symbols-outlined text-[15px]">database</span>
              <span>Prática Instantânea &amp; Ecossistema de Dados</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Bancos de Aula e Exemplos Prontos
            </h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] max-w-md leading-relaxed">
            Sem necessidade de configurar MySQL ou Docker. Escolha entre bases clássicas de exemplo ou projetos práticos com centenas de registros do currículo de aula.
          </p>
        </div>

        {/* Grupo 1: Bancos Focados em Aula (Modo Aula) */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-[#FF6B00] text-[22px]">school</span>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Bancos Focados em Aula (Modo Aula)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 uppercase">
              Projetos Reais
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* db_rh */}
            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#FF6B00] transition-all flex flex-col justify-between group shadow-sm hover:shadow-[0_8px_24px_rgba(255,107,0,0.15)]">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">badge</span>
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base font-mono text-[var(--text-primary)]">db_rh</h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">500 linhas</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  Estrutura corporativa completa de Recursos Humanos com funcionários, cargos, departamentos, datas de admissão e históricos salariais.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-color)] text-[11px] font-mono text-[#FF8533]">
                Foco: GROUP BY &amp; Agregações
              </div>
            </div>

            {/* db_streamflix */}
            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#29B6F6] transition-all flex flex-col justify-between group shadow-sm hover:shadow-[0_8px_24px_rgba(41,182,246,0.15)]">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#29B6F6]/15 flex items-center justify-center text-[#29B6F6] mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">movie</span>
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base font-mono text-[var(--text-primary)]">db_streamflix</h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">100+ planos</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  Catálogo de filmes e séries, assinantes, planos mensais, pagamentos e histórico de reproduções de uma plataforma moderna de streaming.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-color)] text-[11px] font-mono text-[#29B6F6]">
                Foco: INNER &amp; LEFT JOINs
              </div>
            </div>

            {/* db_pizzaria_express */}
            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#00E676] transition-all flex flex-col justify-between group shadow-sm hover:shadow-[0_8px_24px_rgba(0,230,118,0.15)]">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#00E676]/15 flex items-center justify-center text-[#00E676] mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">local_pizza</span>
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base font-mono text-[var(--text-primary)]">db_pizzaria_express</h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">100 pedidos</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  Sistema de delivery com clientes, pizzas, bordas, ingredientes, pedidos, status de entrega e controle de formas de pagamento.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-color)] text-[11px] font-mono text-[#00E676]">
                Foco: Regras de Negócio &amp; DML
              </div>
            </div>

            {/* db_escolaidiomas */}
            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#AB47BC] transition-all flex flex-col justify-between group shadow-sm hover:shadow-[0_8px_24px_rgba(171,71,188,0.15)]">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#AB47BC]/15 flex items-center justify-center text-[#AB47BC] mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">menu_book</span>
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base font-mono text-[var(--text-primary)]">db_escolaidiomas</h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">1000+ linhas</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  Gestão acadêmica e financeira com alunos, responsáveis, turmas, cursos, frequências e controle de mensalidades integradas.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-color)] text-[11px] font-mono text-[#AB47BC]">
                Foco: Subqueries &amp; Integridade
              </div>
            </div>
          </div>
        </div>

        {/* Grupo 2: Bancos de Exemplos Didáticos (Presets para Prática Instantânea) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] relative overflow-hidden shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFE600]/15 flex items-center justify-center text-[#FFE600]">
                <span className="material-symbols-outlined text-[24px]">terminal</span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Bancos de Exemplos Didáticos (Presets Clássicos)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Estruturas sementes ágeis e pré-carregadas para experimentação imediata de consultas e comandos avulsos.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenEditor}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[#FFE600] text-xs font-semibold transition-all cursor-pointer shadow-sm"
              type="button"
            >
              <span>Abrir no Editor</span>
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            {/* ecommerce_db */}
            <div className="p-5 rounded-2xl bg-[var(--bg-secondary)]/70 border border-[var(--border-color)] hover:border-[#FFE600]/70 transition-all flex flex-col justify-between group shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[#FFE600]">shopping_cart</span>
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">ecommerce_db</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FFE600]/15 text-[var(--accent-yellow)] border border-[#FFE600]/30">
                    5 Tabelas
                  </span>
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed mt-2">
                  Banco clássico de loja virtual com clientes (<code className="font-mono text-[11px] text-[var(--text-primary)]">usuarios</code>), <code className="font-mono text-[11px] text-[var(--text-primary)]">categorias</code>, <code className="font-mono text-[11px] text-[var(--text-primary)]">produtos</code>, <code className="font-mono text-[11px] text-[var(--text-primary)]">pedidos</code> e <code className="font-mono text-[11px] text-[var(--text-primary)]">itens_pedido</code>.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <span className="text-[#FF8533]">Foco: JOINs, Filtros WHERE &amp; Estoque</span>
                <span className="text-[var(--text-muted)]">Preset Semente</span>
              </div>
            </div>

            {/* universidade_db */}
            <div className="p-5 rounded-2xl bg-[var(--bg-secondary)]/70 border border-[var(--border-color)] hover:border-[#00E676]/70 transition-all flex flex-col justify-between group shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[#00E676]">account_balance</span>
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">universidade_db</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
                    5 Tabelas
                  </span>
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed mt-2">
                  Estrutura acadêmica universitária com <code className="font-mono text-[11px] text-[var(--text-primary)]">departamentos</code>, <code className="font-mono text-[11px] text-[var(--text-primary)]">professores</code>, <code className="font-mono text-[11px] text-[var(--text-primary)]">cursos</code>, <code className="font-mono text-[11px] text-[var(--text-primary)]">alunos</code> e <code className="font-mono text-[11px] text-[var(--text-primary)]">matriculas</code> com notas e semestres.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <span className="text-[#00E676]">Foco: GROUP BY, HAVING &amp; AVG()</span>
                <span className="text-[var(--text-muted)]">Preset Semente</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Seção de Futuras Features (Roadmap Pedagógico) */}
      <section id="features" className="px-4 sm:px-8 max-w-6xl mx-auto py-20 border-t border-[var(--border-color)]">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] text-xs font-mono font-semibold uppercase tracking-wider mb-4 border border-[#FF6B00]/30">
            <span className="material-symbols-outlined text-[16px]">upcoming</span>
            <span>O Que Vem por Aí • Roadmap</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-[var(--text-primary)] tracking-tight mb-4">
            Evolução Contínua: <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#FF6B00] via-[#FFA726] to-[#FFE600] bg-clip-text text-transparent">
              Plataforma Educacional Completa
            </span>
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            O SQLEditor está se transformando em uma plataforma colaborativa completa de ensino e aprendizagem prática de banco de dados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="p-7 rounded-3xl bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#FF6B00]/50 transition-all shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-3 py-1 bg-[#FF6B00]/20 text-[#FF6B00] border-b border-l border-[#FF6B00]/30 rounded-bl-xl font-mono text-[10px] font-bold">
              EM BREVE
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] mb-5 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">manage_accounts</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Perfis de Alunos &amp; Professores
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Autenticação individualizada com ambientes adaptados: professores contam com painel pedagógico de criação de desafios, e alunos têm foco na resolução interativa de consultas.
            </p>
            <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
              <span>Controle de acessos e privacidade</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-7 rounded-3xl bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#29B6F6]/50 transition-all shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-3 py-1 bg-[#29B6F6]/20 text-[#29B6F6] border-b border-l border-[#29B6F6]/30 rounded-bl-xl font-mono text-[10px] font-bold">
              EM BREVE
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#29B6F6]/15 flex items-center justify-center text-[#29B6F6] mb-5 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">groups</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Formação e Gestão de Turmas
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Criação dinâmica de turmas virtuais, matrículas por código de convite, divisão por semestre ou disciplina e visão centralizada do progresso dos estudantes.
            </p>
            <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#29B6F6]" />
              <span>Gestão acadêmica em tempo real</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-7 rounded-3xl bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#00E676]/50 transition-all shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-3 py-1 bg-[#00E676]/20 text-[#00E676] border-b border-l border-[#00E676]/30 rounded-bl-xl font-mono text-[10px] font-bold">
              EM BREVE
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#00E676]/15 flex items-center justify-center text-[#00E676] mb-5 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">task_alt</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Execução &amp; Entrega de Exercícios
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Caderno de exercícios integrado ao editor: testes unitários automáticos de SQL, validação imediata do dataset resultante, submissão com 1 clique e feedback instantâneo de notas.
            </p>
            <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
              <span>Autocorreção e métricas de acerto</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Seção de Changelogs Interativa (Acordeom desde o dia 13/10/2026) */}
      <section id="changelog" className="px-4 sm:px-8 max-w-5xl mx-auto py-20 border-t border-[var(--border-color)]">
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
              Todos os marcos e melhorias desenvolvidos desde a versão inicial em 13/10/2026. Clique em qualquer card para expandir ou recolher os detalhes.
            </p>
          </div>

          {/* Botões de Ação para Expandir / Recolher Todos */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={expandAllVersions}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1"
              type="button"
              title="Expandir todas as versões"
            >
              <span className="material-symbols-outlined text-[16px]">unfold_more</span>
              <span>Expandir Todos</span>
            </button>
            <button
              onClick={collapseAllVersions}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1"
              type="button"
              title="Recolher todas as versões"
            >
              <span className="material-symbols-outlined text-[16px]">unfold_less</span>
              <span>Recolher</span>
            </button>
          </div>
        </div>

        {/* Linha do Tempo Expansível */}
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[var(--border-color)]">
          {CHANGELOG_HISTORY.map((entry) => {
            const isExpanded = !!expandedVersions[entry.version];

            return (
              <div key={entry.version} className="relative pl-9">
                {/* Marcador na Timeline */}
                <span
                  className={`absolute left-1.5 top-4 w-4 h-4 rounded-full border-4 border-[var(--bg-primary)] transition-all ${
                    entry.isLatest
                      ? 'bg-[#FF6B00] shadow-[0_0_10px_#FF6B00]'
                      : isExpanded
                      ? 'bg-[var(--accent-yellow)]'
                      : 'bg-[var(--border-color)]'
                  }`}
                />

                {/* Card Clicável com Acordeom */}
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
                  {/* Cabeçalho do Card (Número, Data, Badge, Título e Ícone de Expansão) */}
                  <div className="p-4 sm:p-5 flex items-start justify-between gap-3 select-none">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span
                          className={`font-mono text-sm font-bold ${
                            entry.isLatest ? 'text-[#FF6B00]' : 'text-[var(--text-primary)]'
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

                    {/* Botão de Toggle Visual */}
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 transition-transform duration-200 mt-1">
                      <span className="material-symbols-outlined text-[20px]">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                  </div>

                  {/* Conteúdo Expansível com Itens Técnicos */}
                  {isExpanded && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 border-t border-[var(--border-color)]/60 animate-in fade-in duration-200">
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

      {/* 8. Seção Institucional: Milkfed Devs && Reqs Lords & Professor William Devidé Komel */}
      <section id="institucional" className="px-4 sm:px-8 max-w-6xl mx-auto py-20 border-t border-[var(--border-color)]">
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

        {/* Card Grande de Apresentação da Empresa e do Criador */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[var(--accent-yellow)]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 relative z-10">
            {/* Bloco 1: Logotipo da Empresa com Destaque e Efeito Chamativo */}
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

            {/* Bloco 2: Filosofia Institucional e Pilares */}
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

              {/* Pilares da Milkfed */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[18px] text-[#FF6B00]">verified_user</span>
                  <span className="text-[var(--text-primary)] font-medium">Engenharia de Requisitos &amp; Domínio de Negócio</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[18px] text-[#00E676]">speed</span>
                  <span className="text-[var(--text-primary)] font-medium">Aplicações Offline-First &amp; Performance Extrema</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[18px] text-[#FFE600]">smart_toy</span>
                  <span className="text-[var(--text-primary)] font-medium">Inteligência Artificial Generativa &amp; Agentes Autônomos</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[18px] text-[#29B6F6]">hub</span>
                  <span className="text-[var(--text-primary)] font-medium">Sistemas Distribuídos &amp; Ecossistemas de Dados</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bloco 3: Perfil do Criador (Professor William Devidé Komel) */}
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

            {/* Links Profissionais do Criador */}
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="mailto:williamdevide@gmail.com"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--accent-yellow)] text-xs font-semibold transition-all cursor-pointer font-mono"
                title="Enviar e-mail para o Professor William Devidé"
              >
                <span className="material-symbols-outlined text-[16px] text-[var(--accent-yellow)]">mail</span>
                <span>williamdevide@gmail.com</span>
              </a>

              <a
                href="https://www.linkedin.com/in/williamdevide"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A66C2]/15 hover:bg-[#0A66C2] text-[#0A66C2] hover:text-white border border-[#0A66C2]/40 rounded text-xs font-semibold transition-all cursor-pointer shadow-sm"
                title="Conectar com o Professor William Devidé no LinkedIn"
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

      {/* 9. Quickstart / Terminal Local (Estilo DrawDB Self-Hosted) */}
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
              <span className="ml-2 font-mono text-xs text-zinc-400">Terminal Bash / PowerShell</span>
            </div>
            <button
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
            <span className="text-zinc-500"># 1. Clone o repositório do SQLEditor</span>{'\n'}
            <span className="text-[#00E676]">$</span> git clone https://github.com/williamdevide/antigravity.SQLEditor{'\n'}
            <span className="text-zinc-500"># 2. Acesse a pasta do frontend e instale as dependências</span>{'\n'}
            <span className="text-[#00E676]">$</span> cd antigravity.SQLEditor/frontend && npm install{'\n'}
            <span className="text-zinc-500"># 3. Inicie o servidor de desenvolvimento</span>{'\n'}
            <span className="text-[#00E676]">$</span> npm run dev{'\n'}
            <span className="text-zinc-500"># → Disponível instantaneamente em http://localhost:5173</span>
          </pre>
        </div>
      </section>

      {/* 10. Banner de Conversão Final (CTA) */}
      <section className="px-4 sm:px-8 max-w-5xl mx-auto py-20 text-center">
        <div className="bg-gradient-to-b from-[#FF6B00]/15 to-[var(--bg-surface)] border border-[#FF6B00]/30 rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden">
          <h2 className="text-3xl sm:text-5xl font-black text-[var(--text-primary)] tracking-tight mb-4">
            Pronto para dominar SQL &amp; Modelagem?
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Abra o editor agora mesmo e comece a consultar, modelar e exportar sem burocracia ou instalações pesadas.
          </p>
          <button
            onClick={onOpenEditor}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FFA726] text-white text-base font-extrabold shadow-[0_0_30px_rgba(255,107,0,0.5)] hover:shadow-[0_0_40px_rgba(255,107,0,0.8)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            type="button"
          >
            Teste você mesmo (Abrir SQLEditor) →
          </button>
        </div>
      </section>

      {/* 11. Footer */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-surface)] py-10 px-4 sm:px-8 text-xs text-[var(--text-muted)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FF6B00] text-[20px]">bolt</span>
            <span className="font-bold text-sm text-[var(--text-primary)]">SQLEditor</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]">v{APP_VERSION}</span>
            <span>• Milkfed Devs &amp;&amp; Reqs Lords</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={onOpenEditor} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
              Editor
            </button>
            <button onClick={() => onOpenView('er-diagram')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
              Diagrama ER
            </button>
            <button onClick={() => onOpenView('er-model')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
              Modelo ER
            </button>
            <a href="#institucional" className="hover:text-[var(--text-primary)] transition-colors">
              Milkfed &amp; Criador
            </a>
            <button onClick={() => onOpenView('about')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
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
