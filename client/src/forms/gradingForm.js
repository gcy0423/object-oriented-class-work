import { attr, escapeHtml, buttonLabel } from "../utils/dom.js";

function fieldError(message) {
  return message ? `<small class="field-error">${escapeHtml(message)}</small>` : "";
}

export function gradingForm({ submission = null, errors = {}, saving = false }) {
  if (!submission) {
    return `<div class="panel">${escapeHtml("选择一条提交后，这里可以填写教师评分。")}</div>`;
  }
  return `
    <form class="panel form-grid" data-form="grade-submission">
      <input type="hidden" name="submissionId" value="${attr(submission.id)}" />
      <div class="panel-header"><h2>教师评分</h2></div>
      <label>
        <span>学生</span>
        <input value="${attr(submission.studentSnapshot?.name || submission.studentId)}" disabled />
      </label>
      <label>
        <span>分数</span>
        <input name="score" type="number" min="0" max="100" value="${attr(submission.grades?.[0]?.score ?? 0)}" required />
        ${fieldError(errors.score)}
      </label>
      <label>
        <span>评分反馈</span>
        <textarea name="feedback" rows="5" required>${escapeHtml(submission.grades?.[0]?.feedback || "")}</textarea>
        <small class="helper">评分反馈会显示在教师详情和学生查看页。</small>
        ${fieldError(errors.feedback)}
      </label>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${escapeHtml(buttonLabel("保存评分", "保存中...", saving))}</button>
    </form>
  `;
}
