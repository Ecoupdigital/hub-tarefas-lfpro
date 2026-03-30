/**
 * Automation Engine — Story 3.1
 *
 * Executes board automations in response to events.
 * Key features:
 *  - Anti-loop: module-level Set prevents the same automation from re-entering
 *  - Fire-and-forget: never throws to the caller — all errors are logged
 *  - Logs every execution to `automation_logs` (status: success | error | skipped, details jsonb)
 */
import { supabase } from '@/integrations/supabase/client';
import type { TriggerType, ActionType, AutomationRow } from './useAutomations';

type LogStatus = 'success' | 'error' | 'skipped';

export type AutomationTriggerType = TriggerType | 'person_assigned';

export interface AutomationEvent {
  type: AutomationTriggerType;
  boardId: string;
  itemId: string;
  /** The column that changed (for column_change / status_change / person_assigned) */
  columnId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  groupId?: string;
}

// Module-level Set — persists for the browser session, prevents infinite loops
const executingAutomations = new Set<string>();

/**
 * Entry point: call this after a mutation succeeds to run any matching automations.
 * Must NEVER throw — all errors are caught internally.
 */
export async function executeAutomations(event: AutomationEvent): Promise<void> {
  try {
    const { data: automations, error } = await supabase
      .from('automations')
      .select('*')
      .eq('board_id', event.boardId)
      .eq('is_active', true)
      .eq('trigger_type', event.type);

    if (error || !automations) return;

    for (const automation of automations as AutomationRow[]) {
      await runAutomation(automation, event);
    }
  } catch (err) {
    console.error('[AutomationEngine] Error fetching automations:', err);
  }
}

async function runAutomation(automation: AutomationRow, event: AutomationEvent): Promise<void> {
  // Anti-loop: if this automation is already executing, skip
  if (executingAutomations.has(automation.id)) return;

  // Check if the trigger config matches this specific event
  if (!matchesTriggerConfig(automation, event)) return;

  // Check optional conditions against item's current column values
  if (!(await matchesConditions(automation, event.itemId))) return;

  executingAutomations.add(automation.id);
  let logStatus: LogStatus = 'success';
  let logDetails: Record<string, unknown> | null = null;

  try {
    await executeActions(automation, event);

    // Update run_count and last_run_at on the automation record
    supabase
      .from('automations')
      .update({ run_count: (automation.run_count || 0) + 1, last_run_at: new Date().toISOString() })
      .eq('id', automation.id)
      .then(() => {/* fire-and-forget */})
      .catch(() => {/* ignore */});

  } catch (err) {
    logStatus = 'error';
    logDetails = { error: (err as Error).message };
    console.error(`[AutomationEngine] Automation "${automation.name}" (${automation.id}) failed:`, err);
  } finally {
    executingAutomations.delete(automation.id);
  }

  // Log execution — fire-and-forget, never blocks the flow
  supabase
    .from('automation_logs')
    .insert({
      automation_id: automation.id,
      item_id: event.itemId || null,
      status: logStatus,
      details: logDetails,
    })
    .then(() => {/* ok */})
    .catch((logErr) => {
      console.error('[AutomationEngine] Failed to write automation log:', logErr);
    });
}

/**
 * Verify that the automation's trigger_config matches the specific event details.
 * E.g. for status_change: only fire if the changed column and status value match.
 */
function matchesTriggerConfig(automation: AutomationRow, event: AutomationEvent): boolean {
  const config = (automation.trigger_config as Record<string, unknown>) || {};

  switch (automation.trigger_type) {
    case 'status_change': {
      // Must match the column
      if (config.columnId && config.columnId !== event.columnId) return false;
      // Must match the target status key/value
      if (config.statusKey) {
        // statusKey format: "columnId:key" — compare the key portion against newValue
        const targetKey = String(config.statusKey).split(':').pop();
        if (targetKey && targetKey !== String(event.newValue)) return false;
      }
      return true;
    }
    case 'column_change':
    case 'person_assigned': {
      if (config.columnId && config.columnId !== event.columnId) return false;
      return true;
    }
    case 'item_created':
    case 'date_arrived':
    default:
      return true;
  }
}

interface ConditionRule {
  columnId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'is_empty' | 'is_not_empty';
  value?: unknown;
}

interface ConditionGroup {
  combinator?: 'and' | 'or';
  rules?: ConditionRule[];
}

/**
 * Condition matching with real evaluation against item column values.
 * If no rules defined, always matches. Otherwise fetches column_values
 * for the item and evaluates each rule.
 */
async function matchesConditions(automation: AutomationRow, itemId: string): Promise<boolean> {
  const conditions = automation.conditions as ConditionGroup | null;
  if (!conditions || !Array.isArray(conditions.rules) || conditions.rules.length === 0) {
    return true;
  }

  // Fetch current column values for the item
  const { data: columnValues, error } = await supabase
    .from('column_values')
    .select('column_id, value')
    .eq('item_id', itemId);

  if (error || !columnValues) return true; // fail-open on fetch error

  const valueMap = new Map<string, unknown>();
  for (const cv of columnValues) {
    valueMap.set(cv.column_id, cv.value);
  }

  const combinator = conditions.combinator || 'and';
  const results = conditions.rules.map((rule) => evaluateRule(rule, valueMap));

  return combinator === 'and'
    ? results.every(Boolean)
    : results.some(Boolean);
}

function evaluateRule(rule: ConditionRule, valueMap: Map<string, unknown>): boolean {
  if (!rule.columnId || !rule.operator) return true;

  const cellValue = valueMap.get(rule.columnId);
  const cellStr = cellValue != null ? String(cellValue) : '';

  switch (rule.operator) {
    case 'equals':
      return cellStr === String(rule.value ?? '');
    case 'not_equals':
      return cellStr !== String(rule.value ?? '');
    case 'contains':
      return cellStr.toLowerCase().includes(String(rule.value ?? '').toLowerCase());
    case 'gt': {
      const num = parseFloat(cellStr);
      const target = parseFloat(String(rule.value ?? ''));
      return !isNaN(num) && !isNaN(target) && num > target;
    }
    case 'lt': {
      const num = parseFloat(cellStr);
      const target = parseFloat(String(rule.value ?? ''));
      return !isNaN(num) && !isNaN(target) && num < target;
    }
    case 'is_empty':
      return cellValue == null || cellStr === '';
    case 'is_not_empty':
      return cellValue != null && cellStr !== '';
    default:
      return true;
  }
}

/**
 * Execute all configured actions for an automation (multi-action support).
 */
async function executeActions(automation: AutomationRow, event: AutomationEvent): Promise<void> {
  // Prefer the `actions` array (multi-action) over the legacy single action fields
  const actionsArray = Array.isArray(automation.actions) && automation.actions.length > 0
    ? (automation.actions as { action_type: string; action_config: Record<string, unknown> }[])
    : [{ action_type: automation.action_type, action_config: (automation.action_config as Record<string, unknown>) || {} }];

  for (const action of actionsArray) {
    if (!action.action_type) continue;
    await executeSingleAction(
      action.action_type as ActionType,
      action.action_config || {},
      event.itemId,
      event.boardId,
    );
  }
}

async function executeSingleAction(
  actionType: string,
  config: Record<string, unknown>,
  itemId: string,
  boardId: string,
): Promise<void> {
  switch (actionType) {
    case 'change_status':
    case 'set_column_value': {
      if (!config.columnId) return;
      await supabase
        .from('column_values')
        .upsert(
          {
            item_id: itemId,
            column_id: config.columnId as string,
            value: config.value ?? config.statusKey ?? null,
          },
          { onConflict: 'item_id,column_id' }
        );
      break;
    }

    case 'assign_person': {
      // Find the target people column (config.columnId) or first people column on the board
      let targetColumnId = config.columnId as string | undefined;
      if (!targetColumnId) {
        const { data: col } = await supabase
          .from('columns')
          .select('id')
          .eq('board_id', boardId)
          .eq('column_type', 'people')
          .limit(1)
          .maybeSingle();
        targetColumnId = col?.id;
      }
      if (!targetColumnId || !config.personId) return;
      await supabase
        .from('column_values')
        .upsert(
          { item_id: itemId, column_id: targetColumnId, value: [config.personId] },
          { onConflict: 'item_id,column_id' }
        );
      break;
    }

    case 'send_notification':
    case 'notify_assignee': {
      // Insert into notifications table (fails silently if table doesn't exist)
      await supabase
        .from('notifications')
        .insert({
          message: config.message || 'Automação executada',
          item_id: itemId,
          board_id: boardId,
        })
        .then(() => {/* ok */})
        .catch(() => {/* table may not exist — ignore */});
      break;
    }

    case 'move_to_group': {
      if (!config.groupId) return;
      await supabase
        .from('items')
        .update({ group_id: config.groupId })
        .eq('id', itemId);
      break;
    }

    case 'create_subitem': {
      await supabase
        .from('subitems')
        .insert({
          item_id: itemId,
          name: config.subitemName as string || 'Subitem',
          board_id: boardId,
        })
        .then(() => {/* ok */})
        .catch(() => {/* subitems table may not exist — ignore */});
      break;
    }

    default:
      // Unknown action type — log and skip
      console.warn(`[AutomationEngine] Unknown action type: "${actionType}"`);
  }
}
