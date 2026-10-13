# 🚀 Instruções de Execução e Comandos - SQLEditor

Este guia reúne os comandos essenciais para executar, testar e empacotar a aplicação **SQLEditor** localmente no ambiente Windows.

---

## 📋 Pré-requisitos
* **Node.js**: v18+ ou v20+ instalado.
* **NPM**: v9+ ou superior.
* Navegador moderno (Chrome, Edge, Firefox, Brave) com suporte a IndexedDB e Web Workers.

---

## ⚡ Inicialização Rápida

### Opção 1: Via Script Automatizado (Windows)
Dê um duplo clique no arquivo `executar.bat` na raiz do projeto. Ele cuidará da verificação de dependências e iniciará o servidor local abrindo o navegador automaticamente em `http://localhost:5173`.

### Opção 2: Via Terminal (PowerShell / Bash)
```powershell
# 1. Acesse o diretório do frontend
cd frontend

# 2. Instale as dependências (se ainda não instaladas)
npm install

# 3. Inicie o servidor Vite de desenvolvimento
npm run dev
```

Abra o navegador em `http://localhost:5173`.

---

## 🛠️ Comandos de Desenvolvimento (Frontend)

* `npm run dev`: Inicia o servidor de desenvolvimento Vite com Hot Module Replacement (HMR).
* `npm run build`: Valida os tipos TypeScript e compila o bundle de produção otimizado na pasta `dist/`.
* `npm run preview`: Executa um servidor local servindo a versão de produção gerada em `dist/`.
* `npm run lint`: Executa a verificação estática de código com oxlint.

---

## 💾 Persistência e Limpeza de Dados Locais
* **Armazenamento 100% Offline:** Os bancos e tabelas criados ficam salvos no **IndexedDB** do navegador.
* **Restaurar Padrões:** Caso queira resetar os bancos de dados criados e restaurar os bancos de dados padrão de estudo (`ecommerce_db` e `universidade_db`), clique no botão **"Resetar Banco"** no topo da interface.
* **Backup & Restauração:** Utilize as opções da aba **"Configurações"** para exportar seus scripts SQL ou importar arquivos `.sql` e `.json`.

---
*Assinado: Agente Antigravity - SENAI Ourinhos Edition*
