import type { Entry, HomeAssistant, Note, NoteFields, Snapshot, Task, TaskFields } from "./types";

/** Thin wrapper around the integration's websocket commands. */
export class TududiApi {
  constructor(private readonly getHass: () => HomeAssistant) {}

  private call<T>(type: string, data: Record<string, unknown> = {}): Promise<T> {
    return this.getHass().callWS<T>({ type: `tududi/${type}`, ...data });
  }

  entries(): Promise<Entry[]> {
    return this.call("entries");
  }

  subscribe(entryId: string, onSnapshot: (snap: Snapshot) => void): Promise<() => Promise<void>> {
    return this.getHass().connection.subscribeMessage<Snapshot>(onSnapshot, {
      type: "tududi/subscribe",
      entry_id: entryId,
    });
  }

  refresh(entryId: string): Promise<void> {
    return this.call("refresh", { entry_id: entryId });
  }

  createTask(entryId: string, name: string, fields: TaskFields = {}): Promise<Task> {
    return this.call("task/create", { entry_id: entryId, name, ...fields });
  }

  updateTask(entryId: string, uid: string, fields: TaskFields): Promise<Task> {
    return this.call("task/update", { entry_id: entryId, uid, ...fields });
  }

  deleteTask(entryId: string, uid: string): Promise<void> {
    return this.call("task/delete", { entry_id: entryId, uid });
  }

  createNote(entryId: string, title: string, fields: NoteFields = {}): Promise<Note> {
    return this.call("note/create", { entry_id: entryId, title, ...fields });
  }

  updateNote(entryId: string, uid: string, fields: NoteFields): Promise<Note> {
    return this.call("note/update", { entry_id: entryId, uid, ...fields });
  }

  deleteNote(entryId: string, uid: string): Promise<void> {
    return this.call("note/delete", { entry_id: entryId, uid });
  }
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) return String(err.message);
  return String(err);
}
