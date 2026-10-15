import { LitElement, css, html, nothing } from "lit";
import { icon } from "./icons";
import type { Note } from "./types";

export interface NoteSaveDetail {
  uid: string | null;
  title: string;
  content: string;
}

/**
 * List of notes with inline editing. Emits `note-save` ({uid|null, title, content})
 * and `note-delete` ({uid}).
 */
export class TududiNotes extends LitElement {
  static override properties = {
    notes: { attribute: false },
    heading: {},
    canAdd: { type: Boolean, attribute: "can-add" },
    editing: { state: true },
    draftTitle: { state: true },
    draftContent: { state: true },
    expanded: { state: true },
  };

  declare notes: Note[];
  declare heading: string;
  declare canAdd: boolean;
  declare editing: string | null;
  declare draftTitle: string;
  declare draftContent: string;
  declare expanded: Set<string>;

  constructor() {
    super();
    this.notes = [];
    this.heading = "Notes";
    this.canAdd = true;
    this.editing = null;
    this.draftTitle = "";
    this.draftContent = "";
    this.expanded = new Set();
  }

  private startEdit(note: Note | null) {
    this.editing = note ? note.uid : "new";
    this.draftTitle = note?.title ?? "";
    this.draftContent = note?.content ?? "";
  }

  private save() {
    const title = this.draftTitle.trim();
    if (!title) return;
    this.dispatchEvent(
      new CustomEvent<NoteSaveDetail>("note-save", {
        detail: {
          uid: this.editing === "new" ? null : this.editing,
          title,
          content: this.draftContent,
        },
        bubbles: true,
        composed: true,
      }),
    );
    this.editing = null;
  }

  private removeNote(note: Note) {
    if (!confirm(`Delete note "${note.title}"?`)) return;
    this.dispatchEvent(
      new CustomEvent("note-delete", { detail: { uid: note.uid }, bubbles: true, composed: true }),
    );
  }

  private toggle(uid: string) {
    const next = new Set(this.expanded);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    this.expanded = next;
  }

  private renderEditor() {
    return html`
      <div class="editor">
        <input
          class="title-input"
          placeholder="Title"
          .value=${this.draftTitle}
          @input=${(e: InputEvent) => (this.draftTitle = (e.target as HTMLInputElement).value)}
        />
        <textarea
          rows="5"
          placeholder="Write a note…"
          .value=${this.draftContent}
          @input=${(e: InputEvent) =>
            (this.draftContent = (e.target as HTMLTextAreaElement).value)}
        ></textarea>
        <div class="actions">
          <button class="text" @click=${() => (this.editing = null)}>Cancel</button>
          <button class="primary" ?disabled=${!this.draftTitle.trim()} @click=${this.save}>
            Save
          </button>
        </div>
      </div>
    `;
  }

  override render() {
    const sorted = [...this.notes].sort((a, b) =>
      (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
    );
    return html`
      <div class="header">
        <span class="heading">${icon("note", 18)} ${this.heading}</span>
        ${this.canAdd && this.editing !== "new"
          ? html`<button class="text" @click=${() => this.startEdit(null)}>
              ${icon("plus", 18)} Add note
            </button>`
          : nothing}
      </div>
      ${this.editing === "new" ? this.renderEditor() : nothing}
      ${sorted.length === 0 && this.editing !== "new"
        ? html`<div class="empty">No notes yet.</div>`
        : nothing}
      ${sorted.map((note) =>
        this.editing === note.uid
          ? this.renderEditor()
          : html`
              <div class="note">
                <div class="note-head">
                  <button class="note-title" @click=${() => this.toggle(note.uid)}>
                    ${note.title}
                  </button>
                  <button class="icon" title="Edit" @click=${() => this.startEdit(note)}>
                    ${icon("pencil", 18)}
                  </button>
                  <button class="icon" title="Delete" @click=${() => this.removeNote(note)}>
                    ${icon("delete", 18)}
                  </button>
                </div>
                <div class="content ${this.expanded.has(note.uid) ? "expanded" : ""}"
                  @click=${() => this.toggle(note.uid)}>${note.content}</div>
              </div>
            `,
      )}
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .heading {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: var(--secondary-text-color);
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .empty {
      color: var(--secondary-text-color);
      font-size: 0.9em;
      padding: 4px 0 8px;
    }
    .note {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 8px;
      background: var(--card-background-color);
    }
    .note-head {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .note-title {
      flex: 1;
      text-align: left;
      font: inherit;
      font-weight: 500;
      background: none;
      border: none;
      color: var(--primary-text-color);
      padding: 0;
      cursor: pointer;
    }
    .content {
      white-space: pre-wrap;
      color: var(--secondary-text-color);
      font-size: 0.9em;
      margin-top: 4px;
      max-height: 4.5em;
      overflow: hidden;
      cursor: pointer;
    }
    .content.expanded {
      max-height: none;
    }
    .editor {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }
    input,
    textarea {
      font: inherit;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      padding: 8px;
      box-sizing: border-box;
      width: 100%;
    }
    textarea {
      resize: vertical;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    button {
      font: inherit;
      cursor: pointer;
    }
    button.text {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      color: var(--primary-color);
      padding: 4px 6px;
      border-radius: 6px;
    }
    button.primary {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
    }
    button.primary:disabled {
      opacity: 0.5;
      cursor: default;
    }
    button.icon {
      background: none;
      border: none;
      color: var(--secondary-text-color);
      padding: 4px;
      border-radius: 50%;
      display: inline-flex;
    }
    button.icon:hover,
    button.text:hover {
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
    }
  `;
}

customElements.define("tududi-notes", TududiNotes);
