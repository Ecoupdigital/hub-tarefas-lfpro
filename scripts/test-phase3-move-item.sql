-- ============================================================
-- SCRIPT DE TESTE — Fase 3: Fix "Mover para Grupo"
-- Execute no Supabase SQL Editor
-- ============================================================

-- TESTE 1: Verificar RLS na tabela items
-- A política deve permitir UPDATE para membros do workspace
SELECT
  polname AS policy_name,
  polcmd  AS command,
  polroles::text,
  pg_get_expr(polqual, polrelid) AS using_expression,
  pg_get_expr(polwithcheck, polrelid) AS with_check
FROM pg_policy
WHERE polrelid = 'items'::regclass
ORDER BY polcmd, polname;
-- Esperado: Deve existir política UPDATE que usa can_access_board() ou is_workspace_member()

-- TESTE 2: Simular o UPDATE que o useMoveItem executa
-- Substitua pelos IDs reais do seu ambiente
-- Este teste valida que a operação funciona corretamente para um usuário autenticado
SELECT
  i.id,
  i.name,
  i.group_id,
  g.title AS group_title,
  b.name AS board_name
FROM items i
JOIN groups g ON g.id = i.group_id
JOIN boards b ON b.id = i.board_id
WHERE b.state = 'active'
  AND i.parent_item_id IS NULL
LIMIT 5;
-- Use os IDs acima para testar o UPDATE abaixo

-- TESTE 3: Verificar que o UPDATE retorna a linha afetada (com SELECT após UPDATE)
-- Execute com um item e grupo reais do seu banco:
/*
UPDATE items
SET group_id = '<novo_group_id>'
WHERE id = '<item_id>'
RETURNING id, group_id;
-- Esperado: 1 linha retornada com group_id = <novo_group_id>
-- Se retornar 0 linhas: RLS está bloqueando silenciosamente
*/

-- TESTE 4: Verificar grupos disponíveis no mesmo board
-- Substitua <board_id> pelo ID do board que você vai testar
SELECT
  g.id,
  g.title,
  g.position,
  COUNT(i.id) AS item_count
FROM groups g
LEFT JOIN items i ON i.group_id = g.id AND i.parent_item_id IS NULL
WHERE g.board_id = (
  SELECT id FROM boards WHERE state = 'active' LIMIT 1
)
GROUP BY g.id, g.title, g.position
ORDER BY g.position;
-- Esperado: Lista de grupos com contagem de itens por grupo

-- TESTE 5: Verificar consistência após mover (simulação)
-- Pegue um item do grupo A e mova para o grupo B, então verifique
SELECT
  i.id,
  i.name,
  i.group_id,
  g.title AS current_group,
  i.updated_at
FROM items i
JOIN groups g ON g.id = i.group_id
JOIN boards b ON b.id = i.board_id
WHERE b.state = 'active'
  AND i.parent_item_id IS NULL
ORDER BY i.updated_at DESC
LIMIT 10;
-- Esperado: Os itens movidos devem aparecer no topo (updated_at recente)
--           com o group_id correto para o grupo de destino

-- ============================================================
-- TESTES DE COMPORTAMENTO NO FRONTEND (Manual)
-- ============================================================
-- 1. Abra um board com múltiplos grupos
-- 2. Clique nos "..." (três pontinhos) de um item
-- 3. Selecione "Mover para" → escolha outro grupo
-- 4. ESPERADO ANTIGO (bugado): Toast "Item movido" mas item permanecia no grupo original após reload
-- 5. ESPERADO NOVO (corrigido):
--    a. O item desaparece imediatamente do grupo original (optimistic update)
--    b. O item aparece imediatamente no grupo de destino (optimistic update)
--    c. Se a operação falhar: o item volta ao grupo original automaticamente (rollback)
--    d. Se houver erro de permissão: toast de erro em vermelho aparece
-- 6. Recarregue a página (F5) — o item deve estar no grupo de destino
-- 7. Verifique no Supabase: a linha em "items" deve ter group_id = <grupo_destino>

-- ============================================================
-- VERIFICAÇÃO NO CÓDIGO
-- ============================================================
-- Execute no terminal:
/*
# Verificar que useMoveItem usa .select('id').single()
grep -n "select.*id.*single\|mutateAsync\|Falha ao mover" \
  src/hooks/useCrudMutations.ts \
  src/components/board/BoardTable.tsx

# Verificar optimistic update em useMoveItem
grep -n "onMutate\|onError\|previousItems\|setQueryData" \
  src/hooks/useCrudMutations.ts | grep -A5 -B5 "moveItem\|useMoveItem"

# Verificar que BoardTable usa mutateAsync (não mutate) para mover
grep -n "moveMutation\|handleMove\|mutateAsync" src/components/board/BoardTable.tsx
*/

-- Resultado esperado:
-- useCrudMutations.ts: deve ter .select('id').single() e onMutate com setQueryData
-- BoardTable.tsx: deve ter mutateAsync com try/catch e toast de erro
