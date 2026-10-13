# 📘 SOP Mestre: [NOME DO PROJETO]
**Status:** Planejamento / Inicialização | **Versão:** 2.5.5

## 1. Visão Geral e Objetivo Principal
[Descreva de forma clara o que o sistema deve realizar, qual problema de mercado ou técnico ele resolve, e qual o valor entregue ao usuário final.]

## 2. Arquitetura do Projeto (Antigravity v2.5.5)
* **Layer 1 (Diretiva & Estratégia):** Este documento de SOP e as especificações derivadas.
* **Layer 2 (Orquestração / Gemini 3.8 Flash):** O Agente interpretando regras, gerando código e coordenando a execução.
* **Layer 3 (Execução & Determinismo):** Scripts, suítes de teste e ferramentas de CLI na raiz ou em pastas dedicadas.

## 3. Escopo Tecnológico & Requisitos (Tech Stack)
- **Frontend / Interface:** [Ex: React com Vite, Tailwind CSS, shadcn/ui, Multi-temas (Dark/Light)]
- **Backend / API:** [Ex: Node.js (Express/Fastify) ou Python (FastAPI)]
- **Persistência / Dados:** [Ex: Supabase, Firebase, PostgreSQL, SQLite ou Local Storage]
- **Variáveis de Ambiente:** [Ex: Configurações obrigatórias no arquivo `.env`]

## 4. Diretrizes de UX/UI e Referências Visuais
- **Inspiração Real:** [Descreva sites reais ou padrões de mercado que servirão de referência estética e funcional para o design do projeto].
- **Experiência do Usuário:** Priorizar design responsivo (Mobile-First), microinterações fluidas, acessibilidade (a11y) e suporte a múltiplos temas (Dark Mode Premium e Light Mode Minimalista).

## 5. Fluxo Operacional de Execução
1. **Kickoff:** Leitura do prompt original (`ideia-projeto.md`) e validação deste SOP consolidado (`projeto.md`).
2. **Desenvolvimento Modular:** Criação de sub-SOPs granulares na pasta `/documentation/directives/SOP/` para cada grande funcionalidade ou módulo.
3. **Codificação & Testes:** Implementação do código-fonte segregado (`/src`, `/backend`, `/frontend`) acompanhado de testes automatizados (`/tests`).
4. **Empacotamento:** Geração do guia de comandos (`instruction.md`) e do script de automação local (`executar.bat`).

## 6. Definição de Sucesso (Deliverables)
- **Entregáveis Finais:** [Ex: Aplicação web funcional, API documentada, scripts de automação, relatórios].
- **Arquivos de Suporte Obrigatórios:** 
  - `README.md` (Vitrine bilíngue e moderna).
  - `instruction.md` (Guia rápido de terminal).
  - `executar.bat` (Script de inicialização autossuficiente para Windows).

## 7. Tratamento de Erros, Resiliência e Self-Annealing
- **Detecção de Falhas:** Em caso de erro de compilação ou teste, analisar o traceback completo fornecido pelo ambiente.
- **Correção Direta:** Ajustar o código e validar imediatamente com testes automatizados (ciclo rápido de feedback).
- **Evolução Documental:** Atualizar os SOPs específicos na pasta `/SOP/` caso ocorram mudanças estruturais nos fluxos ou nas APIs.