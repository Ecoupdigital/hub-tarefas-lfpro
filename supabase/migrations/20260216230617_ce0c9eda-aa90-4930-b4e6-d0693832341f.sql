
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer', 'guest');

-- Profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#6161FF',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace members
CREATE TABLE public.workspace_members (
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  PRIMARY KEY (workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members WHERE user_id = _user_id AND workspace_id = _workspace_id)
$$;

CREATE POLICY "Members can view workspaces" ON public.workspaces FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "Authenticated can create workspaces" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Workspace admins can update" ON public.workspaces FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), id));

CREATE POLICY "Members can view membership" ON public.workspace_members FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace creators can add members" ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Boards
CREATE TABLE public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  state TEXT DEFAULT 'active' CHECK (state IN ('active', 'archived', 'deleted')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view boards" ON public.boards FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can create boards" ON public.boards FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update boards" ON public.boards FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete boards" ON public.boards FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Groups
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  color TEXT DEFAULT '#579BFC',
  position FLOAT NOT NULL DEFAULT 0,
  is_collapsed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_board(_user_id UUID, _board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.boards b
    JOIN public.workspace_members wm ON wm.workspace_id = b.workspace_id
    WHERE b.id = _board_id AND wm.user_id = _user_id
  )
$$;

CREATE POLICY "Board members can view groups" ON public.groups FOR SELECT TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can update groups" ON public.groups FOR UPDATE TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can delete groups" ON public.groups FOR DELETE TO authenticated USING (public.can_access_board(auth.uid(), board_id));

-- Columns
CREATE TABLE public.columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  column_type TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  width INTEGER DEFAULT 150,
  position FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can view columns" ON public.columns FOR SELECT TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can create columns" ON public.columns FOR INSERT TO authenticated WITH CHECK (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can update columns" ON public.columns FOR UPDATE TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can delete columns" ON public.columns FOR DELETE TO authenticated USING (public.can_access_board(auth.uid(), board_id));

-- Items
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  parent_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position FLOAT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can view items" ON public.items FOR SELECT TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can create items" ON public.items FOR INSERT TO authenticated WITH CHECK (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can update items" ON public.items FOR UPDATE TO authenticated USING (public.can_access_board(auth.uid(), board_id));
CREATE POLICY "Board members can delete items" ON public.items FOR DELETE TO authenticated USING (public.can_access_board(auth.uid(), board_id));

-- Column values
CREATE TABLE public.column_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  column_id UUID REFERENCES public.columns(id) ON DELETE CASCADE,
  value JSONB,
  text_representation TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, column_id)
);
ALTER TABLE public.column_values ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_item(_user_id UUID, _item_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.items i
    JOIN public.boards b ON b.id = i.board_id
    JOIN public.workspace_members wm ON wm.workspace_id = b.workspace_id
    WHERE i.id = _item_id AND wm.user_id = _user_id
  )
$$;

CREATE POLICY "Board members can view values" ON public.column_values FOR SELECT TO authenticated USING (public.can_access_item(auth.uid(), item_id));
CREATE POLICY "Board members can create values" ON public.column_values FOR INSERT TO authenticated WITH CHECK (public.can_access_item(auth.uid(), item_id));
CREATE POLICY "Board members can update values" ON public.column_values FOR UPDATE TO authenticated USING (public.can_access_item(auth.uid(), item_id));
CREATE POLICY "Board members can delete values" ON public.column_values FOR DELETE TO authenticated USING (public.can_access_item(auth.uid(), item_id));

-- Updates (comments)
CREATE TABLE public.updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  body TEXT NOT NULL,
  parent_update_id UUID REFERENCES public.updates(id),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can view updates" ON public.updates FOR SELECT TO authenticated USING (public.can_access_item(auth.uid(), item_id));
CREATE POLICY "Authenticated can create updates" ON public.updates FOR INSERT TO authenticated WITH CHECK (public.can_access_item(auth.uid(), item_id));
CREATE POLICY "Authors can update own updates" ON public.updates FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Authors can delete own updates" ON public.updates FOR DELETE TO authenticated USING (author_id = auth.uid());

-- Favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  position FLOAT DEFAULT 0,
  UNIQUE(user_id, board_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own favorites" ON public.favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  -- Default role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_column_values_updated_at BEFORE UPDATE ON public.column_values FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_updates_updated_at BEFORE UPDATE ON public.updates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
