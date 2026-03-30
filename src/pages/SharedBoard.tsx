import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicBoardByToken } from '@/hooks/useBoardShares';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2, Lock, Shield } from 'lucide-react';
import { hashPassword } from '@/utils/hashUtils';

const SharedBoard: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = usePublicBoardByToken(token);
  const [passwordInput, setPasswordInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data || data.status === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Link invalido</h2>
          <p className="text-sm text-muted-foreground">
            Este link de compartilhamento nao existe ou foi revogado.
          </p>
        </div>
      </div>
    );
  }

  if (data.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Link expirado</h2>
          <p className="text-sm text-muted-foreground">
            Este link de compartilhamento expirou e nao esta mais disponivel.
          </p>
        </div>
      </div>
    );
  }

  // Password check — use has_password flag, verify against internal _passwordHash
  if (data.share?.has_password && !authenticated) {
    const handlePasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const hashed = await hashPassword(passwordInput);
      if (hashed === data.share!._passwordHash) {
        setAuthenticated(true);
        setPasswordError(false);
      } else {
        setPasswordError(true);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="max-w-sm w-full mx-auto px-4">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="text-center">
              <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-foreground">Board protegido</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Digite a senha para acessar este board.
              </p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <Input
                type="password"
                value={passwordInput}
                onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
                placeholder="Senha"
                autoFocus
              />
              {passwordError && (
                <p className="text-xs text-destructive">Senha incorreta. Tente novamente.</p>
              )}
              <button
                type="submit"
                className="w-full px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
              >
                Acessar
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <SharedBoardView data={data} />;
};

type SharePermission = 'view' | 'comment' | 'edit';

const SharedBoardView: React.FC<{ data: any }> = ({ data }) => {
  const { board, groups, columns, items, columnValues, share } = data;
  const permission: SharePermission = share?.permission || 'view';
  const isReadOnly = permission === 'view' || permission === 'comment';

  // Build column value map
  const cvMap = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    for (const cv of columnValues) {
      if (!map[cv.item_id]) map[cv.item_id] = {};
      map[cv.item_id][cv.column_id] = cv.value;
    }
    return map;
  }, [columnValues]);

  const getPermissionLabel = (perm: string) => {
    switch (perm) {
      case 'view': return 'Visualizacao';
      case 'comment': return 'Comentarios';
      case 'edit': return 'Edicao';
      default: return perm;
    }
  };

  const renderCellValue = (column: any, value: any) => {
    const settings = (column.settings as any) || {};
    const colType = column.column_type;

    if (value === null || value === undefined) {
      return <span className="text-muted-foreground/40">&mdash;</span>;
    }

    switch (colType) {
      case 'status': {
        const labels = settings.labels || {};
        const label = labels[value];
        if (label) {
          return (
            <span
              className="px-2 py-0.5 rounded text-[11px] text-white font-medium"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          );
        }
        return String(value);
      }
      case 'checkbox':
        return value ? (
          <span className="text-primary font-medium">✓</span>
        ) : (
          <span className="text-muted-foreground">✗</span>
        );
      case 'rating': {
        const stars = Number(value) || 0;
        return (
          <div className="flex gap-0.5 justify-center">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={i < stars ? 'text-yellow-500' : 'text-gray-300'}>
                ★
              </span>
            ))}
          </div>
        );
      }
      case 'progress': {
        const progress = Math.min(Number(value) || 0, 100);
        return (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{progress}%</span>
          </div>
        );
      }
      case 'email':
        return (
          <a href={`mailto:${String(value)}`} className="text-primary hover:underline text-xs truncate">
            {String(value)}
          </a>
        );
      case 'phone':
        return (
          <a href={`tel:${String(value)}`} className="text-primary hover:underline text-xs">
            {String(value)}
          </a>
        );
      case 'number':
        return <span className="text-xs font-medium">{Number(value).toLocaleString('pt-BR')}</span>;
      case 'long_text':
        return <span className="text-xs text-muted-foreground line-clamp-2">{String(value)}</span>;
      case 'people': {
        if (Array.isArray(value)) {
          return <span className="text-xs">{value.length} pessoa(s)</span>;
        }
        return <span className="text-xs">{String(value)}</span>;
      }
      case 'time_tracking': {
        const totalSeconds = typeof value === 'object' && value !== null
          ? (value as any).totalSeconds || 0
          : Number(value) || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return <span className="text-xs">{hours > 0 ? `${hours}h ` : ''}{minutes}m</span>;
      }
      case 'link':
        return (
          <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs truncate">
            {String(value)}
          </a>
        );
      case 'date':
        try {
          return new Date(String(value)).toLocaleDateString('pt-BR');
        } catch {
          return String(value);
        }
      case 'tags':
        if (Array.isArray(value)) {
          return (
            <div className="flex gap-1 flex-wrap">
              {value.map((t: string, i: number) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{t}</span>
              ))}
            </div>
          );
        }
        return String(value);
      default:
        return <span className="text-xs">{String(value)}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{board?.name || 'Board'}</h1>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              <Shield className="w-3 h-3" />
              {getPermissionLabel(share.permission)}
            </span>
          </div>
          {board?.description && (
            <p className="text-sm text-muted-foreground mt-1">{board.description}</p>
          )}
        </div>
      </div>

      {/* Board content */}
      <div className="max-w-7xl mx-auto py-6 px-4 overflow-x-auto">
        {groups.map((group: any) => {
          const groupItems = items.filter((i: any) => i.group_id === group.id);

          return (
            <div key={group.id} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: group.color || '#579BFC' }} />
                <h3 className="text-sm font-bold" style={{ color: group.color || '#579BFC' }}>
                  {group.title}
                </h3>
                <span className="text-[10px] text-muted-foreground">{groupItems.length} itens</span>
              </div>

              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground min-w-[200px]">
                        Item
                      </th>
                      {columns.map((col: any) => (
                        <th key={col.id} className="text-center px-3 py-2 text-[11px] font-medium text-muted-foreground min-w-[120px]">
                          {col.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 1} className="text-center py-6 text-sm text-muted-foreground">
                          Nenhum item neste grupo.
                        </td>
                      </tr>
                    ) : (
                      groupItems.map((item: any) => (
                        <tr key={item.id} className={`border-b border-border last:border-0 transition-colors ${isReadOnly ? '' : 'hover:bg-muted/30 cursor-pointer'}`}>
                          <td className="px-4 py-2 text-sm text-foreground">{item.name}</td>
                          {columns.map((col: any) => (
                            <td key={col.id} className="px-3 py-2 text-center">
                              {renderCellValue(col, cvMap[item.id]?.[col.id])}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Este board nao possui grupos ainda.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-muted-foreground">
        Compartilhado via LFPro Tasks
      </div>
    </div>
  );
};

export default SharedBoard;
