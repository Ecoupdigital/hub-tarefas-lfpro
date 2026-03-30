/**
 * Formata entradas do activity_log em linguagem natural (PT-BR).
 *
 * O campo `metadata` pode conter:
 *   - column_name: nome da coluna alterada
 *   - from_group / to_group: grupos de origem/destino ao mover item
 *   - item_name: nome do item (para criação/exclusão)
 *   - triggered_by: 'user' | 'automation'
 *
 * O campo `action` mapeia para:
 *   - column_value_changed: valor de coluna alterado
 *   - item_created: item criado
 *   - item_moved: item movido entre grupos
 *   - item_deleted: item excluído
 *   - item_updated: item atualizado
 *   - status_changed: status alterado
 *   - comment_added: comentário adicionado
 */

export interface ActivityLogEntry {
  id: string;
  board_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  item_id: string | null;
  old_value: any;
  new_value: any;
  metadata: any;
  created_at: string;
}

export interface Column {
  id: string;
  title: string;
  type?: string;
}

function formatValue(value: any, columnType?: string): string {
  if (value === null || value === undefined) return '(vazio)';
  if (typeof value === 'object') {
    // People column: array of user ids or objects
    if (Array.isArray(value)) {
      if (value.length === 0) return '(nenhum)';
      return value.map((v: any) => (typeof v === 'string' ? v : v?.name ?? v?.id ?? JSON.stringify(v))).join(', ');
    }
    // Date object
    if (value.date) return value.date;
    // Status object
    if (value.label) return value.label;
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'sim' : 'nao';
  return String(value);
}

export function formatActivityAction(log: ActivityLogEntry, columns: Column[] = []): string {
  const meta = (log.metadata as Record<string, any> | null) ?? {};
  const column = columns.find((c) => c.id === log.entity_id) ?? null;
  const columnName = meta.column_name ?? column?.title ?? 'um campo';
  const columnType = column?.type;

  switch (log.action) {
    case 'column_value_changed': {
      const oldFormatted = formatValue(log.old_value, columnType);
      const newFormatted = formatValue(log.new_value, columnType);
      if (log.old_value !== null && log.old_value !== undefined) {
        return `alterou ${columnName} de "${oldFormatted}" para "${newFormatted}"`;
      }
      return `definiu ${columnName} como "${newFormatted}"`;
    }

    case 'status_changed': {
      const oldFormatted = formatValue(log.old_value, 'status');
      const newFormatted = formatValue(log.new_value, 'status');
      if (log.old_value !== null && log.old_value !== undefined) {
        return `alterou o status de "${oldFormatted}" para "${newFormatted}"`;
      }
      return `definiu o status como "${newFormatted}"`;
    }

    case 'item_created': {
      const itemName = meta.item_name ?? log.new_value?.name ?? null;
      if (itemName) return `criou "${itemName}"`;
      return 'criou este item';
    }

    case 'item_moved': {
      const fromGroup = meta.from_group ?? log.old_value?.group ?? null;
      const toGroup = meta.to_group ?? log.new_value?.group ?? null;
      if (fromGroup && toGroup) {
        return `moveu de "${fromGroup}" para "${toGroup}"`;
      }
      if (toGroup) return `moveu para "${toGroup}"`;
      return 'moveu o item';
    }

    case 'item_deleted': {
      const itemName = meta.item_name ?? log.old_value?.name ?? null;
      if (itemName) return `excluiu "${itemName}"`;
      return 'excluiu o item';
    }

    case 'item_updated':
      return 'atualizou o item';

    case 'comment_added':
      return 'adicionou um comentario';

    default:
      return 'realizou uma acao';
  }
}

export function isAutomationEntry(log: ActivityLogEntry): boolean {
  const meta = (log.metadata as Record<string, any> | null) ?? {};
  return meta.triggered_by === 'automation';
}
