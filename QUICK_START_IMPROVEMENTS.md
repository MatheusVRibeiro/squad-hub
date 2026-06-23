# 🎯 Guia Rápido - Melhorias de Regras de Negócio Implementadas

## ✨ O Que Mudou

### 1. **Múltiplos Responsáveis por Task** ✅

**Antes**: Uma tarefa tinha apenas 1 responsável
**Agora**: Uma tarefa pode ter 0, 1 ou vários responsáveis

#### Como usar:

```
1. Clique na task card na coluna
2. Clique no botão de "Responsável" (User icon)
3. Dropdown mostra quem está atribuído e membros disponíveis
4. Clique num membro para ADICIONAR à tarefa
5. Clique no X ao lado de um responsável para REMOVER
6. Ou clique "Limpar todos" para remover todos
```

**Exemplo visual**:

```
┌─────────────────────────────┐
│ Implementar OAuth2          │
├─────────────────────────────┤
│ 👥 2 responsáveis           │  ← clique aqui
│                             │
│ ✓ João Silva                │
│ ✓ Maria Santos              │
│                             │
│ ─────────────────────────   │ (dropdown aberto)
│ □ Bruno Lima                │
│ □ Ana Souza                 │
│ Limpar todos                │
└─────────────────────────────┘
```

---

### 2. **Validação ao Mover para "Em Progresso"** ✅

**Regra**: Não pode mover para "DOING" sem atribuir alguém

**O que acontece**:

```
Usuario tenta arrastar task para "Em progresso"
        ↓
Sistema verifica: tem assignee?
        ↓
❌ NÃO → Toast: "⚠️ Atribua pelo menos uma pessoa antes de iniciar"
✅ SIM → Move task e notifica responsáveis
```

---

### 3. **Validação ao Finalizar "Concluído"** ✅

**Regra**: Não pode marcar como "DONE" sem atribuir alguém

**O que acontece**:

```
Usuario arrasta task para "Concluído"
        ↓
Sistema verifica: tem assignee?
        ↓
❌ NÃO → Toast: "⚠️ Atribua pelo menos uma pessoa antes de marcar como concluída"
✅ SIM → Move task, salva timestamp (completedAt), notifica
```

---

### 4. **Novo Campo: Estrutura Preparada** 🏗️

Os seguintes campos foram adicionados ao tipo `KanbanTask`:

| Campo            | Tipo                                        | Descrição                           |
| ---------------- | ------------------------------------------- | ----------------------------------- |
| `assignees`      | `string[]`                                  | Lista de responsáveis (novo)        |
| `priority`       | `"low" \| "medium" \| "high" \| "critical"` | Prioridade da task (estrutura)      |
| `dueDate`        | `string` (ISO)                              | Data limite (estrutura)             |
| `estimatedHours` | `number`                                    | Horas estimadas (estrutura)         |
| `completedAt`    | `string` (ISO)                              | Data/hora conclusão (estrutura)     |
| `subtasks`       | `object[]`                                  | Checklist de subtarefas (estrutura) |

---

## 🔄 Fluxo Recomendado

### Para um Membro

```
1. Tarefa criada em "A fazer"
   └─ Criador: cria task com título + descrição

2. Adicionar responsável
   └─ Clique no dropdown > selecione seu nome
   └─ Toast: "Tarefa agora com 1 responsável(s)"

3. Mover para "Em progresso"
   ✅ Agora permite (tem responsável)
   └─ Sistema salva transição

4. Trabalhar na tarefa...
   └─ Acompanhar progresso via Mural/comentários

5. Marcar como "Concluído"
   ✅ Agora permite (tem responsável)
   └─ Sistema salva `completedAt` = agora
   └─ Notifica donos do projeto
```

### Para Múltiplos Responsáveis

```
1. Task criada: "Implementar auth OAuth2"

2. Lead atribui DOIS membros:
   ├─ Clique dropdown
   ├─ Seleciona "João Silva" → adicionado ✓
   ├─ Seleciona "Maria Santos" → adicionada ✓
   └─ Task mostra: "2 responsáveis"

3. Ambos veem a tarefa com seus nomes
   └─ Notification: ambos recebem aviso

4. Colaboram e movem juntos
   └─ Qualquer um pode mover para "Em progresso"
   └─ Ambos completam = vai para "Concluído"
```

---

## 📊 Próximas Melhorias (Roadmap)

### Phase 2 - UI/UX

- [ ] Mostrar avatares dos responsáveis (em vez de só nomes)
- [ ] Badges de cor para prioridades (low=blue, high=red, critical=red-dark)
- [ ] Tooltip com `dueDate` (mostra dias restantes)
- [ ] Subtasks com checklist interativo

### Phase 3 - Relatórios

- [ ] Burndown chart (tarefas/dia restante)
- [ ] Velocity: tarefas por semana
- [ ] Gráfico: quem completa mais tasks?
- [ ] Atraso: tarefas vencidas em DOING/TODO

### Phase 4 - Automações

- [ ] Sugerir responsáveis baseado em skills
- [ ] Notificar se task em DOING há 5+ dias
- [ ] Auto-assign: se você criou, é responsável
- [ ] Webhook Slack: "Task concluída" → notifica canal

---

## 🐛 Como Testar

### Teste 1: Múltiplos Responsáveis

```
1. Abra um projeto
2. Vá ao Kanban Board
3. Clique na task card
4. Clique "Responsável" (User icon)
5. Selecione 2-3 membros
6. ✅ Verificar que aparecem na lista com X para remover
```

### Teste 2: Validação ao Mover para DOING

```
1. Crie uma nova task (vai para TODO)
2. Tente arrastar para "Em progresso" SEM atribuir
3. ❌ Deve mostrar toast: "Atribua pelo menos uma pessoa..."
4. Agora atribua alguém
5. ✅ Agora permite mover
```

### Teste 3: Validação ao Mover para DONE

```
1. Mova task de TODO → DOING (com responsável atribuído)
2. Agora mova para DONE
3. ✅ Deve aceitar (tem responsável)
4. Verificar `completedAt` foi salvo
```

---

## 💾 Dados Persistidos

Todas as mudanças são salvas em `localStorage`:

```javascript
// Chave para cada projeto
@montesquad:project-detail:{projectId}

// Estrutura salva
{
  ...projectData,
  tasks: [
    {
      id: "t1",
      title: "...",
      assignees: ["João Silva", "Maria Santos"],  // novo
      priority: "high",                            // novo (estrutura)
      dueDate: "2026-06-30T23:59:59Z",            // novo (estrutura)
      completedAt: "2026-06-15T14:30:00Z",        // novo (estrutura)
      status: "done"
    }
  ]
}
```

---

## ❓ FAQ

**P: Posso atribuir a mesma pessoa múltiplas vezes?**
R: Não, o sistema evita duplicatas. Se você clicar no mesmo membro 2x, nada acontece.

**P: Ao remover todos os responsáveis, a tarefa volta pra TODO?**
R: Não, você pode ter task em DOING/DONE sem responsável (apenas não pode MOVER para DOING/DONE sem).

**P: Os assignees são salvos em tempo real?**
R: Sim, cada mudança é persistida no localStorage (e enviada via API se backend estiver disponível).

**P: Quando usar "Pegar tarefa" vs dropdown?**
R: "Pegar tarefa" = atalho para adicionar você em 1 clique.
Dropdown = controle total (adicionar outros, remover, etc).

---

## 🎓 Conceitos

**Assignees vs Assignee**:

- `assignee` (antigo): string, compatibilidade retroativa
- `assignees` (novo): array, suporta múltiplos
- Quando salva `assignees`, sincroniza `assignee = assignees[0]`

**Validações de Transição**:

- TODO → DOING: ✅ requer 1+ responsável
- DOING → TODO: ✅ qualquer hora
- DOING → DONE: ✅ requer 1+ responsável
- DONE → DOING: ✅ qualquer hora
- DONE → TODO: ✅ qualquer hora

---

**Dúvidas? Veja `BUSINESS_IMPROVEMENTS.md` para visão completa de roadmap! 🚀**
