import React from 'react';
import { ExternalLink, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface ButtonCellProps {
  value: any;
  onChange: (val: any) => void;
  settings?: {
    label?: string;
    action_type?: 'open_url' | 'trigger_automation';
    action_config?: {
      url?: string;
      automation_id?: string;
    };
  };
}

const ButtonCell: React.FC<ButtonCellProps> = ({ settings }) => {
  const label = settings?.label || 'Clique';
  const actionType = settings?.action_type || 'open_url';
  const actionConfig = settings?.action_config || {};

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    switch (actionType) {
      case 'open_url': {
        const url = actionConfig.url;
        if (url) {
          window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer');
        } else {
          toast.info('Nenhuma URL configurada para este botao');
        }
        break;
      }
      case 'trigger_automation': {
        if (actionConfig.automation_id) {
          toast.success('Automacao disparada');
        } else {
          toast.info('Nenhuma automacao configurada para este botao');
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-primary text-primary-foreground font-density-cell font-medium hover:bg-primary/90 transition-colors text-xs"
      >
        {actionType === 'open_url' ? (
          <ExternalLink className="w-3 h-3" />
        ) : (
          <Zap className="w-3 h-3" />
        )}
        {label}
      </button>
    </div>
  );
};

export default ButtonCell;
