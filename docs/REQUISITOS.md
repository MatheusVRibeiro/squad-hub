# Análise de Requisitos — squad-hub (Frontend MontesSquad)

> **Propósito deste arquivo:** dar à IA (ou qualquer dev novo) o contexto COMPLETO do produto antes de tocar no código. Leia antes de qualquer tarefa. Complementa o GUIA_DESENVOLVEDOR.md (foco técnico); aqui o foco é PRODUTO + REQUISITOS.
> Última atualização: 2026-08-28

---

## 1. Visão Geral

**Objetivo do projeto:** Frontend web do **MontesSquad** — plataforma de formação de squads e projetos colaborativos com integração GitHub. O squad-hub é a interface onde desenvolvedores descobrem projetos, se candidatam a vagas por função, operam o kanban (assumir/abandonar/reatribuir tasks), acompanham a atividade do squad (timeline, mural), veem rankings (Top Committers/Contributors), matching de projetos/tasks recomendados, portfólio verificável e reputação técnica. Princípio de UX da refatoração em curso: *"Trabalho primeiro. Contexto depois. Configuração por último."*

**Público-alvo / usuários:** Desenvolvedores (membros e candidatos), donos de projetos, e visitantes (perfis/portfólios públicos). Consome a `MontesSquad-API` (Express+MySQL, porta 3333).

**Tipo:** SPA/SSR web (TanStack Start) de plataforma SaaS — TCC.

**Status:** ativo em desenvolvimento — 140/140 testes (20 arquivos); refatoração de UI/UX do Kanban escalável em execução (plano de 21 etapas, ETAPAS 0–20).

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Linguagem | TypeScript | ^5.8.3 |
| Framework | TanStack Start (React 19, Vite) | @tanstack/react-start ^1.167.50 / react ^19.2.0 / vite ^7.3.1 |
| Roteamento | TanStack Router (file-based) + TanStack Query | ^1.168.25 / ^5.83.0 |
| Banco de dados | nenhum (API REST via MontesSquad-API) | — |
| ORM | — | — |
| Autenticação | JWT (AuthContext, persistência em localStorage) | — |
| Testes | Vitest + Testing Library (jsdom) | ^4.1.10 / ^16.3.2 |
| Deploy | Cloudflare (wrangler.jsonc + @cloudflare/vite-plugin) / Hono node server | — |
| Outros | Tailwind CSS 4 + shadcn/ui (Radix), axios ^1.16.1, react-hook-form + zod, framer-motion, recharts, lucide-react, sonner, cmdk | — |

*Versões reais do package.json — nunca inventar.*

---

## 3. Atores / Papéis

| Ator | Descrição | Permissões principais |
|------|-----------|----------------------|
| Membro (usuário comum) | Desenvolvedor logado (conta local ou GitHub) | Dashboard, descobrir projetos, candidatar-se, kanban (assumir/abandonar/reatribuir), perfil, notificações, configurações |
| Dono do projeto (owner) | Criador de um projeto | CRUD de vagas, aprovar candidaturas, configurações do projeto (privacidade, GitHub, links), ações administrativas |
| Membro do squad | Usuário aprovado em projeto | Kanban, tasks recomendadas, timeline, mural, rankings do projeto |
| Visitante | Não autenticado | Ver projetos/perfis/portfólios públicos |
| ADM | Conta administrativa | Gestão de usuários |

> A diferenciação de permissões (`isOwner`/`isMember`) vem do backend; o frontend apenas adapta a UI.

---

## 4. Requisitos Funcionais (RF)

> Formato: `RF-01` — <título> — <descrição do comportamento esperado, mensurável>

### Módulo: Autenticação
- **RF-01** — Login/cadastro local — telas `login.tsx`/`register.tsx` com auto-login após cadastro; persistência de sessão em localStorage via `AuthContext`.
- **RF-02** — Login com GitHub — botão "Continuar com GitHub"; rotas `auth.github.success`, `auth.github.email-exists` (conta existente exige login local para vincular) e `auth.github.complete-profile` (onboarding).
- **RF-03** — Recuperação de senha — telas `recuperar-senha.tsx`/`resetar-senha.tsx` (token por e-mail).
- **RF-04** — Conectar/desconectar GitHub — seção Configurações > Integrações (`GitHubConnectionCard`) com estados Não conectado/Conectando/Conectado/Erro.

### Módulo: Descoberta e projetos
- **RF-05** — Dashboard — visão inicial com projetos e contexto do usuário.
- **RF-06** — Listagem de projetos — `projetos.index.tsx`/`projetos.tsx` com `ProjectCard` (tecnologias, membros, status).
- **RF-07** — Criação de projeto — `projetos.novo.tsx` com definição de vagas por função (ex.: 2 Backend, 1 QA).
- **RF-08** — Meus projetos — `meus-projetos.tsx` (projetos onde o usuário é membro/dono).
- **RF-09** — Matching de projetos — seção "Recomendados para você" com score 0–100 e fatores explicáveis (consumo de `GET /matching/projetos`).

### Módulo: Tela de projeto (kanban escalável)
- **RF-10** — Banner compacto do projeto — hierarquia visual: título (maior) + badge de status, descrição com line-clamp, tecnologias em badges (+N), metadados (membros, criador, data), resumo GitHub conectado/desconectado; ações `Nova tarefa`/`Convidar`/menu `...` conforme permissão.
- **RF-11** — Navegação interna do projeto — tabs `Kanban | Atividade | Equipe | GitHub | Insights | Configurações` (Kanban padrão; sticky); subtabs em Atividade (Timeline | Mural) e Equipe (Membros | Vagas | Candidaturas).
- **RF-12** — KanbanBoard — colunas `todo/doing/review/done` com drag and drop, busca por título, filtros por responsável/prioridade, criação/edição de tarefas, dificuldade e habilidades, subtarefas, badges/atividade GitHub.
- **RF-13** — Ciclo de vida da task na UI — assumir, abandonar, remover responsável, reatribuir e histórico de responsáveis (consumo dos endpoints da API).
- **RF-14** — Kanban para alto volume — altura operacional controlada por viewport, colunas com scroll interno (header sticky + `overflow-y: auto`), contadores por coluna, tratamento especial de `Concluído`, carregamento progressivo por coluna, modo `Quadro` e modo `Lista`, footer do Kanban.
- **RF-15** — Filtros — toolbar simples + drawer lateral de filtros avançados (estado centralizado).
- **RF-16** — Tasks recomendadas — `TasksRecomendadas` (consumo de `GET /projetos/:id/tasks/recomendadas` com compatibilidade + motivos; não bloqueia assunção manual).

### Módulo: Squad e atividade
- **RF-17** — Equipe — `MembersList`, `Vagas` e `Applications` (candidaturas com vaga, compatibilidade e tecnologias).
- **RF-18** — Atividade — `ProjectTimeline` (eventos do squad) + `Mural` (mensagens do projeto).
- **RF-19** — Painel GitHub — `GithubProjectPanel` (repositório, branch, status) + `GithubTaskBadge`/`GithubTaskActivity` nos cards.
- **RF-20** — Rankings — `TopContributors`/`TopCommitters` por projeto (aba Insights) e seção `Ranking` na sidebar com rankings GLOBAIS (`GET /rankings/*`) — sem regra de ranking nova no frontend.

### Módulo: Perfil e reputação
- **RF-21** — Perfil técnico — bio, localização, tecnologias com nível, funções de interesse, disponibilidade, objetivo (onboarding em etapas).
- **RF-22** — Portfólio verificável — `VerifiedContributions`: projetos + função + tasks verificadas + PRs mergeados + commits (privados ocultados).
- **RF-23** — Reputação técnica — exibida separada do XP/nível no perfil.
- **RF-24** — Notificações — tela `notificacoes.tsx` (central de notificações da plataforma).
- **RF-25** — Configurações — `configuracoes.tsx` (integrações GitHub, preferências).

---

## 5. Requisitos Não-Funcionais (RNF)

| Código | Categoria | Requisito |
|--------|-----------|-----------|
| RNF-01 | Performance | Kanban eficiente com 5, 20, 100+ tarefas: scroll interno por coluna (colunas não crescem indefinidamente), lazy loading de telas/componentes, carregamento progressivo |
| RNF-02 | Usabilidade | Interface em PT-BR; princípio "Trabalho primeiro. Contexto depois. Configuração por último."; estados loading/error preservados em todas as telas |
| RNF-03 | Compatibilidade | Responsivo (mobile → desktop); navegadores modernos; Node 18+ em dev |
| RNF-04 | Segurança | Autorização exibida conforme `isOwner`/`isMember` (decisão real no backend); token nunca exposto em logs; dados de repositório privado nunca renderizados para não-membro |
| RNF-05 | Qualidade | Vitest + Testing Library (140 testes, mockando `./api`); ESLint (0 erros); `tsc --noEmit` sem erros; Prettier |
| RNF-06 | Acessibilidade | Acessibilidade mínima verificada em cada gate da refatoração (ETAPA 17 do plano); testes dedicados de acessibilidade da tela de projeto |
| RNF-07 | Confiabilidade | Serviços com desembrulho do envelope `{sucesso, dados}`; fallback mock apenas em DEV; cache/refetch via TanStack Query (`['project', id]`) |
| RNF-08 | Processo | Gate por etapa (TypeScript, lint, testes, permissões, estados, responsividade, acessibilidade, regressões); commits em PT-BR; nunca pular etapa |

---

## 6. Regras de Negócio

> As regras que o sistema DEVE respeitar (o "contrato" do domínio).

1. **RN-01** — Kanban é a tab padrão da tela de projeto; o trabalho vem antes de contexto e configuração.
2. **RN-02** — Rankings globais da sidebar consomem os endpoints existentes (`GET /rankings/committers`, `GET /rankings/contributors`) — NUNCA criar regra de ranking nova no frontend.
3. **RN-03** — Componentes existentes devem ser reaproveitados, não duplicados (KanbanBoard, KanbanToolbar, TasksRecomendadas, GithubProjectPanel, TopCommitters, TopContributors, ProjectTimeline, MembersList, Vagas, Applications, Mural).
4. **RN-04** — O banner do projeto é resumo: não renderizar `GithubProjectPanel` inteiro dentro do banner; dados vindos de `ProjectDetail` (sem nova API).
5. **RN-05** — Ações administrativas (Nova tarefa, Convidar, menu `...`) aparecem conforme permissão (`isOwner`/`isMember`).
6. **RN-06** — Tasks recomendadas são recomendação, não autorização: score baixo nunca bloqueia a assunção manual.
7. **RN-07** — Dados de repositório privado só são exibidos para membros do projeto (fail-closed na renderização).
8. **RN-08** — Novas rotas são file-based: criar `src/routes/<nome>.tsx` e regenerar `routeTree.gen.ts` (rodar `vite dev` uma vez).
9. **RN-09** — O banner ocupa significativamente menos altura em desktop, com o Kanban mais próximo da dobra inicial (critério da refatoração).
10. **RN-10** — O fallback mock de dados só existe em DEV; em produção toda tela consome a API real.

---

## 7. Integrações Externas

| Integração | Para quê | Como (API/Webhook/SDK) |
|------------|----------|------------------------|
| MontesSquad-API | Todas as operações de negócio | REST/JSON (axios, JWT) em `http://localhost:3333` (dev) / `VITE_API_URL` |
| GitHub (indireto) | Identidade, commits, PRs, badges | Via endpoints da API (GitHub App no backend) |
| Cloudflare | Deploy do build de produção | wrangler + @cloudflare/vite-plugin |

---

## 8. Fluxos Principais (User Stories resumidas)

- **Como desenvolvedor, eu quero ver projetos compatíveis com meu perfil, para** encontrar um squad onde contribuir.
  - Fluxo: dashboard → "Recomendados para você" (score 92% + fatores: Node.js ✓, SQL ✓, Backend ✓) → abrir projeto → resultado: descoberta guiada por matching.
- **Como membro, eu quero operar o kanban do projeto, para** organizar e executar o trabalho do squad.
  - Fluxo: tela do projeto (tab Kanban) → ver tasks recomendadas → assumir task (branch gerada) → arrastar entre colunas → PR mergeado → task `done` → resultado: fluxo de trabalho completo na UI.
- **Como dono de projeto, eu quero aprovar candidaturas por vaga, para** formar o squad com os perfis certos.
  - Fluxo: tab Equipe → Candidaturas → ver vaga/compatibilidade/tecnologias do candidato → aprovar → resultado: membro entra com função definida.
- **Como visitante, eu quero ver o portfólio de um desenvolvedor, para** avaliar sua experiência real.
  - Fluxo: perfil → "Contribuições verificadas" (PRs mergeados, commits, projetos; privados ocultados) → resultado: evidência profissional.

---

## 9. Fora de Escopo / Restrições

- **Refatoração do Kanban em execução** — plano de 21 etapas (ETAPAS 0–20 em `docs/REFATORACAO_KANBAN_ESCALAVEL_UIUX.md`); etapas não concluídas ainda não fazem parte do comportamento real.
- **Sem regra de ranking no frontend** — rankings são 100% da API; o frontend só exibe.
- **Sem backend próprio** — 100% dependente da `MontesSquad-API`; fallback mock apenas em DEV.
- **GitHub App real pendente no backend** — badges/atividade GitHub dependem da configuração real dos envs `GITHUB_*` no backend.
- **Rate limit em memória no backend** — comportamento de 1 instância (aceito para MVP).
- **Sem i18n** — interface apenas em PT-BR.
- **ESLint** — 7 warnings conhecidos (react-refresh em shadcn/ui + AuthContext); 0 erros é o padrão.

---

## 10. Referências

- `docs/REFATORACAO_KANBAN_ESCALAVEL_UIUX.md` — fonte principal da UI: 21 etapas (0–20) da refatoração da tela de projeto e Kanban escalável, com gates e critérios
- `README.md` — stack, como rodar, credenciais de teste, estrutura
- `BUSINESS_IMPROVEMENTS.md`, `QUICK_START_IMPROVEMENTS.md` — melhorias de produto
- `../MontesSquad-API/docs/PLANO_EVOLUCAO_PRODUTO_MONTESQUAD.md` — plano de evolução do produto (19 etapas) — fonte das funcionalidades de negócio
- `../MontesSquad-API/docs/RELATORIO_EVOLUCAO_PRODUTO.md` — status real das etapas
- `../MontesSquad-API/docs/api.md` — referência de endpoints consumidos
- Repos irmãos: `../MontesSquad-API` (backend)
