import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  formatMoney,
  invoiceDraft,
  invoiceNames,
  invoiceTotal,
  latestInvoiceNamed,
  toCents,
  daysUntil,
  dueLabel,
  dueTone,
  groupTasks,
  initials,
  matchesSearch,
  parseTags,
  parseView,
  quickAddDefaults,
  tasksForView,
  viewCount,
  withTask,
} from "./logic";
import type { Snapshot, Task } from "./types";

const TODAY = "2026-10-15";

function task(uid: string, extra: Partial<Task> = {}): Task {
  return {
    uid,
    name: uid,
    status: 0,
    done: false,
    open: true,
    priority: null,
    due_date: null,
    note: "",
    tags: [],
    project_uid: null,
    assigned_to: null,
    owner_id: 1,
    recurring: false,
    completed_at: null,
    created_at: null,
    ...extra,
  };
}

const doneExtra = { status: 2, done: true, open: false };

function snap(tasks: Task[]): Snapshot {
  return {
    entry_id: "e1",
    today: TODAY,
    currency: "EUR",
    reminder_tag: "invoice",
    reminder_days_before: 7,
    self_person: "p1",
    self_user_id: 1,
    tasks,
    projects: [{ uid: "bills", name: "Household bills" }],
    tags: ["invoice"],
    notes: [],
    people: [],
    last_update_success: true,
  };
}

const SNAP = snap([
  task("electricity", { due_date: "2026-10-14", tags: ["invoice"], project_uid: "bills" }),
  task("water", { due_date: TODAY, tags: ["Invoice"], project_uid: "bills", priority: 2 }),
  task("bike", { due_date: "2026-10-17" }),
  task("internet", { due_date: "2026-10-18", tags: ["invoice"], project_uid: "bills" }),
  task("daycare", { due_date: "2026-10-25", tags: ["invoice"], project_uid: "bills" }),
  task("coffee"),
  task("paid", { ...doneExtra, due_date: "2026-10-10", tags: ["invoice"], project_uid: "bills" }),
]);

const uids = (tasks: Task[]) => tasks.map((t) => t.uid);

describe("dates", () => {
  it("counts days", () => {
    expect(daysUntil(TODAY, "2026-10-14")).toBe(-1);
    expect(daysUntil(TODAY, "2026-11-01")).toBe(17);
    expect(daysUntil("2026-03-28", "2026-03-30")).toBe(2); // across DST
    expect(addDays(TODAY, 3)).toBe("2026-10-18");
  });

  it("labels and tones", () => {
    expect(dueLabel(TODAY, TODAY)).toBe("Today");
    expect(dueLabel(TODAY, "2026-10-16")).toBe("Tomorrow");
    expect(dueLabel(TODAY, "2026-10-14")).toBe("Yesterday");
    expect(dueLabel(TODAY, "2026-10-12")).toBe("3 days overdue");
    expect(dueLabel(TODAY, "2026-10-17")).toBe("Saturday");
    expect(dueLabel(TODAY, "2026-11-01")).toBe("Sun, Nov 1");
    expect([-1, 0, 7, 8].map(dueTone)).toEqual(["overdue", "today", "soon", "later"]);
  });
});

describe("views", () => {
  it("filters builtin views", () => {
    expect(uids(tasksForView(SNAP, "today")).sort()).toEqual(["electricity", "water"]);
    expect(uids(tasksForView(SNAP, "overdue"))).toEqual(["electricity"]);
    expect(uids(tasksForView(SNAP, "upcoming")).sort()).toEqual(["bike", "daycare", "internet"]);
    expect(uids(tasksForView(SNAP, "inbox"))).toEqual(["coffee"]);
    expect(uids(tasksForView(SNAP, "done"))).toEqual(["paid"]);
    expect(tasksForView(SNAP, "all")).toHaveLength(6);
  });

  it("invoices include paid ones and match tags case-insensitively", () => {
    expect(uids(tasksForView(SNAP, "invoices")).sort()).toEqual(
      ["daycare", "electricity", "internet", "paid", "water"],
    );
    expect(viewCount(SNAP, "invoices")).toBe(4);
  });

  it("filters projects and tags", () => {
    expect(tasksForView(SNAP, "project:bills")).toHaveLength(5);
    expect(viewCount(SNAP, "project:bills")).toBe(4);
    expect(tasksForView(SNAP, "tag:invoice")).toHaveLength(5);
  });
});

describe("grouping", () => {
  const group = (view: Parameters<typeof tasksForView>[1]) =>
    groupTasks(SNAP, view, tasksForView(SNAP, view)).map((g) => [g.label, uids(g.tasks)]);

  it("groups today", () => {
    expect(group("today")).toEqual([
      ["Overdue", ["electricity"]],
      ["Today", ["water"]],
    ]);
  });

  it("groups invoices by reminder window", () => {
    expect(group("invoices")).toEqual([
      ["Overdue", ["electricity"]],
      ["Due within 7 days", ["water", "internet"]],
      ["Later", ["daycare"]],
      ["Paid", ["paid"]],
    ]);
  });

  it("groups upcoming by date", () => {
    expect(group("upcoming").map(([label]) => label)).toEqual([
      "Saturday · Sat, Oct 17",
      "Sunday · Sun, Oct 18",
      "Sun, Oct 25",
    ]);
  });

  it("puts completed last in projects", () => {
    expect(group("project:bills").map(([label]) => label)).toEqual([null, "Completed"]);
  });
});

describe("helpers", () => {
  it("quick add defaults", () => {
    expect(quickAddDefaults(SNAP, "today")).toEqual({ due_date: TODAY });
    expect(quickAddDefaults(SNAP, "upcoming")).toEqual({ due_date: "2026-10-16" });
    expect(quickAddDefaults(SNAP, "invoices")).toEqual({ tags: ["invoice"] });
    expect(quickAddDefaults(SNAP, "project:bills")).toEqual({ project_uid: "bills" });
    expect(quickAddDefaults(SNAP, "tag:car")).toEqual({ tags: ["car"] });
    expect(quickAddDefaults(SNAP, "inbox")).toEqual({});
  });

  it("parses views from the route", () => {
    expect(parseView("")).toBe("today");
    expect(parseView("/invoices")).toBe("invoices");
    expect(parseView("/project:abc")).toBe("project:abc");
    expect(parseView("/tag:car%20stuff")).toBe("tag:car stuff");
    expect(parseView("/nonsense")).toBe("today");
  });

  it("parses tags", () => {
    expect(parseTags(" invoice, #car,Invoice ,, ")).toEqual(["invoice", "car"]);
  });

  it("search matches name, note and tags", () => {
    const t = task("x", { name: "Pay bill", note: "Ref 1234", tags: ["invoice"] });
    expect(matchesSearch(t, "pay")).toBe(true);
    expect(matchesSearch(t, "1234")).toBe(true);
    expect(matchesSearch(t, "INVO")).toBe(true);
    expect(matchesSearch(t, "nope")).toBe(false);
  });

  it("initials and optimistic replace", () => {
    expect(initials("Giulia Rossi")).toBe("GR");
    const updated = withTask(SNAP, { ...SNAP.tasks[0]!, name: "changed" });
    expect(updated.tasks[0]!.name).toBe("changed");
    expect(SNAP.tasks[0]!.name).toBe("electricity");
    expect(withTask(SNAP, task("new")).tasks).toHaveLength(8);
  });
});

describe("invoices", () => {
  const inv = (uid: string, extra: Partial<Task>, amount: string | null, currency = "EUR") =>
    task(uid, {
      tags: ["invoice"],
      invoice: { amount, currency, reference: null, previous_uid: null, next_uid: null },
      ...extra,
    });
  const S = { ...snap([]), currency: "EUR" };

  it("adds months and clamps to month end", () => {
    expect(addMonths("2026-10-15", 1)).toBe("2026-11-15");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-12-31", 2)).toBe("2027-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("parses amounts to cents", () => {
    expect(toCents("52.10")).toBe(5210);
    expect(toCents("1 234,5")).toBe(123450);
    expect(toCents("abc")).toBeNull();
    expect(toCents(null)).toBeNull();
  });

  it("formats money and totals", () => {
    expect(formatMoney("52.1", "EUR", "en")).toBe("€52.10");
    expect(formatMoney("5", "XYZ1", "en")).toBe("5.00 XYZ1");
    expect(formatMoney(null, "EUR")).toBe("");
    const tasks = [inv("a", {}, "10.10"), inv("b", {}, "5.05"), inv("c", {}, null),
      inv("d", {}, "1", "USD")];
    expect(invoiceTotal(tasks, "EUR", "en")).toBe("€15.15 + $1.00");
    expect(invoiceTotal([], "EUR")).toBe("");
  });

  it("finds the latest invoice by name and suggests names", () => {
    const s = {
      ...S,
      tasks: [
        inv("old", { name: "Water", due_date: "2026-08-15" }, "30"),
        inv("new", { name: "water ", due_date: "2026-09-15" }, "31"),
        inv("el", { name: "Electricity", due_date: "2026-09-01" }, "50"),
        task("plain", { name: "Water" }),
      ],
    };
    expect(latestInvoiceNamed(s, "WATER")?.uid).toBe("new");
    expect(latestInvoiceNamed(s, "Gas")).toBeUndefined();
    expect(invoiceNames(s)).toEqual(["water", "Electricity"]);
  });

  it("drafts the next invoice of a series", () => {
    const prev = inv(
      "p",
      { name: "Water", due_date: "2026-10-15", project_uid: "bills", assigned_to: "giulia" },
      "31",
      "USD",
    );
    expect(invoiceDraft(S, prev)).toEqual({
      name: "Water",
      due_date: "2026-11-15",
      amount: "",
      currency: "USD",
      reference: "",
      project_uid: "bills",
      assigned_to: "giulia",
      note: "",
      previous_uid: "p",
    });
    expect(invoiceDraft(S).currency).toBe("EUR");
  });
});
