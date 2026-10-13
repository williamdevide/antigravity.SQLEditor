# ⚡ SQLEditor - Interactive MySQL Playground & Schema Explorer

<div align="center">

![Google Antigravity](https://img.shields.io/badge/Developed%20with-Google%20Antigravity-4285F4?style=for-the-badge&logo=google&logoColor=white)
![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB%20%2B%20AlaSQL-FF6B00?style=for-the-badge&logo=mysql&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)

**Ambiente Web Interativo e Educacional para Prática de Banco de Dados MySQL com Persistência 100% Offline no Navegador**  
*Interactive Web Educational Environment for MySQL Database Practice with 100% In-Browser Offline Persistence*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwilliamdevide%2Fantigravity.SQLEditor&root-directory=frontend)

[Português](#-português) • [English](#-english)

</div>

---

## 🇧🇷 Português

### 📖 Visão Geral
O **SQLEditor** é uma plataforma educacional Single Page Application (SPA) projetada para estudantes e instrutores praticarem comandos DDL e DML com sintaxe MySQL inteiramente no navegador.

Inspirado em interfaces modernas como DBeaver, TablePlus e prototipado no **Google Stitch**, o sistema inclui:
- **Navegador de Schema (Schema Explorer):** Inicia limpo por padrão. Clique com o botão direito sobre o título **SCHEMA EXPLORER** para alternar entre:
  - 🗑️ **Carregar vazio:** ambiente sem nenhum banco de dados.
  - 📦 **Carregar BDs de exemplo:** carrega os bancos clássicos `ecommerce_db` e `universidade_db`.
  - 🎓 **Carregar BDs Aula:** carrega automaticamente todos os bancos enviados pelo professor.
- **Editor Multi-Abas com Soluções Integradas:**
  - Botão **+ Nova Aba** com menu suspenso: *Criar aba em branco* ou *Carregar Soluções* (com submenu dinâmico listando os arquivos de aula).
  - Rolagem automática da barra de guias para manter a última aba e o botão `+` sempre visíveis.
  - Botão **Fechar Todas** (ao lado de Limpar) com diálogo de confirmação.
- **Botão Resetar Banco:** Restaura com precisão o estado original do modo atualmente selecionado no Schema Explorer (Vazio, Exemplos ou Aula).
- **Console e Grade de Dados (Data Grid):** Exibição interativa e paginada dos resultados com contagem de registros e logs detalhados de execução (tempo decorrido, linhas afetadas e erros precisos).
- **Persistência Total no Navegador (IndexedDB):** Todos os bancos criados, tabelas e registros ficam salvos localmente no computador do aluno via IndexedDB (AlaSQL e Dexie), sobrevivendo ao fechar e reabrir o navegador.
- **Controles de Zoom Independentes:** Botoeiras de zoom dedicadas para ajustar individualmente o tamanho de fonte da Sidebar, do Editor e do Console.
- **Visualizador ER e Histórico:** Diagrama visual dinâmico de relacionamento entre tabelas com identificação inteligente de PK/FK, cardinalidades `1 : N`, conectores Bézier ajustados ao zoom e exportação em PNG de alta resolução.
- **Autocompletar Inteligente e Contextual:** Sugestões estritas ao banco de dados ativo e sensíveis ao início digitado.
- **Exportação e Scripts Completos:** Acesso rápido por clique direito na sidebar para inspecionar scripts DDL/DML e exportar arquivos `.sql` de bancos e tabelas.
- **Temas Claro e Escuro:** Suporte a temas com paleta de contraste refinada.

### 📁 Pastas Definitivas para Novos Arquivos (Professor)
Para adicionar novos bancos de dados ou soluções sem necessidade de comandos ou prompts adicionais, salve os arquivos `.sql` diretamente nestas pastas:
* 🗄️ **Bancos de Dados de Aula:** `frontend/src/data/bds/`  
  *(Qualquer arquivo `.sql` colocado aqui é automaticamente reconhecido e carregado ao selecionar "Carregar BDs Aula")*
* 💡 **Scripts de Soluções:** `frontend/src/data/solutions/`  
  *(Qualquer arquivo `.sql` colocado aqui aparece imediatamente no submenu "Carregar Soluções" do botão "+ Nova Aba")*

### 📁 Estrutura de Pastas do Projeto
```
├── /frontend
│   ├── /src
│   │   ├── /data
│   │   │   ├── /bds          # 👈 Pasta Oficial: Scripts SQL dos bancos de aula
│   │   │   └── /solutions    # 👈 Pasta Oficial: Scripts SQL das soluções de aula
│   │   ├── /components       # Componentes React (Editor, Sidebar, Dropdowns, etc.)
│   │   ├── /services         # Motor AlaSQL, Dexie, Reviewer e ScriptsLoader
├── /backend                  # Serviço Node.js/Express auxiliar
├── /documentation            # Diretivas, SOPs e promptHistory.md
├── executar.bat              # Script de inicialização automática de 1 clique no Windows
└── README.md                 # Documentação mestre do repositório
```

### 🚀 Como Executar Localmente
1. Dê um duplo clique no arquivo `executar.bat` ou:
```bash
cd frontend
npm install
npm run dev
```
2. Acesse `http://localhost:5173` no seu navegador.

### 🌐 Publicação no Vercel
Você pode publicar o projeto na nuvem da Vercel de duas formas:

#### Opção A: 1-Clique com GitHub (Recomendado)
1. Clique no botão [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwilliamdevide%2Fantigravity.SQLEditor&root-directory=frontend)
2. Conecte sua conta do GitHub e clique em **Deploy**. O arquivo `vercel.json` configurado na raiz cuidará do build automático de produção.

#### Opção B: Via Terminal (Vercel CLI)
```bash
cd frontend
npx vercel login
npx vercel --prod
```

---

## 🇺🇸 English

### 📖 Overview
**SQLEditor** is a client-side educational Single Page Application (SPA) crafted for students and developers to practice MySQL DDL/DML queries with high fidelity right in their browser.

Inspired by industry-standard tools like DBeaver, TablePlus and styled directly with modern web standards, featuring:
- **Schema Explorer:** Dynamic tree view of databases, tables, views and columns with rich right-click context actions (`SELECT *`, `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, full script view and `.sql` file export).
- **Tabbed SQL Workspace:** Powered by **Monaco Editor** with MySQL syntax highlighting, auto-complete restricted to the active database, Find & Replace and keyboard shortcuts (`Ctrl+Enter` to run).
- **Interactive Data Grid & Execution Log:** High-density result table, copy error buttons, column sorting, elapsed time and precise diagnostic reporting.
- **100% In-Browser Offline Persistence:** Local databases are stored using IndexedDB (`alasql` + `dexie`), keeping all data intact even after closing the browser.
- **Independent Zoom Controls:** Per-pane zoom sliders for sidebar, code editor, and console panels.
- **Interactive ER Diagram & Query History:** Entity-relationship viewer with cardinalities `1 : N`, Bézier connectors and HD PNG export.

### 👨‍🏫 Author & Credits
* **Creator & Lead Instructor:** Professor William Devidé Komel
* **Contact / Email:** `williamdevide@gmail.com`
* **Institution:** SENAI Ourinhos

### 🤖 Powered by Google Antigravity
Built with Google's next-generation agentic development framework:
- **Specialized AI Agents:** `@orchestrator`, `@frontend-specialist`, `@project-planner`.
- **Active Skills:** `@clean-code`, `@frontend-design`, `@app-builder`, `@stitch`.

---
*Assinado: Agente Antigravity - SENAI Ourinhos Edition*
