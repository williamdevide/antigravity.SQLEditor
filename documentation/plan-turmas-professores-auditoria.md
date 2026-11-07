# 📋 Plano Arquitetural: Sistema de Turmas, Aprovação de Professores e Histórico de Eventos (Auditoria)

> **Data:** 07/11/2026  
> **Comandos:** `/agente-orquestrador`, `/grill-me`, `/goal`  
> **Perfil:** Padrão SENAI - Arquitetura de 3 Camadas

---

## 🎯 Objetivos Centrais

1. **Ciclo de Cadastro do Aluno e Professor (`AuthModal.tsx`):**
   - Seletor de Perfil no topo: Aluno ou Professor.
   - **Aluno:** formulário com dados escolares e campo opcional "Código da Turma".
     - Se preenchido com código válido: status `pending` de aprovação na turma.
     - Se não informado: aluno sem turma, com acesso livre a tarefas gerais do SQLEditor.
   - **Professor:** cadastro fica com `status: 'pending_approval'`, aguardando autorização do Administrador.
2. **Painel do Professor & Gestão de Turmas (`TeacherPanelView.tsx`):**
   - Professores autorizados podem criar turmas, gerando um código único de 6 caracteres (ex: `A8F2K9`).
   - Gestão de alunos:
     - Admissão direta por e-mail de alunos cadastrados.
     - Aprovação ou recusa de alunos pendentes que entraram com o código da turma.
     - Remoção de aluno da turma (sem removê-lo da plataforma).
3. **Controle do Administrador (`AdminPanelView.tsx`):**
   - Autorização e recusa de professores pendentes.
   - Elevação de professores a Administrador e rebaixamento seguro (com proteção para a conta principal).
   - Exclusão definitiva de usuários da plataforma (exclusiva do Administrador).
4. **Trilha de Auditoria & Histórico de Eventos (`system_events`):**
   - Registro automático de todos os eventos administrativos e escolares:
     - Cadastros, aprovação/recusa de docentes, criação de turmas, solicitações de alunos, admissões/remoções de alunos, elevações e exclusões de usuários.
   - Aba dedicada "Histórico de Eventos" no Painel do Administrador com:
     - Tabela detalhada e filtros por tipo de evento e período.
     - Exportação dupla imediata: **CSV (Excel)** e **JSON estruturado**.
5. **Regras de Segurança do Cloud Firestore (`firestore.rules`):**
   - Delegação ao subagente especializado `firestore-rules-author` para cobrir as coleções `users`, `classes`, `class_members` e `system_events`.

---

## 📁 Matriz de Arquivos e Responsabilidades

| Arquivo | Camada | Responsabilidade |
|---|---|---|
| `frontend/src/types/index.ts` | Modelos | Interfaces `ClassItem`, `ClassMemberItem`, `SystemEventItem`, `UserStatus`. |
| `frontend/src/services/classService.ts` | Serviço | Criação de turmas, validação de código, solicitações e admissões de alunos. |
| `frontend/src/services/auditService.ts` | Serviço | Gravação de eventos na trilha de auditoria e exportação CSV/JSON. |
| `frontend/src/services/authService.ts` | Serviço | Suporte a `pending_approval` para professores e exclusão definitiva de usuários. |
| `frontend/src/context/AuthContext.tsx` | Contexto | Flags `isTeacherApproved`, gerenciamento de turma ativa e atalhos de navegação. |
| `frontend/src/components/AuthModal.tsx` | Interface | Seletor Aluno/Professor e campo de código de turma com validação. |
| `frontend/src/components/TeacherPanelView.tsx` | Interface | Tela completa de turmas do professor (código de acesso, alunos e solicitações). |
| `frontend/src/components/AdminPanelView.tsx` | Interface | Aprovação de professores, exclusão de usuários e aba de Histórico de Eventos. |
| `frontend/src/components/UserProfileView.tsx` | Interface | Card de status da turma (pendente/aprovada) e entrada por código. |
| `frontend/src/components/Header.tsx` | Interface | Atalho "Minhas Turmas" para professores autorizados e badges correspondentes. |
| `firestore.rules` | Infraestrutura | Regras de segurança geradas pelo subagente para todas as coleções. |

