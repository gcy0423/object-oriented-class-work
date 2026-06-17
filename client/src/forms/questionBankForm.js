import { attr, escapeHtml, buttonLabel } from "../utils/dom.js";

function fieldError(message) {
  return message ? `<small class="field-error">${escapeHtml(message)}</small>` : "";
}

export function questionBankForm({ courses = [], value = {}, errors = {}, saving = false }) {
  return `
    <form class="panel form-grid" data-form="question-bank">
      <input type="hidden" name="id" value="${attr(value.id || "")}" />
      <div class="panel-header"><h2>${value.id ? "编辑题库" : "新建题库"}</h2></div>
      <label>
        <span>题库标题</span>
        <input name="title" value="${attr(value.title || "")}" required />
        ${fieldError(errors.title)}
      </label>
      <label>
        <span>课程</span>
        <select name="courseId" required>
          <option value="">请选择课程</option>
          ${courses.map((course) => `<option value="${attr(course.id)}" ${course.id === value.courseId ? "selected" : ""}>${escapeHtml(course.title)}</option>`).join("")}
        </select>
        ${fieldError(errors.courseId)}
      </label>
      <label>
        <span>题库说明</span>
        <textarea name="description" rows="4">${escapeHtml(value.description || "")}</textarea>
        <small class="helper">说明题库覆盖的知识范围或使用场景。</small>
      </label>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${escapeHtml(buttonLabel("保存题库", "保存中...", saving))}</button>
    </form>
  `;
}
