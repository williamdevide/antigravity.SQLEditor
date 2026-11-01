# ⚡ SQLEditor - Central da Disciplina de Banco de Dados

<div align="center">

![Google Antigravity](https://img.shields.io/badge/Desenvolvido%20com-Google%20Antigravity-4285F4?style=for-the-badge&logo=google&logoColor=white)
![React 19](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Storage](https://img.shields.io/badge/Storage-IndexedDB%20%2B%20Dexie%20%2B%20AlaSQL-FF6B00?style=for-the-badge&logo=mysql&logoColor=white)
![Version](https://img.shields.io/badge/Version-v3.2.4-00E676?style=for-the-badge)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)

**Ambiente Web Educacional Integrado para a Disciplina de Banco de Dados: Modelagem Conceitual, Normalização 1FN–3FN, Estúdio DER Reativo e Laboratório SQL 100% Offline no Navegador**  
*Integrated Educational Web Platform for Database Systems: Conceptual Modeling, 1NF–3NF Normalization, Reactive ER Studio, and SQL Lab with 100% In-Browser Offline Persistence*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwilliamdevide%2Fantigravity.SQLEditor&root-directory=frontend)

[Português](#-português) • [English](#-english)

</div>

---

## 🤖 Agentes de IA & Skill Packs (Google Antigravity)

Este ecossistema foi projetado, arquitetado e refinado com o auxílio dos agentes e pacotes de competências especializados do **Google Antigravity**:

| Agente / Especialista | Papel Principal no Projeto |
| :--- | :--- |
| **`@orchestrator` / `@agente-orquestrador`** | Orquestração central da jornada de 5 etapas da disciplina, roteamento determinístico e integridade de contexto. |
| **`@frontend-specialist`** | Engenharia dos componentes React 19, Monaco Editor, animações a 60 FPS e conformidade estrita da identidade visual (*Zero Purple Ban*). |
| **`@database-architect`** | Modelagem relacional, parser tolerante de SQL ao vivo, linter pedagógico de esquemas e validação de normalização 1FN–3FN. |

### 📚 Skill Packs Utilizados
* **`@agente-orquestrador`**: Governança da arquitetura em 3 camadas e histórico auditável de prompts.
* **`@clean-code`**: Código idiomático, sem over-engineering, testes automatizados e tipagem TypeScript estrita.
* **`@frontend-architecture`**: Separação modular de responsabilidades (UI, Geometria, Parsers, Dexie e AlaSQL).
* **`@frontend-design`**: Sistema de design autoral com variáveis CSS dinâmicas para 4 Temas de Interface e 4 Temas de Sintaxe.
* **`@database-design`**: Arquitetura relacional, integridade referencial e normalização formal 1FN, 2FN e 3FN.
* **`@lint-and-validate` & `@verify-changes`**: Execução de suites determinísticas de compilação, lint e testes de layout SVG.

---

## 🇧🇷 Português

### 📖 Visão Geral da Central (v3.2.4)
O **SQLEditor** evoluiu de um editor SQL para uma **Central Completa da Disciplina de Banco de Dados**, cobrindo todas as etapas práticas da formação técnica e acadêmica do SENAI:

```
[Etapa 1: Modelo Conceitual] ➔ [Etapa 2: Normalização 1FN-3FN] ➔ [Etapa 3: Estúdio DER] ➔ [Etapa 4: Laboratório SQL] ➔ [Etapa 5: Prática & Desafios]
```

### ✨ Módulos Principais

1. **📐 Estúdio DER Dedicado (Motor SVG de 7 Camadas):**
   * Rotas ortogonais 90° arredondadas com algoritmo de escape geométrico e opção Bézier fluida.
   * Hit-area invisível de 22px, trilha de contraste, Spotlight com atenuação a 22% para foco em aula.
   * Fluxo laser animado no sentido `FK ➔ PK`, alça em "C" para Self-Join e garfo *fork-trunk-fork* para chaves compostas.
   * Notações de cardinalidade selecionáveis: Pé-de-Galinha (*Crow's Foot*), 1:N clássico ou Pinos Vetoriais.
   * Cartões ricos: colapso inteligente mantendo chaves ancoradas, trava de posição (🔒), amostra ao vivo de registros (👁️ *Live Data Peek*), seção de triggers (⚡), áreas temáticas com arraste solidário e notas adesivas post-it.

2. **⚡ Laboratório SQL com Split-View Reativo (SQL ↔ DER):**
   * Editor Monaco de alto desempenho com autocompletar contextual estrito ao banco ativo.
   * Parser tolerante em tempo real via `useDeferredValue` para `CREATE TABLE`, `ALTER TABLE`, `INSERT INTO` e `CREATE TRIGGER`.
   * Engenharia reversa e direta cirúrgica: alterações visuais no DER aplicam patches pontuais no Monaco via `executeEdits` preservando o histórico de Desfazer (`Ctrl+Z`).
   * Execução multi-comando em lote com exibição fiel do último comando e marcadores interativos (`✓`/`✖`) no gutter.

3. **📋 Modelo Lógico & Dicionário de Dados (1FN–3FN):**
   * Descrições semânticas editáveis por tabela e por coluna, salvas localmente no IndexedDB.
   * Checklist interativo dos critérios de 1FN, 2FN e 3FN com explicação teórica imediata.
   * Linter pedagógico em português com detecção de chaves ausentes, orfãs, tipos incompatíveis e dependências circulares.
   * Compartilhamento zero-backend via link compactado `#z.<base64url>` e 5 exportadores: PNG HD, SVG, PDF A4, Mermaid `erDiagram` e Markdown `.md`.

4. **🎓 Galeria de Bancos de Aula & Desafios Autocorrigíveis:**
   * Miniaturas vetoriais dinâmicas dos bancos de dados (`<ERThumbnailSvg />`).
   * Bancos oficiais das aulas (Pizzaria/Streaming, Escola de Idiomas, RH, E-Commerce).
   * Templates curados e laboratórios de correção de violação de 1FN, 2FN e 3FN.
   * 7 desafios graduados em 5 fases com validador local determinístico e banner ativo acoplável.

5. **⚙️ Central de Configurações em 4 Pilares & Super-Backup (.sqleditor.json):**
   * **Pilar 1:** Interface, Tipografia (`12–22px`), Zoom DER (`60–150%`), Pills Rápidas e Modo Leve (Lab Mode 60 FPS).
   * **Pilar 2:** Automações do editor, auto-capitalização, auto-ponto-e-vírgula e ciclo `Limit 30/100/Total`.
   * **Pilar 3:** Estúdio DER, ortogonal vs Bézier, cardinalidades, snap to grid 24px e FKs implícitas.
   * **Pilar 4:** Rigor do linter, controle do esquema interno `dbo` e **Super-Backup Portátil (.sqleditor.json)** para migrar todo o ambiente entre o laboratório da escola e o computador pessoal de casa.

---

### 📁 Pastas de Scripts para Professores

Para adicionar novos bancos de dados ou soluções sem tocar no código:
* 🗄️ **Bancos de Dados de Aula:** `frontend/src/data/bds/`  
  *(Qualquer arquivo `.sql` adicionado aqui é imediatamente carregado na Galeria e no Schema Explorer).*
* 💡 **Scripts de Soluções:** `frontend/src/data/solutions/`  
  *(Qualquer arquivo `.sql` adicionado aqui aparece no menu suspenso do botão "+ Nova Aba").*

---

### 🚀 Como Executar Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/williamdevide/antigravity.SQLEditor.git
cd antigravity.SQLEditor/frontend

# 2. Instale as dependências
npm install

# 3. Inicie o servidor Vite
npm run dev
```

Abra `http://localhost:5173` no navegador. No Windows, você também pode dar duplo clique no executável `executar.bat` na raiz.

---

## 🇺🇸 English

### 📖 Platform Overview (v3.2.4)
**SQLEditor** is a comprehensive educational Single Page Application (SPA) designed for computer science students and instructors to practice every phase of relational database systems directly in the browser:

1. **📐 Dedicated ER Studio (7-Layer SVG Engine):**
   * 90° rounded orthogonal routing with obstacle avoidance and optional fluid Bézier curves.
   * 22px hit-areas, contrast outlines, 22% Spotlight focus dimming for classroom demonstrations.
   * Animated laser flow (`FK ➔ PK`), recursive "C" loops for Self-Joins, and fork-trunk-fork composite FK trunks.
   * Rich table cards with smart collapse, position locks (🔒), Live Data Peek, triggers section (⚡), subject areas, and sticky notes.

2. **⚡ Reactive SQL Lab & Split-View (SQL ↔ ER):**
   * High-performance Monaco Editor with schema-aware autocomplete strictly scoped to active databases.
   * Real-time tolerant parser for `CREATE TABLE`, `ALTER TABLE`, `INSERT INTO`, and `CREATE TRIGGER`.
   * Surgical visual forward-engineering: visual additions in ER patch Monaco via `executeEdits` while preserving Undo (`Ctrl+Z`).

3. **📋 Relational Data Dictionary & 1NF–3NF Normalization:**
   * Editable descriptions for tables and columns persisted in IndexedDB.
   * Interactive 1NF/2NF/3NF criteria checklist with academic definitions.
   * Pedagogical schema linter detecting missing PKs, orphan FKs, type mismatches, and circular dependencies.
   * Zero-backend sharing via `#z.<deflate-base64url>` URLs and 5 exporters (PNG HD, SVG, PDF A4, Mermaid, and Markdown).

4. **🎓 Classroom Gallery & Auto-Graded Challenges:**
   * Dynamic pure-vector schema silhouettes (`<ERThumbnailSvg />`).
   * Pre-packaged classroom datasets and normalization violation labs.
   * 7 graduated practice exercises with instant deterministic local validation.

5. **⚙️ 4-Pillar Settings & Portable Super-Backup (.sqleditor.json):**
   * Complete portable state backup packaging databases, open tabs, ER diagrams, notes, dictionaries, and exercise progress into a single `.sqleditor.json` file.

---

### 📄 Licença / License
Distribuído sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.

*Desenvolvido com o ecossistema Google Antigravity — Edição Especial SENAI.*
