import React, { useState, useEffect } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useAllItemsForMention } from '@/hooks/useSupabaseData';

interface SelectedItem {
  id: string;
  name: string;
  boardId: string;
  boardName: string;
}

interface ItemPickerPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: SelectedItem) => void;
}

/**
 * Picker de items para inserir como @mention numa pagina.
 *
 * Abre como dialog modal (slash menu nao tem ancora DOM persistente).
 * Busca debounced via state local + React Query staleTime.
 * RLS do Supabase ja restringe aos items acessiveis pelo usuario.
 */
const ItemPickerPopover: React.FC<ItemPickerPopoverProps> = ({ open, onOpenChange, onSelect }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce de ~200ms para nao gerar request a cada tecla
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  // Reseta query quando o dialog fecha
  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [open]);

  const { data: items = [], isLoading } = useAllItemsForMention(debouncedQuery);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar item por nome..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!isLoading && items.length === 0 && (
          <CommandEmpty>Nenhum item encontrado</CommandEmpty>
        )}
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">Buscando...</div>
        )}
        {items.length > 0 && (
          <CommandGroup heading="Items">
            {items.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.name} ${item.board_name} ${item.id}`}
                onSelect={() => {
                  onSelect({
                    id: item.id,
                    name: item.name,
                    boardId: item.board_id,
                    boardName: item.board_name,
                  });
                  onOpenChange(false);
                }}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate flex-1 font-medium text-foreground">{item.name}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                  {item.board_name}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default ItemPickerPopover;
