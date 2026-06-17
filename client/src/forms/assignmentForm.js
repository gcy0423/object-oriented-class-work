import { attr, escapeHtml } from "../utils/dom.js";
import { buttonLabel, } from "../utils/dom.js";

function fieldError(message) {
  return message ? `<small class="field-error">${escapeHtml(message)}</small>` : "";
}

export function assignmentForm({ courses = [], rubrics = [], value = {}, errors = {}, saving = false }) {
  return `
    <form class="panel form-grid" data-form="assignment">
      <input type="hidden" name="id" value="${attr(value.id || "")}" />
      <div class="panel-header"><h2>${value.id ? "编辑作业" : "发布作业"}</h2></div>
      <label>
        <span>作业标题</span>
        <input name="title" value="${attr(value.title || "")}" required />
        <small class="helper">标题会显示在作业列表和学生端详情中。</small>
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
        <span>评分规则</span>
        <select name="rubricId" required>
          <option value="">请选择评分规则</option>
          ${rubrics.map((rubric) => `<option value="${attr(rubric.id)}" ${rubric.id === value.rubricId ? "selected" : ""}>${escapeHtml(rubric.title)}</option>`).join("")}
        </select>
        <small class="helper">v6 继续复用已有 Rubric 接口。</small>
        ${fieldError(errors.rubricId)}
      </label>
      <label>
        <span>截止日期</span>
        <input name="dueAt" type="date" value="${attr(String(value.dueAt || "").slice(0, 10))}" required />
        ${fieldError(errors.dueAt)}
      </label>
      <label>
        <span>状态</span>
        <select name="status">
          <option value="draft" ${value.status === "draft" ? "selected" : ""}>草稿</option>
          <option value="published" ${value.status === "published" || !value.status ? "selected" : ""}>已发布</option>
          <option value="closed" ${value.status === "closed" ? "selected" : ""}>已关闭</option>
        </select>
      </label>
      <label>
        <span>作业说明</span>
        <textarea name="description" rows="5">${escapeHtml(value.description || "")}</textarea>
        <small class="helper">支持教师补充提交要求、评分提示和范围说明。</small>
      </label>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${escapeHtml(buttonLabel("保存作业", "保存中...", saving))}</button>
    </form>
  `;
}
