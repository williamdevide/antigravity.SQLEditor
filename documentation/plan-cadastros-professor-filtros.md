# 📋 Plano de Implementação: Cadastros Escolares SENAI, Nível Professor e Filtros Avançados

> **Data:** 05/11/2026  
> **Comandos:** `/agente-orquestrador`, `/grill-me`, `/goal`  
> **Metodologia:** Arquitetura de 3 Camadas + Diretrizes SENAI

---

## 🎯 Objetivos do Projeto

1. **Formulário de Cadastro ("Criar Conta"):**
   - Nome Completo, E-mail.
   - Curso: campo de linha inteira pré-preenchido com `"Técnico em Desenvolvimento de Sistemas"`.
   - Turma e Matrícula em colunas separadas.
   - WhatsApp / Telefone.
   - Senha e Confirmação de Senha.
2. **Fluxo do Aluno autenticado via Google:**
   - Detecção de perfil incompleto (campos de Turma e Matrícula vazios).
   - Redirecionamento automático e amigável para a tela **"Meu Perfil"** no primeiro acesso para preenchimento dos dados acadêmicos.
3. **Novo Nível de Acesso: Professor (`role: 'professor'`):**
   - Suporte ao papel `'professor'` no modelo de tipos, Firestore e regras de segurança.
   - Badges visuais dedicados no Cabeçalho, Meu Perfil e Painel Admin (`👨‍🏫 Professor`).
   - Seletor suspenso no Painel do Administrador para alterar permissões entre **Aluno**, **Professor** e **Administrador**.
4. **Filtros e Ordenação Avançada no Painel do Administrador:**
   - Barra de filtros compostos:
     - Busca textual (Nome, E-mail, Matrícula, Telefone).
     - Filtro por Curso (dinâmico).
     - Filtro por Turma (dinâmico).
     - Filtro por Nível/Papel (Todos, Aluno, Professor, Admin).
   - Ordenação por cabeçalhos de coluna clicáveis (▲/▼):
     - Curso, Turma, Matrícula, Nome, Data de Cadastro.
5. **Atualização de Segurança do Firestore (`firestore.rules`):**
   - Delegação ao subagente `firestore-rules-author` para validar e incluir o papel `'professor'`.

---

## 🏗️ Estrutura de Mudanças nos Arquivos

| Arquivo | Mudanças Principais |
|---|---|
| `frontend/src/types/index.ts` | `UserRole = 'admin' \| 'professor' \| 'aluno'`, campos `course`, `turma` em `UserProfile`. |
| `frontend/src/services/authService.ts` | Atualização das funções de sincronização, atualização de perfil e elevação de papéis. |
| `frontend/src/context/AuthContext.tsx` | Helper `isProfessor`, detecção de perfil pendente de dados acadêmicos. |
| `frontend/src/components/AuthModal.tsx` | Novo layout do formulário Criar Conta com Curso em largura total e Turma separada. |
| `frontend/src/components/UserProfileView.tsx` | Campos Curso e Turma separados, badge Professor e destaque para dados pendentes. |
| `frontend/src/components/AdminPanelView.tsx` | Filtros compostos, ordenação clicável por colunas, seletor de papel e contadores de Alunos/Professores/Admins. |
| `frontend/src/components/Header.tsx` | Renderização do badge `👨‍🏫 Professor` no avatar do topo. |
| `firestore.rules` | Autorização do papel `professor` e regras de integridade via subagente. |
| `documentation/promptHistory.md` | Registro contínuo de rastreabilidade de prompts. |

