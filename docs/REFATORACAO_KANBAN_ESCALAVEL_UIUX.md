# MonteSquad — Refatoração executável da tela de projeto e Kanban escalável

> Documento de execução para agente orquestrador e subagentes. Este plano foi escrito a partir da estrutura atual dos repositórios `MatheusVRibeiro/squad-hub` e `MatheusVRibeiro/MontesSquad-API`.

---

# 1. Objetivo

Refatorar a tela de detalhes do projeto e o Kanban para que:

- o Kanban seja a principal área operacional;
- o layout permaneça eficiente com 5, 20, 100 ou mais tarefas;
- o banner do projeto reproduza a hierarquia visual aprovada no mockup;
- o GitHub conectado apareça de forma resumida e clara no banner;
- filtros simples e avançados reduzam o volume visível de tarefas;
- as colunas deixem de crescer indefinidamente na vertical;
- tarefas concluídas tenham tratamento específico para não dominar o quadro;
- exista modo `Quadro` e modo `Lista`;
- o sidebar possua uma seção `Ranking` com `Top Contributors` e `Top Committers` globais;
- os rankings do projeto continuem dentro de `Insights`;
- componentes e regras já existentes sejam reaproveitados, não duplicados.

Princípio de UX:

> **Trabalho primeiro. Contexto depois. Configuração por último.**

---

# 2. Estado atual confirmado

## Frontend

Repositório:

```text
MatheusVRibeiro/squad-hub
```

Arquivos centrais já existentes:

```text
src/routes/projetos.$id.tsx
src/components/projects/KanbanBoard.tsx
src/components/projects/KanbanToolbar.tsx
src/components/AppSidebar.tsx
src/layouts/AppLayout.tsx
src/services/projectDetail.ts
```

Componentes que já existem e DEVEM ser reutilizados:

```text
KanbanBoard
KanbanToolbar
TasksRecomendadas
GithubProjectPanel
GithubTaskBadge
GithubTaskActivity
TopCommitters
TopContributors
ProjectTimeline
MembersList
Vagas
Applications
Mural
```

O `KanbanBoard.tsx` já possui hoje:

- estados `todo`, `doing`, `review`, `done`;
- busca por título;
- filtro por responsável;
- filtro por prioridade;
- criação/edição de tarefas;
- drag and drop;
- assumir tarefa;
- abandonar tarefa;
- remover responsável;
- reatribuir tarefa;
- histórico de responsáveis;
- dificuldade;
- habilidades;
- subtarefas;
- badges/atividade GitHub.

Portanto, **não recriar nenhuma dessas funções**.

## Backend

Repositório:

```text
MatheusVRibeiro/MontesSquad-API
```

Os rankings globais já existem:

```text
GET /rankings/committers
GET /rankings/contributors
```

E rankings por projeto:

```text
GET /projetos/:projetoId/rankings/committers
GET /projetos/:projetoId/rankings/contributors
```

Logo, a seção `Ranking` da sidebar deve consumir os endpoints globais existentes. Não criar regra de ranking nova no frontend.

---

# 3. Regra absoluta de execução

O agente principal é o **ORQUESTRADOR**.

Ele deve:

1. compreender a etapa;
2. mapear dependências;
3. dividir trabalhos independentes;
4. delegar a subagentes quando houver ganho real;
5. impedir dois subagentes de editar simultaneamente o mesmo arquivo;
6. revisar cada entrega;
7. integrar alterações;
8. executar testes;
9. validar visualmente;
10. fechar o gate;
11. somente então liberar a próxima etapa.

## 3.1 Proibição de pular etapas

**NÃO implementar a etapa seguinte enquanto a etapa atual não estiver 100% concluída.**

Enquanto aguarda subagentes, o orquestrador PODE:

- ler arquivos da próxima etapa;
- mapear riscos;
- planejar distribuição;
- preparar contratos;
- preparar testes;
- antecipar conflitos.

Enquanto aguarda subagentes, o orquestrador NÃO PODE:

- modificar arquivos da próxima etapa;
- commitar implementação da próxima etapa;
- misturar alterações de duas etapas em um mesmo pacote.

## 3.2 Gate padrão

Ao final de TODA etapa:

```text
ETAPA X — GATE

[ ] todos os arquivos previstos foram alterados/criados
[ ] TypeScript sem erros
[ ] lint passando
[ ] testes relacionados passando
[ ] regras atuais preservadas
[ ] permissões preservadas
[ ] estados loading/error preservados
[ ] responsividade verificada quando aplicável
[ ] acessibilidade mínima verificada
[ ] regressões verificadas
[ ] nenhuma pendência bloqueante
```

---

# ETAPA 0 — Baseline e auditoria

## Objetivo

Registrar como a tela funciona antes da refatoração e impedir regressões silenciosas.

## ALTERAR

Nenhum arquivo de produção nesta etapa.

## INSPECIONAR obrigatoriamente

```text
src/routes/projetos.$id.tsx
src/components/projects/KanbanBoard.tsx
src/components/projects/KanbanToolbar.tsx
src/components/AppSidebar.tsx
src/layouts/AppLayout.tsx
src/services/projectDetail.ts
src/services/rankings.ts              (se existir)
src/components/projects/TopCommitters.tsx
src/components/projects/TopContributors.tsx
src/__tests__/projetos-id-lazy-loading.test.tsx
src/__tests__/projetos-id-papeis.test.tsx
src/__tests__/projetos-id-acessibilidade.test.tsx
```

## O que mapear

- onde `KanbanBoard` é renderizado;
- como as tabs do projeto são montadas;
- quais componentes já são lazy-loaded;
- quais permissões dependem de `isOwner` e `isMember`;
- como `GithubProjectPanel` recebe dados;
- como os rankings por projeto são consumidos;
- como sidebar determina item ativo;
- quais tipos existem em `ProjectDetail` e `KanbanTask`;
- como a query `['project', id]` é atualizada/refetchada.

## Testes

Executar baseline:

```bash
npm test
npm run lint
npm run build
```

Registrar falhas pré-existentes antes de modificar código.

## Critério de conclusão

Existe um mapa claro de arquivos, dependências e funcionalidades e o baseline foi registrado.

---

# ETAPA 1 — Extrair e compactar o banner do projeto

## Objetivo

Transformar o card superior atual em um banner compacto igual à hierarquia do mockup, sem perder dados ou ações.

## ALTERAR

```text
src/routes/projetos.$id.tsx
```

## CRIAR

Preferencialmente:

```text
src/components/projects/ProjectHeader.tsx
```

Criar somente se a extração reduzir significativamente a complexidade da rota. Caso contrário, refatorar inline e extrair depois.

## O que deve mudar em `projetos.$id.tsx`

Remover do fluxo principal do banner qualquer bloco grande de:

- privacidade;
- links do squad;
- configuração detalhada do GitHub;
- Top Contributors;
- Top Committers.

Esses recursos não serão removidos; apenas reposicionados em etapas posteriores.

## O banner deve passar a conter

### Bloco esquerdo

```text
[ÍCONE DO PROJETO]

API DE PAGAMENTOS                    [Aberto]
API de testes para processamento e conciliação de pagamentos.

[Node.js] [React] [TypeScript] [PostgreSQL]

1/5 membros
Criado por Matheus
10/08/2026
GitHub: MatheusVRibeiro/api-pagamentos
Branch: main
```

### Bloco direito

```text
[ + Nova tarefa ] [ Convidar ] [ ... ]

GitHub                                    Conectado ✓
MatheusVRibeiro/api-pagamentos
main · atualizado há 2 min
```

## Regras visuais obrigatórias

- título é a maior hierarquia;
- badge de status ao lado do título;
- descrição limitada a 1–2 linhas com `line-clamp`;
- tecnologias em badges compactos;
- se houver muitas tecnologias, mostrar primeiras + `+N`;
- metadados em linha sempre que houver espaço;
- card do GitHub do banner é apenas resumo;
- não renderizar `GithubProjectPanel` inteiro dentro do banner.

## Dados a reutilizar

Usar dados já presentes em `ProjectDetail`. Não criar nova API apenas para o banner.

## Ações

- `Nova tarefa`: deve abrir fluxo existente do Kanban; se atualmente isso só existe dentro da coluna, expor callback/ação sem duplicar modal;
- `Convidar`: reutilizar fluxo existente, se houver;
- menu `...`: receber ações administrativas já existentes.

## Testes a alterar/criar

Atualizar testes de rota que dependam do markup antigo.

Criar, se útil:

```text
src/__tests__/project-header.test.tsx
```

Validar:

- status;
- nome;
- tecnologias;
- membros;
- criador;
- data;
- resumo GitHub conectado/desconectado;
- ações conforme permissão.

## Critério de conclusão

Em desktop, o banner ocupa significativamente menos altura e o Kanban fica mais próximo da dobra inicial.

---

# ETAPA 2 — Reorganizar navegação interna do projeto

## Objetivo

Reduzir quantidade de tabs de primeiro nível.

## ALTERAR

```text
src/routes/projetos.$id.tsx
```

## Nova navegação obrigatória

```text
Kanban | Atividade | Equipe | GitHub | Insights | Configurações
```

`Kanban` deve ser a tab padrão.

## Reorganização dos componentes existentes

### Kanban

```text
KanbanBoard
TasksRecomendadas
```

### Atividade

```text
ProjectTimeline
Mural
```

Preferir subtabs internos:

```text
Timeline | Mural
```

### Equipe

```text
MembersList
Vagas
Applications
```

Preferir subtabs:

```text
Membros | Vagas | Candidaturas
```

### GitHub

```text
GithubProjectPanel
```

### Insights

```text
TopContributors
TopCommitters
```

### Configurações

```text
Privacidade
Links
Ações administrativas
```

## O que REMOVER do primeiro nível

Não manter como tabs principais separadas:

```text
Mural
Membros
Vagas
Recomendadas
Candidaturas
```

## Sticky

Tornar a navegação do projeto sticky se não conflitar com o header global de `AppLayout`.

O header global possui altura `h-14`; calcular offset corretamente.

## Testes

Atualizar:

```text
src/__tests__/projetos-id-lazy-loading.test.tsx
src/__tests__/projetos-id-papeis.test.tsx
src/__tests__/projetos-id-acessibilidade.test.tsx
```

## Critério de conclusão

Kanban é o primeiro conteúdo operacional e todas as funcionalidades antigas continuam acessíveis na nova hierarquia.

---

# ETAPA 3 — Preparar o Kanban para grande volume: altura e scroll interno

## Objetivo

Impedir que colunas com dezenas de tarefas aumentem indefinidamente a altura da página.

## ALTERAR

```text
src/components/projects/KanbanBoard.tsx
```

## O que deve mudar

### 3.1 Container geral do board

Criar altura operacional controlada baseada na viewport.

Exemplo conceitual:

```text
min-height: 520px
height/max-height: calc(100vh - altura-header-global - altura-banner - tabs - toolbar)
```

Não copiar valores cegamente; medir layout real.

### 3.2 Cada coluna

Estrutura esperada:

```text
column
├── header sticky
└── task-list overflow-y-auto
```

A lista deve possuir:

```css
overflow-y: auto;
min-height: 0;
```

### 3.3 Header da coluna

Deve permanecer visível enquanto tarefas rolam internamente.

Exemplo:

```text
A FAZER   32   [+]
```

### 3.4 Board horizontal

Em telas menores, permitir `overflow-x-auto` sem esmagar cards.

## NÃO ALTERAR

- lógica `move()`;
- drag-and-drop;
- update de status;
- claim/reassign/abandon;
- GitHub task activity;
- mutations existentes.

## Testes

Adicionar teste estrutural onde possível e validação manual com fixtures de:

```text
5 tasks
20 tasks
100 tasks
```

## Critério de conclusão

Com 100 tarefas, a página não cresce 100 cards para baixo; cada coluna possui scroll independente e os quatro headers permanecem alinhados.

---

# ETAPA 4 — Contadores e estado por coluna

## Objetivo

Tornar volume explícito e facilitar leitura do quadro.

## ALTERAR

```text
src/components/projects/KanbanBoard.tsx
```

## O que deve mudar

Para cada coluna calcular:

```text
quantidade filtrada
quantidade total
```

Exibir:

```text
A fazer      32
Em progresso 18
Em revisão    6
Concluído    44
```

Quando filtros estiverem ativos, considerar mostrar tooltip/legenda:

```text
12 de 32
```

## Regra

Os contadores devem ser derivados de `filteredTasks`, não mantidos em estado duplicado.

## Critério de conclusão

Contadores sempre refletem corretamente filtros e movimentação de cards.

---

# ETAPA 5 — Centralizar e ampliar o estado de filtros

## Objetivo

Evoluir os filtros atuais sem espalhar vários `useState` isolados.

## ALTERAR

```text
src/components/projects/KanbanBoard.tsx
src/components/projects/KanbanToolbar.tsx
```

## CRIAR

Recomendado:

```text
src/types/kanbanFilters.ts
```

ou manter o tipo junto ao toolbar se o projeto preferir menos arquivos.

## Estado sugerido

Substituir gradualmente:

```text
searchTerm
assigneeFilter
priorityFilter
```

por estrutura coerente:

```ts
type KanbanFilterState = {
  search: string;
  statuses: KanbanStatus[];
  priorities: ("low" | "medium" | "high")[];
  assignees: string[];
  onlyMine: boolean;
  unassigned: boolean;
  overdue: boolean;
  hasDueDate: boolean;
};
```

Não é obrigatório usar exatamente esse tipo se houver melhor compatibilidade com o código atual, mas deve existir uma fonte única de verdade para filtros.

## Busca

Ampliar a busca atual de título para:

- título;
- descrição;
- ID da tarefa.

Usar normalização já existente (`normalizeText`).

Adicionar debounce de 200–300 ms somente se necessário para performance.

## Critério de conclusão

Todos os filtros são derivados de um estado coerente e não existem conflitos entre filtros antigos e novos.

---

# ETAPA 6 — Refatorar `KanbanToolbar` conforme mockup

## Objetivo

Transformar a toolbar atual em uma barra operacional completa.

## ALTERAR

```text
src/components/projects/KanbanToolbar.tsx
src/components/projects/KanbanBoard.tsx
```

## Layout obrigatório

```text
[ Buscar tarefas... ]

[ Minhas tarefas ]
[ Sem responsável ]
[ Atrasadas ]
[ Alta prioridade ]

[ Responsável ▾ ]
[ Prioridade ▾ ]
[ Mais filtros ]

[ Quadro | Lista ]
```

## Quick filters

### Minhas tarefas

Usar usuário autenticado (`useAuth`) e dados reais de responsável.

### Sem responsável

Task sem responsável.

### Atrasadas

```text
dueDate < hoje AND status != done
```

Tratar `YYYY-MM-DD` como data local, seguindo o padrão já existente de `formatDueDate`.

### Alta prioridade

```text
priority === high
```

## Dropdowns

- responsável;
- prioridade.

## Remover ruído

O contador `X de Y tarefas` pode migrar para o footer do board para liberar espaço na toolbar.

## Critério de conclusão

Toolbar reproduz a hierarquia do mockup e combina quick filters com filtros avançados.

---

# ETAPA 7 — Drawer lateral de filtros avançados

## Objetivo

Adicionar filtros completos sem sobrecarregar a toolbar.

## ALTERAR

```text
src/components/projects/KanbanToolbar.tsx
src/components/projects/KanbanBoard.tsx
```

## CRIAR

```text
src/components/projects/KanbanFiltersDrawer.tsx
```

Utilizar componente `Sheet`/`Drawer` já disponível no design system se existir. Não instalar biblioteca nova sem necessidade.

## Conteúdo obrigatório

```text
FILTROS                           X

Status                            Limpar
[x] A fazer
[x] Em progresso
[x] Em revisão
[x] Concluídas

Prioridade                        Limpar
[ ] Alta
[ ] Média
[ ] Baixa

Responsável                       Limpar
[ Buscar responsável... ]
[ ] Sem responsável
[ ] Matheus Ribeiro
[ ] João Silva
...

Outros                            Limpar
[ ] Atrasadas
[ ] Com prazo

[ Aplicar filtros ]
[ Limpar todos ]
```

## Regras

- drawer utiliza a mesma fonte de estado de filtros;
- nenhum filtro duplicado com lógica diferente;
- `Limpar` por seção deve afetar apenas seção;
- `Limpar todos` restaura estado inicial;
- filtros devem funcionar combinados.

## Acessibilidade

- foco preso no drawer enquanto aberto;
- botão fechar rotulado;
- checkboxes com labels;
- `Esc` fecha.

## Critério de conclusão

Combinações como `Em revisão + Alta + João` funcionam corretamente.

---

# ETAPA 8 — Cards compactos

## Objetivo

Reduzir altura de cada card para aumentar densidade sem perder informação essencial.

## ALTERAR

```text
src/components/projects/KanbanBoard.tsx
```

Se o card estiver inline e a função crescer demais, CRIAR:

```text
src/components/projects/KanbanTaskCard.tsx
```

## Hierarquia do card

### Linha 1

```text
Título                                  #1021
```

### Linha 2

```text
[Baixa]               12/out
```

### Linha 3

Descrição com no máximo 2 linhas.

### Linha 4

Responsável ou `Sem responsável`.

### Linha 5

No máximo 2–3 skills + `+N`.

### Rodapé contextual

Em progresso:

```text
2/4 subtasks · 2 commits
```

Em revisão:

```text
1 PR aberto
```

Concluído:

```text
✓ concluído · data/responsável
```

## Ações

Manter menu `⋮` para ações secundárias.

### Importante

Não mostrar simultaneamente duas ações equivalentes como:

```text
Assumir tarefa
Pegar tarefa
```

Deve existir UMA única ação primária:

```text
Assumir tarefa
```

## Preservar

- `GithubTaskBadge`;
- `GithubTaskActivity` no detalhe/modal quando apropriado;
- histórico de responsáveis;
- reatribuição;
- abandono;
- edição;
- exclusão conforme permissão.

## Critério de conclusão

Em uma coluna de altura semelhante ao mockup cabem visivelmente mais cards do que no layout atual sem sacrificar leitura.

---

# ETAPA 9 — Tratamento especial de `Concluído`

## Objetivo

Evitar que dezenas de tarefas antigas concluídas ocupem memória e espaço visual desnecessariamente.

## ALTERAR

```text
src/components/projects/KanbanBoard.tsx
```

## Estado adicional

Criar controle como:

```text
showAllDone
collapsedDone
```

ou estrutura equivalente.

## Comportamento inicial

- mostrar apenas 5–10 concluídas mais recentes;
- ordenar pela data mais adequada disponível sem alterar persistência;
- footer:

```text
Ver mais 41 tarefas concluídas
```

## Coluna recolhível

Adicionar:

```text
Recolher concluídas
```

Quando recolhida, manter contador visível.

## Regra

Não remover tasks do estado; alterar apenas renderização.

## Critério de conclusão

Uma coluna com 100 concluídas não renderiza 100 cards simultaneamente por padrão.

---

# ETAPA 10 — Carregamento progressivo por coluna

## Objetivo

Evitar renderização simultânea de centenas de cards.

## ALTERAR

```text
src/components/projects/KanbanBoard.tsx
```

## Implementação inicial

Criar limite de renderização por coluna, por exemplo:

```text
20 cards
```

Footer:

```text
+ 29 tarefas
```

Ao clicar, aumentar lote.

## Não fazer ainda

Não instalar virtualização nesta etapa.

## Evolução futura

Se profiling demonstrar necessidade, considerar `@tanstack/react-virtual` em etapa própria.

## Critério de conclusão

Com fixture de 200 tasks, o DOM inicial contém apenas quantidade controlada de cards.

---

# ETAPA 11 — Modo `Quadro` e `Lista`

## Objetivo

Fornecer alternativa eficiente para gerenciamento de 100+ tasks.

## ALTERAR

```text
src/components/projects/KanbanBoard.tsx
src/components/projects/KanbanToolbar.tsx
```

## CRIAR

```text
src/components/projects/KanbanListView.tsx
```

## Estado

```text
viewMode: 'board' | 'list'
```

## Lista deve mostrar

```text
ID
Task
Status
Responsável
Prioridade
Prazo
GitHub/PR
```

## Regras

- utiliza o MESMO `filteredTasks`;
- não faz nova query;
- ações de editar/assumir/reatribuir devem chamar os mesmos handlers quando expostas;
- não duplicar regras de negócio.

## Persistência opcional

Salvar preferência em `localStorage` somente se isso não complicar testes.

## Critério de conclusão

Alternar Quadro/Lista não altera filtros e não perde estado das tasks.

---

# ETAPA 12 — Footer do Kanban

## Objetivo

Mostrar escala, atualização e controle de quantidade sem poluir o topo.

## ALTERAR

```text
src/components/projects/KanbanBoard.tsx
```

## Footer esperado

```text
100 tarefas     Atualizado há 1 minuto   ↻

1 2 3 ... 5 >   [20 por página]
```

## Regra importante sobre paginação

Se o backend ainda entrega todas as tasks, NÃO fingir paginação server-side.

Nesse caso:

- `20 por página` controla renderização/client-side;
- documentar internamente que é paginação visual;
- não criar URLs/offsets falsos.

Quando API ganhar paginação real, migrar separadamente.

## Atualização

Preferir timestamp da query TanStack (`dataUpdatedAt`) ou estado real disponível.

Botão `↻` deve chamar refetch/invalidate já existente, não duplicar fetch manual.

## Critério de conclusão

Footer comunica quantidade total, atualização e volume renderizado de forma verdadeira.

---

# ETAPA 13 — Sidebar: seção Ranking

## Objetivo

Adicionar ranking global à navegação lateral conforme mockup.

## ALTERAR

```text
src/components/AppSidebar.tsx
```

## CRIAR

Rotas globais recomendadas:

```text
src/routes/ranking.contributors.tsx
src/routes/ranking.committers.tsx
```

OU, se o padrão de rotas do projeto favorecer uma página única:

```text
src/routes/ranking.tsx
```

com tabs:

```text
Top Contributors | Top Committers
```

Escolher UMA abordagem após verificar convenção atual do TanStack Router. Não criar páginas duplicadas.

## Sidebar atual

Hoje existe apenas grupo `Workspace` com:

```text
Explorar Projetos
Criar Projeto
Meus Projetos
Meu Perfil
Configurações
```

## Novo grupo

Adicionar:

```text
RANKING

Top Contributors
Top Committers
```

Ícone sugerido:

```text
Trophy
```

ou ícones distintos consistentes com Lucide.

## Endpoint existente — usar, não recriar

```text
GET /rankings/contributors
GET /rankings/committers
```

## CRIAR/ALTERAR service frontend

Se ainda não existir serviço global adequado:

```text
src/services/rankings.ts
```

Adicionar funções:

```ts
getTopContributorsGlobal(limit, period)
getTopCommittersGlobal(limit, period)
```

Se esse arquivo já existir, somente ampliar/reutilizar.

## Diferenciar ranking global e do projeto

Sidebar:

```text
ranking global
```

Aba `Insights` do projeto:

```text
ranking somente daquele projeto
```

Nunca misturar queries/cache keys.

## Query keys sugeridas

```text
['rankings', 'contributors', 'global', period]
['rankings', 'committers', 'global', period]
['rankings', 'contributors', 'project', projectId]
['rankings', 'committers', 'project', projectId]
```

## Testes

Criar/alterar:

```text
src/__tests__/app-sidebar.test.tsx
src/__tests__/ranking-global.test.tsx
```

## Critério de conclusão

Sidebar exibe seção Ranking, links funcionam e dados globais vêm dos endpoints existentes.

---

# ETAPA 14 — Refinar `AppLayout` para o novo layout

## Objetivo

Garantir espaço útil suficiente para Kanban de quatro colunas.

## ALTERAR

```text
src/layouts/AppLayout.tsx
```

## Avaliar e alterar somente se necessário

Hoje `main` possui:

```text
px-4 py-6 sm:px-6 lg:px-8
```

A página do projeto não deve ficar excessivamente estreita.

Preferir que a rota do projeto use largura fluida ou `max-w-7xl`/equivalente, mantendo outras páginas estáveis.

Não alterar globalmente paddings se isso degradar dashboard/perfil.

Se necessário, adicionar mecanismo de conteúdo amplo:

```text
fullWidth/contentClassName
```

somente se o padrão de arquitetura justificar.

## Header global

Preservar:

- busca;
- notificações;
- menu do perfil;
- greeting;
- sidebar trigger.

## Critério de conclusão

Kanban possui largura suficiente sem quebrar outras rotas.

---

# ETAPA 15 — Reposicionar GitHub, Insights e Configurações

## Objetivo

Garantir que informações secundárias não apareçam antes do Kanban.

## ALTERAR

```text
src/routes/projetos.$id.tsx
```

## GitHub

Reutilizar:

```text
GithubProjectPanel
```

Somente dentro da tab GitHub.

O banner utiliza apenas resumo.

## Insights

Reutilizar:

```text
TopContributors
TopCommitters
```

Não renderizar esses componentes antes do Kanban.

## Configurações

Mover interface de:

```text
Privacidade
Links
```

para tab/modal de Configurações.

### Preservar obrigatoriamente

```text
updatePrivacy
atualizarVisibilidadeProjeto
updateLinks
atualizarLinksProjeto
```

Incluindo optimistic update, rollback, toast e invalidateQueries já existentes.

## Critério de conclusão

Ao abrir projeto, usuário vê banner + tabs + Kanban sem passar por rankings/configurações.

---

# ETAPA 16 — Responsividade

## Objetivo

Manter UX funcional de desktop a mobile.

## ALTERAR

```text
src/routes/projetos.$id.tsx
src/components/projects/ProjectHeader.tsx      (se criado)
src/components/projects/KanbanBoard.tsx
src/components/projects/KanbanToolbar.tsx
src/components/projects/KanbanFiltersDrawer.tsx
src/components/AppSidebar.tsx
```

## Desktop grande

- quatro colunas simultâneas;
- drawer lateral;
- banner em duas áreas;
- sidebar expandida.

## Notebook

- quatro colunas quando couber;
- gaps menores;
- toolbar pode quebrar em duas linhas.

## Tablet

- board com scroll horizontal;
- largura mínima por coluna;
- drawer ocupa proporção adequada.

## Mobile

Não comprimir 4 colunas.

Preferir seletor de status:

```text
A Fazer 32 | Progresso 18 | Revisão 6 | Concluídas 44
```

Renderizar uma coluna principal por vez ou scroll horizontal bem controlado.

## Critério de conclusão

Nenhum CTA ou card sai da viewport e o Kanban continua navegável em todas as larguras.

---

# ETAPA 17 — Acessibilidade

## Objetivo

Não perder acessibilidade durante aumento de complexidade.

## ALTERAR

Arquivos modificados nas etapas anteriores.

## Validar

- `aria-label` em `...`, refresh e botões apenas com ícone;
- toolbar navegável por teclado;
- drawer com foco correto;
- tabs acessíveis;
- status não depende apenas de cor;
- foco visível;
- menus acessíveis;
- scroll interno não impede navegação por teclado.

## Testes

Atualizar:

```text
src/__tests__/projetos-id-acessibilidade.test.tsx
```

## Critério de conclusão

Fluxo principal do Kanban pode ser percorrido via teclado e não há regressão nos testes existentes.

---

# ETAPA 18 — Performance com alto volume

## Objetivo

Validar empiricamente a solução antes de adicionar virtualização.

## NÃO ALTERAR primeiro

Não instalar bibliotecas automaticamente.

## Criar fixture/test helper

Criar gerador de tasks para teste, por exemplo:

```text
src/__tests__/fixtures/kanbanTasks.ts
```

com funções para gerar:

```text
20
100
200
```

tasks.

## Medir

- tempo de render inicial;
- quantidade de cards no DOM;
- fluidez de scroll;
- drag and drop;
- troca de filtros;
- troca Quadro/Lista.

## Somente se necessário

Criar etapa adicional de virtualização usando ferramenta compatível, preferencialmente TanStack Virtual.

## Critério de conclusão

100 tasks permanecem utilizáveis sem renderização desnecessária de todos os cards e sem travamento perceptível.

---

# ETAPA 19 — Testes funcionais completos

## ALTERAR/CRIAR

```text
src/__tests__/kanban-scale.test.tsx
src/__tests__/kanban-filters.test.tsx
src/__tests__/kanban-list-view.test.tsx
src/__tests__/app-sidebar.test.tsx
src/__tests__/ranking-global.test.tsx
```

Atualizar testes atuais da rota quando necessário.

## Casos obrigatórios

### Kanban

- 1 task;
- 20 tasks;
- 100 tasks;
- colunas corretas;
- contadores corretos;
- scroll container presente;
- concluídas limitadas;
- carregar mais;
- recolher concluídas;
- Quadro/Lista.

### Filtros

- busca;
- minhas tarefas;
- sem responsável;
- atrasadas;
- alta prioridade;
- responsável;
- prioridade;
- combinação múltipla;
- limpar seção;
- limpar todos.

### Regras existentes

- claim;
- abandon;
- reassign;
- move;
- edit;
- GitHub badge/activity.

### Sidebar

- grupo Ranking;
- item ativo;
- modo collapsed;
- links globais.

### Permissões

- owner;
- membro;
- visitante.

---

# ETAPA 20 — Regressão final e fechamento

## Objetivo

Garantir que a refatoração não destruiu funcionalidades já entregues.

## Validar obrigatoriamente

```text
KanbanBoard
KanbanToolbar
drag and drop
criação de task
edição de task
subtasks
assumir tarefa
abandonar tarefa
remover responsável
reatribuir tarefa
histórico de responsáveis
habilidades
dificuldade
GitHubTaskBadge
GitHubTaskActivity
GithubProjectPanel
PR/review/done
TasksRecomendadas
ProjectTimeline
Mural
MembersList
Vagas
Applications
TopContributors projeto
TopCommitters projeto
TopContributors global
TopCommitters global
privacidade
links
encerrar projeto
sair do projeto
loading
error state
retry
sidebar collapsed
busca global
notificações
perfil
```

## Comandos finais

```bash
npm test
npm run lint
npm run build
```

## Critério final

Nenhuma regressão conhecida e todos os gates anteriores fechados.

---

# 4. Mapa consolidado de arquivos

## Arquivos que CERTAMENTE devem ser ALTERADOS

```text
src/routes/projetos.$id.tsx
src/components/projects/KanbanBoard.tsx
src/components/projects/KanbanToolbar.tsx
src/components/AppSidebar.tsx
```

## Arquivos que provavelmente serão ALTERADOS

```text
src/layouts/AppLayout.tsx
src/services/rankings.ts                    (se já existir)
src/__tests__/projetos-id-lazy-loading.test.tsx
src/__tests__/projetos-id-papeis.test.tsx
src/__tests__/projetos-id-acessibilidade.test.tsx
```

## Arquivos recomendados para CRIAR

```text
src/components/projects/ProjectHeader.tsx
src/components/projects/KanbanFiltersDrawer.tsx
src/components/projects/KanbanListView.tsx
src/components/projects/KanbanTaskCard.tsx        (somente se extração for útil)
src/types/kanbanFilters.ts                         (ou tipo junto ao toolbar)
src/routes/ranking.tsx                             (ou duas rotas específicas)
src/__tests__/kanban-scale.test.tsx
src/__tests__/kanban-filters.test.tsx
src/__tests__/kanban-list-view.test.tsx
src/__tests__/app-sidebar.test.tsx
src/__tests__/ranking-global.test.tsx
src/__tests__/fixtures/kanbanTasks.ts
```

## Componentes existentes que NÃO devem ser recriados

```text
GithubProjectPanel
GithubTaskBadge
GithubTaskActivity
TopCommitters
TopContributors
TasksRecomendadas
ProjectTimeline
MembersList
Vagas
Applications
Mural
```

---

# 5. Resultado visual esperado

```text
┌──────────────────────────────────────────────────────────────────────┐
│ API DE PAGAMENTOS                         [+ Nova tarefa] [Convidar] │
│ [Aberto]                                                     [...]   │
│ API de testes para processamento...                                │
│ [Node.js] [React] [TypeScript] [PostgreSQL]                        │
│ 1/5 membros · Criado por Matheus · 10/08/2026                     │
│ GitHub MatheusVRibeiro/api-pagamentos · main     Conectado ✓       │
└──────────────────────────────────────────────────────────────────────┘

Kanban | Atividade | Equipe | GitHub | Insights | Configurações

[Buscar tarefas...] [Minhas] [Sem responsável] [Atrasadas] [Alta]
[Responsável ▾] [Prioridade ▾] [Mais filtros]      [Quadro | Lista]

┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ A FAZER     32 │ │ PROGRESSO   18 │ │ REVISÃO      6 │ │ CONCLUÍDO   44 │
│ ────────────── │ │ ────────────── │ │ ────────────── │ │ ────────────── │
│ card           │ │ card           │ │ card           │ │ card           │
│ card           │ │ card           │ │ card           │ │ card           │
│ card           │ │ card           │ │ card           │ │ card           │
│ ↕ scroll       │ │ ↕ scroll       │ │ ↕ scroll       │ │ ver mais 41    │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘

100 tarefas · atualizado há 1 min                        20 por página
```

Sidebar:

```text
MonteSquad

Workspace
Explorar Projetos
Criar Projeto
Meus Projetos
Meu Perfil
Configurações

RANKING
Top Contributors
Top Committers

Sair
```

---

# 6. Gate final do projeto

A implementação só pode ser declarada concluída quando:

```text
[ ] banner está compacto e conforme hierarquia aprovada
[ ] status/badge aparecem corretamente
[ ] membros, criador e data aparecem no banner
[ ] GitHub repo + branch + estado conectado aparecem no banner
[ ] Kanban é a primeira área operacional
[ ] tabs foram agrupadas
[ ] sidebar possui Ranking
[ ] Top Contributors global funciona
[ ] Top Committers global funciona
[ ] ranking do projeto continua separado em Insights
[ ] Kanban possui altura controlada
[ ] cada coluna possui scroll interno
[ ] headers das colunas permanecem visíveis
[ ] contadores funcionam
[ ] quick filters funcionam
[ ] drawer avançado funciona
[ ] filtros combinados funcionam
[ ] limpar filtros funciona
[ ] cards são compactos
[ ] existe apenas uma ação primária de assumir tarefa
[ ] concluídas são limitadas/recolhíveis
[ ] carregamento progressivo funciona
[ ] modo Quadro funciona
[ ] modo Lista funciona
[ ] footer comunica total e atualização corretamente
[ ] não existe paginação falsa declarada como backend
[ ] 100 tasks foram testadas
[ ] drag-and-drop continua funcionando
[ ] GitHub task integrations continuam funcionando
[ ] permissões continuam funcionando
[ ] mobile/tablet/desktop foram validados
[ ] acessibilidade foi validada
[ ] testes passam
[ ] lint passa
[ ] build passa
[ ] nenhuma regressão conhecida
```

---

# 7. Prompt operacional resumido para o executor

```text
Você é o agente executor responsável pela refatoração do Kanban e tela de projeto do MonteSquad.

Leia este documento inteiro antes de modificar código.

Trabalhe estritamente em ordem de etapas.
Não pule etapas.
Não implemente a próxima antes de fechar o gate da atual.

Você pode delegar trabalhos independentes a subagentes, mas deve:
- definir ownership de arquivos;
- impedir edição simultânea do mesmo arquivo;
- revisar tecnicamente toda entrega;
- integrar;
- testar;
- validar regressão;
- fechar o gate.

Enquanto espera subagentes, apenas planeje a próxima etapa; não a implemente.

Não recrie funcionalidades existentes.
Reutilize obrigatoriamente KanbanBoard, GithubProjectPanel, rankings, timeline, mural, membros, vagas, candidaturas e integrações GitHub já existentes.

Os arquivos centrais obrigatórios da refatoração são:
- src/routes/projetos.$id.tsx
- src/components/projects/KanbanBoard.tsx
- src/components/projects/KanbanToolbar.tsx
- src/components/AppSidebar.tsx

O resultado final deve continuar simples com poucas tasks e permanecer eficiente com 100+ tasks.
```
