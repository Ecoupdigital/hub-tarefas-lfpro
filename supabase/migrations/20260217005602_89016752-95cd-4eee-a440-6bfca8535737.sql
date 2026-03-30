-- Allow workspace admins to delete workspaces
CREATE POLICY "Workspace admins can delete"
ON public.workspaces
FOR DELETE
USING (is_workspace_member(auth.uid(), id));

-- Allow members to delete workspace members (for cleanup during ws deletion)
CREATE POLICY "Members can delete membership"
ON public.workspace_members
FOR DELETE
USING (is_workspace_member(auth.uid(), workspace_id));
