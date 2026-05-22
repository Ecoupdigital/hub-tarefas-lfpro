import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from '@blocknote/core';
import { MentionInlineContent } from './blocks/MentionInlineContent';

/**
 * Schema customizado do BlockNote para o LFPro Tasks.
 *
 * Estende defaults com inline content `mention-item` (@chip clicavel).
 * Plano 01-05b vai adicionar block spec `embed-board` reusando este schema.
 *
 * Para registrar novos blocks/inline content, criar specs em ./blocks/
 * e adicionar nos maps abaixo. Tipos sao inferidos automaticamente.
 */
export const lfproBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    // 01-05b: 'embed-board': EmbedBoardBlock,
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
