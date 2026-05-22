import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Database } from 'lucide-react';

interface DatabaseSidebarItemProps {
  /** boards.id da database inline */
  databaseId: string;
  /** boards.page_id (page que ancora a database) */
  parentPageId: string;
  /** Nome do board (database) */
  name: string;
  /** Emoji opcional; se setado, sobrescreve o icone Lucide */
  icon: string | null;
  /** Cor de destaque (board.color) usada como tint no icone padrao */
  color: string | null;
  /** Profundidade na arvore (indentacao 16px por nivel) */
  level: number;
}

/**
 * Renderiza uma database inline (board com page_id) como item filho de uma page
 * no sidebar. Click navega pra rota da page parente com hash apontando pro
 * bloco database (#db=:databaseId), permitindo que a Page faca scroll/foco.
 *
 * Visual: indentado 16px por nivel, icone Database (Lucide) ou emoji se setado.
 * Padroes copiados de PageSidebarItem pra manter consistencia visual no sidebar.
 */
const DatabaseSidebarItem: React.FC<DatabaseSidebarItemProps> = ({
  databaseId,
  parentPageId,
  name,
  icon,
  color,
  level,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive =
    location.pathname === `/page/${parentPageId}` &&
    location.hash === `#db=${databaseId}`;

  return (
    <button
      onClick={() => navigate(`/page/${parentPageId}#db=${databaseId}`)}
      className={`flex items-center w-full density-px density-py-item text-sm rounded-md transition-colors duration-[70ms] ${
        isActive
          ? 'bg-primary/15 text-primary font-semibold'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
      }`}
      style={{ paddingLeft: `${level * 16 + 8}px` }}
      title={name}
    >
      <span className="flex-shrink-0 mr-2 inline-flex items-center justify-center w-3.5">
        {icon
          ? <span className="text-sm leading-none">{icon}</span>
          : <Database className="w-3.5 h-3.5" style={color ? { color } : undefined} />}
      </span>
      <span className="font-density-cell truncate flex-1 text-left">{name}</span>
    </button>
  );
};

export default DatabaseSidebarItem;
