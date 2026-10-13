# 📘 SOP Mestre: SQLEditor
**Status:** Planejamento / Inicialização | **Versão:** 2.5.5

## 1. Visão Geral e Objetivo Principal
O **SQLEditor** é um ambiente web interativo e educacional para estudantes e profissionais praticarem banco de dados utilizando a sintaxe MySQL em um ambiente 100% client-side[cite: 1]. O sistema resolve a necessidade de um playground leve, responsivo e resiliente, que ofereça flexibilidade de interface (painéis redimensionáveis, zoom independente por área e temas claro/escuro)[cite: 1], navegação por schema com ações rápidas via menu de contexto[cite: 1], um editor avançado com suporte a abas[cite: 1] e um motor de execução local integrado com suporte a persistência automática via IndexedDB[cite: 1].

## 2. Arquitetura do Projeto (Antigravity v2.5.5)
* **Layer 1 (Diretiva & Estratégia):** Regras de negócio, especificação de componentes UI/UX, templates de comandos SQL do menu de contexto e este SOP Mestre localizado na pasta de documentação (`/documentation/directives/SOP/`)[cite: 1].
* **Layer 2 (Orquestração / Gemini 3.8 Flash):** Agente de IA responsável por interpretar as diretivas do Layer 1, gerenciar o estado da sessão, traduzir as intenções do usuário em código TypeScript/React e coordenar as chamadas deterministicas do Layer 3[cite: 1].
* **Layer 3 (Execução & Determinismo):** Códigos determinísticos e scripts de infraestrutura[cite: 1].
  * Motor de execução SQLite WASM (`@sql.js` / `wa-sqlite`) com tradutor de sintaxe MySQL[cite: 1].
  * Abstração de persistência em IndexedDB/LocalStorage via `dexie`[cite: 1].
  * Arquivos temporários de build, cache de parser e logs salvos estritamente no diretório `.tmp/`[cite: 1].
  * Entregáveis e artefatos de publicação destinados ao ambiente em nuvem (Vercel, Supabase ou Cloud Storage)[cite: 1].

## 3. Escopo Tecnológico & Requisitos (Tech Stack)
- **Frontend / Interface:** React (Vite) com TypeScript, Tailwind CSS, `react-resizable-panels`, `@monaco-editor/react` (ou CodeMirror 6) e `lucide-react`[cite: 1].
- **Engine de Execução SQL:** WASM-based SQLite (`@sql.js`) com camada de compatibilidade/parser de sintaxe MySQL[cite: 1].
- **Persistência / Dados:** IndexedDB via `dexie` (armazenamento de schemas, tabelas, registros, abas ativas e logs) e `localStorage` (preferências de layout e temas)[cite: 1].
- **Variáveis de Ambiente:** Arquivo `.env` para configurações de ambiente (ex: `VITE_APP_TITLE=SQLEditor`, `VITE_ENABLE_AUTO_SAVE=true`).

## 4. Diretrizes de UX/UI e Referências Visuais
- **Inspiração Real:** Inspirado em IDEs modernas de banco de dados (como DBeaver e TablePlus) combinadas com a simplicidade e leveza de playgrounds de código online (como CodeSandbox e JSFiddle)[cite: 1].
- **Experiência do Usuário:** 
  - Layout de duas colunas principais com divisórias redimensionáveis[cite: 1].
  - **Coluna da Esquerda (Schema Explorer):** Árvore de navegação com menu suspenso de contexto (botão direito) no nó do banco (`CREATE`, `DROP`) e no nó da tabela (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`) que abre automaticamente uma nova aba com o script preenchido[cite: 1].
  - **Coluna da Direita (Workspace):** Gerenciador de abas no topo, editor de código SQL no centro (com destaque de sintaxe e autocompletar) e painel de resultados no rodapé (grade de dados e log de erros/execução)[cite: 1].
  - **Controles de Zoom Independente:** Botoeiras (`+`, `-`, `Reset`) dedicadas para cada painel ajustar o tamanho da fonte/escala visual de forma isolada[cite: 1].
  - **Múltiplos Temas:** Transição fluida entre Dark Mode e Light Mode[cite: 1].

## 5. Fluxo Operacional de Execução
1. **Kickoff:** Leitura do prompt original e validação deste SOP Mestre (`SQLEditor.md`)[cite: 1].
2. **Setup de Arquivos Temporários:** Garantir a criação da pasta `.tmp/` para armazenamento de logs de execução, compilação intermédia e testes[cite: 1].
3. **Desenvolvimento Modular:** Criação de sub-SOPs e componentes granulares:
   - `/src/components/layout`: Divisores, controles de zoom e suporte a temas[cite: 1].
   - `/src/components/sidebar`: Árvore de schemas e menu de contexto (botão direito)[cite: 1].
   - `/src/components/editor`: Gerenciador de abas e integração com Monaco/CodeMirror[cite: 1].
   - `/src/components/console`: Grade de dados interativa e log de erros[cite: 1].
   - `/src/services/db`: Camada de persistência IndexedDB com Dexie e WASM Engine[cite: 1].
4. **Codificação & Testes:** Implementação do código-fonte na estrutura `/src`, acompanhada de suítes de teste de integração do parser SQL[cite: 1].
5. **Empacotamento e Nuvem:** Preparação dos arquivos entregáveis para deploy em nuvem e documentação local[cite: 1].

## 6. Definição de Sucesso (Deliverables)
- **Entregáveis Finais:** 
  - Aplicação web SPA completa do **SQLEditor** pronta para ser publicada em nuvem[cite: 1].
  - Scripts de inicialização e build compilados[cite: 1].
- **Arquivos de Suporte Obrigatórios:** 
  - `README.md` (Apresentação do projeto, arquitetura e instruções de uso)[cite: 1].
  - `instruction.md` (Guia rápido de comandos para o terminal)[cite: 1].
  - `executar.bat` (Script autossuficiente de execução e inicialização no Windows)[cite: 1].

## 7. Tratamento de Erros, Resiliência e Self-Annealing
- **Separação de Logs Temporários:** Qualquer arquivo temporário de log, erro de build ou dump de execução deve ser gravado estritamente dentro da pasta `.tmp/` para evitar poluição do repositório principal[cite: 1].
- **Detecção e Diagnóstico de Erros SQL:** Capturar exceções emitidas pelo motor WASM ou parser MySQL, exibindo-as no painel inferior de resultados com linha e coluna correspondentes para orientar o estudante[cite: 1].
- **Auto-Recuperação de Persistência (IndexedDB):** Caso os dados locais no IndexedDB fiquem num estado corrompido, o sistema deve isolar o erro, registrar o log em `.tmp/db_error.log` e oferecer o botão "Restaurar Padrões / Resetar Dados" para recriar o schema sem travar a aplicação[cite: 1].
- **Ciclo Rápido de Correção:** Ao detectar falhas em testes automáticos ou na compilação do Vite, o orquestrador (Layer 2) deve analisar o traceback armazenado em `.tmp/build_error.log`, aplicar os ajustes no código determinístico (Layer 3) e revalidar o componente[cite: 1].
- **Evolução Documental:** Qualquer alteração nos contratos de dados, estruturas de comandos do menu de contexto ou bibliotecas principais deve ser refletida de forma síncrona neste SOP e nos sub-SOPs do diretório `/documentation/directives/SOP/`[cite: 1].