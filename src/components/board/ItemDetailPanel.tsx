import React, { useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MoreHorizontal, Send, Pin, MessageSquare, Trash2, FileText, Activity as ActivityIcon, Plus, Copy, ArrowRight, Clock, Link2, ChevronDown, ChevronRight, Reply, Play, Pause, Pencil } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useUpdates, useCreateUpdate, useToggleUpdatePin, useEditUpdate, useDeleteUpdate, useDuplicateUpdate, useProfiles, useAllSubitems, useItemFull } from '@/hooks/useSupabaseData';
import { useDeleteItem, useCreateSubitem, useDuplicateItem, useMoveItem } from '@/hooks/useCrudMutations';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useItemActivityRealtime } from '@/hooks/useActivityLog';
const DependencyManager = React.lazy(() => import('./DependencyManager'));
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MentionInput, { RenderMentionText } from '@/components/shared/MentionInput';
import RichTextEditor, { RichTextDisplay } from '@/components/shared/RichTextEditor';
import { supabase } from '@/integrations/supabase/client';

const ActivityFeed = React.lazy(() => import('./ActivityFeed'));
import EmojiReactions from './EmojiReactions';
import StatusCell from './StatusCell';
import PeopleCell from './PeopleCell';
import DateCell from './DateCell';
import LinkCell from './LinkCell';
import CheckboxCell from './CheckboxCell';
import NumberCell from './NumberCell';
import DropdownCell from './DropdownCell';
import LongTextCell from './LongTextCell';
import EmailCell from './EmailCell';
import PhoneCell from './PhoneCell';
import RatingCell from './RatingCell';
import TagsCell from './TagsCell';
import ProgressCell from './ProgressCell';
import AutoNumberCell from './AutoNumberCell';
import TimeTrackingCell from './TimeTrackingCell';
import TextCell from './TextCell';
import TimelineCell from './TimelineCell';
import ConnectBoardsCell from './ConnectBoardsCell';
import MirrorCell from './MirrorCell';
import VoteCell from './VoteCell';
import ColorCell from './ColorCell';
import ButtonCell from './ButtonCell';
import LocationCell from './LocationCell';
import FileCell from './FileCell';
const FormulaCell = React.lazy(() => import('./FormulaCell'));
import { parseTimeData, formatDuration, formatDurationFull, parseManualTime, TimeTrackingData } from './TimeTrackingDetailModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useReactionsForItem, useToggleReaction, type Reaction } from '@/hooks/useReactions';
import { useAuth } from '@/hooks/useAuth';
import { useCanAdmin } from '@/hooks/usePermissions';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

interface UpdateEntry {
  id: string;
  item_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at?: string | null;
  is_pinned?: boolean;
  parent_update_id?: string | null;
}

const ItemDetailPanel: React.FC = () => {
  const { selectedItem, setSelectedItem, updateSelectedItem, pushNavItem, popNavItem, jumpToNavLevel, navStack, activeBoard, updateItemColumnValue, updateItemName, activeBoardId } = useApp();
  const navigate = useNavigate();
  const isSubitem = !!selectedItem?.parent_item_id;
  // Quando é subitem, carrega os dados completos (com columnValues) via query
  const { data: fullSubitem } = useItemFull(isSubitem ? selectedItem?.id : null);
  // Merge: fullSubitem fornece os dados do DB; selectedItem.columnValues fornece updates otimistas.
  // Isso garante que edições aparecem imediatamente na UI sem esperar o refetch.
  const effectiveItem = useMemo(() => {
    if (!isSubitem || !fullSubitem) return selectedItem;
    return {
      ...fullSubitem,
      columnValues: {
        ...fullSubitem.columnValues,
        ...(selectedItem?.columnValues ?? {}),
      },
    };
  }, [isSubitem, fullSubitem, selectedItem]);
  const { user } = useAuth();
  const [updateText, setUpdateText] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [newSubitemName, setNewSubitemName] = useState('');
  const [addingSubitem, setAddingSubitem] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deletingUpdateId, setDeletingUpdateId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [timeManualInputs, setTimeManualInputs] = useState<Record<string, { time: string; note: string }>>({});
  const [tabTimeTick, setTabTimeTick] = useState(0);
  const isAdmin = useCanAdmin(activeBoard?.id ?? null);
  const { data: itemUpdates = [], isLoading: updatesLoading } = useUpdates(selectedItem?.id);
  const createUpdate = useCreateUpdate();
  const togglePinMut = useToggleUpdatePin();
  const editUpdate = useEditUpdate();
  const deleteUpdate = useDeleteUpdate();
  const duplicateUpdate = useDuplicateUpdate();
  const { data: profiles = [] } = useProfiles();
  const deleteItem = useDeleteItem();
  const createSubitem = useCreateSubitem();
  const duplicateItem = useDuplicateItem();
  const moveItem = useMoveItem();
  const { pushAction, undo } = useUndoRedo();
  const { data: allSubitems = [] } = useAllSubitems(activeBoardId);

  const currentUserId = user?.id;

  // Subscricao em tempo real para o activity feed do item atual
  useItemActivityRealtime(selectedItem?.id ?? null, activeBoardId);

  // Live tick for active timers in the Tempo tab
  const hasRunningTimer = useMemo(() =>
    selectedItem
      ? (activeBoard?.columns || []).filter(c => c.type === 'time_tracking').some(c => {
          const td = parseTimeData(selectedItem.columnValues?.[c.id]?.value);
          return !!td.runningFrom;
        })
      : false,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedItem?.columnValues, activeBoard?.columns]
  );

  useEffect(() => {
    if (!hasRunningTimer) return;
    const interval = setInterval(() => setTabTimeTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [hasRunningTimer]);

  // Ensure columnValues is always an object (may be undefined when opened from /my-work before board data loads)
  if (selectedItem && !selectedItem.columnValues) {
    selectedItem.columnValues = {};
  }

  // Collect all update IDs for batch reactions query
  const updateIds = useMemo(() => itemUpdates.map((u: any) => u.id), [itemUpdates]);
  const { data: allReactions = [] } = useReactionsForItem(updateIds);

  // Group reactions by update_id
  const reactionsByUpdate = useMemo(() => {
    const map = new Map<string, Reaction[]>();
    for (const r of allReactions) {
      const existing = map.get(r.update_id) || [];
      existing.push(r);
      map.set(r.update_id, existing);
    }
    return map;
  }, [allReactions]);

  // Organize updates into threads: parent comments and replies
  const { pinnedUpdates, parentUpdates, repliesByParent } = useMemo(() => {
    const updates = itemUpdates as UpdateEntry[];
    const pinned: UpdateEntry[] = [];
    const parents: UpdateEntry[] = [];
    const replies = new Map<string, UpdateEntry[]>();

    for (const u of updates) {
      if (u.parent_update_id) {
        const existing = replies.get(u.parent_update_id) || [];
        existing.push(u);
        replies.set(u.parent_update_id, existing);
      } else if (u.is_pinned) {
        pinned.push(u);
      } else {
        parents.push(u);
      }
    }

    // Sort replies by created_at ascending (oldest first)
    for (const [, arr] of replies) {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return { pinnedUpdates: pinned, parentUpdates: parents, repliesByParent: replies };
  }, [itemUpdates]);

  const handleSendUpdate = useCallback(async () => {
    if (!updateText.trim() || !selectedItem || !activeBoard) return;
    const body = updateText.trim();
    createUpdate.mutate({ itemId: selectedItem.id, body });

    // Extract mentions and create notifications
    const mentionRegex = /@\[([a-f0-9-]+)\]/g;
    const hasTodos = body.includes('@todos');
    const mentionedIds = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(body)) !== null) {
      mentionedIds.add(match[1]);
    }

    if (hasTodos) {
      profiles.forEach(p => mentionedIds.add(p.id));
    }

    const { data: userData } = await supabase.auth.getUser();
    const curUserId = userData.user?.id;

    for (const userId of mentionedIds) {
      if (userId === curUserId) continue;
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'mention',
        title: `Voce foi mencionado em ${selectedItem.name}`,
        body: body.slice(0, 200),
        item_id: selectedItem.id,
        board_id: activeBoard?.id || null,
      } as any);
    }

    setUpdateText('');
    setEditorKey(k => k + 1); // Força reset do editor rico
  }, [updateText, selectedItem, profiles, createUpdate, activeBoard]);

  const handleSendReply = useCallback((parentId: string) => {
    if (!replyText.trim() || !selectedItem) return;
    const body = replyText.trim();

    createUpdate.mutate(
      { itemId: selectedItem.id, body, parentUpdateId: parentId },
      {
        onSuccess: () => {
          setReplyText('');
          setReplyingTo(null);
          setExpandedReplies(prev => new Set([...prev, parentId]));
        },
        onError: () => {
          toast.error('Erro ao enviar resposta');
        },
      }
    );
  }, [replyText, selectedItem, createUpdate]);

  const handleTogglePin = useCallback((updateId: string, currentPinned: boolean) => {
    togglePinMut.mutate(
      { updateId, isPinned: !currentPinned },
      {
        onError: () => toast.error('Erro ao fixar comentario'),
      }
    );
  }, [togglePinMut]);

  const handleSaveEdit = useCallback((updateId: string) => {
    if (!editText.trim() || !selectedItem) return;
    editUpdate.mutate(
      { updateId, body: editText.trim(), itemId: selectedItem.id },
      {
        onSuccess: () => { setEditingUpdateId(null); setEditText(''); toast.success('Update editado'); },
        onError: () => toast.error('Erro ao editar update'),
      }
    );
  }, [editText, selectedItem, editUpdate]);

  const handleDeleteUpdate = useCallback((updateId: string) => {
    if (!selectedItem) return;
    deleteUpdate.mutate(
      { updateId, itemId: selectedItem.id },
      {
        onSuccess: () => { setDeletingUpdateId(null); toast.success('Update excluído'); },
        onError: () => toast.error('Erro ao excluir update'),
      }
    );
  }, [selectedItem, deleteUpdate]);

  const handleDuplicateUpdate = useCallback((update: UpdateEntry) => {
    if (!selectedItem) return;
    duplicateUpdate.mutate(
      { update: { item_id: selectedItem.id, body: update.body } },
      {
        onSuccess: () => toast.success('Update duplicado'),
        onError: () => toast.error('Erro ao duplicar update'),
      }
    );
  }, [selectedItem, duplicateUpdate]);

  if (!selectedItem || !activeBoard) return null;

  const columns = activeBoard.columns;
  const subitems = allSubitems.filter((s: any) => s.parent_item_id === selectedItem.id);
  const currentGroup = activeBoard.groups.find(g => g.id === selectedItem.groupId);

  // Find time tracking columns
  const timeTrackingCols = columns.filter(c => c.type === 'time_tracking');

  const getProfileName = (authorId: string) => profiles.find(pr => pr.id === authorId)?.name || 'Usuario';
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleTimeTabToggle = useCallback((col: any) => {
    if (!selectedItem) return;
    const colValues = effectiveItem?.columnValues ?? selectedItem.columnValues ?? {};
    const val = colValues[col.id]?.value;
    const td = parseTimeData(val);
    let newData: TimeTrackingData;
    if (td.runningFrom) {
      const elapsed = Math.floor((Date.now() - new Date(td.runningFrom).getTime()) / 1000);
      const newSession = { start: td.runningFrom, end: new Date().toISOString(), duration: elapsed, note: '' };
      newData = { ...td, sessions: [...td.sessions, newSession], totalSeconds: td.totalSeconds + elapsed, runningFrom: null };
      toast.success(`Timer pausado — ${formatDurationFull(elapsed)} registrados`);
    } else {
      newData = { ...td, runningFrom: new Date().toISOString() };
      toast.success('Timer iniciado');
    }
    updateItemColumnValue(selectedItem.id, col.id, { value: newData });
    updateSelectedItem({
      ...selectedItem,
      columnValues: { ...colValues, [col.id]: { ...(colValues[col.id] ?? {}), value: newData } },
    });
  }, [selectedItem, effectiveItem, updateItemColumnValue, updateSelectedItem]);

  const handleTimeTabManualAdd = useCallback((col: any) => {
    if (!selectedItem) return;
    const inputs = timeManualInputs[col.id] || { time: '', note: '' };
    const secs = parseManualTime(inputs.time);
    if (!secs || secs <= 0) return;
    const colValues = effectiveItem?.columnValues ?? selectedItem.columnValues ?? {};
    const val = colValues[col.id]?.value;
    const td = parseTimeData(val);
    const now = new Date().toISOString();
    const newSession = { start: now, end: now, duration: secs, note: inputs.note.trim() || 'Entrada manual' };
    const newData: TimeTrackingData = { ...td, sessions: [...td.sessions, newSession], totalSeconds: td.totalSeconds + secs };
    updateItemColumnValue(selectedItem.id, col.id, { value: newData });
    updateSelectedItem({
      ...selectedItem,
      columnValues: { ...colValues, [col.id]: { ...(colValues[col.id] ?? {}), value: newData } },
    });
    setTimeManualInputs(prev => ({ ...prev, [col.id]: { time: '', note: '' } }));
  }, [selectedItem, effectiveItem, timeManualInputs, updateItemColumnValue, updateSelectedItem]);

  const handleTimeTabDeleteSession = useCallback((col: any, idx: number) => {
    if (!selectedItem) return;
    const colValues = effectiveItem?.columnValues ?? selectedItem.columnValues ?? {};
    const val = colValues[col.id]?.value;
    const td = parseTimeData(val);
    const session = td.sessions[idx];
    const newData: TimeTrackingData = {
      ...td,
      sessions: td.sessions.filter((_, i) => i !== idx),
      totalSeconds: Math.max(0, td.totalSeconds - session.duration),
    };
    updateItemColumnValue(selectedItem.id, col.id, { value: newData });
    updateSelectedItem({
      ...selectedItem,
      columnValues: { ...colValues, [col.id]: { ...(colValues[col.id] ?? {}), value: newData } },
    });
  }, [selectedItem, effectiveItem, updateItemColumnValue, updateSelectedItem]);

  const toggleRepliesExpanded = (parentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(selectedItem.id);
      pushAction({
        type: 'item_delete',
        entityId: selectedItem.id,
        entityType: 'item',
        oldValue: 'active',
        newValue: 'deleted',
      });
      toast.success('Item movido para a lixeira', {
        action: {
          label: 'Desfazer',
          onClick: () => { undo(); },
        },
        duration: 5000,
      });
      setSelectedItem(null);
    } catch { toast.error('Erro ao excluir item'); }
  };

  const handleAddSubitem = () => {
    if (!newSubitemName.trim()) return;
    createSubitem.mutate({ boardId: activeBoard.id, groupId: selectedItem.groupId, parentItemId: selectedItem.id, name: newSubitemName.trim() });
    setNewSubitemName('');
    setAddingSubitem(false);
  };

  const renderDetailCell = (col: any) => {
    const colValues = effectiveItem?.columnValues ?? {};
    const cv = colValues[col.id];
    const val = cv?.value;
    const onChange = (v: any) => {
      updateItemColumnValue(selectedItem.id, col.id, { value: v });
      // Atualiza item no lugar (sem limpar navStack — importante para subitems)
      updateSelectedItem({
        ...selectedItem,
        columnValues: {
          ...colValues,
          [col.id]: { ...(colValues[col.id] ?? {}), value: v },
        },
      });
    };
    switch (col.type) {
      case 'status': return <div className="h-7 rounded overflow-visible"><StatusCell value={val} labels={col.settings.labels || {}} onChange={onChange} /></div>;
      case 'people': return <div className="h-8 overflow-visible"><PeopleCell value={val} onChange={onChange} /></div>;
      case 'date': return <div className="h-8"><DateCell value={val} onChange={onChange} /></div>;
      case 'link': return <div className="h-8"><LinkCell value={val} onChange={onChange} /></div>;
      case 'checkbox': return <CheckboxCell value={val} onChange={onChange} />;
      case 'number': return <div className="h-8"><NumberCell value={val} onChange={onChange} /></div>;
      case 'dropdown': return <div className="h-8 overflow-visible"><DropdownCell value={val} options={col.settings.options || []} onChange={onChange} /></div>;
      case 'long_text': return <div className="h-8"><LongTextCell value={val} onChange={onChange} /></div>;
      case 'email': return <div className="h-8"><EmailCell value={val} onChange={onChange} /></div>;
      case 'phone': return <div className="h-8"><PhoneCell value={val} onChange={onChange} /></div>;
      case 'rating': return <div className="h-8"><RatingCell value={val} onChange={onChange} /></div>;
      case 'tags': return <div className="h-8 overflow-visible"><TagsCell value={val} onChange={onChange} /></div>;
      case 'progress': return <div className="h-8"><ProgressCell value={val} onChange={onChange} /></div>;
      case 'auto_number': return <AutoNumberCell value={val} />;
      case 'time_tracking': return <div className="h-8"><TimeTrackingCell value={val} onChange={onChange} /></div>;
      case 'text': return <div className="h-8"><TextCell value={val} onChange={onChange} /></div>;
      case 'creation_log':
      case 'last_updated': return <span className="font-density-cell text-muted-foreground">{val?.date ? new Date(val.date).toLocaleDateString('pt-BR') : '\u2014'}</span>;
      case 'timeline': return <div className="h-8"><TimelineCell value={val} onChange={onChange} /></div>;
      case 'vote': return <div className="h-8"><VoteCell value={val} onChange={onChange} /></div>;
      case 'color': return <div className="h-8"><ColorCell value={val} onChange={onChange} /></div>;
      case 'location': return <div className="h-8"><LocationCell value={val} onChange={onChange} /></div>;
      case 'button': return <div className="h-8"><ButtonCell value={val} onChange={onChange} settings={col.settings as any} /></div>;
      case 'file': return <div className="h-8"><FileCell value={val} itemId={selectedItem.id} columnId={col.id} onChange={onChange} /></div>;
      case 'connect_boards': return <div className="h-8"><ConnectBoardsCell value={val} onChange={onChange} itemId={selectedItem.id} columnId={col.id} settings={col.settings as any} /></div>;
      case 'mirror': return <div className="h-8"><MirrorCell value={val} onChange={onChange} itemId={selectedItem.id} columnId={col.id} settings={col.settings as any} /></div>;
      case 'formula': return (
        <React.Suspense fallback={<span className="text-muted-foreground/40">\u2014</span>}>
          <FormulaCell
            formula={col.settings.formula || ''}
            columnTitle={col.title}
            columnValues={colValues}
            columns={columns}
          />
        </React.Suspense>
      );
      default: return <span className="font-density-cell text-muted-foreground">{val?.toString() || '\u2014'}</span>;
    }
  };

  // Render a single update comment
  const renderComment = (update: UpdateEntry, isReply = false) => {
    const reactions = reactionsByUpdate.get(update.id) || [];
    const replies = repliesByParent.get(update.id) || [];
    const replyCount = replies.length;
    const isExpanded = expandedReplies.has(update.id);
    const canPin = update.author_id === currentUserId;
    const canEdit = update.author_id === currentUserId || isAdmin;

    return (
      <div key={update.id} className={`group/reaction ${isReply ? 'ml-6 border-l-2 border-border pl-3' : ''}`}>
        <div className={`rounded-lg p-3 ${update.is_pinned ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            {update.is_pinned && <Pin className="w-3 h-3 text-primary" />}
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-density-badge font-bold">
              {getInitials(getProfileName(update.author_id))}
            </div>
            <span className="font-density-cell font-medium text-foreground">{getProfileName(update.author_id)}</span>
            <span className="font-density-tiny text-muted-foreground">{format(parseISO(update.created_at), "dd/MM HH:mm")}</span>

            {/* Pin button */}
            {!isReply && canPin && (
              <button
                onClick={() => handleTogglePin(update.id, !!update.is_pinned)}
                className={`ml-auto p-1 rounded hover:bg-muted text-muted-foreground transition-colors ${update.is_pinned ? 'text-primary' : 'opacity-0 group-hover/reaction:opacity-100'}`}
                title={update.is_pinned ? 'Desafixar' : 'Fixar'}
              >
                <Pin className="w-3 h-3" />
              </button>
            )}

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`${canPin ? '' : 'ml-auto'} p-1 rounded hover:bg-muted text-muted-foreground opacity-0 group-hover/reaction:opacity-100 transition-opacity`}>
                  <MoreHorizontal className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                {canEdit && (
                  <DropdownMenuItem onClick={() => { setEditingUpdateId(update.id); setEditText(update.body); }}>
                    <Pencil className="w-3 h-3 mr-2" /> Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleDuplicateUpdate(update)}>
                  <Copy className="w-3 h-3 mr-2" /> Duplicar
                </DropdownMenuItem>
                {update.author_id === currentUserId && (
                  <DropdownMenuItem
                    onClick={() => setDeletingUpdateId(update.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-2" /> Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {editingUpdateId === update.id ? (
            <div className="mt-2">
              <RichTextEditor
                key={`edit-${update.id}`}
                value={update.body}
                onChange={setEditText}
                onSubmit={() => handleSaveEdit(update.id)}
                placeholder="Edite o update..."
                minHeight="70px"
              />
              <div className="flex justify-end gap-2 mt-1.5">
                <button
                  onClick={() => { setEditingUpdateId(null); setEditText(''); }}
                  className="px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSaveEdit(update.id)}
                  disabled={editUpdate.isPending || !editText.trim()}
                  className="px-2.5 py-1 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50"
                >
                  <Send className="w-3 h-3 inline mr-1" /> Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-foreground/80">
              {update.body?.startsWith('<') ? (
                <RichTextDisplay html={update.body} />
              ) : (
                <RenderMentionText text={update.body} profiles={profiles} />
              )}
              {update.updated_at && update.updated_at !== update.created_at && (
                <span className="text-xs text-muted-foreground ml-1">(editado)</span>
              )}
            </div>
          )}

          {/* Emoji Reactions */}
          <EmojiReactions
            updateId={update.id}
            reactions={reactions}
            currentUserId={currentUserId}
          />

          {/* Reply button and count (only for parent comments) */}
          {!isReply && (
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => {
                  setReplyingTo(replyingTo === update.id ? null : update.id);
                  setReplyText('');
                }}
                className="flex items-center gap-1 font-density-tiny text-muted-foreground hover:text-primary transition-colors"
              >
                <Reply className="w-3 h-3" />
                Responder
              </button>

              {replyCount > 0 && (
                <button
                  onClick={() => toggleRepliesExpanded(update.id)}
                  className="flex items-center gap-1 font-density-tiny text-primary hover:underline"
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {replyCount} resposta{replyCount !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Reply input */}
        {!isReply && replyingTo === update.id && (
          <div className="ml-6 mt-2 bg-muted/20 rounded-lg p-2 border-l-2 border-primary/30">
            <MentionInput
              value={replyText}
              onChange={setReplyText}
              placeholder="Escreva uma resposta..."
              rows={2}
              className="w-full bg-transparent text-sm text-foreground resize-none outline-none placeholder:text-muted-foreground/50"
            />
            <div className="flex justify-end gap-2 mt-1.5">
              <button
                onClick={() => { setReplyingTo(null); setReplyText(''); }}
                className="px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSendReply(update.id)}
                disabled={!replyText.trim()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
              >
                <Send className="w-3 h-3" /> Enviar
              </button>
            </div>
          </div>
        )}

        {/* Replies */}
        {!isReply && isExpanded && replies.length > 0 && (
          <div className="space-y-2 mt-2">
            {replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  // Time tracking widget data
  const firstTimeCol = timeTrackingCols[0];
  const firstTimeVal = firstTimeCol ? selectedItem.columnValues[firstTimeCol.id]?.value : null;
  const firstTimeData = firstTimeVal ? parseTimeData(firstTimeVal) : null;

  return (
    <>
      <div className="fixed inset-0 bg-background/50 z-40" onClick={() => setSelectedItem(null)} />
      <div className="fixed right-0 top-0 h-screen w-[45vw] max-w-[700px] min-w-[400px] bg-card border-l border-border z-50 animate-slide-in-right flex flex-col shadow-2xl">
      <ErrorBoundary>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-1 min-w-0 flex-1 mr-2">
            {navStack.length > 0 ? (
              <button onClick={popNavItem} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors flex-shrink-0">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            ) : (
              <button onClick={() => setSelectedItem(null)} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
            {/* Breadcrumb */}
            <nav className="flex items-center gap-0.5 min-w-0 overflow-hidden font-density-tiny text-muted-foreground">
              <button
                onClick={() => { navigate(`/board/${activeBoard.id}`); setSelectedItem(null); }}
                className="hover:text-primary hover:underline transition-colors truncate flex-shrink-0 max-w-[80px]"
                title={`Ir para ${activeBoard.name}`}
              >
                {activeBoard.name}
              </button>
              {currentGroup && (
                <>
                  <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />
                  <span className="truncate flex-shrink-0 max-w-[80px]" style={{ color: currentGroup.color }}>{currentGroup.title}</span>
                </>
              )}
              {navStack.map((navItem, idx) => (
                <React.Fragment key={navItem.id ?? idx}>
                  <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />
                  <button
                    onClick={() => jumpToNavLevel(idx)}
                    className="hover:text-foreground transition-colors truncate max-w-[80px]"
                    title={navItem.name}
                  >
                    {navItem.name}
                  </button>
                </React.Fragment>
              ))}
              <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />
              <span className="truncate text-foreground font-medium max-w-[120px]" title={selectedItem.name}>{selectedItem.name}</span>
            </nav>
          </div>
          <div className="flex items-center gap-1">
            {/* Timer widget in header */}
            {firstTimeCol && firstTimeData && (
              <div className="flex items-center gap-1 mr-2 px-2 py-1 bg-muted/50 rounded-md">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <div className="h-6 w-[100px]">
                  <TimeTrackingCell
                    value={firstTimeVal}
                    onChange={(v) => updateItemColumnValue(selectedItem.id, firstTimeCol.id, { value: v })}
                  />
                </div>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => duplicateItem.mutate(selectedItem.id)}>
                  <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
                </DropdownMenuItem>
                {activeBoard.groups.filter(g => g.id !== selectedItem.groupId).map(g => (
                  <DropdownMenuItem key={g.id} onClick={() => moveItem.mutate({ itemId: selectedItem.id, groupId: g.id })}>
                    <ArrowRight className="w-3.5 h-3.5 mr-2" /> Mover p/ {g.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={() => setShowDelete(true)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="px-5 py-4">
          {editingName ? (
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} autoFocus
              onBlur={() => { updateItemName(selectedItem.id, tempName); setEditingName(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { updateItemName(selectedItem.id, tempName); setEditingName(false); } if (e.key === 'Escape') setEditingName(false); }}
              className="text-xl font-bold text-foreground bg-transparent outline-none border-b-2 border-primary w-full" />
          ) : (
            <h2 className="text-xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
              onDoubleClick={() => { setTempName(selectedItem.name); setEditingName(true); }}>
              {selectedItem.name}
            </h2>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-5 mb-0 w-auto justify-start bg-transparent border-b border-border rounded-none p-0 h-auto">
            <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 font-density-cell">
              <FileText className="w-3.5 h-3.5 mr-1" /> Detalhes
            </TabsTrigger>
            <TabsTrigger value="updates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 font-density-cell">
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Updates
            </TabsTrigger>
            {timeTrackingCols.length > 0 && (
              <TabsTrigger value="time" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 font-density-cell">
                <Clock className="w-3.5 h-3.5 mr-1" /> Tempo
              </TabsTrigger>
            )}
            <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 font-density-cell">
              <ActivityIcon className="w-3.5 h-3.5 mr-1" /> Atividade
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <TabsContent value="details" className="px-5 py-4 mt-0">
              {/* Colunas editáveis — mesma view para items e subitems */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                {isSubitem && !fullSubitem && (
                  <p className="font-density-tiny text-muted-foreground italic">Carregando campos...</p>
                )}
                {columns.map(col => (
                  <div key={col.id} className="flex items-center gap-3">
                    <span className="font-density-cell text-muted-foreground w-24 flex-shrink-0 font-medium">{col.title}</span>
                    <div className="flex-1">{renderDetailCell(col)}</div>
                  </div>
                ))}
              </div>

              {/* Subitems section — disponível para items e subitems (suporte a sub-subitems) */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-density-cell font-semibold text-foreground">Subitems ({subitems.length})</h3>
                  <button onClick={() => setAddingSubitem(true)} className="flex items-center gap-1 font-density-tiny text-primary hover:underline">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>
                {subitems.map((sub: any) => (
                  <div key={sub.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0 group/sub hover:bg-muted/40 rounded px-1 -mx-1 transition-colors">
                    <span className="font-density-cell text-foreground flex-1 truncate">{sub.name}</span>
                    <button
                      onClick={() => pushNavItem(sub)}
                      className="opacity-0 group-hover/sub:opacity-100 transition-opacity flex items-center gap-0.5 font-density-tiny text-primary hover:text-primary/80"
                      title="Abrir detalhes do subitem"
                    >
                      <span>Abrir</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {addingSubitem && (
                  <div className="flex gap-1 mt-1">
                    <input value={newSubitemName} onChange={e => setNewSubitemName(e.target.value)} placeholder="Nome do subitem" autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleAddSubitem(); if (e.key === 'Escape') { setNewSubitemName(''); setAddingSubitem(false); } }}
                      className="flex-1 bg-muted rounded px-2 py-1 text-xs text-foreground outline-none" />
                  </div>
                )}
              </div>

              {/* Dependencies section */}
              <Suspense fallback={<div className="mt-4 space-y-3 py-4">{[1,2,3].map(i => (<div key={i} className="h-10 bg-muted animate-pulse rounded-md" />))}</div>}>
                <DependencyManager
                  itemId={selectedItem.id}
                  itemName={selectedItem.name}
                  onNavigateToItem={(depItemId) => {
                    const targetItem = activeBoard.groups
                      .flatMap(g => g.items)
                      .find(i => i.id === depItemId);
                    if (targetItem) {
                      setSelectedItem(targetItem);
                    }
                  }}
                />
              </Suspense>
            </TabsContent>

            <TabsContent value="updates" className="px-5 py-4 mt-0">
              {updatesLoading && (
                <div className="space-y-3 py-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
                  ))}
                </div>
              )}
              {/* New update input — Rich Text Editor */}
              <div className="mb-4">
                <RichTextEditor
                  key={editorKey}
                  value=""
                  onChange={setUpdateText}
                  onSubmit={handleSendUpdate}
                  placeholder="Escreva um update... Selecione texto para formatar"
                  minHeight="90px"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSendUpdate}
                    disabled={createUpdate.isPending || !updateText.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" /> Enviar
                  </button>
                </div>
              </div>

              {/* Pinned comments first */}
              {pinnedUpdates.length > 0 && (
                <div className="space-y-3 mb-4">
                  <p className="font-density-tiny text-muted-foreground font-medium uppercase tracking-wide">Fixados</p>
                  {pinnedUpdates.map(update => renderComment(update))}
                </div>
              )}

              {/* Regular comments */}
              <div className="space-y-3">
                {parentUpdates.map(update => renderComment(update))}
              </div>

              {parentUpdates.length === 0 && pinnedUpdates.length === 0 && (
                <p className="text-center text-muted-foreground py-6 font-density-cell">
                  Nenhum update ainda. Seja o primeiro a comentar!
                </p>
              )}
            </TabsContent>

            {/* Time tab */}
            {timeTrackingCols.length > 0 && (
              <TabsContent value="time" className="px-5 py-4 mt-0">
                {timeTrackingCols.map(col => {
                  const val = (effectiveItem?.columnValues ?? selectedItem.columnValues)?.[col.id]?.value;
                  const td = parseTimeData(val);
                  const isRunning = !!td.runningFrom;
                  // Compute live display seconds (tabTimeTick triggers re-render every second)
                  const liveSeconds = td.runningFrom
                    ? td.totalSeconds + Math.floor((Date.now() - new Date(td.runningFrom).getTime()) / 1000)
                    : td.totalSeconds;
                  void tabTimeTick; // consumed for live ticking
                  const manualIn = timeManualInputs[col.id] || { time: '', note: '' };
                  const overEst = td.estimatedSeconds && td.estimatedSeconds > 0 ? liveSeconds > td.estimatedSeconds : false;
                  const pct = td.estimatedSeconds && td.estimatedSeconds > 0
                    ? Math.min(100, Math.round((liveSeconds / td.estimatedSeconds) * 100))
                    : null;

                  return (
                    <div key={col.id} className="mb-6">
                      <h3 className="font-density-cell font-semibold text-foreground mb-3">{col.title}</h3>

                      {/* Summary + play/pause */}
                      <div className="bg-muted/50 rounded-xl p-4 space-y-3 mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleTimeTabToggle(col)}
                              className={`p-2.5 rounded-full flex-shrink-0 shadow-sm transition-all active:scale-95 ${isRunning ? 'bg-destructive/15 text-destructive hover:bg-destructive/25 ring-2 ring-destructive/20' : 'bg-accent/15 text-accent hover:bg-accent/25 ring-2 ring-accent/20'}`}
                              title={isRunning ? 'Pausar timer' : 'Iniciar timer'}
                            >
                              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tempo total</span>
                              {isRunning
                                ? <span className="text-accent font-medium text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse inline-block" /> Em andamento</span>
                                : <span className="text-xs text-muted-foreground">{td.sessions.length} sessão(ões)</span>
                              }
                            </div>
                          </div>
                          <span className="text-2xl font-bold text-foreground font-mono tabular-nums" title={formatDurationFull(liveSeconds)}>
                            {formatDuration(liveSeconds)}
                          </span>
                        </div>

                        {td.estimatedSeconds != null && td.estimatedSeconds > 0 && (
                          <>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${overEst ? 'bg-destructive' : 'bg-accent'}`}
                                style={{ width: `${Math.min(pct!, 100)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-density-tiny text-muted-foreground">
                                Estimativa: {formatDuration(td.estimatedSeconds)} ({pct}%)
                              </span>
                              {overEst && (
                                <span className="font-density-tiny text-destructive font-medium">
                                  +{formatDuration(liveSeconds - td.estimatedSeconds)} acima
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Manual time entry */}
                      <div className="flex gap-1.5 mb-3">
                        <input
                          value={manualIn.time}
                          onChange={e => setTimeManualInputs(prev => ({ ...prev, [col.id]: { ...manualIn, time: e.target.value } }))}
                          placeholder="Ex: 1h 30m"
                          onKeyDown={e => { if (e.key === 'Enter') handleTimeTabManualAdd(col); }}
                          className="flex-1 h-7 bg-muted/50 border border-border rounded px-2 text-xs text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
                        />
                        <input
                          value={manualIn.note}
                          onChange={e => setTimeManualInputs(prev => ({ ...prev, [col.id]: { ...manualIn, note: e.target.value } }))}
                          placeholder="Nota"
                          onKeyDown={e => { if (e.key === 'Enter') handleTimeTabManualAdd(col); }}
                          className="flex-1 h-7 bg-muted/50 border border-border rounded px-2 text-xs text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
                        />
                        <button
                          onClick={() => handleTimeTabManualAdd(col)}
                          className="h-7 px-2 rounded border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Adicionar tempo manual"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Sessions list */}
                      <div className="space-y-1">
                        {td.sessions.length === 0 && (
                          <p className="font-density-tiny text-muted-foreground/60 py-1">Nenhuma sessão registrada.</p>
                        )}
                        {[...td.sessions].reverse().map((session, rIdx) => {
                          const idx = td.sessions.length - 1 - rIdx;
                          return (
                            <div key={idx} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0 group/sess">
                              <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-density-cell font-mono text-foreground" title={formatDurationFull(session.duration)}>
                                    {formatDurationFull(session.duration)}
                                  </span>
                                  {session.start && (
                                    <span className="font-density-tiny text-muted-foreground">
                                      {(() => { try { return format(parseISO(session.start), "dd/MM HH:mm", { locale: ptBR }); } catch { return ''; } })()}
                                      {session.end && session.end !== session.start && (
                                        <> &rarr; {(() => { try { return format(parseISO(session.end), "HH:mm"); } catch { return ''; } })()}</>
                                      )}
                                    </span>
                                  )}
                                </div>
                                {session.note && <p className="font-density-tiny text-muted-foreground mt-0.5">{session.note}</p>}
                              </div>
                              <button
                                onClick={() => handleTimeTabDeleteSession(col, idx)}
                                className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover/sess:opacity-100 transition-opacity flex-shrink-0"
                                title="Remover sessão"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            )}

            <TabsContent value="activity" className="px-5 py-4 mt-0">
              <Suspense fallback={<div className="space-y-3 py-4">{[1,2,3].map(i => (<div key={i} className="h-10 bg-muted animate-pulse rounded-md" />))}</div>}>
                <ActivityFeed
                  boardId={activeBoard.id}
                  itemId={selectedItem.id}
                  columns={columns.map(c => ({ id: c.id, title: c.title, type: c.type }))}
                />
              </Suspense>
            </TabsContent>
          </div>
        </Tabs>
      </ErrorBoundary>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>O item "{selectedItem.name}" sera excluido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingUpdateId} onOpenChange={() => setDeletingUpdateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir update?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUpdateId && handleDeleteUpdate(deletingUpdateId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ItemDetailPanel;
