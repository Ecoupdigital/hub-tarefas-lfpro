import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from '@blocknote/core';
import { MentionInlineContent } from './blocks/MentionInlineContent';
import { EmbedBoardBlock } from './blocks/EmbedBoardBlock';
import { DatabaseBlock } from './blocks/DatabaseBlock';
import { BookmarkBlock } from './blocks/BookmarkBlock';

/**
 * Schema customizado do BlockNote para o LFPro Tasks.
 *
 * Estende defaults com:
 *  - inline content `mention-item` (@chip clicavel para item, 01-05)
 *  - block `embed-board` (mini-view read-only de board, 01-05b)
 *  - block `database` (database inline ancorada na page, 02-05)
 *  - block `bookmark` (card de preview de URL com metadata cacheada, 02-09)
 *
 * Para registrar novos blocks/inline content, criar specs em ./blocks/
 * e adicionar nos maps abaixo. Tipos sao inferidos automaticamente.
 */
// createReactBlockSpec retorna uma factory (options?) => BlockSpec na API
// do BlockNote v0.51. Invocamos aqui para obter o spec final consumido pelo schema.
const embedBoardSpec = EmbedBoardBlock();
const databaseSpec = DatabaseBlock();
const bookmarkSpec = BookmarkBlock();

export const lfproBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    'embed-board': embedBoardSpec,
    'database': databaseSpec,
    'bookmark': bookmarkSpec,
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    'mention-item': MentionInlineContent,
  },
  styleSpecs: {
    ...defaultStyleSpecs,
  },
});

/** Tipo do editor com o schema custom (uso opcional em props/refs). */
export type LfproBlockNoteEditor = typeof lfproBlockNoteSchema.BlockNoteEditor;
