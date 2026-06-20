import { attr, escapeHtml } from "../utils/dom.js";

export function studentSubmissionForm({ assignment, draft, saving }) {
  return `
    <form class="student-form-card" data-form="student-submission">
      <input type="hidden" name="assignmentId" value="${attr(assignment?.id || "")}" />
      <label>
        <span>提交正文</span>
        <textarea name="content" rows="12" required>${escapeHtml(draft?.content || "")}</textarea>
      </label>
      <label>
        <span>附件说明</span>
        <textarea name="attachmentsText" rows="4" placeholder="diagram.png: https://...">${escapeHtml(draft?.attachmentsText || "")}</textarea>
      </label>
      <label>
        <span>上传附件</span>
        <input name="attachmentFile" type="file" />
      </label>
      <div class="button-row">
        <button class="btn" type="button" data-action="student-save-submit-draft">保存草稿</button>
        <button class="btn" type="button" data-action="student-check-submission">AI 自检</button>
        <button class="btn primary" type="button" data-action="student-preview-submission">${saving ? "保存中..." : "预览提交"}</button>
      </div>
    </form>
  `;
}
