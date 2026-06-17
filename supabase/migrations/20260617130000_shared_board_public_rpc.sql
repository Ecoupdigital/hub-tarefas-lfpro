-- Link público de board (acesso anônimo sem login) via RPC SECURITY DEFINER.
-- Antes: o hook lia as tabelas direto como `anon`, mas as RLS só liberam
-- `authenticated` -> board público carregava vazio. Agora 1 RPC valida o token
-- (+ senha bcrypt + expiração) NO SERVIDOR e retorna o board inteiro. Não abre
-- RLS anon nas tabelas de dados.

-- pgcrypto (crypt/gen_salt/gen_random_bytes). Já costuma existir (default do token).
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ─── Leitura pública do board por token ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_shared_board(p_token text, p_password text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_share public.board_shares;
  v_board jsonb;
  v_groups jsonb;
  v_columns jsonb;
  v_items jsonb;
  v_values jsonb;
BEGIN
  SELECT * INTO v_share FROM public.board_shares WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_share.expires_at IS NOT NULL AND v_share.expires_at < now() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  IF v_share.password_hash IS NOT NULL THEN
    IF p_password IS NULL OR p_password = '' THEN
      RETURN jsonb_build_object('status', 'password_required');
    END IF;
    IF crypt(p_password, v_share.password_hash) <> v_share.password_hash THEN
      RETURN jsonb_build_object('status', 'wrong_password');
    END IF;
  END IF;

  SELECT to_jsonb(b) INTO v_board FROM public.boards b WHERE b.id = v_share.board_id;
  IF v_board IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(g) ORDER BY g.position), '[]'::jsonb) INTO v_groups
    FROM public.groups g WHERE g.board_id = v_share.board_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.position), '[]'::jsonb) INTO v_columns
    FROM public.columns c WHERE c.board_id = v_share.board_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.position), '[]'::jsonb) INTO v_items
    FROM public.items i
    WHERE i.board_id = v_share.board_id AND i.parent_item_id IS NULL AND i.state <> 'deleted';

  SELECT COALESCE(jsonb_agg(to_jsonb(cv)), '[]'::jsonb) INTO v_values
    FROM public.column_values cv
    WHERE cv.item_id IN (
      SELECT i.id FROM public.items i
      WHERE i.board_id = v_share.board_id AND i.parent_item_id IS NULL AND i.state <> 'deleted'
    );

  RETURN jsonb_build_object(
    'status', 'ok',
    'share', jsonb_build_object(
      'permission', v_share.permission,
      'expires_at', v_share.expires_at,
      'has_password', v_share.password_hash IS NOT NULL
    ),
    'board', v_board,
    'groups', v_groups,
    'columns', v_columns,
    'items', v_items,
    'columnValues', v_values
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_board(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_board(text, text) TO anon, authenticated;

-- ─── Criação de link (token seguro + senha bcrypt no servidor) ──────────────
CREATE OR REPLACE FUNCTION public.create_board_share(
  p_board_id uuid,
  p_permission text DEFAULT 'view',
  p_expires_at timestamptz DEFAULT NULL,
  p_password text DEFAULT NULL
)
RETURNS public.board_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.board_shares;
  v_token text;
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.can_access_board(auth.uid(), p_board_id) THEN
    RAISE EXCEPTION 'no access to board';
  END IF;
  IF p_permission NOT IN ('view', 'comment', 'edit') THEN
    RAISE EXCEPTION 'invalid permission';
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  IF p_password IS NOT NULL AND p_password <> '' THEN
    v_hash := crypt(p_password, gen_salt('bf'));
  END IF;

  INSERT INTO public.board_shares (board_id, token, permission, expires_at, password_hash, created_by)
  VALUES (p_board_id, v_token, p_permission, p_expires_at, v_hash, auth.uid())
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_board_share(uuid, text, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_board_share(uuid, text, timestamptz, text) TO authenticated;
