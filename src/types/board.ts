export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'admin' | 'member' | 'viewer' | 'guest';
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  color: string;
  boards: Board[];
}

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  folder_id?: string | null;
  position: number;
  groups: Group[];
  columns: Column[];
}

export interface Group {
  id: string;
  boardId: string;
  title: string;
  color: string;
  isCollapsed: boolean;
  position: number;
  items: Item[];
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  type: ColumnType;
  width: number;
  position: number;
  settings: ColumnSettings;
}

export type ColumnType =
  | 'text' | 'status' | 'date' | 'people' | 'link'
  | 'time_tracking' | 'number' | 'dropdown' | 'checkbox'
  | 'long_text' | 'timeline' | 'file' | 'email' | 'phone'
  | 'rating' | 'tags' | 'progress' | 'auto_number'
  | 'creation_log' | 'last_updated' | 'formula'
  | 'connect_boards' | 'mirror' | 'vote' | 'color' | 'button' | 'location';

export interface StatusLabel {
  name: string;
  color: string;
  isDone?: boolean;
}

export interface ColumnSettings {
  labels?: Record<string, StatusLabel>;
  options?: string[];
  unit?: string;
  format?: string;
  formula?: string;
}

export interface Item {
  id: string;
  boardId: string;
  groupId: string;
  name: string;
  position: number;
  columnValues: Record<string, ColumnValue>;
  subitems?: SubItem[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubItem {
  id: string;
  parentId: string;
  name: string;
  status?: string;
  person?: string;
  date?: string;
}

// ── Column value types (one per ColumnType) ─────────────────────────────────

export interface TimeSession {
  start: string; // ISO 8601
  end?: string;  // ISO 8601, undefined when running
}

export type StatusValue = string | null;
export type TextValue = string | null;
export type DateValue = string | null;         // ISO 8601
export type NumberValue = number | null;
export type CheckboxValue = boolean;
export type EmailValue = string | null;
export type PhoneValue = string | null;
export type LongTextValue = string | null;
export type RatingValue = number | null;       // 0-5
export type ProgressValue = number | null;     // 0-100
export type AutoNumberValue = number | null;
export type FormulaValue = string | number | null;
export type PeopleValue = string[];            // array of user IDs
export type TagsValue = string[];              // array of labels
export type DropdownValue = string | null;     // selected label
export type LinkValue = { url: string; text?: string } | null;
export type TimelineValue = { start: string; end: string } | null;
export type FileValue = { name: string; url: string; size?: number }[];
export type TimeTrackingValue = { sessions: TimeSession[]; totalSeconds: number; runningFrom?: string } | null;
export type CreationLogValue = { date: string; user_id: string } | null;
export type LastUpdatedValue = { date: string; user_id: string } | null;
export type ConnectBoardsValue = string[];     // array of connected item IDs
export type VoteValue = number | null;
export type ColorValue = string | null;        // hex color
export type LocationValue = { lat: number; lng: number; address?: string } | null;
export type MirrorValue = unknown;             // reflects another column, shape varies

export type ColumnValueData =
  | StatusValue
  | TextValue
  | DateValue
  | NumberValue
  | CheckboxValue
  | EmailValue
  | PhoneValue
  | LongTextValue
  | RatingValue
  | ProgressValue
  | AutoNumberValue
  | FormulaValue
  | PeopleValue
  | TagsValue
  | DropdownValue
  | LinkValue
  | TimelineValue
  | FileValue
  | TimeTrackingValue
  | CreationLogValue
  | LastUpdatedValue
  | ConnectBoardsValue
  | VoteValue
  | ColorValue
  | LocationValue
  | MirrorValue;

/** Maps each ColumnType to its strongly-typed value */
export type ColumnTypeValueMap = {
  status: StatusValue;
  text: TextValue;
  date: DateValue;
  number: NumberValue;
  checkbox: CheckboxValue;
  email: EmailValue;
  phone: PhoneValue;
  long_text: LongTextValue;
  rating: RatingValue;
  progress: ProgressValue;
  auto_number: AutoNumberValue;
  formula: FormulaValue;
  people: PeopleValue;
  tags: TagsValue;
  dropdown: DropdownValue;
  link: LinkValue;
  timeline: TimelineValue;
  file: FileValue;
  time_tracking: TimeTrackingValue;
  creation_log: CreationLogValue;
  last_updated: LastUpdatedValue;
  connect_boards: ConnectBoardsValue;
  vote: VoteValue;
  color: ColorValue;
  location: LocationValue;
  mirror: MirrorValue;
};

export interface ColumnValue {
  value: ColumnValueData;
  text?: string;
}

export interface Update {
  id: string;
  itemId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  isPinned?: boolean;
  replies?: Update[];
}

export type UserRole = 'admin' | 'member' | 'viewer' | 'guest';

export interface BoardPermission {
  id: string;
  boardId: string;
  userId: string;
  role: string;
}

export interface BoardTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  config: any;
  isSystem: boolean;
  workspace_id?: string | null;
}
