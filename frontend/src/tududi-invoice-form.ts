import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { define, icon } from "./icons";
import {
  formatDate,
  formatMoney,
  invoiceNames,
  latestInvoiceNamed,
  toCents,
  type InvoiceDraft,
} from "./logic";
import type { InvoiceFields, Snapshot } from "./types";

/**
 * Form for a new invoice. Emits `invoice-submit` (InvoiceFields) and `cancel`.
 * Typing the name of an earlier invoice links to it and prefills project and
 * assignee (unless they were changed by hand).
 */
export class TududiInvoiceForm extends LitElement {
  static override properties = {
    snap: { attribute: false },
    draft: { attribute: false },
    language: {},
    busy: { type: Boolean },
    values: { state: true },
    linkPrevious: { state: true },
    touched: { state: true },
  };

  declare snap: Snapshot;
  declare draft: InvoiceDraft;
  declare language: string;
  declare busy: boolean;
  declare values: InvoiceDraft;
  declare linkPrevious: boolean;
  declare touched: Set<string>;

  constructor() {
    super();
    this.language = "en";
    this.busy = false;
    this.linkPrevious = true;
    this.touched = new Set();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has("draft") && this.draft) {
      this.values = { ...this.draft };
      this.linkPrevious = true;
      this.touched = new Set();
    }
  }

  override firstUpdated() {
    const target = this.values.name ? "input[name=amount]" : "input[name=name]";
    this.renderRoot.querySelector<HTMLInputElement>(target)?.focus();
  }

  private set(field: keyof InvoiceDraft, value: string | null) {
    this.values = { ...this.values, [field]: value };
    this.touched = new Set(this.touched).add(field);
    if (field === "name" && !this.draft.previous_uid) this.prefillFromPrevious();
  }

  private prefillFromPrevious() {
    const previous = latestInvoiceNamed(this.snap, this.values.name);
    if (!previous) return;
    const next = { ...this.values };
    if (!this.touched.has("project_uid")) next.project_uid = previous.project_uid;
    if (!this.touched.has("assigned_to")) next.assigned_to = previous.assigned_to;
    if (!this.touched.has("currency") && previous.invoice?.currency) {
      next.currency = previous.invoice.currency;
    }
    this.values = next;
  }

  private get amountInvalid(): boolean {
    return this.values.amount.trim() !== "" && toCents(this.values.amount) === null;
  }

  private get valid(): boolean {
    return Boolean(this.values.name.trim() && this.values.due_date && !this.amountInvalid);
  }

  private submit(e: Event) {
    e.preventDefault();
    if (!this.valid || this.busy) return;
    const v = this.values;
    const fields: InvoiceFields = {
      name: v.name.trim(),
      due_date: v.due_date,
      amount: v.amount.trim() || null,
      currency: v.currency.trim().toUpperCase() || null,
      reference: v.reference.trim() || null,
      project_uid: v.project_uid,
      assigned_to: v.assigned_to,
      note: v.note.trim() || null,
    };
    if (!this.linkPrevious) fields.previous_uid = null;
    else if (this.draft.previous_uid) fields.previous_uid = this.draft.previous_uid;
    this.dispatchEvent(
      new CustomEvent("invoice-submit", { detail: fields, bubbles: true, composed: true }),
    );
  }

  private cancel() {
    this.dispatchEvent(new CustomEvent("cancel", { bubbles: true, composed: true }));
  }

  override render() {
    const v = this.values;
    const s = this.snap;
    const candidate = this.draft.previous_uid
      ? s.tasks.find((t) => t.uid === this.draft.previous_uid)
      : latestInvoiceNamed(s, v.name);
    const input = (field: keyof InvoiceDraft) => (e: Event) =>
      this.set(field, (e.target as HTMLInputElement).value);

    return html`
      <form @submit=${this.submit}>
        <div class="title">
          ${icon("receipt", 20)}
          <span>${this.draft.previous_uid ? "Next invoice" : "New invoice"}</span>
          <span class="spacer"></span>
          <button type="button" class="icon" title="Close" @click=${this.cancel}>
            ${icon("close", 20)}
          </button>
        </div>

        <div class="grid">
          <label class="wide">
            <span>Name / payee *</span>
            <input
              name="name"
              list="tududi-invoice-names"
              placeholder="e.g. Electricity"
              required
              .value=${v.name}
              @input=${input("name")}
            />
            <datalist id="tududi-invoice-names">
              ${invoiceNames(s).map((n) => html`<option value=${n}></option>`)}
            </datalist>
          </label>

          <label>
            <span>Due date *</span>
            <input name="due_date" type="date" required .value=${v.due_date} @input=${input("due_date")} />
          </label>

          <label>
            <span>Amount</span>
            <div class="amount">
              <input
                name="amount"
                inputmode="decimal"
                placeholder="0.00"
                class=${this.amountInvalid ? "invalid" : ""}
                .value=${v.amount}
                @input=${input("amount")}
              />
              <input
                name="currency"
                class="currency"
                maxlength="3"
                .value=${v.currency}
                @input=${input("currency")}
              />
            </div>
          </label>

          <label class="wide">
            <span>Reference</span>
            <input
              name="reference"
              placeholder="Payment reference or invoice number"
              .value=${v.reference}
              @input=${input("reference")}
            />
          </label>

          <label>
            <span>Project</span>
            <select @change=${(e: Event) => this.set("project_uid", (e.target as HTMLSelectElement).value || null)}>
              <option value="" ?selected=${!v.project_uid}>No project</option>
              ${s.projects.map(
                (p) => html`<option value=${p.uid} ?selected=${p.uid === v.project_uid}>${p.name}</option>`,
              )}
            </select>
          </label>

          <label>
            <span>Paid by</span>
            <select @change=${(e: Event) => this.set("assigned_to", (e.target as HTMLSelectElement).value || null)}>
              <option value="" ?selected=${!v.assigned_to}>Nobody</option>
              ${s.people.map(
                (p) =>
                  html`<option value=${p.uid} ?selected=${p.uid === v.assigned_to}>
                    ${p.name}${p.is_self ? " (me)" : ""}
                  </option>`,
              )}
            </select>
          </label>

          <label class="wide">
            <span>Note</span>
            <textarea rows="2" .value=${v.note} @input=${input("note")}></textarea>
          </label>
        </div>

        ${candidate
          ? html`<label class="link">
              <input
                type="checkbox"
                .checked=${this.linkPrevious}
                @change=${(e: Event) => (this.linkPrevious = (e.target as HTMLInputElement).checked)}
              />
              <span>
                Link to previous invoice: due ${candidate.due_date
                  ? formatDate(candidate.due_date, this.language)
                  : "–"}${candidate.invoice?.amount
                  ? html` · ${formatMoney(candidate.invoice.amount, candidate.invoice.currency, this.language)}`
                  : nothing}${candidate.done ? " · paid" : ""}
              </span>
            </label>`
          : nothing}

        <div class="actions">
          <span class="hint">Tagged #${s.reminder_tag}</span>
          <button type="button" class="text" @click=${this.cancel}>Cancel</button>
          <button type="submit" class="primary" ?disabled=${!this.valid || this.busy}>
            ${this.busy ? "Saving…" : "Add invoice"}
          </button>
        </div>
      </form>
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }
    form {
      background: var(--card-background-color);
      border: 1px solid var(--primary-color);
      border-radius: 10px;
      padding: 12px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: var(--primary-color);
    }
    .spacer {
      flex: 1;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px 12px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    label.wide {
      grid-column: 1 / -1;
    }
    label.link {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      font-size: 0.9em;
    }
    label.link input {
      width: auto;
    }
    .amount {
      display: flex;
      gap: 6px;
    }
    input,
    select,
    textarea {
      font: inherit;
      font-size: 1rem;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      padding: 8px;
      box-sizing: border-box;
      width: 100%;
      color-scheme: light dark;
    }
    input.currency {
      width: 64px;
      flex: none;
      text-transform: uppercase;
    }
    input.invalid {
      border-color: var(--error-color);
    }
    textarea {
      resize: vertical;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hint {
      flex: 1;
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    button {
      font: inherit;
      cursor: pointer;
    }
    button.icon {
      background: none;
      border: none;
      color: var(--secondary-text-color);
      padding: 4px;
      border-radius: 50%;
      display: inline-flex;
    }
    button.text {
      background: none;
      border: none;
      color: var(--primary-color);
      padding: 6px 12px;
      border-radius: 6px;
    }
    button.primary {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
    }
    button.primary:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `;
}

define("tududi-invoice-form", TududiInvoiceForm);
