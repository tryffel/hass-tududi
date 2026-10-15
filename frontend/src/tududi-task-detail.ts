import { LitElement, css, html, nothing } from "lit";
import { define, icon } from "./icons";
import {
  addDays,
  daysUntil,
  dueLabel,
  dueTone,
  formatDate,
  formatMoney,
  parseTags,
  toCents,
} from "./logic";
import "./tududi-notes";
import {
  PRIORITY_LABELS,
  STATUS,
  STATUS_LABELS,
  type Snapshot,
  type Task,
  type TaskFields,
} from "./types";

const EDITABLE_STATUSES = [
  STATUS.NOT_STARTED,
  STATUS.IN_PROGRESS,
  STATUS.WAITING,
  STATUS.PLANNED,
  STATUS.DONE,
];

/**
 * Editing pane for one task. Emits `task-change` ({uid, fields}),
 * `task-delete` ({uid}) and `close`. Note events from <tududi-notes> bubble.
 */
export class TududiTaskDetail extends LitElement {
  static override properties = {
    task: { attribute: false },
    snap: { attribute: false },
    language: {},
  };

  declare task: Task;
  declare snap: Snapshot;
  declare language: string;

  constructor() {
    super();
    this.language = "en";
  }

  private change(fields: TaskFields) {
    this.dispatchEvent(
      new CustomEvent("task-change", {
        detail: { uid: this.task.uid, fields },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private close() {
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  private deleteTask() {
    if (!confirm(`Delete task "${this.task.name}"?`)) return;
    this.dispatchEvent(
      new CustomEvent("task-delete", {
        detail: { uid: this.task.uid },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onName(e: Event) {
    const value = (e.target as HTMLInputElement).value.trim();
    if (value && value !== this.task.name) this.change({ name: value });
    else (e.target as HTMLInputElement).value = this.task.name;
  }

  private onNote(e: Event) {
    const value = (e.target as HTMLTextAreaElement).value;
    if (value !== this.task.note) this.change({ note: value || null });
  }

  private onTags(e: Event) {
    const tags = parseTags((e.target as HTMLInputElement).value);
    if (tags.join(",") !== this.task.tags.join(",")) this.change({ tags });
  }

  private setDue(date: string | null) {
    if (date !== this.task.due_date) this.change({ due_date: date });
  }

  private emit(type: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /** Save amount, currency and reference together (they form one data comment). */
  private onInvoice() {
    const value = (name: string) =>
      this.renderRoot.querySelector<HTMLInputElement>(`input[name=${name}]`)?.value.trim() ?? "";
    const amount = value("amount");
    if (amount && toCents(amount) === null) return;
    const inv = this.task.invoice;
    const next = {
      amount: amount || null,
      currency: value("currency").toUpperCase() || null,
      reference: value("reference") || null,
    };
    const unchanged =
      toCents(next.amount) === toCents(inv?.amount ?? null) &&
      next.currency === (inv?.currency ?? null) &&
      next.reference === (inv?.reference ?? null);
    if (unchanged) return;
    this.emit("invoice-change", { uid: this.task.uid, ...next });
  }

  private renderLinked(label: string, uid: string | null, dir: "prev" | "next") {
    if (!uid) return nothing;
    const linked = this.snap.tasks.find((t) => t.uid === uid);
    const text = linked
      ? html`${linked.due_date ? formatDate(linked.due_date, this.language) : linked.name}${
          linked.invoice?.amount
            ? html` · ${formatMoney(linked.invoice.amount, linked.invoice.currency, this.language)}`
            : nothing
        }${linked.done ? " · paid" : ""}`
      : html`<em>not loaded</em>`;
    return html`<button
      class="linked ${dir}"
      ?disabled=${!linked}
      @click=${() => this.emit("select-task", { uid })}
    >
      ${dir === "prev" ? icon("chevronLeft", 18) : nothing}
      <span><span class="linked-label">${label}</span> ${text}</span>
      ${dir === "next" ? icon("chevronRight", 18) : nothing}
    </button>`;
  }

  private renderInvoice() {
    const inv = this.task.invoice;
    if (!inv) return nothing;
    const amountInvalid = (e: Event) => {
      const el = e.target as HTMLInputElement;
      el.classList.toggle("invalid", el.value.trim() !== "" && toCents(el.value) === null);
    };
    return html`
      <section class="invoice">
        <div class="section-title">${icon("receipt", 18)} Invoice</div>
        <div class="grid">
          <label>Amount</label>
          <div class="amount">
            <input
              name="amount"
              inputmode="decimal"
              placeholder="0.00"
              .value=${inv.amount ?? ""}
              @input=${amountInvalid}
              @change=${this.onInvoice}
            />
            <input
              name="currency"
              class="currency"
              maxlength="3"
              placeholder=${this.snap.currency}
              .value=${inv.currency ?? ""}
              @change=${this.onInvoice}
            />
          </div>
          <label>Reference</label>
          <input
            name="reference"
            placeholder="Payment reference"
            .value=${inv.reference ?? ""}
            @change=${this.onInvoice}
          />
        </div>
        <div class="links">
          ${this.renderLinked("Previous", inv.previous_uid, "prev")}
          ${this.renderLinked("Next", inv.next_uid, "next")}
        </div>
        ${inv.next_uid
          ? nothing
          : html`<button class="chip next-invoice" @click=${() => this.emit("next-invoice", { uid: this.task.uid })}>
              ${icon("plus", 16)} Create next invoice
            </button>`}
      </section>
    `;
  }

  override render() {
    const t = this.task;
    const s = this.snap;
    const projectNotes = t.project_uid
      ? s.notes.filter((n) => n.project_uid === t.project_uid)
      : [];
    const project = s.projects.find((p) => p.uid === t.project_uid);
    const days = t.due_date ? daysUntil(s.today, t.due_date) : null;

    return html`
      <div class="bar">
        <button class="icon" title="Close" @click=${this.close}>${icon("back")}</button>
        <span class="spacer"></span>
        <button class="icon danger" title="Delete task" @click=${this.deleteTask}>
          ${icon("delete")}
        </button>
      </div>

      <div class="content">
        <div class="name-row">
          <button
            class="check ${t.done ? "checked" : ""}"
            title=${t.done ? "Reopen" : "Mark done"}
            @click=${() => this.change({ status: t.done ? STATUS.NOT_STARTED : STATUS.DONE })}
          >
            ${t.done ? icon("check", 18) : nothing}
          </button>
          <input
            class="name ${t.done ? "done" : ""}"
            .value=${t.name}
            @change=${this.onName}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
        ${t.recurring
          ? html`<div class="hint">${icon("repeat", 16)} Recurring task (edit recurrence in tududi)</div>`
          : nothing}

        <div class="grid">
          <label>Due date</label>
          <div class="due">
            <input
              type="date"
              .value=${t.due_date ?? ""}
              @change=${(e: Event) => this.setDue((e.target as HTMLInputElement).value || null)}
            />
            ${days !== null
              ? html`<span class="badge ${dueTone(days)}">${dueLabel(s.today, t.due_date!, this.language)}</span>`
              : nothing}
            <div class="quick">
              <button class="chip" @click=${() => this.setDue(s.today)}>Today</button>
              <button class="chip" @click=${() => this.setDue(addDays(s.today, 1))}>Tomorrow</button>
              <button class="chip" @click=${() => this.setDue(addDays(s.today, 7))}>+1 week</button>
              ${t.due_date
                ? html`<button class="chip" @click=${() => this.setDue(null)}>Clear</button>`
                : nothing}
            </div>
          </div>

          <label>Status</label>
          <select
            @change=${(e: Event) =>
              this.change({ status: Number((e.target as HTMLSelectElement).value) })}
          >
            ${EDITABLE_STATUSES.map(
              (st) =>
                html`<option value=${st} ?selected=${st === t.status}>${STATUS_LABELS[st]}</option>`,
            )}
          </select>

          <label>Priority</label>
          <select
            @change=${(e: Event) => {
              const v = (e.target as HTMLSelectElement).value;
              this.change({ priority: v === "" ? null : Number(v) });
            }}
          >
            <option value="" ?selected=${t.priority === null}>None</option>
            ${[0, 1, 2].map(
              (p) =>
                html`<option value=${p} ?selected=${p === t.priority}>${PRIORITY_LABELS[p]}</option>`,
            )}
          </select>

          <label>Project</label>
          <select
            @change=${(e: Event) =>
              this.change({ project_uid: (e.target as HTMLSelectElement).value || null })}
          >
            <option value="" ?selected=${!t.project_uid}>No project</option>
            ${s.projects.map(
              (p) => html`<option value=${p.uid} ?selected=${p.uid === t.project_uid}>${p.name}</option>`,
            )}
          </select>

          <label>Assigned to</label>
          <select
            @change=${(e: Event) =>
              this.change({ assigned_to: (e.target as HTMLSelectElement).value || null })}
          >
            <option value="" ?selected=${!t.assigned_to}>Nobody</option>
            ${s.people.map(
              (p) =>
                html`<option value=${p.uid} ?selected=${p.uid === t.assigned_to}>
                  ${p.name}${p.is_self ? " (me)" : ""}
                </option>`,
            )}
          </select>

          <label>Tags</label>
          <div>
            <input
              list="tududi-tags"
              placeholder="e.g. invoice, car"
              .value=${t.tags.join(", ")}
              @change=${this.onTags}
            />
            <datalist id="tududi-tags">
              ${s.tags.map((tag) => html`<option value=${tag}></option>`)}
            </datalist>
          </div>
        </div>

        ${this.renderInvoice()}

        <label class="block">Note</label>
        <textarea
          rows="6"
          placeholder="Details, invoice amount, reference number…"
          .value=${t.note}
          @change=${this.onNote}
        ></textarea>

        ${project
          ? html`<tududi-notes
              .notes=${projectNotes}
              heading=${`Notes · ${project.name}`}
              can-add
            ></tududi-notes>`
          : nothing}
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--card-background-color);
      color: var(--primary-text-color);
    }
    .bar {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      border-bottom: 1px solid var(--divider-color);
      min-height: 48px;
      box-sizing: border-box;
    }
    .spacer {
      flex: 1;
    }
    .content {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .content > * {
      flex-shrink: 0;
    }
    .name-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    input.name {
      font-size: 1.3em;
      font-weight: 500;
      border: 1px solid transparent;
      background: transparent;
      padding: 6px;
    }
    input.name:hover,
    input.name:focus {
      border-color: var(--divider-color);
    }
    input.name.done {
      text-decoration: line-through;
      color: var(--secondary-text-color);
    }
    .hint {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
    .grid {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 10px 12px;
      align-items: center;
    }
    label {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    label.block {
      margin-bottom: -6px;
    }
    .due {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .due input {
      width: auto;
    }
    .quick {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      width: 100%;
    }
    input,
    select,
    textarea {
      font: inherit;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      padding: 8px;
      box-sizing: border-box;
      width: 100%;
      color-scheme: light dark;
    }
    textarea {
      resize: vertical;
    }
    button {
      font: inherit;
      cursor: pointer;
    }
    button.icon {
      background: none;
      border: none;
      color: var(--primary-text-color);
      padding: 8px;
      border-radius: 50%;
      display: inline-flex;
    }
    button.icon:hover {
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
    }
    button.icon.danger {
      color: var(--error-color);
    }
    button.chip {
      border: 1px solid var(--divider-color);
      background: none;
      color: var(--primary-text-color);
      border-radius: 16px;
      padding: 2px 10px;
      font-size: 0.85em;
    }
    button.chip:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }
    .check {
      flex: none;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid var(--secondary-text-color);
      background: none;
      color: var(--text-primary-color, #fff);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .check.checked {
      background: var(--success-color, #43a047);
      border-color: var(--success-color, #43a047);
    }
    .badge {
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.15));
    }
    .badge.overdue {
      background: var(--error-color);
      color: #fff;
    }
    .badge.today {
      background: var(--warning-color, #ffa600);
      color: #fff;
    }
    .badge.soon {
      color: var(--primary-color);
    }
    tududi-notes {
      margin-top: 8px;
    }
    section.invoice {
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      padding: 10px 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: var(--secondary-text-color);
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .amount {
      display: flex;
      gap: 6px;
    }
    input.currency {
      width: 64px;
      flex: none;
      text-transform: uppercase;
    }
    input.invalid {
      border-color: var(--error-color);
    }
    .links {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .links:empty {
      display: none;
    }
    button.linked {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 4px 8px;
      color: var(--primary-text-color);
      font-size: 0.85em;
    }
    button.linked.next {
      margin-left: auto;
    }
    button.linked:hover:not([disabled]) {
      border-color: var(--primary-color);
    }
    .linked-label {
      color: var(--secondary-text-color);
    }
    button.next-invoice {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  `;
}

define("tududi-task-detail", TududiTaskDetail);
