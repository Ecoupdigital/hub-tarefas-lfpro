import { supabase } from '@/integrations/supabase/client';
import { BoardTemplate } from '@/data/boardTemplates';

interface ApplyTemplateOptions {
  boardId: string;
  template: BoardTemplate;
  userId: string;
}

/**
 * Aplica um template a um board recém-criado.
 * Cria grupos, colunas e itens de exemplo conforme definidos no template.
 * Faz deep clone de toda a estrutura JSON para garantir isolamento.
 */
export async function applyTemplate({ boardId, template, userId }: ApplyTemplateOptions): Promise<void> {
  // Deep clone para garantir que modificações no board não afetam o template original
  const config = structuredClone({ groups: template.groups, columns: template.columns });

  // 1. Criar grupos e mapear titulo → id para uso nos itens
  const groupIdByTitle: Record<string, string> = {};
  for (let i = 0; i < config.groups.length; i++) {
    const group = config.groups[i];
    const { data: createdGroup, error } = await supabase
      .from('groups')
      .insert({
        board_id: boardId,
        title: group.title,
        color: group.color || '#579BFC',
        position: (i + 1) * 1000,
      })
      .select()
      .single();
    if (error) throw error;
    groupIdByTitle[group.title] = createdGroup.id;
  }

  // 2. Criar colunas com tipos e settings
  for (let i = 0; i < config.columns.length; i++) {
    const col = config.columns[i];
    const { error } = await supabase
      .from('columns')
      .insert({
        board_id: boardId,
        title: col.title,
        column_type: col.type,
        position: (i + 1) * 1000,
        settings: col.settings || {},
      });
    if (error) throw error;
  }

  // 3. Criar itens de exemplo em cada grupo
  for (const group of config.groups) {
    const groupId = groupIdByTitle[group.title];
    if (!groupId || !group.items?.length) continue;
    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i];
      const { error } = await supabase
        .from('items')
        .insert({
          board_id: boardId,
          group_id: groupId,
          name: item.name,
          position: Date.now() + i * 10,
          created_by: userId,
        });
      if (error) {
        // Não bloqueia a criação do board se um item de exemplo falhar
        console.warn('applyTemplate: falha ao criar item de exemplo', item.name, error.message);
      }
    }
  }
}
