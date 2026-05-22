---
phase: 03-views-notion-style-com-toggle-de-estilo
plan: 03-03b
type: feature
autonomous: true
wave: 1
depends_on: [03-02, 03-03]
requirements: [REQ-23, REQ-27]
files_modified:
  - src/components/database/notion/NotionTableView.tsx
  - src/components/database/notion/NotionTableHeader.tsx
  - src/components/database/notion/NotionTableRow.tsx
must_haves:
  truths:
    - "NotionTableView renderiza tabela com cabecalho cinza (notion-header-bg), rows ~32px"
    - "Cada coluna no header tem NotionColumnIcon a esquerda + nome"
    - "Click em celula edita inline via NotionInlineCell (do plano 03-03)"
    - "Click no titulo da row abre ItemDetailPanel; dblclick edita o nome"
    - "Linha '+ Novo' por group chama useCreateItem"
    - "Sem zebra striping; hover bg --notion-row-hover"
  artifacts:
    - path: "src/components/database/notion/NotionTableView.tsx"
      provides: "View principal (substitui stub do plano 02)"
    - path: "src/components/database/notion/NotionTableHeader.tsx"
      provides: "Header sticky com icones por tipo de coluna"
    - path: "src/components/database/notion/NotionTableRow.tsx"
      provides: "Linha compacta com titulo editavel + cells inline"
  key_links:
    - from: "NotionTableView"
      to: "useApp().activeBoard + useProfiles + useUpdateColumnValue + useCreateItem + useUpdateItem"
      via: "Mutations chamadas a partir dos callbacks onChange/onCreate"
    - from: "NotionTableRow"
      to: "NotionInlineCell (do plano 03-03)"
      via: "Renderiza editor inline por column.type"
---

# Fase 3 Plano 03b: NotionTableView (tabela compacta com edit inline)

**Objetivo:** Substitui o stub criado no plano 02 pela implementacao real de `NotionTableView`. Tabela compacta, header com icones por tipo (via `NotionColumnIcon` do 03-03), rows de ~32px com hover sutil, edicao inline (via `NotionInlineCell` do 03-03), e "+ Novo" por group.

**Cobre:** REQ-23 (NotionTableView), REQ-27 (paleta).

## Research Inline

**Hooks usados** (todos ja existem):
- `useApp()` em `@/context/AppContext` → `activeBoard` + `setSelectedItem`
- `useProfiles()` em `@/hooks/useSupabaseData` → perfis
- `useUpdateColumnValue()` em `@/hooks/useSupabaseData:594`
- `useCreateItem()` em `@/hooks/useSupabaseData:744`
- `useUpdateItem()` em `@/hooks/useSupabaseData:827`

**Helpers consumidos** (criados no plano 03-03):
- `NotionColumnIcon` (named export)
- `NotionInlineCell` (named export — despacha por column.type)

## Contexto

@src/context/AppContext.tsx — useApp() retornando activeBoard
@src/components/database/notion/notionColumnIcon.tsx — criado no 03-03
@src/components/database/notion/notionInlineCell.tsx — criado no 03-03
@src/types/board.ts — Column, Item

## Tarefas

<task id="1" type="auto">
<files>src/components/database/notion/NotionTableHeader.tsx</files>
<action>
Componente header sticky com icone + nome por coluna.

```tsx
import React from 'react';
import { NotionColumnIcon } from './notionColumnIcon';
import type { Column } from '@/types/board';

interface Props {
  columns: Column[];
  gutterWidth?: number;
}

const NotionTableHeader: React.FC<Props> = ({ columns, gutterWidth = 32 }) => (
  <div
    className="flex items-center sticky top-0 z-10 border-b"
    style={{ borderColor: 'var(--notion-border)', backgroundColor: 'var(--notion-header-bg)' }}
  >
    <div style={{ width: gutterWidth }} className="shrink-0" />
    <div
      className="flex-1 min-w-[200px] flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium"
      style={{ color: 'var(--notion-text-secondary)' }}
    >
      <NotionColumnIcon type="text" />
      <span>Nome</span>
    </div>
    {columns.map((col) => (
      <div
        key={col.id}
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium border-l"
        style={{
          width: Math.max(col.width || 140, 120),
          borderColor: 'var(--notion-border)',
          color: 'var(--notion-text-secondary)',
        }}
        title={col.title}
      >
        <NotionColumnIcon type={col.type} />
        <span className="truncate">{col.title}</span>
      </div>
    ))}
  </div>
);

export default NotionTableHeader;
```
</action>
<verify><automated>test -f src/components/database/notion/NotionTableHeader.tsx && grep -q "NotionColumnIcon" src/components/database/notion/NotionTableHeader.tsx && echo OK</automated></verify>
<done>Header sticky com icone Lucide por tipo, bg notion-header-bg, border-bottom notion-border.</done>
</task>

<task id="2" type="auto">
<files>src/components/database/notion/NotionTableRow.tsx</files>
<action>
Linha por item: titulo editavel + cells inline.

```tsx
import React from 'react';
import { NotionInlineCell } from './notionInlineCell';
import type { Column, Item, ColumnValue } from '@/types/board';

interface Profile {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
}

interface NotionTableRowProps {
  item: Item;
  columns: Column[];
  profiles: Profile[];
  gutterWidth?: number;
  onChangeCell: (columnId: string, value: unknown, text?: string) => void;
  onChangeName: (name: string) => void;
  onOpen: () => void;
}

/**
 * Linha Notion:
 *  - min-height var(--notion-row-h) (32px)
 *  - hover bg var(--notion-row-hover) via classe notion-row-hover
 *  - border-bottom var(--notion-border)
 *  - sem zebra striping
 *  - titulo: click=abre ItemDetailPanel, dblclick=edita inline
 */
const NotionTableRow: React.FC<NotionTableRowProps> = ({
  item, columns, profiles, gutterWidth = 32, onChangeCell, onChangeName, onOpen,
}) => {
  const [editingName, setEditingName] = React.useState(false);
  const [localName, setLocalName] = React.useState(item.name);

  React.useEffect(() => setLocalName(item.name), [item.name]);

  return (
    <div
      className="group flex items-stretch notion-row-hover border-b"
      style={{ minHeight: 'var(--notion-row-h)', borderColor: 'var(--notion-border)' }}
    >
      <div style={{ width: gutterWidth }} className="shrink-0" />
      <div className="flex-1 min-w-[200px] flex items-center px-2 py-1">
        {editingName ? (
          <input
            autoFocus
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={() => {
              setEditingName(false);
              if (localName.trim() && localName !== item.name) onChangeName(localName.trim());
              else setLocalName(item.name);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') { setLocalName(item.name); setEditingName(false); }
            }}
            className="flex-1 bg-transparent border-none outline-none text-sm focus:ring-1 focus:ring-[var(--notion-blue)] rounded px-1"
            style={{ color: 'var(--notion-text-primary)' }}
          />
        ) : (
          <button
            type="button"
            onClick={onOpen}
            onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true); }}
            className="flex-1 text-left text-sm truncate hover:underline"
            style={{ color: 'var(--notion-text-primary)' }}
            title="Clicar para abrir, dois cliques para renomear"
          >
            {item.name || <span className="notion-text-tertiary">Sem titulo</span>}
          </button>
        )}
      </div>
      {columns.map((col) => {
        const cv: ColumnValue | undefined = item.columnValues?.[col.id];
        return (
          <div
            key={col.id}
            className="flex items-center px-1.5 border-l"
            style={{
              width: Math.max(col.width || 140, 120),
              borderColor: 'var(--notion-border)',
            }}
          >
            <NotionInlineCell
              column={col}
              value={cv}
              profiles={profiles}
              onChange={(value, text) => onChangeCell(col.id, value, text)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default NotionTableRow;
```
</action>
<verify><automated>test -f src/components/database/notion/NotionTableRow.tsx && grep -q "NotionInlineCell" src/components/database/notion/NotionTableRow.tsx && echo OK</automated></verify>
<done>NotionTableRow renderiza titulo (click=abre, dblclick=rename) + cells inline. Hover via notion-row-hover. min-height --notion-row-h.</done>
</task>

<task id="3" type="auto">
<files>src/components/database/notion/NotionTableView.tsx</files>
<action>
**Substituir** stub do plano 02 (que tem "Em construcao (plano 03-03)"). Sobrescrever arquivo com:

```tsx
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
```

Garantir que o arquivo NAO contem mais a string "Em construcao (plano 03-03)" (stub deve ter sido sobrescrito).
</action>
<verify><automated>grep -q "Em construcao (plano 03-03)" src/components/database/notion/NotionTableView.tsx && exit 1; grep -q "NotionTableHeader\|NotionTableRow" src/components/database/notion/NotionTableView.tsx && grep -q "useUpdateColumnValue\|useCreateItem" src/components/database/notion/NotionTableView.tsx && npx tsc --noEmit 2>&1 | grep -E "NotionTableView" || echo OK</automated></verify>
<done>Stub substituido. NotionTableView usa Header + Row, useUpdateColumnValue/useCreateItem/useUpdateItem, group header se >1 group.</done>
</task>

<task id="4" type="checkpoint:human-verify">
<files>none</files>
<action>
**Smoke test manual** apos tarefas 1-3:

1. Style 'notion', view 'Tabela'
2. Verificar:
   - [ ] Header tabela cinza claro/escuro, icones do tipo a esquerda do nome
   - [ ] Rows compactas (~32px), sem zebra, hover sutil
   - [ ] Click no titulo abre ItemDetailPanel
   - [ ] Double-click no titulo edita inline; Enter salva; Escape cancela
   - [ ] Edicao em text/long_text/number: digita + Tab/blur salva (refresh nao perde)
   - [ ] Status / Dropdown: select nativo, escolha salva
   - [ ] Date: input type=date salva como YYYY-MM-DD
   - [ ] Checkbox: click toggla; visual ativo com fundo azul Notion
   - [ ] People: avatares Notion (initials), read-only
   - [ ] "+ Novo" fim de cada group cria item
   - [ ] Trocar pra LFPro restaura BoardTable identico
   - [ ] Zero warm gold no modo Notion
</action>
<verify><automated>FALTANDO — smoke test manual</automated></verify>
<done>NotionTableView funcional, edit inline persiste, sem regressao LFPro, paleta cinza pura.</done>
</task>

## Criterios de Sucesso

- [ ] Header com icones por tipo (consumindo NotionColumnIcon)
- [ ] Cells inline editaveis (consumindo NotionInlineCell)
- [ ] Click titulo abre ItemDetailPanel; dblclick rename
- [ ] "+ Novo" cria item
- [ ] Group header so aparece se >1 group
- [ ] LFPro Tabela intacta
