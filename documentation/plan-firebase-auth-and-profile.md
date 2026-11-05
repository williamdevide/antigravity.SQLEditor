# Plano de Implementação: Autenticação Firebase, Perfil SENAI e Painel de Administrador

> **Data de Início:** 05/11/2026  
> **Status:** Em Andamento  
> **Arquitetura:** React 19 + TypeScript + Vite + Firebase Auth & Firestore + Tailwind CSS  
> **Diretiva:** /agente-orquestrador /grill-me /goal

---

## 🎯 1. Objetivos da Mudança

1. **Acesso Público Preservado (Zero Regressão):**
   - Os botões "Abrir Laboratório SQL" na Landing Page serão renomeados para **"Testar Laboratório SQL"**, mantendo a experiência local offline e funcional para qualquer visitante sem login.
2. **Nova Área de Autenticação no Cabeçalho:**
   - O botão "Abrir Central" na barra de navegação da Landing Page e no Header é substituído por **"Entrar"** e **"Criar Conta"**.
3. **Autenticação Firebase Completa:**
   - E-mail e Senha com fluxo estrito de verificação por e-mail (`sendEmailVerification`).
   - Login com Conta Google (`GoogleAuthProvider`).
   - Recuperação de Senha com disparo de link por e-mail (`sendPasswordResetEmail`).
4. **Perfis de Usuário (Aluno vs Administrador):**
   - Papel de Administrador concedido automaticamente ao e-mail do Professor (`williamdevide@gmail.com`) e registrado na coleção `users` do Firestore.
   - Demais cadastros recebem o papel de `aluno`.
5. **Tela "Meu Perfil" (Padrão Educacional SENAI):**
   - Visualização e edição de: Nome Completo, E-mail, Turma/Curso (ex: *Técnico em Desenvolvimento de Sistemas*), Matrícula/Código do Aluno e Telefone/WhatsApp.
   - Alteração de senha para contas cadastradas via e-mail e senha.
6. **Tela "Painel do Administrador" (Configurações Extras e Permissões):**
   - Exibida no menu hambúrguer exclusivamente para administradores.
   - Visão geral de alunos cadastrados, controle de permissões e estrutura modular para configurações globais.

---

## 📋 2. Etapas de Execução

- [ ] **Etapa 1: Instalação e Configuração do Firebase no Vite**
  - Instalar dependência `firebase`.
  - Configurar `frontend/vite.config.ts` com `envDir: '../'` e `envPrefix: ['VITE_', 'FIREBASE_']`.
  - Criar `frontend/src/services/firebase.ts` com inicialização robusta e tradução de mensagens de erro para PT-BR.
- [ ] **Etapa 2: Definição de Tipos e Camada de Serviços de Autenticação**
  - Atualizar `frontend/src/types/index.ts` com `UserProfile`, `UserRole`, `'profile'` e `'admin-panel'` em `ActiveView`.
  - Criar `frontend/src/services/authService.ts` com todas as operações de Auth e Firestore.
  - Criar `frontend/src/context/AuthContext.tsx` para distribuição de estado e hooks reativos (`useAuth`).
- [ ] **Etapa 3: Interface de Autenticação (Modal Multi-Abas)**
  - Criar `frontend/src/components/AuthModal.tsx` com suporte a Entrar, Criar Conta, Esqueci a Senha e Aguardando Verificação.
- [ ] **Etapa 4: Telas "Meu Perfil" e "Painel do Administrador"**
  - Criar `frontend/src/components/UserProfileView.tsx`.
  - Criar `frontend/src/components/AdminPanelView.tsx`.
- [ ] **Etapa 5: Integração no Header, Landing Page, Menu Hambúrguer e App**
  - Atualizar `LandingPageView.tsx` com os novos botões "Testar Laboratório SQL" e ações de Login/Cadastro.
  - Atualizar `Header.tsx` com status de autenticação e botões contextuais.
  - Atualizar `MainMenuDropdown.tsx` incluindo "Meu Perfil" e "Painel do Administrador".
  - Integrar rotas e estado em `App.tsx`.
- [ ] **Etapa 6: Validação de Qualidade e Compilação**
  - `oxlint`: 0 erros.
  - `tsc -b && vite build`: compilação de produção com 0 erros.
  - Atualização do histórico em `promptHistory.md`.

