import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useProfiles, useUpdateColumnValue, useCreateItem, useUpdateItem } from '@/hooks/useSupabaseData';
import NotionTableHeader from './NotionTableHeader';
import NotionTableRow from './NotionTableRow';
import type { Column, Item } from '@/types/board';

interface NotionTableViewProps {
  mode?: 'database' | 'board';
}

/**
 * Tabela Notion-style (Fase 03).
 *
 *  - Header sticky com nome + colunas (icone do tipo + nome)
 *  - Rows compactas (~32px), hover sutil, sem zebra
 *  - Click no titulo abre ItemDetailPanel; dblclick edita inline
 *  - Click em celula edita inline via NotionInlineCell
 *  - "+ Novo" fixo no fim de cada group cria item via useCreateItem
 *
 * Dados: activeBoard injetado por DatabaseBoardContext. Profiles via useProfiles.
 * Mutations via useUpdateColumnValue / useCreateItem / useUpdateItem.
 */
const NotionTableView: React.FC<NotionTableViewProps> = ({ mode = 'database' }) => {
  const { activeBoard, setSelectedItem } = useApp();
  const { data: profiles = [] } = useProfiles();
  const updateColumnValue = useUpdateColumnValue();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const [creatingInGroup, setCreatingInGroup] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');

  if (!activeBoard) {
    return <div className="p-4 text-sm notion-text-secondary">Carregando tabela...</div>;
  }

  const visibleColumns: Column[] = activeBoard.columns
    .slice()
    .sort((a, b) => a.position - b.position);

  const containerClass =
    mode === 'database'
      ? 'max-h-[640px] overflow-auto rounded-md border'
      : 'h-full overflow-auto';

  const handleChangeCell = (item: Item, columnId: string, value: unknown, text?: string) => {
    const col = visibleColumns.find((c) => c.id === columnId);
    updateColumnValue.mutate({
      itemId: item.id,
      columnId,
      value,
      text,
      boardId: activeBoard.id,
      oldValue: item.columnValues?.[columnId]?.value,
      columnType: col?.type,
      itemName: item.name,
    });
  };

  const handleRenameItem = (item: Item, newName: string) => {
    updateItem.mutate({ id: item.id, name: newName });
  };

  const handleCreateItem = (groupId: string) => {
    const name = newItemName.trim();
    if (!name) {
      setCreatingInGroup(null);
      setNewItemName('');
      return;
    }
    createItem.mutate(
      { boardId: activeBoard.id, groupId, name },
      { onSuccess: () => { setCreatingInGroup(null); setNewItemName(''); } }
    );
  };

  return (
    <div
      className={containerClass}
      style={{ borderColor: 'var(--notion-border)', backgroundColor: 'var(--notion-bg)' }}
    >
      <NotionTableHeader columns={visibleColumns} />

      {activeBoard.groups.map((group) => (
        <div key={group.id}>
          {activeBoard.groups.length > 1 && (
            <div
              className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide border-b"
              style={{
                color: 'var(--notion-text-secondary)',
                backgroundColor: 'var(--notion-panel)',
                borderColor: 'var(--notion-border)',
              }}
            >
              {group.title}
            </div>
          )}

          {group.items.map((item) => (
            <NotionTableRow
              key={item.id}
              item={item}
              columns={visibleColumns}
              profiles={profiles}
              onChangeCell={(colId, val, text) => handleChangeCell(item, colId, val, text)}
              onChangeName={(name) => handleRenameItem(item, name)}
              onOpen={() => setSelectedItem(item)}
            />
          ))}

          {creatingInGroup === group.id ? (
            <div className="flex items-center px-3 py-1.5 border-b" style={{ borderColor: 'var(--notion-border)' }}>
              <input
                autoFocus
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onBlur={() => handleCreateItem(group.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateItem(group.id);
                  if (e.key === 'Escape') { setCreatingInGroup(null); setNewItemName(''); }
                }}
                placeholder="Nome do novo item"
                className="flex-1 bg-transparent border-none outline-none text-sm focus:ring-1 focus:ring-[var(--notion-blue)] rounded px-1"
                style={{ color: 'var(--notion-text-primary)' }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setCreatingInGroup(group.id); setNewItemName(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs notion-text-secondary notion-hover w-full text-left border-b"
              style={{ borderColor: 'var(--notion-border)' }}
            >
              <Plus className="w-3 h-3" />
              Novo
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotionTableView;
