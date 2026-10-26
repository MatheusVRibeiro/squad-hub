# Resumo do Projeto — MonteSquad

## Propósito
Aplicação web em TypeScript (React + Vite) para gerenciamento colaborativo de projetos (Kanban, candidaturas, ranking de contribuintes e integração com GitHub). O código inclui UI, lógica de rotas, contexto de autenticação, serviços que consomem APIs e scripts de banco de dados.

## Tecnologias principais
- TypeScript
- React (+ TanStack Router)
- Vitel
- Vitest (testes)
- Axios-like para chamadas HTTP (`src/services/api.ts`)
- Possível deploy em Cloudflare Workers (`wrangler.jsonc`) ou Node (servidor local)

-## Estrutura essencial (visão por pasta)
- `src/routes/`: Páginas/rotas da aplicação (ex.: login, dashboard, projetos). Cada arquivo representa uma rota React.
- `src/components/`: Componentes reutilizáveis de interface (sidebar, menus, protected route, etc.).
- `src/layouts/`: Layouts que envolvem as páginas (`AppLayout`, `AuthLayout`).
- `src/contexts/`: Contextos React para estado global (ex.: `AuthContext`).
- `src/services/`: Abstrações de API e lógica de integração (ex.: `projects.ts`, `notifications.ts`).
- `src/lib/`: Utilitários e captura/render de erros para SSR.
- `database/`: Scripts SQL organizados por ação (`create/`, `insert/`, `drop/`, `delete/`).
- `__tests__/` e `src/*/*.test.ts`: Suíte de testes unitários e de integração.

## Como o fluxo funciona (resumido)
1. Autenticação e sessão são gerenciadas em `src/contexts/AuthContext.tsx`.
2. Componentes e páginas chamam funções em `src/services/*` para obter/dar update em dados via API.
3. `layouts/` e `components/` cuidam da estrutura visual e proteção de rotas.
4. SSR e tratamento de erros estão em `src/server.ts` e `src/lib/*`.

## Arquivos e funções-chave (exemplos para anexar no TCC)
- `src/contexts/AuthContext.tsx` ([link](src/contexts/AuthContext.tsx#L1-L200)) — `AuthProvider()`, `useAuth()`; operações: `signIn()`, `signUp()`, `signOut()`, `signInWithGithubToken()` e `persistSession()`.
- `src/services/projects.ts` ([link](src/services/projects.ts#L1-L200)) — `fetchProjects()` (busca e normaliza projetos; fallback para mocks em DEV), `requestProjectJoin()`.
- `src/components/AppSidebar.tsx` ([link](src/components/AppSidebar.tsx#L1-L200)) — `AppSidebar()` que renderiza o menu lateral e usa `useAuth()` para `signOut`.
- `src/routes/index.tsx` ([link](src/routes/index.tsx#L1-L120)) — componente `Index()` que redireciona para `/dashboard` ou `/login` conforme estado da sessão.
- `src/server.ts` ([link](src/server.ts#L1-L240)) — ponto de entrada SSR: `fetch(request, env, ctx)` e normalização de erros de SSR.
- `src/services/api.ts` ([link](src/services/api.ts#L1-L120)) — cliente HTTP central, `TOKEN_KEY`/`USER_KEY` usados para persistir sessão.
- `src/components/ProtectedRoute.tsx` ([link](src/components/ProtectedRoute.tsx#L1-L120)) — proteção de rotas baseada em `useAuth()`.
- `database/` — scripts SQL para criação e população (use como evidência de infraestrutura local).

## Lista completa de funções / símbolos importantes
Segue uma lista mais detalhada das funções e componentes que aparecem nos arquivos-chave (útil para anexar ao TCC):

- `src/contexts/AuthContext.tsx`
	- `loginAndMap(email, password)` — chama POST /login e mapeia para o formato `User`.
	- `AuthProvider({ children })` — provider React que mantém `user`, `isLoading` e funções de sessão.
	- `useAuth()` — hook de acesso ao contexto.
	- Métodos expostos: `signIn()`, `signUp()`, `signOut()`, `updateUser()`, `persistSession()`, `signInWithGithubToken()`.

- `src/services/projects.ts`
	- `fetchProjects()` — GET /projetos; normaliza resposta; em `DEV` usa fallback `getLocalProjects()`.
	- `requestProjectJoin(projectId)` — POST para candidaturas (com fallback silencioso em DEV).
	- Re-exports: `MOCK_PROJECTS`, `getLocalProjects`, `saveLocalProjects` (de `src/services/mocks`).

- `src/services/api.ts`
	- `api` — cliente HTTP central (axios ou wrapper); adiciona interceptores e baseURL.
	- `TOKEN_KEY`, `USER_KEY` — chaves para localStorage (persistência de sessão).

- `src/components/AppSidebar.tsx`
	- `AppSidebar()` — componente que monta a navegação lateral e chama `signOut()` do `useAuth()`.

- `src/components/ProtectedRoute.tsx`
	- `ProtectedRoute({ children })` — redireciona para `/login` se não autenticado; mostra loader durante verificação.

- `src/server.ts`
	- `getServerEntry()` — carrega dinamicamente a entry SSR (`@tanstack/react-start/server-entry`).
	- `normalizeCatastrophicSsrResponse(response)` — detecta respostas SSr 'engolidas' e converte em página de erro.
	- Export default: objeto com `fetch(request, env, ctx)` usado como handler (Cloudflare/Server).

- Roteamento e root
	- `src/routes/__root.tsx`: `Route` root com `RootShell`, `RootComponent`, provê `QueryClient` + `AuthProvider` e `Toaster`.

## Resumo de cada tela (routes)
Para o TCC, descreva cada tela com objetivo, entradas/ações principais e endpoints usados.

- `/` — `index.tsx`
	- Objetivo: página inicial que redireciona o usuário para `/dashboard` (se autenticado) ou `/login`.
	- Ações: leitura de estado via `useAuth()`; navegação automática.

- `/login` — `login.tsx`
	- Objetivo: permitir autenticação por e-mail/senha ou via GitHub.
	- Entradas: formulário (`email`, `password`), botão `Continuar com GitHub`.
	- Ações principais: `signIn()` (AuthContext) → POST /login; `getGithubAuthUrl()` → redireciona para OAuth GitHub.

- `/register` — `register.tsx`
	- Objetivo: criação de conta com campos (nome, e-mail, senha, localização, skills) e opção GitHub.
	- Ações: `signUp()` (AuthContext) → POST /usuarios; auto-login pós-cadastro; validação com `zod`.

- `/recuperar-senha` — `recuperar-senha.tsx`
	- Objetivo: solicitar link de recuperação por e-mail.
	- Ações: POST /recuperar-senha (anti-enumeração: resposta genérica mesmo se e-mail não existir).

- `/resetar-senha` — `resetar-senha.tsx`
	- Objetivo: definir nova senha a partir de token (fragment ou query `token`).
	- Ações: leitura do token do fragment `#token=...`, `api.post('/resetar-senha')`.

- `/auth/github/success` — `auth.github.success.tsx`
	- Objetivo: callback OAuth -> finaliza login com token (lido do fragment); usa `signInWithGithubToken()`.

- `/auth/github/complete-profile` — `auth.github.complete-profile.tsx`
	- Objetivo: onboarding para contas criadas via GitHub que precisam completar perfil (nome, bio, opcional senha).
	- Ações: `completeGithubProfile()` → persiste token + dados; `persistSession()`.

- `/auth/github/email-exists` — `auth.github.email-exists.tsx`
	- Objetivo: informar que o e-mail do GitHub já existe em outra conta; orienta conectar GitHub nas configurações.

- `/dashboard` — `dashboard.tsx`
	- Objetivo: visão geral do usuário — KPIs, XP/Reputação, notificações não lidas, recomendações e gráficos.
	- Endpoints/ações: `fetchProjects()`, `fetchReputation()`, `fetchNotifications()`, `fetchProjectTasks()`; apresenta componentes `TopContributors`, `TopCommitters`, `RecomendadosParaVoce`.

- `/projetos/` — `projetos.index.tsx` (Explorar projetos)
	- Objetivo: listar e filtrar projetos públicos por termo, tecnologias, status e ordenação.
	- Ações: `fetchProjects()`, filtro local (fuzzy), `ProjectsToolbar` para seleção de tecnologias/status.

- `/projetos/novo` — `projetos.novo.tsx` (Criar projeto)
	- Objetivo: formulário para criar projeto (nome, descrição, limite de membros, tecnologias, links).
	- Ações: `createProject()` (services/projectDetail) → cria e redireciona para `/projetos/$id`.

- `/projetos/$id` — `projetos.$id.tsx` (Detalhe do projeto)
	- Objetivo: área de trabalho do squad com tabs: `Kanban`, `Atividade` (timeline/mural), `Equipe` (membros/vagas/candidaturas), `GitHub`, `Insights`, `Configurações` (se owner).
	- Ações: `fetchProjectDetail(id)`, `closeProjectLocal()`, `atualizarVisibilidadeProjeto()`, `atualizarLinksProjeto()`, `sairDoProjeto()`. Componentes importantes: `KanbanBoard`, `MembersList`, `Vagas`, `Applications`, `ProjectHeader`.

- `/meus-projetos` — `meus-projetos.tsx`
	- Objetivo: listar projetos cujo `creatorId` corresponde ao usuário (projetos que o usuário criou).
	- Ações: filtro local sobre `fetchProjects()` e ligação para `projetos.novo`.

- `/perfil` — `perfil.tsx`
	- Objetivo: exibir e editar perfil do usuário, reputação, reputação técnica, histórico de projetos, conquistas e portfólio verificável.
	- Ações: `fetchReputation()`, `getPortfolio()`, `getMeuPerfilTecnico()`, `atualizarPerfilTecnico()`, `salvarFuncoes()`, `salvarHabilidadesComNivel()`; opção de importar dados do GitHub.

- `/notificacoes` — `notificacoes.tsx`
	- Objetivo: listar notificações, marcar todas como lidas.
	- Ações: `fetchNotifications()`, `markAllRead()` e navegação para itens vinculados.

- `/ranking` — `ranking.tsx`
	- Objetivo: visualizar rankings globais: `Top Contributors` e `Top Committers`.
	- Ações: `getGlobalContributors()`, `getGlobalCommitters()`; alternar abas e validar params de busca (`tab`).

- `/configuracoes` — `configuracoes.tsx`
	- Objetivo: preferências do usuário (tema escuro), notificações, segurança (mudar senha) e integrações (GitHub).
	- Ações: toggle de tema (persistência local), `api.patch('/usuarios/:id')` para alterar senha, componentes de integração como `GitHubConnectionCard`.

## Como usar estes trechos no TCC
- Anexe: 1) `AuthContext.tsx` (fluxo de sessão), 2) `projects.ts` (integração API + fallback DEV), 3) `projetos.$id.tsx` (arquitetura da tela de projeto com tabs e ações). Inclua 10–30 linhas de cada trecho com comentário curto explicando responsabilidade.

---
Arquivo gerado automaticamente: `resumo_projeto_TCC.md` (atualizado com funções e resumo de telas)


## Sugestão de uso no TCC
- Inclua o parágrafo-resumo deste arquivo como introdução técnica (estrutura, tecnologias e responsabilidades das pastas).
- Anexe trechos curtos (10–30 linhas) de `AuthContext.tsx`, `projects.ts` e `AppSidebar.tsx` para exemplificar arquitetura: contexto para sessão, serviços para API e componentes para UI.
- Documente o fluxo de autenticação (persistência do token, GitHub callback, sync de skills) como estudo de caso de integração.

---
Arquivo gerado automaticamente: `resumo_projeto_TCC.md`
