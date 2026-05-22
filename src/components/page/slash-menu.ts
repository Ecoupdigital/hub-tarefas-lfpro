import {
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from '@blocknote/react';
import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';

/**
 * Handlers que o PageEditor injeta para abrir UIs custom
 * (popovers/modals) a partir de itens do slash menu.
 *
 * Handlers opcionais sao condicionais: o item correspondente so e adicionado
 * ao menu quando o PageEditor passa a callback. Isso permite usar o editor
 * em contextos sem pageId/workspaceId (ex: previews) sem expor opcoes invalidas.
 *
 *  - `onTriggerEmbedBoard` (01-05b): embed read-only de board existente
 *  - `onTriggerDatabase`   (02-05):  criar database inline na page atual
 */
export interface SlashMenuHandlers {
  onTriggerMention: () => void;
  onTriggerEmbedBoard?: () => void;
  onTriggerDatabase?: () => void;
}

/**
 * Constroi a lista final de items do slash menu em pt-BR:
 *  - defaults do BlockNote (ja traduzidos via prop `dictionary` no editor)
 *  - items custom LFPro (Mencionar item, opcionalmente Embedar board)
 *
 * filterSuggestionItems usa `title`, `aliases` e `subtext` para matching.
 * Por isso aliases incluem variacoes pt/en para usuarios que escapem padrao.
 */
export function getCustomSlashMenuItems<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  handlers: SlashMenuHandlers,
): DefaultReactSuggestionItem[] {
  // BlockNote ja respeita o `dictionary` do editor, mapeando titles para pt-BR.
  const defaults = getDefaultReactSlashMenuItems(editor);

  const customs: DefaultReactSuggestionItem[] = [
    {
      title: 'Mencionar item',
      onItemClick: () => handlers.onTriggerMention(),
      aliases: ['mencionar', 'mention', '@item', 'item', 'mencao'],
      group: 'LFPro',
      subtext: 'Inserir referencia clicavel para um item de board',
    },
  ];

  if (handlers.onTriggerEmbedBoard) {
    customs.push({
      title: 'Embedar board',
      onItemClick: () => handlers.onTriggerEmbedBoard!(),
      aliases: ['embedar', 'embed', 'board', 'tabela'],
      group: 'LFPro',
      subtext: 'Inserir tabela read-only de um board',
    });
  }

  if (handlers.onTriggerDatabase) {
    customs.push({
      title: 'Database',
      onItemClick: () => handlers.onTriggerDatabase!(),
      aliases: ['database', 'db', 'mini board', 'mini-board', 'tabela editavel', 'kanban', 'calendario'],
      group: 'LFPro',
      subtext: 'Inserir mini-board com Tabela, Kanban, Calendario e Lista detalhada',
    });
  }

  // Items LFPro vem primeiro para serem facilmente alcancaveis via "/" + tipagem rapida.
  return [...customs, ...defaults];
}
