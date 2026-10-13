# 🎨 Especificação UI/UX e Design System: SQLEditor

Este documento detalha o Guia de Estilo, Arquitetura Visual, Paleta de Cores, Tipografia, Estrutura Semântica HTML5 e Estilização CSS3 Avançada para o projeto **SQLEditor**.

---

## 1. Paleta de Cores (Formato Hexadecimal)

A paleta foi desenvolvida com foco em um **Dark Mode técnico e imersivo**, combinando superfícies em escala de cinzas profundos, detalhes vibrantes em laranja/amarelo neon para destaque de ações e acentos verdes para confirmações e estados de sucesso.

### 1.1 Cores de Superfície e Background (Dark Mode)
- **Background Principal (`--bg-primary`):** `#0F1117` (Cinza ultra-escuro frio)
- **Background Secundário (`--bg-secondary`):** `#161922` (Superfície dos painéis e sidebar)
- **Superfície Eleva / Cards (`--bg-surface`):** `#1E222D` (Header, abas e modais)
- **Superfície Hover / Alt (`--bg-hover`):** `#2A2F3D` (Estado hover de itens e listas)
- **Bordas / Divisores (`--border-color`):** `#2E3445` (Divisórias e limites de painéis)

### 1.2 Cores de Ação e Acentos Neon (Brand & Highlights)
- **Primária / Laranja Neon (`--accent-orange`):** `#FF6B00` (Botões de execução e ações primárias)
- **Hover Laranja (`--accent-orange-hover`):** `#FF8533` (Estado hover de ação primária)
- **Glow Laranja Neon (`--glow-orange`):** `rgba(255, 107, 0, 0.35)` (Efeito de brilho em foco e botões ativos)
- **Destaque / Amarelo Neon (`--accent-yellow`):** `#FFE600` (Badges de alerta, seleções e ícones em destaque)
- **Glow Amarelo Neon (`--glow-yellow`):** `rgba(255, 230, 0, 0.3)` (Acentuação de elementos selecionados)

### 1.3 Cores de Feedback e Status
- **Sucesso / Verde Neon (`--status-success`):** `#00E676` (Execução de query com sucesso, contagem de linhas e conexões ativas)
- **Glow Verde Neon (`--glow-success`):** `rgba(0, 230, 118, 0.25)` (Brilho neon em badges de sucesso)
- **Erro / Vermelho Neon (`--status-error`):** `#FF3366` (Falhas de sintaxe e erros do MySQL)
- **Alerta / Laranja Suave (`--status-warning`):** `#FF9900` (Avisos de alteração e modificações pendentes)

### 1.4 Tipografia e Textos
- **Texto Primário (`--text-primary`):** `#F0F4F8` (Alto contraste para leitura de código e dados)
- **Texto Secundário (`--text-secondary`):** `#94A3B8` (Rótulos, metadados e informações secundárias)
- **Texto Muted (`--text-muted`):** `#64748B` (Placeholders, atalhos de teclado e comentários)

---

## 2. Tipografia e Hierarquia Visual

- **Fonte do Sistema / UI:** `'Inter'`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `Roboto`, `sans-serif`.
- **Fonte do Editor de Código & Console:** `'JetBrains Mono'`, `'Fira Code'`, `'Monaco'`, `'Consolas'`, `monospace` (com suporte a ligaturas de código).

### Escala Tipográfica
- **Título da Aplicação (H1 / Logo):** `1.125rem` (`18px`) | Weight: `700` | Tracking: `-0.02em`
- **Títulos de Seção / Painel (H2):** `0.875rem` (`14px`) | Weight: `600` | Transform: `uppercase` | Letter-spacing: `0.05em`
- **Abas e Botões Principais:** `0.875rem` (`14px`) | Weight: `500`
- **Corpo de Texto / Árvore de Schemas:** `0.8125rem` (`13px`) | Weight: `400`
- **Editor de Código e Tabela de Dados:** `0.8125rem` (`13px`) | Weight: `400` | Line-Height: `1.6`
- **Badges, Status e Atalhos:** `0.75rem` (`12px`) | Weight: `600`

---

## 3. Estrutura HTML5 Semântica

A estrutura HTML5 foi projetada com seletores de classe e ID essenciais para permitir o controle dinâmico dos painéis e zooms independentes.

```html
<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SQLEditor - Ambiente Interativo MySQL</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body id="app-root" class="app-container">

  <!-- CABEÇALHO PRINCIPAL DA APLICAÇÃO -->
  <header id="main-header" class="header-bar">
    <div class="header-brand">
      <span class="brand-icon">⚡</span>
      <h1 class="brand-title">SQLEditor <span class="badge-version">v2.5.5</span></h1>
    </div>
    
    <div class="header-actions">
      <button id="btn-run-query" class="btn btn-primary btn-neon-glow" title="Executar Script (Ctrl+Enter)">
        <span class="btn-icon">▶</span> Executar
      </button>
      <button id="btn-new-tab" class="btn btn-secondary">
        <span class="btn-icon">+</span> Nova Aba
      </button>
      <button id="btn-clear-editor" class="btn btn-secondary">Limpar</button>
      <button id="btn-reset-db" class="btn btn-danger-outline">Resetar Banco</button>
      <div class="theme-toggle-wrapper">
        <button id="btn-theme-toggle" class="btn-icon-only" title="Alternar Tema">🌙</button>
      </div>
    </div>
  </header>

  <!-- WORKSPACE COM PAINÉIS DIVIDIDOS -->
  <main id="main-workspace" class="workspace-grid">
    
    <!-- PAINEL ESQUERDO: NAVEGADOR DE SCHEMA -->
    <aside id="pane-sidebar" class="pane-sidebar" data-zoom="100">
      <div class="pane-header">
        <h2 class="pane-title">Schema Explorer</h2>
        <div class="zoom-controls">
          <button class="btn-zoom" data-target="pane-sidebar" data-action="zoom-out" title="Reduzir Zoom">-</button>
          <span class="zoom-level">100%</span>
          <button class="btn-zoom" data-target="pane-sidebar" data-action="zoom-in" title="Aumentar Zoom">+</button>
        </div>
      </div>
      
      <div id="schema-tree" class="schema-tree-container">
        <!-- Árvore de Bancos e Tabelas populada via JS/IndexedDB -->
      </div>
    </aside>

    <!-- DIVISOR REDIMENSIONÁVEL HORIZONTAL -->
    <div id="resizer-sidebar" class="resizer resizer-horizontal"></div>

    <!-- PAINEL DIREITO: GERENCIADOR DE ABAS, EDITOR E CONSOLE -->
    <section id="pane-workspace" class="pane-workspace">
      
      <!-- GERENCIADOR DE ABAS E EDITOR (PARTE SUPERIOR / MEIO) -->
      <div id="pane-editor-wrapper" class="pane-editor-wrapper" data-zoom="100">
        <div class="editor-tabs-bar">
          <ul id="editor-tabs" class="tab-list">
            <li class="tab-item active" data-tab-id="tab-1">
              <span class="tab-title">script_1.sql</span>
              <button class="tab-close">×</button>
            </li>
          </ul>
          <div class="zoom-controls">
            <button class="btn-zoom" data-target="pane-editor-wrapper" data-action="zoom-out">-</button>
            <span class="zoom-level">100%</span>
            <button class="btn-zoom" data-target="pane-editor-wrapper" data-action="zoom-in">+</button>
          </div>
        </div>

        <div id="code-editor-container" class="code-editor-container">
          <!-- Monaco Editor ou CodeMirror renderizado aqui -->
        </div>
      </div>

      <!-- DIVISOR REDIMENSIONÁVEL VERTICAL -->
      <div id="resizer-editor" class="resizer resizer-vertical"></div>

      <!-- PAINEL INFERIOR: RESULTADOS E CONSOLE -->
      <div id="pane-console" class="pane-console" data-zoom="100">
        <div class="console-header-bar">
          <ul id="console-tabs" class="tab-list">
            <li class="tab-item active" data-target="view-grid">Grade de Dados</li>
            <li class="tab-item" data-target="view-log">Log de Execução</li>
          </ul>
          <div class="console-status">
            <span id="status-badge" class="status-badge badge-success">
              <span class="status-dot"></span> Pronto
            </span>
            <div class="zoom-controls">
              <button class="btn-zoom" data-target="pane-console" data-action="zoom-out">-</button>
              <span class="zoom-level">100%</span>
              <button class="btn-zoom" data-target="pane-console" data-action="zoom-in">+</button>
            </div>
          </div>
        </div>

        <div class="console-content">
          <!-- VIEW 1: DATA GRID -->
          <div id="view-grid" class="console-view active">
            <div id="data-grid-table-wrapper" class="table-wrapper">
              <table id="data-grid" class="data-table">
                <thead>
                  <!-- Cabeçalhos das colunas preenchidos via JS -->
                </thead>
                <tbody>
                  <!-- Linhas preenchidas via JS -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- VIEW 2: LOG DE ERRO / EXECUÇÃO -->
          <div id="view-log" class="console-view">
            <pre id="execution-log" class="log-output"></pre>
          </div>
        </div>
      </div>

    </section>

  </main>

  <!-- MENU DE CONTEXTO SUSPENSO (BOTÃO DIREITO) -->
  <div id="context-menu" class="context-menu hidden">
    <ul class="context-menu-list">
      <li class="context-menu-item" data-action="select">SELECT * FROM ...</li>
      <li class="context-menu-item" data-action="insert">INSERT INTO ...</li>
      <li class="context-menu-item" data-action="update">UPDATE ...</li>
      <li class="context-menu-item" data-action="delete">DELETE FROM ...</li>
      <li class="context-menu-divider"></li>
      <li class="context-menu-item" data-action="alter">ALTER TABLE ...</li>
      <li class="context-menu-item danger" data-action="drop">DROP TABLE ...</li>
    </ul>
  </div>

</body>
</html>


4. Estilo CSS3 Moderno
O código CSS utiliza variáveis nativas para temas, layout em Flexbox/Grid, animações fluidas nos botões e badges com brilho neon.

/* ==========================================================================
   1. VARIÁVEIS DE TEMA & CSS RESET
   ========================================================================== */
:root {
  /* Fontes */
  --font-ui: 'Inter', system-ui, -apple-system, sans-serif;
  --font-code: 'JetBrains Mono', 'Fira Code', monospace;

  /* Paleta Dark Mode */
  --bg-primary: #0F1117;
  --bg-secondary: #161922;
  --bg-surface: #1E222D;
  --bg-hover: #2A2F3D;
  --border-color: #2E3445;

  /* Acentos Neon */
  --accent-orange: #FF6B00;
  --accent-orange-hover: #FF8533;
  --glow-orange: rgba(255, 107, 0, 0.35);
  
  --accent-yellow: #FFE600;
  --glow-yellow: rgba(255, 230, 0, 0.3);

  /* Status */
  --status-success: #00E676;
  --glow-success: rgba(0, 230, 118, 0.25);
  --status-error: #FF3366;
  --status-warning: #FF9900;

  /* Textos */
  --text-primary: #F0F4F8;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;

  /* Transições */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body, html {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: var(--font-ui);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

/* ==========================================================================
   2. LAYOUT PRINCIPAL E RESPONSIVIDADE (GRID & FLEXBOX)
   ========================================================================== */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.header-bar {
  height: 52px;
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 10;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-title {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge-version {
  font-size: 0.7rem;
  font-weight: 600;
  background-color: var(--bg-hover);
  color: var(--accent-yellow);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 230, 0, 0.2);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.workspace-grid {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  position: relative;
}

/* Painéis */
.pane-sidebar {
  width: 280px;
  min-width: 200px;
  max-width: 500px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.pane-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  overflow: hidden;
}

.pane-editor-wrapper {
  flex: 6;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
}

.pane-console {
  flex: 4;
  min-height: 120px;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

/* Divisores Redimensionáveis */
.resizer {
  background-color: var(--border-color);
  transition: background-color var(--transition-fast);
  z-index: 5;
}

.resizer-horizontal {
  width: 4px;
  cursor: col-resize;
}

.resizer-vertical {
  height: 4px;
  cursor: row-resize;
}

.resizer:hover, .resizer:active {
  background-color: var(--accent-orange);
  box-shadow: 0 0 8px var(--glow-orange);
}

/* ==========================================================================
   3. COMPONENTES: BOTÕES E EFEITOS HOVER NEON
   ========================================================================== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition-normal);
}

.btn-primary {
  background-color: var(--accent-orange);
  color: #FFFFFF;
  border-color: var(--accent-orange);
}

.btn-primary:hover {
  background-color: var(--accent-orange-hover);
  transform: translateY(-1px);
  box-shadow: 0 0 12px var(--glow-orange);
}

.btn-neon-glow {
  box-shadow: 0 0 8px var(--glow-orange);
}

.btn-secondary {
  background-color: var(--bg-surface);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.btn-secondary:hover {
  background-color: var(--bg-hover);
  border-color: var(--text-muted);
}

.btn-danger-outline {
  background: transparent;
  color: var(--status-error);
  border-color: rgba(255, 51, 102, 0.3);
}

.btn-danger-outline:hover {
  background-color: rgba(255, 51, 102, 0.1);
  border-color: var(--status-error);
  box-shadow: 0 0 8px rgba(255, 51, 102, 0.3);
}

/* Controles de Zoom Individual */
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.btn-zoom {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-weight: bold;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 2px;
}

.btn-zoom:hover {
  color: var(--accent-yellow);
  background-color: var(--bg-hover);
}

.zoom-level {
  font-size: 0.7rem;
  color: var(--text-muted);
  min-width: 32px;
  text-align: center;
}

/* ==========================================================================
   4. BADGES COM BRILHO NEON E STATUS
   ========================================================================== */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.badge-success {
  background-color: rgba(0, 230, 118, 0.12);
  color: var(--status-success);
  border: 1px solid rgba(0, 230, 118, 0.3);
  box-shadow: 0 0 10px var(--glow-success);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--status-success);
  box-shadow: 0 0 6px var(--status-success);
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0% { opacity: 0.6; box-shadow: 0 0 4px var(--status-success); }
  50% { opacity: 1; box-shadow: 0 0 10px var(--status-success); }
  100% { opacity: 0.6; box-shadow: 0 0 4px var(--status-success); }
}

/* ==========================================================================
   5. GERENCIADOR DE ABAS E TABELA DE DADOS
   ========================================================================== */
.editor-tabs-bar, .console-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  padding-right: 12px;
}

.tab-list {
  display: flex;
  list-style: none;
}

.tab-item {
  padding: 10px 16px;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  border-right: 1px solid var(--border-color);
  font-size: 0.8125rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all var(--transition-fast);
}

.tab-item:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.tab-item.active {
  background-color: var(--bg-surface);
  color: var(--accent-yellow);
  border-top: 2px solid var(--accent-yellow);
  font-weight: 600;
}

.tab-close {
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1rem;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-close:hover {
  color: var(--status-error);
  background-color: rgba(255, 51, 102, 0.15);
}

/* Grade de Dados */
.table-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-code);
  font-size: 0.8125rem;
  text-align: left;
}

.data-table th {
  background-color: var(--bg-surface);
  color: var(--accent-yellow);
  padding: 8px 12px;
  border-bottom: 2px solid var(--border-color);
  position: sticky;
  top: 0;
  font-weight: 600;
}

.data-table td {
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.data-table tr:hover {
  background-color: var(--bg-hover);
}

/* ==========================================================================
   6. MENU DE CONTEXTO SUSPENSO (BOTÃO DIREITO)
   ========================================================================== */
.context-menu {
  position: absolute;
  z-index: 1000;
  width: 200px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  padding: 6px 0;
}

.context-menu.hidden {
  display: none;
}

.context-menu-list {
  list-style: none;
}

.context-menu-item {
  padding: 8px 14px;
  font-size: 0.8125rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.context-menu-item:hover {
  background-color: var(--accent-orange);
  color: #FFFFFF;
}

.context-menu-item.danger:hover {
  background-color: var(--status-error);
}

.context-menu-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 4px 0;
}

/* ==========================================================================
   7. LAYOUT RESPONSIVO (MOBILE-FIRST BREAKPOINTS)
   ========================================================================== */
@media (max-width: 768px) {
  .workspace-grid {
    flex-direction: column;
  }

  .pane-sidebar {
    width: 100% !important;
    height: 180px;
    min-width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .resizer-horizontal {
    display: none;
  }

  .header-title {
    font-size: 1rem;
  }

  .btn {
    padding: 6px 10px;
    font-size: 0.75rem;
  }
}


