

# Plano de Melhorias: Personalizacao de Colunas e Temporalizacao de Tarefas

## Problemas Identificados

Apos analise completa do codigo, identifiquei os seguintes problemas:

### Problemas de Personalizacao de Colunas
1. **CreateColumnModal ja tem a interface de status labels e dropdown options**, mas pode nao estar funcionando corretamente porque o modal pode nao estar sendo aberto (o botao de criar coluna esta dentro do GroupSection e depende do fluxo correto)
2. **EditColumnModal existe e funciona**, mas o clique no header da coluna que abre o modal pode estar com problemas de propagacao de evento ou de estado
3. **StatusCell nao permite adicionar novos labels "on the fly"** - so mostra os labels existentes, sem opcao de editar/criar direto na celula
4. **DropdownCell nao permite adicionar opcoes inline** - se as opcoes vieram vazias da criacao, ficam vazias para sempre (ate abrir EditColumnModal)
5. **Nao ha preview visual dos labels ao criar** - o usuario nao ve como vai ficar a aparencia do status antes de criar
6. **Color picker nativo do HTML e muito limitado** - precisa de uma paleta de cores pre-definidas mais bonita

### Problemas de Temporalizacao (TimeTracking)
7. **Timer nao persiste entre sessoes** - ao recarregar a pagina, o timer reseta (estado "running" fica apenas em useState local)
8. **Nao salva historico de sessoes** - so salva o total acumulado, sem saber quando comecou/parou
9. **Chama onChange a cada 1 segundo** - gera uma chamada ao banco por segundo, sem debounce
10. **Nao mostra estimativa de tempo** - nao tem campo para definir tempo estimado e comparar com gasto
11. **Nao tem log de sessoes** - impossivel ver "trabalhei das 10h as 12h"
12. **Sem relatorio de tempo** - nao ha totalizacao por grupo/board/periodo

---

## Fase 1: Corrigir e Melhorar Modal de Criacao de Colunas (6 melhorias)

### Arquivos a modificar:
- `src/components/modals/CreateColumnModal.tsx`

### Melhorias:

**1. Paleta de cores visual** - Substituir o `<input type="color">` por uma grade de cores pre-definidas (10 cores do Monday) + opcao de cor personalizada. Cada cor e um circulo clicavel com check quando selecionada.

**2. Preview visual de labels** - Ao configurar status labels, mostrar uma preview de como ficara a celula de status (badge colorido com o nome).

**3. Validacao de labels** - Impedir criar coluna de status sem pelo menos 1 label com nome preenchido. Mostrar erro inline.

**4. Templates de status** - Botoes rapidos para carregar configuracoes pre-prontas: "Basico (A Fazer/Em Progresso/Concluido)", "Prioridade (Baixa/Media/Alta/Critica)", "Aprovacao (Pendente/Aprovado/Rejeitado)".

**5. Drag para reordenar labels** - Permitir arrastar os labels de status para mudar a ordem em que aparecem no dropdown.

**6. Valores default para cada tipo** - Ao selecionar tipo "tags", pre-carregar com tags de exemplo. Ao selecionar "rating", mostrar preview de estrelas. Ao selecionar "progress", mostrar preview da barra.

---

## Fase 2: Melhorar Modal de Edicao de Colunas (5 melhorias)

### Arquivos a modificar:
- `src/components/modals/EditColumnModal.tsx`

### Melhorias:

**7. Mesma paleta de cores visual** da Fase 1 (reutilizar componente).

**8. Aviso ao excluir label em uso** - Antes de remover um label de status, verificar se ha itens usando aquele label e mostrar aviso: "3 itens usam este label. Eles ficarao sem status."

**9. Renomear label com propagacao** - Ao renomear um label, os itens que usam o label antigo continuam funcionando (ja funciona pois usam ID, nao nome).

**10. Historico de alteracoes** - Mostrar "Ultima alteracao: ha 2 dias" no footer do modal.

**11. Duplicar coluna** - Botao para criar copia da coluna com mesmas configuracoes mas novo titulo.

---

## Fase 3: StatusCell com Edicao Inline (4 melhorias)

### Arquivos a modificar:
- `src/components/board/StatusCell.tsx`

### Melhorias:

**12. Botao "Editar labels" no dropdown do status** - Ao clicar na celula de status e ver a lista de labels, mostrar um link "Editar labels" no rodape que abre o EditColumnModal.

**13. Busca de labels** - Quando ha mais de 5 labels, mostrar um campo de busca no topo do dropdown.

**14. Label "Nenhum" com visual diferenciado** - Em vez de "Limpar" com texto cinza, mostrar como um label real com icone de X.

**15. Animacao de transicao** - Ao trocar de status, animar a mudanca de cor com fade suave (CSS transition).

---

## Fase 4: DropdownCell Melhorado (3 melhorias)

### Arquivos a modificar:
- `src/components/board/DropdownCell.tsx`

### Melhorias:

**16. Adicionar opcao inline** - Botao "+ Nova opcao" no rodape do dropdown que permite digitar e adicionar uma nova opcao sem precisar ir ao EditColumnModal. Salva a nova opcao no settings da coluna.

**17. Busca de opcoes** - Campo de busca quando ha mais de 5 opcoes.

**18. Cores automaticas para opcoes** - Cada opcao recebe uma cor automatica (da paleta de 10 cores) para melhor diferenciacao visual.

---

## Fase 5: Sistema de Temporalizacao Completo (12 melhorias)

### Arquivos a criar:
- `src/components/board/TimeTrackingDetailModal.tsx` - Modal com detalhes completos de tempo

### Arquivos a modificar:
- `src/components/board/TimeTrackingCell.tsx` - Refatorar completamente
- `src/hooks/useSupabaseData.ts` - Adicionar queries de time sessions

### Melhorias:

**19. Persistir estado "running" no banco** - Salvar `startedAt` (timestamp de quando o timer foi iniciado) no JSONB do column_value. Ao recarregar, calcular o tempo decorrido desde `startedAt` e retomar contagem.

**20. Debounce no save** - Salvar o tempo acumulado a cada 30 segundos em vez de 1 segundo. Manter contagem local no state.

**21. Sessoes de trabalho** - Armazenar array de sessoes no JSONB: `{ sessions: [{ start: "2024-01-01T10:00", end: "2024-01-01T12:00", duration: 7200 }], totalSeconds: 7200, runningFrom: null }`. Cada Play/Pause cria uma nova sessao.

**22. Modal de detalhes de tempo** - Ao clicar no tempo acumulado (nao no botao play), abrir modal mostrando:
   - Tempo total acumulado
   - Lista de sessoes (data + hora inicio/fim + duracao)
   - Botao para adicionar tempo manual
   - Botao para editar/excluir sessoes

**23. Adicionar tempo manual** - No modal, campo para digitar "2h 30m" e adicionar como uma sessao manual.

**24. Tempo estimado** - Campo opcional no settings da coluna time_tracking para definir estimativa (ex: 8h). A celula mostra "3h / 8h" com barra de progresso.

**25. Visual de excesso** - Quando tempo gasto > estimado, a barra fica vermelha e mostra "+2h acima do estimado".

**26. Reset de timer** - Botao para zerar todo o tempo acumulado (com confirmacao).

**27. Formatacao inteligente** - Mostrar "1d 2h" quando passar de 24h, "1sem 3d" quando passar de 7 dias.

**28. Indicador de timer ativo** - Quando o timer esta rodando, mostrar um ponto verde pulsante na celula. Na sidebar, mostrar badge indicando que ha timers ativos no board.

**29. Sumario de tempo por grupo** - No footer do grupo, mostrar soma total de todas as celulas de time_tracking.

**30. Impedir multiplos timers simultaneos** - Ao iniciar um timer, pausar automaticamente qualquer outro timer ativo no mesmo board (opcional, configuravel).

---

## Fase 6: Integracao da Temporalizacao no Painel de Detalhes (3 melhorias)

### Arquivos a modificar:
- `src/components/board/ItemDetailPanel.tsx`

### Melhorias:

**31. Widget de timer no header do painel** - Quando o item tem coluna de time_tracking, mostrar mini-timer no header do painel de detalhes com botao play/pause e tempo acumulado.

**32. Tab "Tempo" no painel** - Nova aba mostrando todas as sessoes de trabalho do item, com timeline visual (barras horizontais representando as sessoes no dia).

**33. Notas por sessao** - Permitir adicionar nota de texto a cada sessao de trabalho (ex: "Trabalhei na parte visual").

---

## Fase 7: Componente Reutilizavel de Paleta de Cores (1 melhoria)

### Arquivos a criar:
- `src/components/ui/color-palette.tsx`

### Melhorias:

**34. Componente ColorPalette** - Componente reutilizavel com:
   - Grade de 10-15 cores pre-definidas (estilo Monday.com)
   - Opcao "Cor personalizada" que abre input color nativo
   - Indicador visual de cor selecionada (check mark)
   - Usado em: CreateColumnModal, EditColumnModal, CreateGroupModal

---

## Resumo Tecnico

### Novos arquivos (2):
- `src/components/board/TimeTrackingDetailModal.tsx`
- `src/components/ui/color-palette.tsx`

### Arquivos a modificar (7):
- `src/components/modals/CreateColumnModal.tsx` - Paleta de cores, preview, templates, validacao
- `src/components/modals/EditColumnModal.tsx` - Paleta de cores, aviso de exclusao, duplicar coluna
- `src/components/board/StatusCell.tsx` - Editar inline, busca, animacao
- `src/components/board/DropdownCell.tsx` - Adicionar opcao inline, busca, cores
- `src/components/board/TimeTrackingCell.tsx` - Refatorar: persistencia, sessoes, debounce, estimativa
- `src/components/board/ItemDetailPanel.tsx` - Widget timer, aba Tempo
- `src/hooks/useSupabaseData.ts` - Mutations de time sessions

### Estrutura de dados para TimeTracking (JSONB no column_values):
```text
{
  "sessions": [
    { "start": "ISO-date", "end": "ISO-date", "duration": 7200, "note": "..." },
    { "start": "ISO-date", "end": null, "duration": 0, "note": "" }
  ],
  "totalSeconds": 7200,
  "runningFrom": "ISO-date-or-null",
  "estimatedSeconds": 28800
}
```

### Ordem de execucao:
1. Fase 7 - Componente ColorPalette (dependencia das outras fases)
2. Fase 1 - CreateColumnModal melhorado
3. Fase 2 - EditColumnModal melhorado
4. Fase 3 - StatusCell com edicao inline
5. Fase 4 - DropdownCell melhorado
6. Fase 5 - TimeTracking completo
7. Fase 6 - Integracao tempo no painel

Total: **34 melhorias** em 7 fases, focadas em personalizacao de colunas e temporalizacao.

