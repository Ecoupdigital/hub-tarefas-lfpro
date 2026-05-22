import React, { useState } from 'react';
import { Table2, Kanban, Calendar, List, Plus } from 'lucide-react';
import { useBoardViews } from '@/hooks/useBoardViews';
import CreateDatabaseViewDialog from './CreateDatabaseViewDialog';
import ViewStyleToggle from './ViewStyleToggle';
import type { DatabaseViewType } from '@/types/database';

interface Props {
  boardId: string;
  activeViewId: string | null;
  onChangeView: (viewId: string) => void;
}

/**
 * Tabs de view da database inline.
 *
 * Renderiza uma tab por board_view do boardId em ordem (position), cada uma
 * com icone do view_type + nome. Click muda a view ativa (callback `onChangeView`).
 * Botao '+' no final abre CreateDatabaseViewDialog pra criar nova view manualmente.
 *
 * UX: scroll horizontal natural sem dropdown overflow (MVP). Tab ativa destacada
 * com `bg-primary/15 text-primary`. Demais tabs `text-muted-foreground` com hover.
 */
const ICON_BY_TYPE: Record<DatabaseViewType, React.ComponentType<{ className?: string }>> = {
  table: Table2,
  kanban: Kanban,
  calendar: Calendar,
  list_detailed: List,
};

const DatabaseViewTabs: React.FC<Props> = ({ boardId, activeViewId, onChangeView }) => {
  const { data: views = [] } = useBoardViews(boardId);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div
      role="tablist"
      aria-label="Views da database"
      className="flex items-center gap-1 px-2 py-1 border-b border-border bg-muted/10 overflow-x-auto scrollbar-thin"
    >
      {views.map((v) => {
        const type = (v.view_type as DatabaseViewType) ?? 'table';
        const Icon = ICON_BY_TYPE[type] ?? List;
        const isActive = v.id === activeViewId;
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChangeView(v.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={v.name}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[140px]">{v.name}</span>
          </button>
        );
      })}
      {/* Toggle de estilo visual da view ativa (Fase 03). Posicionado entre as
          tabs e o botao "+ Nova view" conforme CONTEXT.md. So aparece quando ha
          uma view ativa (ViewStyleToggle ja faz disabled internamente). */}
      <ViewStyleToggle boardId={boardId} viewId={activeViewId} />
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
        title="Nova view"
        aria-label="Criar nova view"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <CreateDatabaseViewDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        boardId={boardId}
        onCreated={(viewId) => onChangeView(viewId)}
      />
    </div>
  );
};

export default DatabaseViewTabs;
