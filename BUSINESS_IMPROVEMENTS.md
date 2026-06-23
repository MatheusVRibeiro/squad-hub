# 📋 Sugestões de Melhorias de Regras de Negócio - Squad Hub

## ✅ Implementações Realizadas

### 1. **Múltiplos Responsáveis por Task (✅ Em Progresso)**

- **O quê**: Permitir atribuir uma tarefa a um ou mais membros simultáneamente
- **Por quê**: Tarefas colaborativas são mais realistas; cada membro vê suas responsabilidades
- **Como**:
  - Campo `assignees: string[]` adicionado ao tipo `KanbanTask`
  - UI mostra avatares de todos os responsáveis
  - Botão "Pegar tarefa" adiciona você à lista de responsáveis
  - Dropdown permite adicionar/remover múltiplos membros

### 2. **Priorização de Tasks (✅ Estrutura)**

- **O quê**: Adicionar níveis de prioridade (low, medium, high, critical)
- **Benefício**: Equipe sabe o que fazer primeiro
- **Campo adicionado**: `priority?: "low" | "medium" | "high" | "critical"`

### 3. **Datas Limites e Estimativas (✅ Estrutura)**

- **O quê**:
  - `dueDate`: data limite para conclusão
  - `estimatedHours`: tempo estimado de trabalho
- **Benefício**: Visibilidade de prazos e alocação de capacidade
- **UI**: Mostrar aviso visual quando vencida

### 4. **Histórico de Conclusão (✅ Estrutura)**

- **O quê**: Campo `completedAt` marca quando a tarefa foi finalizada
- **Benefício**: Relatórios de velocidade, burndown charts, análise de produtividade
- **Tipo**: ISO timestamp (automático ao mover para "done")

### 5. **Subtarefas Opcionais (✅ Estrutura)**

- **O quê**: Dividir tarefas grandes em checklist
- **Campo**: `subtasks: { id, title, completed }[]`
- **UI**: Checkbox para marcar subtarefas completas
- **Regra**: Task só vai para "done" se 100% subtarefas completas

---

## 🚀 Sugestões de Melhorias Adicionais (Roadmap)

### 6. **Validação de Transições de Status**

```
TODO → DOING:
  ⚠️ Requer: Pelo menos 1 responsável
  ✅ Ação: Mostrar tooltip se não tiver assignee
  ✅ Notificação: Avisar membros que foram adicionados

DOING → DONE:
  ⚠️ Requer:
    - Todos os subtasks completos (se houver)
    - Pelo menos 1 responsável
  ✅ Ação: Salvar timestamp em `completedAt`
  ✅ Notificação: Avisar donos do projeto
```

### 7. **Campos Customizáveis por Task**

```
- Tags (ex: "bug", "feature", "refactor", "docs")
- Estimativa de complexidade (story points)
- Labels de tecnologia (ex: "frontend", "backend")
- Dependências entre tarefas (bloqueia outra?)
```

### 8. **Comentários e Atividade dentro da Task**

```
- Thread de comentários (like Figma/Jira)
- @mencionar membros
- Histórico de mudanças (quem moveu, quando, porquê)
- Anexos/links de referência
```

### 9. **Automatizações (Regras de Negócio Avançadas)**

```
- Mover para DONE automaticamente se data limite vencida?
- Notificar @responsável se task está em DOING há 5+ dias?
- Sugerir tarefas baseado em skills do membro?
- Auto-assign: se criou, você é responsável?
```

### 10. **Relatórios e Dashboards**

```
- Burndown chart (tasks/dia restante do sprint)
- Velocity: quantas tarefas/horas por semana
- Gráfico de membros: quem completa mais tasks?
- Atraso: tarefas vencidas em DOING/TODO
- Distribuição de prioridades
```

### 11. **Sprints e Planejamento**

```
- Agrupar tasks em sprints (1-4 semanas)
- Sprint board separado
- Planning: estimar/priorizar antes de iniciar sprint
- Retrospectiva: lessons learned, velocity tracking
```

### 12. **Integração com Comunicação**

```
- Slack: notificações quando task é atribuída
- Discord: webhook ao finalizar task
- Email: resumo semanal de progresso
- Timeline visual: todas as atividades em cronograma
```

---

## 📊 Exemplo de Tarefa com Todas as Melhorias

```json
{
  "id": "t123",
  "title": "Implementar autenticação OAuth2",
  "description": "Adicionar login com Google e GitHub",

  "status": "doing",
  "priority": "high",
  "dueDate": "2026-06-30T23:59:59Z",
  "estimatedHours": 8,
  "completedAt": null,

  "assignees": ["João Silva", "Maria Santos"],
  "subtasks": [
    { "id": "st1", "title": "Setup Google OAuth provider", "completed": true },
    { "id": "st2", "title": "Setup GitHub OAuth provider", "completed": false },
    { "id": "st3", "title": "Token refresh logic", "completed": false },
    { "id": "st4", "title": "Test login flow", "completed": false }
  ],

  "tags": ["feature", "security", "backend"],
  "storyPoints": 13,
  "dependencies": [],

  "comments": [
    {
      "author": "João Silva",
      "text": "@Maria Já fiz o setup do Google, você cuida do GitHub?",
      "createdAt": "2026-06-15T10:30:00Z"
    }
  ]
}
```

---

## 🔄 Matriz de Transições Sugeridas

| De    | Para  | Validações                            | Notificações               |
| ----- | ----- | ------------------------------------- | -------------------------- |
| TODO  | DOING | ✓ Min 1 assignee                      | Assignees                  |
| DOING | TODO  | ✓ Nenhuma                             | —                          |
| DOING | DONE  | ✓ 100% subtasks <br> ✓ Min 1 assignee | Assignees + Project Owners |
| DONE  | DOING | ✓ Nenhuma                             | —                          |
| DONE  | TODO  | ✓ Nenhuma                             | —                          |

---

## 🎯 Priorização de Implementação

### Fase 1 (Sprint Atual)

- [x] Estrutura: múltiplos assignees, prioridade, dueDate
- [ ] UI: mostrar múltiplos avatares
- [ ] Validação: require assignee para DOING

### Fase 2 (Próximo Sprint)

- [ ] Subtasks com checklist
- [ ] Comentários simples por task
- [ ] Filtro por assignee, prioridade

### Fase 3 (Futuro)

- [ ] Sprints
- [ ] Burndown chart
- [ ] Integrações externas

---

## 💡 Boas Práticas Recomendadas

1. **Normalizar nomes de responsáveis** → sempre usar ID + nome (evita duplicação)
2. **Soft delete**: não apagar tasks, marcar com flag `archived: true`
3. **Auditoria**: log todas as mudanças em `activityLog: [{action, by, at, old, new}]`
4. **Versionamento**: manter `createdAt`, `updatedAt` em todas as tasks
5. **Sincronização offline**: salvar local, sincronizar quando online
6. **Notificações em tempo real**: usar WebSocket para updates live (não polling)
