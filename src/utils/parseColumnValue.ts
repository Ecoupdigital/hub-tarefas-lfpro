import type {
  ColumnType,
  ColumnValueData,
  StatusValue,
  TextValue,
  DateValue,
  NumberValue,
  CheckboxValue,
  EmailValue,
  PhoneValue,
  LongTextValue,
  RatingValue,
  ProgressValue,
  AutoNumberValue,
  FormulaValue,
  PeopleValue,
  TagsValue,
  DropdownValue,
  LinkValue,
  TimelineValue,
  FileValue,
  TimeTrackingValue,
  CreationLogValue,
  LastUpdatedValue,
  ConnectBoardsValue,
  VoteValue,
  ColorValue,
  LocationValue,
} from '@/types/board';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/**
 * Converte o valor JSONB retornado pelo Supabase para o tipo correto
 * de acordo com o tipo da coluna.
 */
export function parseColumnValue(value: Json | undefined, type: ColumnType): ColumnValueData {
  if (value === undefined || value === null) {
    switch (type) {
      case 'people':
      case 'tags':
      case 'file':
      case 'connect_boards':
        return [] as PeopleValue;
      case 'checkbox':
        return false as CheckboxValue;
      default:
        return null as StatusValue;
    }
  }

  switch (type) {
    case 'status':
      return (typeof value === 'string' ? value : null) as StatusValue;

    case 'text':
    case 'long_text':
      return (typeof value === 'string' ? value : null) as TextValue;

    case 'date':
      return (typeof value === 'string' ? value : null) as DateValue;

    case 'number':
    case 'rating':
    case 'progress':
    case 'auto_number':
    case 'vote':
      return (typeof value === 'number' ? value : null) as NumberValue;

    case 'checkbox':
      return (typeof value === 'boolean' ? value : Boolean(value)) as CheckboxValue;

    case 'email':
      return (typeof value === 'string' ? value : null) as EmailValue;

    case 'phone':
      return (typeof value === 'string' ? value : null) as PhoneValue;

    case 'dropdown':
      return (typeof value === 'string' ? value : null) as DropdownValue;

    case 'color':
      return (typeof value === 'string' ? value : null) as ColorValue;

    case 'formula':
      return (typeof value === 'string' || typeof value === 'number' ? value : null) as FormulaValue;

    case 'link':
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        const v = value as Record<string, Json>;
        return { url: String(v.url ?? ''), text: v.text ? String(v.text) : undefined } as LinkValue;
      }
      return null as LinkValue;

    case 'timeline':
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        const v = value as Record<string, Json>;
        return { start: String(v.start ?? ''), end: String(v.end ?? '') } as TimelineValue;
      }
      return null as TimelineValue;

    case 'time_tracking':
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        return value as unknown as TimeTrackingValue;
      }
      return null as TimeTrackingValue;

    case 'creation_log':
    case 'last_updated':
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        const v = value as Record<string, Json>;
        return { date: String(v.date ?? ''), user_id: String(v.user_id ?? '') } as CreationLogValue;
      }
      return null as CreationLogValue;

    case 'people':
    case 'tags':
    case 'connect_boards':
      return (Array.isArray(value) ? value.map(String) : []) as PeopleValue;

    case 'file':
      if (Array.isArray(value)) {
        return value.map((f) => {
          const item = f as Record<string, Json>;
          return { name: String(item.name ?? ''), url: String(item.url ?? ''), size: item.size ? Number(item.size) : undefined };
        }) as FileValue;
      }
      return [] as FileValue;

    case 'location':
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        const v = value as Record<string, Json>;
        return { lat: Number(v.lat ?? 0), lng: Number(v.lng ?? 0), address: v.address ? String(v.address) : undefined };
      }
      return null as LocationValue;

    default:
      return value as ColumnValueData;
  }
}
