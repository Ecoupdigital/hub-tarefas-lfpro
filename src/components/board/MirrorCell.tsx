import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useItemConnections } from '@/hooks/useItemConnections';
import { RefreshCw } from 'lucide-react';

interface MirrorCellProps {
  value: any;
  onChange: (val: any) => void;
  itemId: string;
  columnId: string;
  settings?: {
    source_column_id?: string;
    via_connection_column_id?: string;
  };
}

const MirrorCell: React.FC<MirrorCellProps> = ({ itemId, settings }) => {
  const sourceColumnId = settings?.source_column_id;
  const connectionColumnId = settings?.via_connection_column_id;

  const { data: connections = [] } = useItemConnections(itemId, connectionColumnId);
  const firstConnectedItemId = connections.length > 0 ? connections[0].connected_item_id : undefined;

  const { data: mirroredValue, isLoading } = useQuery({
    queryKey: ['mirror_value', firstConnectedItemId, sourceColumnId],
    enabled: !!firstConnectedItemId && !!sourceColumnId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('column_values')
        .select('value')
        .eq('item_id', firstConnectedItemId!)
        .eq('column_id', sourceColumnId!)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
  });

  if (!connectionColumnId || !sourceColumnId) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="font-density-cell text-muted-foreground/40 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          Configurar
        </span>
      </div>
    );
  }

  if (!firstConnectedItemId) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="font-density-cell text-muted-foreground/40">—</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const displayValue = (() => {
    if (mirroredValue === null || mirroredValue === undefined) return '—';
    if (typeof mirroredValue === 'object') {
      if (Array.isArray(mirroredValue)) return mirroredValue.join(', ');
      if (mirroredValue.address) return mirroredValue.address;
      if (mirroredValue.start && mirroredValue.end) return `${mirroredValue.start} - ${mirroredValue.end}`;
      return JSON.stringify(mirroredValue);
    }
    return String(mirroredValue);
  })();

  return (
    <div className="w-full h-full flex items-center justify-center px-1">
      <span className="font-density-cell text-muted-foreground truncate" title={displayValue}>
        {displayValue}
      </span>
    </div>
  );
};

export default MirrorCell;
