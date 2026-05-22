---
phase: 01-docs-mode-notion
plan: 01-05b
type: feature
autonomous: true
wave: 4
depends_on: [01-05]
requirements: [REQ-05]
files_modified:
  - src/components/page/blocks/EmbedBoardBlock.tsx
  - src/components/page/blocks/BoardPickerPopover.tsx
  - src/components/page/blocknote-schema.ts
  - src/components/page/PageEditor.tsx
must_haves:
  truths:
    - "Custom block `embed-board` registrado no schema (estende lfproBlockNoteSchema do 01-05)"
    - "Slash command `/embedar board` abre picker de boards (cross-workspace ao alcance do user) e insere bloco"
    - "Bloco embed renderiza nome do board + lista compacta dos primeiros 20 items"
    - "Click no nome do board no embed navega para `/board/:id`"
    - "Click em item dentro do embed navega para `/board/:id?item=:itemId`"
    - "Bloco e nao-editavel (contentEditable=false no wrapper)"
    - "Persistencia: ciclo save -> reload preserva embed"
  artifacts:
    - path: "src/components/page/blocks/EmbedBoardBlock.tsx"
      provides: "Block spec read-only que renderiza mini-view de um board"
    - path: "src/components/page/blocks/BoardPickerPopover.tsx"
      provides: "Popover de selecao de board"
  key_links:
    - from: "Slash menu (embedar)"
      to: "BoardPickerPopover"
      via: "abre popover, board escolhido dispara editor.insertBlocks"
    - from: "EmbedBoardBlock render"
      to: "boards + items + columns"
      via: "useQuery no render do bloco"
---

# Fase 01 Plano 01-05b: Embed de board read-only no editor

**Objetivo:** Permitir embedar uma mini-view de board dentro de uma pagina (leitura). Complementa o mention (cross-link de pagina -> item) do 01-05 com cross-link de pagina -> board inteiro. Plano separado para respeitar o limite de tamanho.

## Achados de Pesquisa (Inline)

- **createReactBlockSpec** (docs.blocknotejs.org):
  ```ts
  createReactBlockSpec(
    { type, propSchema, content: 'none' },
    { render: ({ block }) => <ReactComponent /> }
  );
  ```
- **Inserir block:** `editor.insertBlocks([{ type: 'embed-board', props: { boardId } }], referenceBlock, 'after')`.
- **contentEditable={false}** no wrapper externo garante que o ProseMirror nao tenta editar texto interno.

## Contexto

@src/components/page/blocknote-schema.ts — schema do 01-05 (estender)
@src/components/page/PageEditor.tsx — onde injetar callback de embed
@src/components/page/slash-menu.ts — funcao ja aceita onTriggerEmbedBoard opcional
@src/hooks/useSupabaseData.ts — useAllBoards

## Tarefas

<task id="1" type="auto">
<files>src/components/page/blocks/BoardPickerPopover.tsx</files>
<action>
Popover de selecao de board.

```tsx
import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useAllBoards } from '@/hooks/useSupabaseData';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (board: { id: string; name: string }) => void;
}

const BoardPickerPopover: React.FC<Props> = ({ open, onOpenChange, onSelect }) => {
  const [query, setQuery] = useState('');
  const { data: boards = [] } = useAllBoards();
  const filtered = boards.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <span style={{ display: 'none' }} />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar board..." value={query} onValueChange={setQuery} autoFocus />
          <CommandList>
            <CommandEmpty>Nenhum board encontrado</CommandEmpty>
            <CommandGroup>
              {filtered.map((board) => (
                <CommandItem
                  key={board.id}
                  value={board.id}
                  onSelect={() => {
                    onSelect({ id: board.id, name: board.name });
                    onOpenChange(false);
                  }}
                >
                  <span className="truncate">{board.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default BoardPickerPopover;
```
</action>
<verify>
  <automated>test -f /home/projects/hub-tarefas-lfpro/src/components/page/blocks/BoardPickerPopover.tsx</automated>
</verify>
<done>Componente criado.</done>
</task>

<task id="2" type="auto">
<files>src/components/page/blocks/EmbedBoardBlock.tsx</files>
<action>
Bloco custom que renderiza mini-view do board (nome + 20 items).

```tsx
import React from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Layout } from 'lucide-react';

interface EmbedData {
  id: string;
  name: string;
  items: Array<{ id: string; name: string }>;
  columnsCount: number;
}

function useEmbedBoardData(boardId: string) {
  return useQuery<EmbedData | null>({
    queryKey: ['embed-board-data', boardId],
    enabled: !!boardId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: board, error } = await supabase
        .from('boards').select('id, name')
        .eq('id', boardId).eq('state', 'active').maybeSingle();
      if (error || !board) return null;
      const { data: items } = await supabase
        .from('items').select('id, name')
        .eq('board_id', boardId).neq('state', 'deleted')
        .is('parent_item_id', null).order('position').limit(20);
      const { count } = await supabase
        .from('columns').select('id', { count: 'exact', head: true })
        .eq('board_id', boardId);
      return { id: board.id, name: board.name, items: items ?? [], columnsCount: count ?? 0 };
    },
  });
}

const EmbedBoardView: React.FC<{ boardId: string }> = ({ boardId }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useEmbedBoardData(boardId);

  if (isLoading) {
    return (
      <div className="my-3 p-4 border border-border rounded-lg bg-muted/30" contentEditable={false}>
        <p className="text-sm text-muted-foreground">Carregando board embedado...</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="my-3 p-4 border border-destructive/30 rounded-lg bg-destructive/5" contentEditable={false}>
        <p className="text-sm text-destructive">Board nao encontrado ou sem permissao.</p>
      </div>
    );
  }

  return (
    <div className="my-3 border border-border rounded-lg overflow-hidden bg-card" contentEditable={false}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <Layout className="w-3.5 h-3.5 text-muted-foreground" />
          <button
            onClick={() => navigate(`/board/${data.id}`)}
            className="text-sm font-medium hover:underline"
          >
            {data.name}
          </button>
          <span className="text-xs text-muted-foreground">
            {data.items.length} item(s) ~ {data.columnsCount} coluna(s)
          </span>
        </div>
        <button
          onClick={() => navigate(`/board/${data.id}`)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          Abrir board <ExternalLink className="w-3 h-3" />
        </button>
      </div>
      <ul className="divide-y divide-border">
        {data.items.length === 0 ? (
          <li className="px-4 py-3 text-sm text-muted-foreground">Sem items.</li>
        ) : (
          data.items.map((item) => (
            <li
              key={item.id}
              className="px-4 py-2 text-sm hover:bg-accent/30 cursor-pointer"
              onClick={() => navigate(`/board/${data.id}?item=${item.id}`)}
            >
              {item.name}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export const EmbedBoardBlock = createReactBlockSpec(
  {
    type: 'embed-board',
    propSchema: { boardId: { default: '' } },
    content: 'none',
  },
  {
    render: ({ block }) => <EmbedBoardView boardId={block.props.boardId as string} />,
  }
);
```
</action>
<verify>
  <automated>cd /home/projects/hub-tarefas-lfpro && npx tsc --noEmit 2>&1 | grep "EmbedBoardBlock" | head -3 || echo "OK"</automated>
</verify>
<done>Bloco custom criado.</done>
</task>

<task id="3" type="auto">
<files>src/components/page/blocknote-schema.ts</files>
<action>
Estender o schema do 01-05 adicionando `embed-board`.

Substituir o arquivo por:

```typescript
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import { MentionInlineContent } from './blocks/MentionInlineContent';
import { EmbedBoardBlock } from './blocks/EmbedBoardBlock';

export const lfproBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    'embed-board': EmbedBoardBlock,
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    'mention-item': MentionInlineContent,
  },
});
```
</action>
<verify>
  <automated>cd /home/projects/hub-tarefas-lfpro && grep "EmbedBoardBlock" src/components/page/blocknote-schema.ts | wc -l</automated>
</verify>
<done>Schema agora inclui embed-board.</done>
</task>

<task id="4" type="auto">
<files>src/components/page/PageEditor.tsx</files>
<action>
Adicionar embed picker + callback no PageEditor existente.

Mudancas:

1. Import:
```typescript
import BoardPickerPopover from './blocks/BoardPickerPopover';
```

2. Adicionar state ao lado do `mentionOpen`:
```typescript
const [embedOpen, setEmbedOpen] = useState(false);
```

3. No `getItems` do `<SuggestionMenuController>`, passar tambem `onTriggerEmbedBoard`:
```typescript
getCustomSlashMenuItems(editor, {
  onTriggerMention: () => setMentionOpen(true),
  onTriggerEmbedBoard: () => setEmbedOpen(true),
}),
```

4. Apos o `<ItemPickerPopover>` renderizar:
```tsx
<BoardPickerPopover
  open={embedOpen}
  onOpenChange={setEmbedOpen}
  onSelect={(board) => {
    const cursor = editor.getTextCursorPosition();
    editor.insertBlocks(
      [{ type: 'embed-board', props: { boardId: board.id } } as any],
      cursor.block,
      'after'
    );
  }}
/>
```

Nota: `as any` no insertBlocks aceito conforme padrao do projeto (tipos custom do schema podem nao bater perfeitamente com inferencia do BlockNote).
</action>
<verify>
  <automated>cd /home/projects/hub-tarefas-lfpro && grep -E "BoardPickerPopover|embedOpen|onTriggerEmbedBoard" src/components/page/PageEditor.tsx | wc -l</automated>
</verify>
<done>PageEditor dispara embed picker via slash menu.</done>
</task>

<task id="5" type="checkpoint:human-verify">
<files>(visual)</files>
<action>
1. `npm run dev`
2. Abrir pagina
3. Digitar `/` -> slash mostra agora "Mencionar item" E "Embedar board"
4. Click "Embedar board" -> picker abre
5. Selecionar board -> bloco aparece com nome + items
6. Click no nome -> navega para o board
7. Click em item -> navega para board com item aberto
8. F5 -> embed persiste
9. Tentar selecionar texto dentro do embed -> NAO permite editar (contentEditable=false)

SQL: `select content from pages where id='<id>'` mostra bloco `type: 'embed-board'`.
</action>
<verify>
  <automated>cd /home/projects/hub-tarefas-lfpro && npm run build 2>&1 | tail -3</automated>
</verify>
<done>Embed funciona end-to-end. Persistencia OK.</done>
</task>

## Criterios de Sucesso

- [ ] embed-board registrado no schema
- [ ] Slash menu inclui "Embedar board"
- [ ] BoardPickerPopover lista boards
- [ ] Bloco renderiza mini-view com items
- [ ] Click no nome/item navega corretamente
- [ ] Bloco read-only (contentEditable=false)
- [ ] Persistencia: reload preserva embed
