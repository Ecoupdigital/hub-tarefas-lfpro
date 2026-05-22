---
status: testing
phase: 03-views-notion-style-com-toggle-de-estilo
source:
  - 03-01-SUMMARY.md
  - 03-02-SUMMARY.md
  - 03-03-SUMMARY.md
  - 03-03b-SUMMARY.md
  - 03-04-SUMMARY.md
  - 03-05-SUMMARY.md
  - 03-06-SUMMARY.md
  - 03-07-SUMMARY.md
started: 2026-05-22T17:30:00Z
updated: 2026-05-22T17:30:00Z
---

## Teste Atual

number: 1
name: Toggle LFPro/Notion visivel
expected: |
  Abrir uma pagina com bloco database. No header das tabs da database (perto dos nomes
  das views), aparece um segmented control com dois botoes: "LFPro" e "Notion".
  O botao ativo tem fundo branco e sombra leve; o inativo fica cinza claro.
awaiting: resposta do usuario

## Testes

### 1. Toggle LFPro/Notion visivel
expected: Segmented control "LFPro / Notion" no header da view ativa
result: [pendente]

### 2. Toggle persiste apos refresh
expected: Selecionar "Notion", recarregar pagina (F5), view continua em Notion. Cada view (Tabela/Kanban/Calendar/Lista) mantem seu estilo de forma independente.
result: [pendente]

### 3. NotionTableView renderiza corretamente
expected: |
  Trocar para Notion na view Tabela. Tabela com cabecalho cinza (sem warm gold),
  rows compactas (~32px), icone lucide a esquerda do nome de cada coluna (text, status,
  date, people, etc), sem zebra striping, hover na row mostra fundo sutil.
result: [pendente]

### 4. Edit inline NotionTableView
expected: |
  Clicar em uma celula (text/number/date/status/dropdown/checkbox) edita inline,
  SEM abrir popover. Editor aparece no lugar da celula. Status/dropdown usam <select>
  nativo HTML5. People e read-only (so visualiza, nao edita).
result: [pendente]

### 5. NotionKanbanView renderiza corretamente
expected: |
  Trocar para Notion na view Kanban. Colunas verticais por status. Cada coluna tem
  header sutil com nome do status + contador entre parenteses. Cards limpos com
  nome do item na primeira linha e 2-3 props nas linhas seguintes (default:
  status, date, people).
result: [pendente]

### 6. Drag de card Kanban entre status
expected: |
  Arrastar card de uma coluna para outra atualiza o status do item. Card mantem
  os dados (so muda o agrupamento). Refresh persiste o novo status.
result: [pendente]

### 7. NotionCalendarView grid de mes
expected: |
  Trocar para Notion na view Calendar. Grid 7 colunas x 5-6 linhas (mes cheio).
  Eventos aparecem como pilulas coloridas (cor por status) com texto truncado
  empilhadas no dia. Header tem mes/ano + botoes <, >, "Hoje" + toggle Semana/Mes.
result: [pendente]

### 8. Toggle Semana/Mes no Calendar
expected: |
  Clicar em "Semana" mostra grid de 7 colunas com apenas a semana atual. Clicar em
  "Mes" volta para grid mes cheio. Navegacao com <, > funciona em ambos modos.
result: [pendente]

### 9. NotionListView linhas + chips
expected: |
  Trocar para Notion na view Lista. Linhas compactas (~40px) com nome do item
  inline + props como chips horizontais a direita (NAO empilhados embaixo do nome,
  diferente da DatabaseListView LFPro). Paleta cinza pura (sem warm gold visivel).
result: [pendente]

### 10. Paleta cinza Notion (sem warm gold)
expected: |
  Em todas as 4 Notion views, NENHUM elemento usa a cor warm gold da LFPro
  (hsl 29 45% 71%). Cabecalhos, hover, bordas, chips de status devem ser
  cinzas neutros. Dark mode tambem cinza neutro (sem variantes warm).
result: [pendente]

### 11. LFPro intacto (sem regressao)
expected: |
  Trocar de volta para LFPro em qualquer view. A view renderiza identica ao
  comportamento anterior a esta fase. Warm gold reaparece no LFPro (badges,
  hover, etc). Sem regressao visual ou funcional.
result: [pendente]

### 12. Trocar estilo nao perde dados
expected: |
  Editar um item, trocar de LFPro para Notion (e vice versa), o item continua
  com os dados atualizados. Realtime continua funcionando (outra aba reflete
  mudancas). Nenhuma escrita extra no banco ao trocar style (so re-render).
result: [pendente]

## Resumo

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0

## Lacunas

[nenhuma ainda]
