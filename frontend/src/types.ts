export interface Task {
  uid: string;
  name: string;
  status: number;
  done: boolean;
  open: boolean;
  priority: number | null;
  due_date: string | null;
  note: string;
  tags: string[];
  project_uid: string | null;
  assigned_to: string | null;
  owner_id: number | null;
  recurring: boolean;
  completed_at: string | null;
  created_at: string | null;
}

export interface Project {
  uid: string;
  name: string;
}

export interface Note {
  uid: string;
  title: string;
  content: string;
  project_uid: string | null;
  tags: string[];
  updated_at: string | null;
}

export interface Person {
  uid: string;
  name: string;
  is_self: boolean;
}

export interface Snapshot {
  entry_id: string;
  today: string;
  reminder_tag: string;
  reminder_days_before: number;
  self_person: string | null;
  self_user_id: number | null;
  tasks: Task[];
  projects: Project[];
  tags: string[];
  notes: Note[];
  people: Person[];
  last_update_success: boolean;
}

export interface Entry {
  entry_id: string;
  title: string;
  linked: boolean;
}

export type TaskFields = Partial<
  Pick<Task, "name" | "status" | "priority" | "due_date" | "tags" | "project_uid" | "assigned_to">
> & { note?: string | null };

export type NoteFields = Partial<Pick<Note, "title" | "content" | "project_uid" | "tags">>;

/** Minimal subset of Home Assistant's frontend `hass` object used by the panel. */
export interface HomeAssistant {
  connection: {
    subscribeMessage<T>(
      callback: (message: T) => void,
      message: Record<string, unknown>,
    ): Promise<() => Promise<void>>;
  };
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  locale?: { language: string };
  language?: string;
  user?: { name: string; is_admin: boolean };
}

export interface Route {
  prefix: string;
  path: string;
}

export const STATUS = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  DONE: 2,
  ARCHIVED: 3,
  WAITING: 4,
  CANCELLED: 5,
  PLANNED: 6,
} as const;

export const STATUS_LABELS: Record<number, string> = {
  0: "Not started",
  1: "In progress",
  2: "Done",
  3: "Archived",
  4: "Waiting",
  5: "Cancelled",
  6: "Planned",
};

export const PRIORITY_LABELS: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
};
