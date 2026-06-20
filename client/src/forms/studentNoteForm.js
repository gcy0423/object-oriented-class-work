import { attr, escapeHtml } from "../utils/dom.js";

export function studentNoteForm({ draft = {}, saving = false, noteId = "" }) {
  return `
    <form class="student-form-card" data-form="student-note-editor">
      <label>
        <span>标题</span>
        <input name="title" value="${attr(draft.title || "")}" required />
      </label>
      <label>
        <span>标签</span>
        <input name="tags" value="${attr(draft.tags || "")}" placeholder="UML, 复习" />
      </label>
      <label>
        <span>内容</span>
        <textarea name="content" rows="14" required>${escapeHtml(draft.content || "")}</textarea>
      </label>
      <div class="button-row">
        <button class="btn" type="button" data-action="student-organize-note">AI 整理</button>
        ${noteId ? `<button class="btn" type="button" data-action="student-delete-note" data-id="${attr(noteId)}">删除</button>` : ""}
        <button class="btn primary" type="submit">${saving ? "保存中..." : "保存笔记"}</button>
      </div>
    </form>
  `;
}
