# ESPECIFICAÇÃO DE TAREFA: Ambiente Interativo de SQL para Estudo (Sintaxe MySQL)

Atue como Engenheiro de Software Principal Full-Stack e Especialista em UX/UI. Seu objetivo é projetar e implementar um ambiente web interativo (Single Page Application) para alunos praticarem gerenciamento de banco de dados MySQL, com suporte a persistência local offline.

---

## 1. REQUISITOS PRINCIPAIS E ARQUITETURA

1. **Motor de Execução e Sintaxe MySQL**:
   - A aplicação deve suportar sintaxe válida de DDL e DML do MySQL.
   - Utilize um motor SQLite WASM executado no navegador (ex: `@sql.js` ou `wa-sqlite`) com uma camada de tradução/compatibilidade, OU um parser/simulador leve de banco de dados no lado do cliente para simular o comportamento do MySQL (inspeção de schema, criação de tabelas e consultas) inteiramente offline.

2. **Camada de Persistência (IndexedDB e LocalStorage)**:
   - **Persistência de Dados**: Utilize IndexedDB (via biblioteca `dexie` ou `idb`) para salvar automaticamente o estado dos bancos de dados, tabelas e registros criados pelos alunos.
   - **Estado do Workspace**: Persista abas abertas, conteúdo dos scripts da aba ativa, tamanho dos painéis e níveis de zoom entre recarregamentos da página.
   - **Botão de Reset**: Forneça uma opção "Restaurar Padrões / Limpar Dados" no cabeçalho para permitir que os alunos limpem o banco de dados local e comecem do zero.

3. **Suporte a Temas**:
   - Suporte nativo a Modo Claro (Light) e Modo Escuro (Dark) com transições suaves.
   - Persista a preferência de tema do usuário no `localStorage`.

4. **Layout Flexível e Redimensionável**:
   - Layout de painéis divididos e redimensionáveis (utilizando `react-resizable-panels` ou dividores CSS/JS padrão).
   - **Zoom Individual por Área**: Cada painel principal (Barra Lateral, Editor e Console) deve possuir controles de zoom independentes (`+`, `-`, `Reset`) para ajustar a escala de fonte/conteúdo sem afetar o restante da interface.

---

## 2. LAYOUT DA UI E ESTRUTURA DE COMPONENTES

A interface é dividida em duas colunas principais com divisórias redimensionáveis:

### A. Coluna da Esquerda: Navegador de Schema (Sidebar)
* **Árvore de Bancos e Tabelas**:
  * Exibe os bancos de dados criados e suas tabelas/colunas aninhadas dinamicamente a partir do IndexedDB.
  * Estrutura de árvore retrátil (collapsible tree).
* **Menus de Contexto (Botão Direito)**:
  * **No Nó de Banco de Dados**:
    * `Criar Script` -> Abre aba com `CREATE DATABASE <nome_banco>;`
    * `Excluir Banco (Drop)` -> Abre aba com `DROP DATABASE <nome_banco>;`
  * **No Nó de Tabela**:
    * `SELECT *` -> Abre aba com `SELECT * FROM <nome_tabela> LIMIT 100;`
    * `INSERT INTO` -> Abre aba preenchida com `INSERT INTO <nome_tabela> (<colunas>) VALUES (<valores>);`
    * `UPDATE` -> Abre aba preenchida com `UPDATE <nome_tabela> SET <coluna> = <valor> WHERE <condicao>;`
    * `DELETE` -> Abre aba preenchida com `DELETE FROM <nome_tabela> WHERE <condicao>;`
    * `ALTER TABLE` -> Abre aba preenchida com `ALTER TABLE <nome_tabela> ADD <nome_coluna> <tipo_dado>;`
    * `DROP TABLE` -> Abre aba preenchida com `DROP TABLE <nome_tabela>;`

### B. Coluna da Direita: Gerenciador de Abas e Workspace
* **Cabeçalho / Barra de Ferramentas**:
  * Botões de ação: `+ Nova Aba`, `Fechar Aba Atual`, `Executar (Ctrl+Enter)`, `Exportar Script SQL`, `Importar Arquivo SQL`, `Limpar Editor`, `Resetar Dados`.
* **Painel Central: Editor de Código SQL**:
  * Editor de código com suporte a abas (Monaco Editor ou CodeMirror 6).
  * Destaque de sintaxe (syntax highlighting) para palavras-chave, funções, tipos de dados e identificadores MySQL.
  * Autocompletar (IntelliSense) para tabelas, colunas e comandos MySQL.
  * Salvamento automático do rascunho no IndexedDB/LocalStorage conforme o aluno digita.
* **Painel Inferior: Resultados e Console de Execução**:
  * Painel de saída em abas mostrando:
    1. **Grade de Dados (Data Grid)**: Tabela interativa exibindo resultados de consultas `SELECT`, com ordenação de colunas e contagem de linhas.
    2. **Log de Execução**: Mensagens de sucesso, quantidade de linhas afetadas, tempo de execução ou mensagens de erro detalhadas do MySQL com indicação de linha.

---

## 3. STACK TÉCNICA E REQUISITOS DE DESIGN

* **Framework**: React / Next.js ou Vite SPA com TypeScript.
* **Armazenamento**: `dexie` ou `idb` para abstração do IndexedDB.
* **Estilização**: Tailwind CSS com variáveis CSS para alternância dinâmica de tokens de tema (Dark/Light).
* **Editor**: `@monaco-editor/react` ou `@uiw/react-codemirror`.
* **Ícones**: `lucide-react`.
* **UX/Acessibilidade**: Layout limpo, moderno e adequado para ambiente educacional técnico. Atalhos de teclado (`Ctrl+Enter` para rodar script, `Ctrl+T` para nova aba).

---

## 4. ENTREGÁVEIS ESPERADOS

1. Código funcional do layout cobrindo divisão de painéis, zoom independente, alternância de temas e sincronização com IndexedDB.
2. Gerenciamento de estado para múltiplos scripts/abas e atualização em tempo real do schema do banco.
3. Componente de árvore (tree-view) com menus de contexto (botão direito) que inserem templates dinâmicos em novas abas do editor.
4. Camada de persistência configurada com recuperação automática ao carregar e opção de reset.

Gere o código-fonte limpo, pronto para produção e modularizado em componentes.