import type { Snapshot, Task } from "./types";

export type BuiltinView = "today" | "upcoming" | "overdue" | "inbox" | "invoices" | "all" | "done";
export type ViewId = BuiltinView | `project:${string}` | `tag:${string}`;

export const BUILTIN_VIEWS: { id: BuiltinView; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "overdue", label: "Overdue" },
  { id: "inbox", label: "Inbox" },
  { id: "invoices", label: "Invoices" },
  { id: "all", label: "All open" },
  { id: "done", label: "Completed" },
];

export interface TaskGroup {
  key: string;
  label: string | null;
  tasks: Task[];
}

const DAY_MS = 86_400_000;

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from `today` to `date` (negative when in the past). */
export function daysUntil(today: string, date: string): number {
  return Math.round((toUtc(date) - toUtc(today)) / DAY_MS);
}

export function addDays(date: string, days: number): string {
  return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

export type DueTone = "overdue" | "today" | "soon" | "later";

export function dueTone(days: number): DueTone {
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "soon";
  return "later";
}

export function formatDate(date: string, lang = "en"): string {
  return new Date(toUtc(date)).toLocaleDateString(lang, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Short human label for a due date relative to today. */
export function dueLabel(today: string, date: string, lang = "en"): string {
  const days = daysUntil(today, date);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${-days} days overdue`;
  if (days < 7) return new Date(toUtc(date)).toLocaleDateString(lang, {
    weekday: "long",
    timeZone: "UTC",
  });
  return formatDate(date, lang);
}

export function hasTag(task: Task, tag: string): boolean {
  const wanted = tag.toLocaleLowerCase();
  return task.tags.some((t) => t.toLocaleLowerCase() === wanted);
}

export function compareTasks(a: Task, b: Task): number {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  const pa = a.priority ?? -1;
  const pb = b.priority ?? -1;
  if (pa !== pb) return pb - pa;
  return a.name.localeCompare(b.name);
}

function compareDone(a: Task, b: Task): number {
  const ca = a.completed_at ?? "";
  const cb = b.completed_at ?? "";
  if (ca !== cb) return ca < cb ? 1 : -1;
  return a.name.localeCompare(b.name);
}

export function matchesSearch(task: Task, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  return (
    task.name.toLocaleLowerCase().includes(q) ||
    task.note.toLocaleLowerCase().includes(q) ||
    task.tags.some((t) => t.toLocaleLowerCase().includes(q))
  );
}

/** Tasks shown in a view (unsorted, includes done tasks where the view shows them). */
export function tasksForView(snap: Snapshot, view: ViewId): Task[] {
  const today = snap.today;
  const tasks = snap.tasks;
  if (view.startsWith("project:")) {
    const uid = view.slice("project:".length);
    return tasks.filter((t) => t.project_uid === uid && (t.open || t.done));
  }
  if (view.startsWith("tag:")) {
    const tag = view.slice("tag:".length);
    return tasks.filter((t) => hasTag(t, tag) && (t.open || t.done));
  }
  switch (view as BuiltinView) {
    case "today":
      return tasks.filter((t) => t.open && t.due_date !== null && t.due_date <= today);
    case "upcoming":
      return tasks.filter((t) => t.open && t.due_date !== null && t.due_date > today);
    case "overdue":
      return tasks.filter((t) => t.open && t.due_date !== null && t.due_date < today);
    case "inbox":
      return tasks.filter((t) => t.open && !t.project_uid && !t.due_date);
    case "invoices":
      return tasks.filter((t) => hasTag(t, snap.reminder_tag) && (t.open || t.done));
    case "done":
      return tasks.filter((t) => t.done);
    case "all":
    default:
      return tasks.filter((t) => t.open);
  }
}

export function viewCount(snap: Snapshot, view: ViewId): number {
  return tasksForView(snap, view).filter((t) => t.open).length;
}

/** Split view tasks into labelled, sorted groups. Empty groups are omitted. */
export function groupTasks(
  snap: Snapshot,
  view: ViewId,
  tasks: Task[],
  lang = "en",
): TaskGroup[] {
  const today = snap.today;
  const open = tasks.filter((t) => t.open).sort(compareTasks);
  const done = tasks.filter((t) => !t.open).sort(compareDone);
  const groups: TaskGroup[] = [];
  const push = (key: string, label: string | null, items: Task[]) => {
    if (items.length) groups.push({ key, label, tasks: items });
  };

  if (view === "today") {
    push("overdue", "Overdue", open.filter((t) => t.due_date! < today));
    push("today", "Today", open.filter((t) => t.due_date === today));
  } else if (view === "upcoming") {
    const byDate = new Map<string, Task[]>();
    for (const t of open) {
      const list = byDate.get(t.due_date!) ?? [];
      list.push(t);
      byDate.set(t.due_date!, list);
    }
    for (const [date, items] of byDate) {
      const label =
        daysUntil(today, date) < 7
          ? `${dueLabel(today, date, lang)} · ${formatDate(date, lang)}`
          : formatDate(date, lang);
      push(date, label, items);
    }
  } else if (view === "invoices") {
    const windowEnd = addDays(today, snap.reminder_days_before);
    push("overdue", "Overdue", open.filter((t) => t.due_date !== null && t.due_date < today));
    push(
      "soon",
      `Due within ${snap.reminder_days_before} days`,
      open.filter((t) => t.due_date !== null && t.due_date >= today && t.due_date <= windowEnd),
    );
    push("later", "Later", open.filter((t) => t.due_date !== null && t.due_date > windowEnd));
    push("nodate", "No due date", open.filter((t) => t.due_date === null));
    push("done", "Paid", done);
  } else if (view === "done") {
    push("done", null, done);
  } else {
    push("open", null, open);
    push("done", "Completed", done);
  }
  return groups;
}

/** Defaults applied to a task created with quick add in a view. */
export function quickAddDefaults(snap: Snapshot, view: ViewId): Record<string, unknown> {
  if (view.startsWith("project:")) return { project_uid: view.slice("project:".length) };
  if (view.startsWith("tag:")) return { tags: [view.slice("tag:".length)] };
  switch (view) {
    case "today":
      return { due_date: snap.today };
    case "upcoming":
      return { due_date: addDays(snap.today, 1) };
    case "invoices":
      return { tags: [snap.reminder_tag] };
    default:
      return {};
  }
}

export function viewTitle(snap: Snapshot | undefined, view: ViewId): string {
  if (view.startsWith("project:")) {
    const uid = view.slice("project:".length);
    return snap?.projects.find((p) => p.uid === uid)?.name ?? "Project";
  }
  if (view.startsWith("tag:")) return `#${view.slice("tag:".length)}`;
  return BUILTIN_VIEWS.find((v) => v.id === view)?.label ?? "Tasks";
}

export function parseView(path: string | undefined): ViewId {
  const raw = decodeURIComponent((path ?? "").replace(/^\/+/, ""));
  if (!raw) return "today";
  if (raw.startsWith("project:") || raw.startsWith("tag:")) return raw as ViewId;
  return BUILTIN_VIEWS.some((v) => v.id === raw) ? (raw as BuiltinView) : "today";
}

export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(",")) {
    const tag = raw.trim().replace(/^#/, "");
    const key = tag.toLocaleLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase())
    .join("");
}

/** Return a copy of the snapshot with one task replaced (optimistic UI). */
export function withTask(snap: Snapshot, task: Task): Snapshot {
  const exists = snap.tasks.some((t) => t.uid === task.uid);
  return {
    ...snap,
    tasks: exists ? snap.tasks.map((t) => (t.uid === task.uid ? task : t)) : [...snap.tasks, task],
  };
}

// ------------------------------------------------------------------ invoices

/** Same day `months` later, clamped to the end of shorter months. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y!, m! - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d!, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Parse "52.10", "52,10" or "1 234,50" to cents; null if invalid. */
export function toCents(amount: string | null | undefined): number | null {
  if (amount === null || amount === undefined) return null;
  let text = amount.replace(/[\s\u00a0]/g, "");
  if (text.includes(",") && !text.includes(".")) text = text.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Math.round(Number(text) * 100);
}

export function formatMoney(
  amount: string | number | null,
  currency: string | null,
  lang = "en",
): string {
  if (amount === null) return "";
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return String(amount);
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat(lang, { style: "currency", currency }).format(value);
    } catch {
      // Unknown currency code: fall through to plain formatting.
    }
  }
  const plain = new Intl.NumberFormat(lang, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return currency ? `${plain} ${currency}` : plain;
}

/** Sum of open invoice amounts per currency, e.g. "€83.10" or "€10.00 + $5.00". */
export function invoiceTotal(tasks: Task[], fallbackCurrency: string, lang = "en"): string {
  const sums = new Map<string, number>();
  for (const t of tasks) {
    const cents = toCents(t.invoice?.amount);
    if (cents === null) continue;
    const currency = t.invoice?.currency ?? fallbackCurrency;
    sums.set(currency, (sums.get(currency) ?? 0) + cents);
  }
  return [...sums]
    .map(([currency, cents]) => formatMoney(cents / 100, currency, lang))
    .join(" + ");
}

export function isInvoice(task: Task): boolean {
  return task.invoice !== undefined && task.invoice !== null;
}

/** Most recent invoice with this name (case-insensitive), by due date. */
export function latestInvoiceNamed(snap: Snapshot, name: string): Task | undefined {
  const wanted = name.trim().toLocaleLowerCase();
  if (!wanted) return undefined;
  return snap.tasks
    .filter((t) => isInvoice(t) && t.name.trim().toLocaleLowerCase() === wanted)
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .at(-1);
}

/** Distinct invoice names, most recently due first (for name suggestions). */
export function invoiceNames(snap: Snapshot): string[] {
  const seen = new Map<string, string>();
  const sorted = snap.tasks
    .filter(isInvoice)
    .sort((a, b) => (b.due_date ?? "").localeCompare(a.due_date ?? ""));
  for (const t of sorted) {
    const key = t.name.trim().toLocaleLowerCase();
    if (!seen.has(key)) seen.set(key, t.name.trim());
  }
  return [...seen.values()];
}

export interface InvoiceDraft {
  name: string;
  due_date: string;
  amount: string;
  currency: string;
  reference: string;
  project_uid: string | null;
  assigned_to: string | null;
  note: string;
  previous_uid?: string | null;
}

/** Empty draft, or the next invoice of a series when `previous` is given. */
export function invoiceDraft(snap: Snapshot, previous?: Task): InvoiceDraft {
  if (!previous) {
    return {
      name: "",
      due_date: "",
      amount: "",
      currency: snap.currency,
      reference: "",
      project_uid: null,
      assigned_to: null,
      note: "",
    };
  }
  return {
    name: previous.name,
    due_date: addMonths(previous.due_date ?? snap.today, 1),
    amount: "",
    currency: previous.invoice?.currency ?? snap.currency,
    reference: "",
    project_uid: previous.project_uid,
    assigned_to: previous.assigned_to,
    note: "",
    previous_uid: previous.uid,
  };
}
