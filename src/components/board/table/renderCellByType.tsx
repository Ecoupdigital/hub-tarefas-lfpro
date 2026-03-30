import React from 'react';
import { Column } from '@/types/board';
import StatusCell from '../StatusCell';
import PeopleCell from '../PeopleCell';
import DateCell from '../DateCell';
import LinkCell from '../LinkCell';
import TimeTrackingCell from '../TimeTrackingCell';
import CheckboxCell from '../CheckboxCell';
import NumberCell from '../NumberCell';
import DropdownCell from '../DropdownCell';
import LongTextCell from '../LongTextCell';
import EmailCell from '../EmailCell';
import PhoneCell from '../PhoneCell';
import RatingCell from '../RatingCell';
import TagsCell from '../TagsCell';
import ProgressCell from '../ProgressCell';
import AutoNumberCell from '../AutoNumberCell';
const FormulaCell = React.lazy(() => import('../FormulaCell'));
import TimelineCell from '../TimelineCell';
import ConnectBoardsCell from '../ConnectBoardsCell';
import MirrorCell from '../MirrorCell';
import VoteCell from '../VoteCell';
import ColorCell from '../ColorCell';
import ButtonCell from '../ButtonCell';
import LocationCell from '../LocationCell';
import FileCell from '../FileCell';
import TextCell from '../TextCell';
import { type ItemFile } from '@/hooks/useFileUpload';

export const renderCellByType = (col: Column, val: any, onChange: (v: any) => void, opts?: { onEditLabels?: () => void; onAddOption?: (opt: string) => void; columnValues?: Record<string, any>; columns?: Column[]; onUpdateSettings?: (settings: any) => void; itemId?: string; onFilePreview?: (file: ItemFile) => void }) => {
  switch (col.type) {
    case 'status': return <StatusCell value={val} labels={col.settings.labels || {}} onChange={onChange} onEditLabels={opts?.onEditLabels} />;
    case 'people': return <PeopleCell value={val} onChange={onChange} />;
    case 'date': return <DateCell value={val} onChange={onChange} />;
    case 'link': return <LinkCell value={val} onChange={onChange} />;
    case 'time_tracking': return <TimeTrackingCell value={val} onChange={onChange} />;
    case 'checkbox': return <CheckboxCell value={val} onChange={onChange} />;
    case 'number': return <NumberCell value={val} onChange={onChange} />;
    case 'dropdown': {
      // Normalizar value: pode ser string ou {values: [...]} do formato migrado
      const dropVal = typeof val === 'object' && val !== null && Array.isArray(val.values)
        ? (val.values[0] ?? '')
        : (typeof val === 'string' ? val : '');
      // Normalizar options: pode ser string[] ou [{id, label}]
      const dropOpts = (col.settings.options || []).map((o: any) =>
        typeof o === 'string' ? o : (o.label ?? '')
      ).filter(Boolean);
      return <DropdownCell value={dropVal} options={dropOpts} onChange={onChange} onAddOption={opts?.onAddOption} />;
    }
    case 'long_text': return <LongTextCell value={val} onChange={onChange} />;
    case 'email': return <EmailCell value={val} onChange={onChange} />;
    case 'phone': return <PhoneCell value={val} onChange={onChange} />;
    case 'rating': return <RatingCell value={val} onChange={onChange} />;
    case 'tags': return <TagsCell value={val} onChange={onChange} />;
    case 'progress': return <ProgressCell value={val} onChange={onChange} />;
    case 'auto_number': return <AutoNumberCell value={val} />;
    case 'creation_log': return (
      <div className="w-full h-full flex items-center justify-center font-density-cell text-muted-foreground px-2 truncate">
        {val?.date ? new Date(val.date).toLocaleDateString('pt-BR') : <span className="text-muted-foreground/40">&mdash;</span>}
      </div>
    );
    case 'last_updated': return (
      <div className="w-full h-full flex items-center justify-center font-density-cell text-muted-foreground px-2 truncate">
        {val?.date ? new Date(val.date).toLocaleDateString('pt-BR') : <span className="text-muted-foreground/40">&mdash;</span>}
      </div>
    );
    case 'file': return opts?.itemId ? (
      <FileCell value={val} itemId={opts.itemId} columnId={col.id} onChange={onChange} onPreview={opts?.onFilePreview} />
    ) : <span className="text-muted-foreground/40">&mdash;</span>;
    case 'formula': return (
      <React.Suspense fallback={<span className="text-muted-foreground/40">&mdash;</span>}>
        <FormulaCell
          formula={col.settings.formula || ''}
          columnTitle={col.title}
          columnValues={opts?.columnValues || {}}
          columns={opts?.columns || []}
          onEditFormula={opts?.onUpdateSettings ? (newFormula) => opts.onUpdateSettings!({ ...col.settings, formula: newFormula }) : undefined}
        />
      </React.Suspense>
    );
    case 'timeline': return <TimelineCell value={val} onChange={onChange} />;
    case 'connect_boards': return opts?.itemId ? (
      <ConnectBoardsCell value={val} onChange={onChange} itemId={opts.itemId} columnId={col.id} settings={col.settings as any} />
    ) : <span className="text-muted-foreground/40">&mdash;</span>;
    case 'mirror': return opts?.itemId ? (
      <MirrorCell value={val} onChange={onChange} itemId={opts.itemId} columnId={col.id} settings={col.settings as any} />
    ) : <span className="text-muted-foreground/40">&mdash;</span>;
    case 'vote': return <VoteCell value={val} onChange={onChange} />;
    case 'color': return <ColorCell value={val} onChange={onChange} />;
    case 'button': return <ButtonCell value={val} onChange={onChange} settings={col.settings as any} />;
    case 'location': return <LocationCell value={val} onChange={onChange} />;
    case 'text': default: return <TextCell value={val} onChange={onChange} />;
  }
};
