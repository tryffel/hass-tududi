import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { TududiApi, errorMessage } from "./api";
import { define, icon } from "./icons";
import {
  BUILTIN_VIEWS,
  daysUntil,
  dueLabel,
  dueTone,
  formatMoney,
  groupTasks,
  initials,
  invoiceDraft,
  invoiceTotal,
  matchesSearch,
  parseView,
  quickAddDefaults,
  tasksForView,
  viewCount,
  viewTitle,
  withTask,
  type InvoiceDraft,
  type ViewId,
} from "./logic";
import "./tududi-invoice-form";
import type { NoteSaveDetail } from "./tududi-notes";
import "./tududi-notes";
import "./tududi-task-detail";
import {
  STATUS,
  type Entry,
  type HomeAssistant,
  type InvoiceFields,
  type Route,
  type Snapshot,
  type Task,
  type TaskFields,
} from "./types";

const ENTRY_STORAGE_KEY = "tududi-panel-entry";

class TududiPanel extends LitElement {
  static override properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    route: { attribute: false },
    panel: { attribute: false },
    entries: { state: true },
    entryId: { state: true },
    serverSnap: { state: true },
    overrides: { state: true },
    selectedUid: { state: true },
    search: { state: true },
    quickAdd: { state: true },
    toast: { state: true },
    loading: { state: true },
    refreshing: { state: true },
    draft: { state: true },
    savingInvoice: { state: true },
  };

  declare hass: HomeAssistant;
  declare narrow: boolean;
  declare route: Route | undefined;
  declare panel: unknown;
  declare entries: Entry[] | undefined;
  declare entryId: string | undefined;
  declare serverSnap: Snapshot | undefined;
  /** Optimistic task changes not yet confirmed by tududi; null = deleted. */
  declare overrides: Map<string, Task | null>;
  declare selectedUid: string | undefined;
  declare search: string;
  declare quickAdd: string;
  declare toast: string | undefined;
  declare loading: boolean;
  declare refreshing: boolean;
  /** Invoice being created (form open) or undefined. */
  declare draft: InvoiceDraft | undefined;
  declare savingInvoice: boolean;

  private api = new TududiApi(() => this.hass);
  private unsubscribe?: Promise<() => Promise<void>>;
  private toastTimer?: number;
  private initialized = false;

  constructor() {
    super();
    this.narrow = false;
    this.overrides = new Map();
    this.search = "";
    this.quickAdd = "";
    this.loading = true;
    this.refreshing = false;
    this.savingInvoice = false;
  }

  // ------------------------------------------------------------------ lifecycle

  override connectedCallback() {
    super.connectedCallback();
    if (this.entryId && !this.unsubscribe) this.subscribe(this.entryId);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribeNow();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has("hass") && this.hass && !this.initialized) {
      this.initialized = true;
      void this.init();
    }
  }

  private async init() {
    try {
      const entries = await this.api.entries();
      this.entries = entries;
      if (!entries.length) {
        this.loading = false;
        return;
      }
      const stored = localStorage.getItem(ENTRY_STORAGE_KEY);
      const chosen =
        entries.find((e) => e.entry_id === stored) ??
        entries.find((e) => e.linked) ??
        entries[0]!;
      this.selectEntry(chosen.entry_id);
    } catch (err) {
      this.loading = false;
      this.showToast(`Could not load tududi accounts: ${errorMessage(err)}`);
    }
  }

  private selectEntry(entryId: string) {
    if (entryId === this.entryId) return;
    localStorage.setItem(ENTRY_STORAGE_KEY, entryId);
    this.unsubscribeNow();
    this.entryId = entryId;
    this.serverSnap = undefined;
    this.overrides = new Map();
    this.selectedUid = undefined;
    this.loading = true;
    this.subscribe(entryId);
  }

  private subscribe(entryId: string) {
    this.unsubscribe = this.api.subscribe(entryId, (snap) => {
      if (snap.entry_id !== this.entryId) return;
      this.serverSnap = snap;
      this.loading = false;
    });
    this.unsubscribe.catch((err) => {
      this.loading = false;
      this.unsubscribe = undefined;
      this.showToast(`Could not load tasks: ${errorMessage(err)}`);
    });
  }

  private unsubscribeNow() {
    const unsub = this.unsubscribe;
    this.unsubscribe = undefined;
    unsub?.then((fn) => fn()).catch(() => undefined);
  }

  // ------------------------------------------------------------------ data helpers

  private get snap(): Snapshot | undefined {
    const snap = this.serverSnap;
    if (!snap || this.overrides.size === 0) return snap;
    let result = snap;
    for (const [uid, task] of this.overrides) {
      result =
        task === null
          ? { ...result, tasks: result.tasks.filter((t) => t.uid !== uid) }
          : withTask(result, task);
    }
    return result;
  }

  private get view(): ViewId {
    return parseView(this.route?.path);
  }

  private get language(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? "en";
  }

  private navigate(view: ViewId) {
    const prefix = this.route?.prefix ?? "/tududi";
    history.pushState(null, "", `${prefix}/${encodeURIComponent(view)}`);
    window.dispatchEvent(new CustomEvent("location-changed"));
    this.selectedUid = undefined;
    this.search = "";
  }

  private showToast(message: string) {
    this.toast = message;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toast = undefined), 6000);
  }

  private setOverride(uid: string, task: Task | null | undefined) {
    const next = new Map(this.overrides);
    if (task === undefined) next.delete(uid);
    else next.set(uid, task);
    this.overrides = next;
  }

  // ------------------------------------------------------------------ actions

  private async updateTask(uid: string, fields: TaskFields) {
    const snap = this.snap;
    const entryId = this.entryId;
    const current = snap?.tasks.find((t) => t.uid === uid);
    if (!snap || !entryId || !current) return;

    const optimistic: Task = { ...current, ...fields } as Task;
    if (fields.status !== undefined) {
      optimistic.done = fields.status === STATUS.DONE;
      optimistic.open = ![STATUS.DONE, STATUS.ARCHIVED, STATUS.CANCELLED].includes(
        fields.status as 2 | 3 | 5,
      );
    }
    this.setOverride(uid, optimistic);
    try {
      await this.api.updateTask(entryId, uid, fields);
    } catch (err) {
      this.showToast(`Saving failed: ${errorMessage(err)}`);
    } finally {
      this.setOverride(uid, undefined);
    }
  }

  private toggleDone(task: Task) {
    void this.updateTask(task.uid, {
      status: task.done ? STATUS.NOT_STARTED : STATUS.DONE,
    });
  }

  private async deleteTask(uid: string) {
    if (!this.entryId) return;
    this.setOverride(uid, null);
    this.selectedUid = undefined;
    try {
      await this.api.deleteTask(this.entryId, uid);
    } catch (err) {
      this.showToast(`Deleting failed: ${errorMessage(err)}`);
    } finally {
      this.setOverride(uid, undefined);
    }
  }

  private async addTask() {
    const name = this.quickAdd.trim();
    const snap = this.snap;
    if (!name || !snap || !this.entryId) return;
    this.quickAdd = "";
    try {
      await this.api.createTask(this.entryId, name, quickAddDefaults(snap, this.view));
    } catch (err) {
      this.quickAdd = name;
      this.showToast(`Adding failed: ${errorMessage(err)}`);
    }
  }

  private async saveNote(detail: NoteSaveDetail, projectUid: string | null) {
    if (!this.entryId) return;
    try {
      if (detail.uid) {
        await this.api.updateNote(this.entryId, detail.uid, {
          title: detail.title,
          content: detail.content,
        });
      } else {
        await this.api.createNote(this.entryId, detail.title, {
          content: detail.content,
          ...(projectUid ? { project_uid: projectUid } : {}),
        });
      }
    } catch (err) {
      this.showToast(`Saving note failed: ${errorMessage(err)}`);
    }
  }

  private async deleteNote(uid: string) {
    if (!this.entryId) return;
    try {
      await this.api.deleteNote(this.entryId, uid);
    } catch (err) {
      this.showToast(`Deleting note failed: ${errorMessage(err)}`);
    }
  }

  // ------------------------------------------------------------------ invoices

  private openInvoiceForm(previousUid?: string) {
    const snap = this.snap;
    if (!snap) return;
    const previous = previousUid ? snap.tasks.find((t) => t.uid === previousUid) : undefined;
    this.draft = invoiceDraft(snap, previous);
    this.selectedUid = undefined;
  }

  private async createInvoice(fields: InvoiceFields) {
    if (!this.entryId) return;
    this.savingInvoice = true;
    try {
      const task = await this.api.createInvoice(this.entryId, fields);
      this.draft = undefined;
      this.selectedUid = task.uid;
    } catch (err) {
      this.showToast(`Adding invoice failed: ${errorMessage(err)}`);
    } finally {
      this.savingInvoice = false;
    }
  }

  private async updateInvoice(detail: {
    uid: string;
    amount: string | null;
    currency: string | null;
    reference: string | null;
  }) {
    const snap = this.snap;
    const task = snap?.tasks.find((t) => t.uid === detail.uid);
    if (!this.entryId || !task?.invoice) return;
    const { uid, ...data } = detail;
    this.setOverride(uid, { ...task, invoice: { ...task.invoice, ...data } });
    try {
      await this.api.updateInvoice(this.entryId, uid, data);
    } catch (err) {
      this.showToast(`Saving invoice failed: ${errorMessage(err)}`);
    } finally {
      this.setOverride(uid, undefined);
    }
  }

  private async refresh() {
    if (!this.entryId) return;
    this.refreshing = true;
    try {
      await this.api.refresh(this.entryId);
    } catch (err) {
      this.showToast(`Refresh failed: ${errorMessage(err)}`);
    } finally {
      this.refreshing = false;
    }
  }

  // ------------------------------------------------------------------ render

  override render() {
    const snap = this.snap;
    const selected = snap?.tasks.find((t) => t.uid === this.selectedUid);
    return html`
      <div class="toolbar">
        ${this.narrow
          ? html`<button
              class="icon"
              title="Menu"
              @click=${() =>
                this.dispatchEvent(
                  new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }),
                )}
            >
              ${icon("menu")}
            </button>`
          : nothing}
        <div class="title">Tududi</div>
        ${this.entries && this.entries.length > 1
          ? html`<select
              class="entry"
              @change=${(e: Event) => this.selectEntry((e.target as HTMLSelectElement).value)}
            >
              ${this.entries.map(
                (e) =>
                  html`<option value=${e.entry_id} ?selected=${e.entry_id === this.entryId}>
                    ${e.title}
                  </option>`,
              )}
            </select>`
          : nothing}
        <button
          class="icon ${this.refreshing ? "spin" : ""}"
          title="Refresh from tududi"
          ?disabled=${!this.entryId}
          @click=${this.refresh}
        >
          ${icon("refresh")}
        </button>
      </div>
      ${this.renderBody(snap, selected)}
      ${this.toast
        ? html`<div class="toast" @click=${() => (this.toast = undefined)}>${this.toast}</div>`
        : nothing}
    `;
  }

  private renderBody(snap: Snapshot | undefined, selected: Task | undefined) {
    if (this.entries && this.entries.length === 0) {
      return html`<div class="message">
        <h2>No tududi account</h2>
        <p>
          No tududi account is linked to your Home Assistant user. Ask an administrator to add
          the Tududi integration with your API key and select you as its Home Assistant user.
        </p>
      </div>`;
    }
    if (this.loading || !snap) {
      return html`<div class="message">Loading…</div>`;
    }
    return html`
      <div class="body ${this.narrow ? "narrow" : ""} ${selected ? "has-detail" : ""}">
        ${this.narrow ? nothing : this.renderNav(snap)}
        <main class="list">
          ${this.narrow ? this.renderNarrowNav(snap) : nothing}
          ${snap.last_update_success
            ? nothing
            : html`<div class="warning">tududi is unreachable; showing cached tasks.</div>`}
          ${this.renderList(snap)}
        </main>
        ${selected
          ? html`<aside class="detail">
              <tududi-task-detail
                .task=${selected}
                .snap=${snap}
                .language=${this.language}
                @close=${() => (this.selectedUid = undefined)}
                @task-change=${(e: CustomEvent<{ uid: string; fields: TaskFields }>) =>
                  this.updateTask(e.detail.uid, e.detail.fields)}
                @task-delete=${(e: CustomEvent<{ uid: string }>) => this.deleteTask(e.detail.uid)}
                @note-save=${(e: CustomEvent<NoteSaveDetail>) =>
                  this.saveNote(e.detail, selected.project_uid)}
                @note-delete=${(e: CustomEvent<{ uid: string }>) => this.deleteNote(e.detail.uid)}
                @invoice-change=${(e: CustomEvent) => this.updateInvoice(e.detail)}
                @select-task=${(e: CustomEvent<{ uid: string }>) => (this.selectedUid = e.detail.uid)}
                @next-invoice=${(e: CustomEvent<{ uid: string }>) => this.openInvoiceForm(e.detail.uid)}
              ></tududi-task-detail>
            </aside>`
          : nothing}
      </div>
    `;
  }

  private renderNav(snap: Snapshot) {
    const item = (id: ViewId, label: string, count?: number) => html`
      <button class="nav-item ${this.view === id ? "active" : ""}" @click=${() => this.navigate(id)}>
        <span class="nav-label">${label}</span>
        ${count ? html`<span class="count">${count}</span>` : nothing}
      </button>
    `;
    return html`
      <nav class="sidebar">
        ${BUILTIN_VIEWS.map((v) =>
          item(v.id, v.label, v.id === "done" ? undefined : viewCount(snap, v.id)),
        )}
        ${snap.projects.length
          ? html`<div class="nav-section">Projects</div>
              ${snap.projects.map((p) =>
                item(`project:${p.uid}`, p.name, viewCount(snap, `project:${p.uid}`)),
              )}`
          : nothing}
        ${snap.tags.length
          ? html`<div class="nav-section">Tags</div>
              ${snap.tags.map((t) => item(`tag:${t}`, `#${t}`, viewCount(snap, `tag:${t}`)))}`
          : nothing}
      </nav>
    `;
  }

  private renderNarrowNav(snap: Snapshot) {
    const other = this.view.startsWith("project:") || this.view.startsWith("tag:");
    return html`
      <div class="chips">
        ${BUILTIN_VIEWS.map((v) => {
          const count = v.id === "done" ? 0 : viewCount(snap, v.id);
          return html`<button
            class="chip ${this.view === v.id ? "active" : ""}"
            @click=${() => this.navigate(v.id)}
          >
            ${v.label}${count ? html` <span class="count">${count}</span>` : nothing}
          </button>`;
        })}
        <select
          class="chip ${other ? "active" : ""}"
          @change=${(e: Event) => {
            const value = (e.target as HTMLSelectElement).value;
            if (value) this.navigate(value as ViewId);
          }}
        >
          <option value="" ?selected=${!other}>Projects & tags…</option>
          ${snap.projects.map(
            (p) =>
              html`<option value=${`project:${p.uid}`} ?selected=${this.view === `project:${p.uid}`}>
                ${p.name}
              </option>`,
          )}
          ${snap.tags.map(
            (t) =>
              html`<option value=${`tag:${t}`} ?selected=${this.view === `tag:${t}`}>#${t}</option>`,
          )}
        </select>
      </div>
    `;
  }

  private renderList(snap: Snapshot) {
    const view = this.view;
    const tasks = tasksForView(snap, view).filter((t) => matchesSearch(t, this.search));
    const groups = groupTasks(snap, view, tasks, this.language);
    const projectUid = view.startsWith("project:") ? view.slice("project:".length) : null;
    const canAdd = view !== "done" && view !== "overdue" && view !== "invoices";

    return html`
      <div class="list-header">
        <h1>${viewTitle(snap, view)}</h1>
        <input
          class="search"
          type="search"
          placeholder="Search"
          .value=${this.search}
          @input=${(e: InputEvent) => (this.search = (e.target as HTMLInputElement).value)}
        />
      </div>
      ${canAdd
        ? html`<form
            class="quick-add"
            @submit=${(e: Event) => {
              e.preventDefault();
              void this.addTask();
            }}
          >
            ${icon("plus")}
            <input
              placeholder=${this.quickAddPlaceholder(snap, view)}
              .value=${this.quickAdd}
              @input=${(e: InputEvent) => (this.quickAdd = (e.target as HTMLInputElement).value)}
            />
          </form>`
        : nothing}
      ${this.draft
        ? html`<tududi-invoice-form
            .snap=${snap}
            .draft=${this.draft}
            .language=${this.language}
            ?busy=${this.savingInvoice}
            @invoice-submit=${(e: CustomEvent<InvoiceFields>) => this.createInvoice(e.detail)}
            @cancel=${() => (this.draft = undefined)}
          ></tududi-invoice-form>`
        : view === "invoices"
          ? html`<button class="quick-add new-invoice" @click=${() => this.openInvoiceForm()}>
              ${icon("receipt")} <span>New invoice</span>
            </button>`
          : nothing}
      ${projectUid
        ? html`<tududi-notes
            class="project-notes"
            .notes=${snap.notes.filter((n) => n.project_uid === projectUid)}
            heading="Project notes"
            can-add
            @note-save=${(e: CustomEvent<NoteSaveDetail>) => this.saveNote(e.detail, projectUid)}
            @note-delete=${(e: CustomEvent<{ uid: string }>) => this.deleteNote(e.detail.uid)}
          ></tududi-notes>`
        : nothing}
      ${groups.length === 0
        ? html`<div class="empty">${this.search ? "No matching tasks." : "Nothing here. 🎉"}</div>`
        : groups.map(
            (g) => html`
              <section>
                ${g.label
                  ? html`<h2 class="group ${g.key}">
                      ${g.label}<span>${g.tasks.length}</span>
                      ${view === "invoices" && g.key !== "done"
                        ? html`<span class="total">${invoiceTotal(g.tasks, snap.currency, this.language)}</span>`
                        : nothing}
                    </h2>`
                  : nothing}
                ${g.tasks.map((t) => this.renderTask(snap, t, view))}
              </section>
            `,
          )}
    `;
  }

  private quickAddPlaceholder(snap: Snapshot, view: ViewId): string {
    if (view === "today") return "Add a task due today";
    if (view === "upcoming") return "Add a task due tomorrow";
    if (view === "invoices") return `Add an invoice (tagged #${snap.reminder_tag})`;
    if (view.startsWith("project:")) return `Add a task to ${viewTitle(snap, view)}`;
    if (view.startsWith("tag:")) return `Add a task tagged ${viewTitle(snap, view)}`;
    return "Add a task";
  }

  private renderTask(snap: Snapshot, t: Task, view: ViewId) {
    const project = view.startsWith("project:")
      ? undefined
      : snap.projects.find((p) => p.uid === t.project_uid);
    const assignee =
      t.assigned_to && t.assigned_to !== snap.self_person
        ? snap.people.find((p) => p.uid === t.assigned_to)
        : undefined;
    const days = t.due_date ? daysUntil(snap.today, t.due_date) : null;
    const tagFilter = view.startsWith("tag:") ? view.slice(4).toLocaleLowerCase() : null;
    const tags = t.tags.filter((tag) => tag.toLocaleLowerCase() !== tagFilter);

    return html`
      <div
        class="task ${t.uid === this.selectedUid ? "selected" : ""} ${t.open ? "" : "closed"}"
        @click=${() => (this.selectedUid = t.uid)}
      >
        <button
          class="check ${t.done ? "checked" : ""} ${t.priority === 2 ? "high" : ""}"
          title=${t.done ? "Reopen" : "Mark done"}
          @click=${(e: Event) => {
            e.stopPropagation();
            this.toggleDone(t);
          }}
        >
          ${t.done ? icon("check", 16) : nothing}
        </button>
        <div class="task-main">
          <div class="task-name">${t.name}</div>
          <div class="meta">
            ${days !== null && t.open
              ? html`<span class="due ${dueTone(days)}">${dueLabel(snap.today, t.due_date!, this.language)}</span>`
              : nothing}
            ${t.status === STATUS.IN_PROGRESS ? html`<span class="status">In progress</span>` : nothing}
            ${t.status === STATUS.WAITING ? html`<span class="status">Waiting</span>` : nothing}
            ${project ? html`<span class="project">${project.name}</span>` : nothing}
            ${tags.map((tag) => html`<span class="tag">#${tag}</span>`)}
            ${t.note ? html`<span class="has-note" title=${t.note}>${icon("note", 14)}</span>` : nothing}
            ${t.recurring ? html`<span class="has-note">${icon("repeat", 14)}</span>` : nothing}
          </div>
        </div>
        ${t.invoice?.amount
          ? html`<span class="money">${formatMoney(t.invoice.amount, t.invoice.currency ?? snap.currency, this.language)}</span>`
          : nothing}
        ${assignee
          ? html`<span class="avatar" title=${`Assigned to ${assignee.name}`}>${initials(assignee.name)}</span>`
          : nothing}
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      font-family: var(--paper-font-body1_-_font-family, inherit);
      position: relative;
    }
    button {
      font: inherit;
      cursor: pointer;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      height: var(--header-height, 56px);
      padding: 0 8px 0 16px;
      background: var(--app-header-background-color, var(--primary-color));
      color: var(--app-header-text-color, var(--text-primary-color, #fff));
      border-bottom: var(--app-header-border-bottom, none);
      box-sizing: border-box;
      flex: none;
    }
    .toolbar .title {
      flex: 1;
      font-size: 20px;
      font-weight: 400;
    }
    .toolbar .icon {
      color: inherit;
    }
    .toolbar select.entry {
      font: inherit;
      color: inherit;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      padding: 4px 8px;
    }
    .toolbar select.entry option {
      color: var(--primary-text-color);
      background: var(--card-background-color);
    }
    button.icon {
      background: none;
      border: none;
      padding: 8px;
      border-radius: 50%;
      display: inline-flex;
      color: var(--primary-text-color);
    }
    button.icon:hover {
      background: rgba(127, 127, 127, 0.15);
    }
    button.icon.spin svg {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .message {
      padding: 32px;
      max-width: 560px;
      margin: 0 auto;
      color: var(--secondary-text-color);
    }
    .body {
      flex: 1;
      display: flex;
      min-height: 0;
    }
    .sidebar {
      width: 220px;
      flex: none;
      overflow-y: auto;
      padding: 12px 8px;
      border-right: 1px solid var(--divider-color);
      box-sizing: border-box;
    }
    .nav-item {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      color: var(--primary-text-color);
      padding: 8px 12px;
      border-radius: 8px;
      text-align: left;
    }
    .nav-item:hover {
      background: rgba(127, 127, 127, 0.1);
    }
    .nav-item.active {
      background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.15);
      color: var(--primary-color);
      font-weight: 500;
    }
    .nav-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .count {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      font-variant-numeric: tabular-nums;
    }
    .nav-section {
      margin: 16px 12px 4px;
      font-size: 0.75em;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--secondary-text-color);
    }
    .list {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
      padding: 16px 24px 48px;
      box-sizing: border-box;
    }
    .body.narrow .list {
      padding: 8px 12px 48px;
    }
    .detail {
      width: 420px;
      flex: none;
      border-left: 1px solid var(--divider-color);
      min-height: 0;
    }
    .body.narrow .detail {
      position: absolute;
      inset: 0;
      width: auto;
      z-index: 5;
      border: none;
    }
    .chips {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 4px 0 8px;
      scrollbar-width: none;
    }
    .chip {
      flex: none;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      border-radius: 16px;
      padding: 4px 12px;
      font: inherit;
      font-size: 0.9em;
    }
    .chip.active {
      border-color: var(--primary-color);
      color: var(--primary-color);
      font-weight: 500;
    }
    .list-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .list-header h1 {
      flex: 1;
      font-size: 1.6em;
      font-weight: 400;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    input.search,
    .quick-add input {
      font: inherit;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 10px;
      box-sizing: border-box;
    }
    input.search {
      width: 180px;
    }
    .quick-add {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      padding: 2px 10px;
      margin-bottom: 16px;
      color: var(--secondary-text-color);
    }
    .quick-add:focus-within {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }
    .quick-add input {
      flex: 1;
      border: none;
      background: none;
      padding: 10px 0;
      outline: none;
    }
    .project-notes {
      margin-bottom: 16px;
    }
    tududi-invoice-form {
      margin-bottom: 16px;
    }
    button.new-invoice {
      width: 100%;
      font: inherit;
      padding: 10px;
      cursor: pointer;
      color: var(--primary-color);
    }
    button.new-invoice:hover {
      border-color: var(--primary-color);
    }
    h2.group .total {
      margin-left: auto;
      font-weight: 500;
      color: var(--primary-text-color);
      text-transform: none;
      letter-spacing: 0;
      font-variant-numeric: tabular-nums;
    }
    .money {
      flex: none;
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
    .task.closed .money {
      color: var(--secondary-text-color);
    }
    .warning {
      background: var(--warning-color, #ffa600);
      color: #fff;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .empty {
      text-align: center;
      color: var(--secondary-text-color);
      padding: 48px 0;
    }
    h2.group {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 0.85em;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color);
      margin: 20px 0 6px;
    }
    h2.group span {
      font-weight: 400;
    }
    h2.group.overdue {
      color: var(--error-color);
    }
    .task {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: border-color 0.1s;
    }
    .task:hover {
      border-color: var(--primary-color);
    }
    .task.selected {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    .task.closed .task-name {
      text-decoration: line-through;
      color: var(--secondary-text-color);
    }
    .check {
      flex: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid var(--secondary-text-color);
      background: none;
      color: var(--text-primary-color, #fff);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .check.high {
      border-color: var(--error-color);
    }
    .check:hover {
      border-color: var(--success-color, #43a047);
    }
    .check.checked {
      background: var(--success-color, #43a047);
      border-color: var(--success-color, #43a047);
    }
    .task-main {
      flex: 1;
      min-width: 0;
    }
    .task-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 10px;
      font-size: 0.8em;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }
    .meta:empty {
      display: none;
    }
    .due.overdue {
      color: var(--error-color);
      font-weight: 500;
    }
    .due.today {
      color: var(--warning-color, #ffa600);
      font-weight: 500;
    }
    .due.soon {
      color: var(--primary-color);
    }
    .tag {
      color: var(--primary-color);
    }
    .has-note {
      display: inline-flex;
    }
    .avatar {
      flex: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--accent-color, #ff9800);
      color: #fff;
      font-size: 0.75em;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .toast {
      position: absolute;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      background: var(--primary-text-color);
      color: var(--primary-background-color);
      padding: 10px 16px;
      border-radius: 8px;
      max-width: 90%;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      cursor: pointer;
    }
  `;
}

define("tududi-panel", TududiPanel);
