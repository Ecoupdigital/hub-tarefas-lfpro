import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  children: (props: {
    attributes: Record<string, any>;
    listeners: Record<string, any> | undefined;
    setNodeRef: (node: HTMLElement | null) => void;
    isDragging: boolean;
    style: React.CSSProperties;
  }) => React.ReactElement;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 50 : undefined,
  };

  return children({ attributes, listeners, setNodeRef, isDragging, style });
};

export default SortableItem;
