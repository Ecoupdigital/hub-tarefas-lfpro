-- Add position column to boards for sidebar reordering
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS position FLOAT DEFAULT 0;

-- Initialize positions based on created_at order within each workspace
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at) * 1000 AS pos
  FROM public.boards
)
UPDATE public.boards SET position = ranked.pos FROM ranked WHERE boards.id = ranked.id;
