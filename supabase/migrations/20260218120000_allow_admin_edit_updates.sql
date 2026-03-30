-- Permite que admins de board editem qualquer update dentro dos seus boards
CREATE POLICY "Board admins can update any update"
  ON public.updates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.board_permissions bp
      JOIN public.items i ON i.board_id = bp.board_id
      WHERE bp.user_id = auth.uid()
        AND bp.role = 'admin'
        AND i.id = updates.item_id
    )
  );
