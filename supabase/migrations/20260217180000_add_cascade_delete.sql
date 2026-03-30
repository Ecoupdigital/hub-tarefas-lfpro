-- ============================================================
-- Story 4.3: CASCADE DELETE no Banco de Dados
-- ============================================================
-- Propósito: Garantir integridade referencial via CASCADE DELETE
-- nos relacionamentos principais, eliminando dados órfãos em caso
-- de falha da aplicação durante operações de exclusão.
--
-- AUDITORIA DOS FKs EXISTENTES (verificado nas migrations anteriores):
--   ✅ groups.board_id        → boards(id)     — já tem ON DELETE CASCADE
--   ✅ columns.board_id       → boards(id)     — já tem ON DELETE CASCADE
--   ✅ items.board_id         → boards(id)     — já tem ON DELETE CASCADE
--   ✅ items.parent_item_id   → items(id)      — já tem ON DELETE CASCADE
--   ✅ column_values.item_id  → items(id)      — já tem ON DELETE CASCADE
--   ✅ column_values.column_id → columns(id)   — já tem ON DELETE CASCADE
--   ✅ updates.item_id        → items(id)      — já tem ON DELETE CASCADE
--   ✅ board_permissions.board_id → boards(id) — já tem ON DELETE CASCADE
--   ✅ board_shares.board_id  → boards(id)     — já tem ON DELETE CASCADE
--   ✅ activity_log.board_id  → boards(id)     — já tem ON DELETE CASCADE
--   ✅ favorites.board_id     → boards(id)     — já tem ON DELETE CASCADE
--
--   ❌ items.group_id → groups(id) — TINHA ON DELETE SET NULL → CORRIGIDO ABAIXO
--
-- IMPACTO:
--   Soft delete (UPDATE boards SET state = 'deleted') NÃO aciona CASCADE.
--   CASCADE só é acionado por DELETE físico (DELETE FROM boards WHERE id = ?).
-- ============================================================

-- Fix principal: items.group_id deve usar CASCADE (não SET NULL)
-- Quando um grupo é deletado, seus itens devem ser deletados junto.
-- Itens órfãos (group_id = NULL) são dados inválidos no modelo atual.
ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_group_id_fkey,
  ADD CONSTRAINT items_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

-- Garantia: updates.parent_update_id sem CASCADE pode deixar respostas órfãs
-- quando o update pai é deletado. Adicionamos CASCADE para manter consistência.
ALTER TABLE public.updates
  DROP CONSTRAINT IF EXISTS updates_parent_update_id_fkey,
  ADD CONSTRAINT updates_parent_update_id_fkey
    FOREIGN KEY (parent_update_id) REFERENCES public.updates(id) ON DELETE CASCADE;

-- ============================================================
-- ROLLBACK (executar para reverter se necessário):
-- ============================================================
-- ALTER TABLE public.items
--   DROP CONSTRAINT IF EXISTS items_group_id_fkey,
--   ADD CONSTRAINT items_group_id_fkey
--     FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;
--
-- ALTER TABLE public.updates
--   DROP CONSTRAINT IF EXISTS updates_parent_update_id_fkey,
--   ADD CONSTRAINT updates_parent_update_id_fkey
--     FOREIGN KEY (parent_update_id) REFERENCES public.updates(id);
-- ============================================================
