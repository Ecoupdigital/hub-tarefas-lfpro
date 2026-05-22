import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from '@blocknote/core';
import { MentionInlineContent } from './blocks/MentionInlineContent';
import { EmbedBoardBlock } from './blocks/EmbedBoardBlock';

/**
 * Schema customizado do BlockNote para o LFPro Tasks.
 *
 * Estende defaults com:
 *  - inline content `mention-item` (@chip clicavel para item, 01-05)
 *  - block `embed-board` (mini-view read-only de board, 01-05b)
 *
 * Para registrar novos blocks/inline content, criar specs em ./blocks/
 * e adicionar nos maps abaixo. Tipos sao inferidos automaticamente.
 */
// createReactBlockSpec retorna uma factory (options?) => BlockSpec na API
// do BlockNote v0.51. Invocamos aqui para obter o spec final consumido pelo schema.
const embedBoardSpec = EmbedBoardBlock();

export const lfproBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    'embed-board': embedBoardSpec,
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
