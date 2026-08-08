# Squad Hub — Frontend MonteSquad

Frontend web do MonteSquad: plataforma de squads/projetos colaborativos (TCC).

## Stack

- **TanStack Start** (React 19, Vite, Tailwind 4)
- **TanStack Router** (file-based routing) + **TanStack Query**
- **shadcn/ui** (Radix + Tailwind)
- **axios** para chamadas à API

## Requisitos

- Node.js 18+
- Backend MonteSquad rodando em `http://localhost:3333` (ver `MontesSquad-API/README.md`)

## Instalação

```bash
npm install
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz:

```env
VITE_API_URL=http://localhost:3333
```

## Execução

```bash
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # build de produção (TanStack Start)
npm run preview      # preview do build
```

> Rotas novas do TanStack Start são file-based: criar `src/routes/<nome>.tsx` e rodar `vite dev` uma vez para regenerar `routeTree.gen.ts`.

## Testes

```bash
npm test             # suíte Vitest (29 testes em src/services/*.test.ts, mockando ./api)
npm run lint         # eslint — 0 erros / 7 warnings (react-refresh em shadcn/ui + AuthContext)
npx tsc --noEmit     # type-check
```

## Credenciais de teste

| E-mail | Senha | Tipo |
|---|---|---|
| `admin@email.com` | `admin123` | adm |
| `lucas@email.com` | `senha123` | membro |

## Estrutura

- `src/routes/` — páginas (login, dashboard, projetos, perfil, notificações, configurações, recuperar/resetar senha)
- `src/services/` — clientes da API (projects, projectDetail, reputation, notifications, tasks, perfil) com desembrulho do envelope `{sucesso, dados}` e fallback mock apenas em DEV
- `src/contexts/AuthContext.tsx` — autenticação (login, cadastro com auto-login, logout, persistência em localStorage)
- `src/components/` — UI (shadcn/ui) e layout
