# ⚡ SQLEditor - Central Integrada da Disciplina de Banco de Dados

<div align="center">

![Google Antigravity](https://img.shields.io/badge/Desenvolvido%20com-Google%20Antigravity-4285F4?style=for-the-badge&logo=google&logoColor=white)
![React 19](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Storage](https://img.shields.io/badge/Storage-IndexedDB%20%2B%20Dexie%20%2B%20AlaSQL-FF6B00?style=for-the-badge&logo=mysql&logoColor=white)
![Version](https://img.shields.io/badge/Version-v3.2.7-00E676?style=for-the-badge)
![SENAI](https://img.shields.io/badge/Parceria-SENAI%20Ourinhos-D32F2F?style=for-the-badge)
![Milkfed](https://img.shields.io/badge/Empresa-Milkfed%20Devs%20%26%26%20Reqs%20Lords-6A1B9A?style=for-the-badge)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)

**Ambiente Web Educacional Integrado para a Disciplina de Banco de Dados: Modelagem Conceitual, Normalização 1FN–3FN, Estúdio DER Reativo, Laboratório SQL e Vídeos Tutoriais Legendados — 100% Offline no Navegador**  
*Integrated Educational Web Platform for Database Systems: Conceptual Modeling, 1NF–3NF Normalization, Reactive ER Studio, SQL Lab, and In-Browser Subtitled Training Videos — 100% Offline Persistence*

---

### 🌐 Links Oficiais do Projeto

[![Demonstração ao Vivo na Vercel](https://img.shields.io/badge/🌐_Demo_Online-antigravity--sql--editor.vercel.app-00E676?style=for-the-badge)](https://antigravity-sql-editor.vercel.app)
[![Repositório GitHub](https://img.shields.io/badge/💻_Repositório_GitHub-williamdevide%2Fantigravity.SQLEditor-181717?style=for-the-badge&logo=github)](https://github.com/williamdevide/antigravity.SQLEditor)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwilliamdevide%2Fantigravity.SQLEditor&root-directory=frontend)

[🇧🇷 Português](#-português) • [🇺🇸 English](#-english)

</div>

---

## 💡 Inovações & Inspirações Arquiteturais (LiveSchema & DrawDB)

O **SQLEditor v3.2** foi projetado para superar a fragmentação de ferramentas no aprendizado de banco de dados, unificando os conceitos mais modernos do mercado em uma experiência pedagógica contínua:

* ⚡ **Inspirado no LiveSchema (Split-View Reativo Bidirecional):**
  * Sincronização em tempo real entre o código DDL escrito no editor e o diagrama visual.
  * O aluno digita `CREATE TABLE` ou `ALTER TABLE` e o diagrama se constrói automaticamente.
  * Mutações visuais aplicam patches cirúrgicos no Monaco Editor via `executeEdits`, preservando o histórico de Desfazer (`Ctrl+Z`).
* 📐 **Inspirado no DrawDB (Estúdio DER Vetorial Interativo):**
  * Canvas infinito fluido com motor SVG multicamadas e rotas ortogonais 90° com algoritmo anti-colisão.
  * Pinos vetoriais de Foreign Key para arrastar e conectar entidades instantaneamente com laser animado (`FK ➔ PK`).
  * Cartões ricos com *Live Data Peek* (espiar registros reais na tabela com 1 clique), agrupamento em Áreas Temáticas e notas adesivas post-it para documentação de Regras de Negócio (RN).

---

## 🤖 Agentes de IA & Skill Packs (Google Antigravity)

Este projeto foi concebido, arquitetado e evoluído utilizando os agentes autônomos e pacotes de competências especializados do **Google Antigravity**:

| Agente / Especialista | Papel Principal no Projeto |
| :--- | :--- |
| **`@orchestrator` / `@agente-orquestrador`** | Governança da arquitetura em 3 camadas, roteamento determinístico, gestão de planos e manutenção do histórico auditável de prompts. |
| **`@frontend-specialist`** | Engenharia dos componentes React 19, integração Monaco Editor, física de layouts SVG a 60 FPS e identidade visual (*Zero Purple Ban*). |
| **`@database-architect`** | Modelagem relacional, parser tolerante de SQL, linter pedagógico de esquemas e validação de normalização 1FN–3FN. |

### 📚 Skill Packs Utilizados
* **`@agente-orquestrador`**: Governança da arquitetura em 3 camadas e rastreabilidade total no `promptHistory.md`.
* **`@clean-code`**: Código idiomático, tipagem estrita TypeScript, ausência de código redundante e alta coesão.
* **`@frontend-architecture`**: Separação modular de responsabilidades (UI, Geometria, Parsers, Dexie e AlaSQL).
* **`@frontend-design`**: Sistema de design autoral com variáveis CSS para 4 Temas de Interface e 4 Esquemas de Cores de Sintaxe.
* **`@database-design`**: Arquitetura relacional, integridade referencial e auditoria de 1FN, 2FN e 3FN.
* **`@lint-and-validate` & `@verify-changes`**: Validações determinísticas com `oxlint`, suites de compilação `tsc` e testes de integridade do SVG.

---

## 🇧🇷 Português

### 📖 Visão Geral da Central (v3.2.4)
O **SQLEditor** é uma plataforma SPA educacional criada pela **Milkfed Devs && Reqs Lords** em cooperação com os instrutores e alunos do **SENAI Ourinhos**. A ferramenta cobre a jornada completa da disciplina de Banco de Dados:

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│  1. REQUISITOS & RN    │ ───► │  2. MODELAGEM CONCEIT. │ ───► │  3. NORMALIZAÇÃO 1-3FN │
│ (Áreas Temáticas/Notas)│      │  (Estúdio DER Vetorial)│      │  (Dicionário de Dados) │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
                                                                             │
┌────────────────────────┐      ┌────────────────────────┐                   ▼
│ 5. PRÁTICA & DESAFIOS  │ ◄─── │ 4. LABORATÓRIO SQL     │ ◄─────────────────┘
│ (Bancos Reais/Vídeos)  │      │ (Split-View Reativo)   │
└────────────────────────┘      └────────────────────────┘
```

---

### ✨ Módulos e Recursos Detalhados

#### 1. 📐 Estúdio DER Dedicado (Motor SVG de 7 Camadas)
* **Rotas Ortogonais 90° e Bézier:** Conexões inteligentes com algoritmo de escape geométrico e opção de curvas suaves.
* **Alternador Inteligente de Layout:** Botão dinâmico **"Organizar Automático"** vs. **"Restaurar Posições Salvas"** (permite experimentar arranjos automáticos e reverter para as posições manuais com 1 clique).
* **Edição Cirúrgica de Colunas:** Clicar diretamente no campo/coluna de uma tabela abre imediatamente o formulário de edição no painel lateral para renomear, alterar tipo, chave primária ou excluir o campo.
* **Clarificação Operacional de Esquemas:**
  * **Banco Ativo:** Diagrama alimentado pelo banco de dados físico instanciado no motor AlaSQL.
  * **Script ao Vivo:** Diagrama alimentado em tempo real pelo código DDL efêmero digitado no Monaco Editor.
* **Visualização de Registros (*Live Data Peek* 👁️):** Inspecione as tuplas reais de qualquer entidade diretamente sobre o cartão no canvas.
* **Spotlight de Aula (22%):** Atenua o restante do diagrama ao clicar em uma relação para direcionar a atenção dos alunos.

#### 2. ⚡ Laboratório SQL com Split-View Reativo (SQL ↔ DER)
* **Editor Monaco Integrado:** Autocompletion com inteligência de esquema estrito ao banco ativo.
* **Execução Flexível:** Execução em lote (`Ctrl+Enter`), execução cirúrgica da linha do cursor (`Alt+E`) e revisão com heurística in-place (`Alt+R`).
* **Parser Tolerante em Tempo Real:** Constrói tabelas, chaves estrangeiras compostas e triggers em tempo de digitação via `useDeferredValue`.

#### 3. 📋 Modelo Lógico & Dicionário de Dados (1FN, 2FN e 3FN)
* **Auditoria de Normalização:** Checklist acadêmico para validação de Dependências Parciais e Transitivas.
* **Documentação Semântica:** Metadados e regras de negócio editáveis por tabela e por coluna, salvos localmente.
* **Linter Pedagógico:** Avisos em português para chaves primárias ausentes, colunas orfãs e tipos incompatíveis em relacionamentos.
* **5 Formatos de Exportação:** PNG em Alta Definição, SVG vetorial puro, PDF A4 pronto para impressão, Mermaid `erDiagram` e Markdown `.md`.

#### 4. 📺 Central de Tutoriais em Vídeo Interativo (Legendados em PT-BR)
* **Player Vetorial Nativo (60 FPS):** Simulação gráfica leve em tempo real via Canvas/SVG sem peso de downloads de vídeos MP4 em redes escolares.
* **Legendas em Português (CC):** Legendas sincronizadas segundo a segundo com destaque de termos técnicos e atalhos.
* **5 Módulos de Aprendizagem:** Tutoriais cobrindo Laboratório SQL, Estúdio DER, Split-View Reativo, Normalização 1FN–3FN e Galeria de Desafios.
* **Controles Avançados:** Scrubber de linha do tempo, seletores de velocidade (`1x`, `1.25x`, `1.5x`, `2x`), modo teatro e atalho direto para testar a ferramenta correspondente.

#### 5. 🎓 Galeria de Bancos de Aula & Desafios Práticos
* **Otimização Extrema de Carregamento (O(1)):** Scripts grandes (ex: 1.064 comandos da Escola de Idiomas) carregam em ~1 segundo graças à execução em lote único e persistência atômica no IndexedDB.
* **Barra de Progresso Dinâmica:** Indicador visual flutuante com porcentagem e status de carregamento em tempo real.
* **Bancos Oficiais Pré-Carregados:** E-Commerce, Escola de Idiomas, Recursos Humanos, Streaming e Pizzaria.
* **7 Desafios Graduados:** Exercícios práticos de DQL e DML com correção automatizada instantânea.

#### 6. ⚙️ Central de Configurações, Feedback & Super-Backup
* **Super-Backup Portátil (`.sqleditor.json`):** Salva todo o estado (bancos de dados, diagramas, abas, dicionário e histórico) em um único arquivo leve para transferir entre o laboratório do SENAI e o computador de casa.
* **Canal Direto de Feedback:** Envio de reportes com anexação automática de diagnóstico para `williamdevide.ourinhos@gmail.com` via cliente nativo de e-mail ou **Gmail Web direto**.
* **4 Temas de Interface & 4 Esquemas de Sintaxe:** Dark, Light, Bege e Grafite, totalmente acessíveis.

---

### 📁 Pastas de Scripts para Professores e Alunos

Para adicionar novos bancos de dados ou scripts de solução sem alterar o código-fonte:
* 🗄️ **Bancos de Dados de Aula:** `frontend/src/data/bds/`  
  *(Arquivos `.sql` aqui são automaticamente detectados pela Galeria e pelo Explorador de Esquemas).*
* 💡 **Scripts de Soluções:** `frontend/src/data/solutions/`  
  *(Arquivos `.sql` aqui são listados no menu suspenso do botão "+ Nova Aba" para estudo imediato).*

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

Abra `http://localhost:5173` no navegador.  
No Windows, você também pode dar duplo clique no arquivo [`executar.bat`](file:///f:/antigravity/projetos/antigravity.SQLEditor/executar.bat) na raiz do projeto.

---

## 🇺🇸 English

### 📖 Platform Overview (v3.2.4)
**SQLEditor** is an all-in-one educational Single Page Application (SPA) developed by **Milkfed Devs && Reqs Lords** in partnership with **SENAI Ourinhos**. The platform is designed to guide students and professionals through every practical stage of Relational Database Systems directly in the browser:

```
[Phase 1: Domain & Requirements] ➔ [Phase 2: Visual ER Studio] ➔ [Phase 3: 1NF–3NF Normalization] ➔ [Phase 4: Reactive SQL Lab] ➔ [Phase 5: Practice & Challenges]
```

---

### ✨ Architectural Highlights & Core Modules

1. **📐 7-Layer SVG Dedicated ER Studio (DrawDB Inspired):**
   * 90° rounded orthogonal lines with collision avoidance and smooth Bézier options.
   * Smart layout switch button: **"Auto Organize"** vs. **"Restore Saved Positions"** (allowing risk-free auto-arranging).
   * Direct column-click editing: clicking any column inside an entity card immediately opens the sidebar editor.
   * Clear schema mode indicators: **Active Physical Database** (AlaSQL engine) vs. **Live Typing Script** (Monaco DDL).
   * *Live Data Peek (👁️)*: inspect real data records directly inside table cards.
   * Laser animated flow (`FK ➔ PK`), recursive self-join loops, subject areas, and sticky note post-its.

2. **⚡ Reactive SQL Lab & Live Split-View (LiveSchema Inspired):**
   * High-performance Monaco Editor with context-aware schema autocompletion.
   * Real-time bidirectional reactive DDL: typing `CREATE TABLE` updates the ER diagram live, while visual changes patch Monaco code via `executeEdits` preserving Undo (`Ctrl+Z`).
   * Surgical line execution (`Alt+E`), batch execution (`Ctrl+Enter`), and heuristic SQL review (`Alt+R`).

3. **📋 Relational Data Dictionary & 1NF–3NF Normalization:**
   * Interactive 1NF/2NF/3NF checklist explaining partial and transitive functional dependencies.
   * Schema linter in Portuguese warning about missing primary keys, orphan columns, and foreign key type mismatches.
   * 5 export formats: HD PNG, pure SVG, print-ready PDF A4, Mermaid `erDiagram`, and Markdown `.md`.

4. **📺 Subtitled Interactive Training Video Center:**
   * 60 FPS in-browser vector simulated player (zero heavy video downloads for classroom networks).
   * Synchronized Portuguese subtitles (CC) across all 5 foundational pillars.
   * Speed controls (`1x` to `2x`), timeline scrubbing, theater mode, and instant direct navigation to the tool.

5. **🎓 High-Speed Classroom Gallery & Auto-Graded Challenges:**
   * Massive scripts (1,000+ statements) load in ~1 second via single-batch transactions and `bulkAdd` in IndexedDB.
   * Floating real-time progress bar with live percentage and step updates.
   * Pre-packaged classroom datasets: E-Commerce, Language School, HR, Streaming, and Pizzeria.
   * 7 self-graded practice challenges with instant local feedback.

6. **⚙️ 4-Pillar Configuration, Direct Feedback & Portable Super-Backup:**
   * Single-file portable backup (`.sqleditor.json`) to transfer entire workspace states between school labs and personal computers.
   * One-click bug and suggestion reporting to `williamdevide.ourinhos@gmail.com` via mail client or **direct Gmail Web**.
   * 4 themes (Dark, Light, Beige, Graphite) and 4 SQL syntax color schemes.

---

### 🚀 Local Quickstart

```bash
git clone https://github.com/williamdevide/antigravity.SQLEditor.git
cd antigravity.SQLEditor/frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser, or double-click `executar.bat` on Windows.

---

### 📄 Licença / License
Distribuído sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.  
*Distributed under the MIT License. See `LICENSE` for more information.*

---

<div align="center">

**SENAI Ourinhos • Escola SENAI "Paulo Egydio Martins"**  
*Desenvolvido por William Devidé Komel — Milkfed Devs && Reqs Lords*  
*Construído com o ecossistema Google Antigravity*

</div>
