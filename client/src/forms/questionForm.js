import { attr, escapeHtml, buttonLabel } from "../utils/dom.js";

function fieldError(message) {
  return message ? `<small class="field-error">${escapeHtml(message)}</small>` : "";
}

function choiceEditor(choices = []) {
  return `
    <fieldset class="choice-editor">
      <legend>选项</legend>
      ${["A", "B", "C", "D"].map((id) => {
        const choice = choices.find((item) => item.id === id) || { id, text: "" };
        return `
          <label>
            <span>${id}</span>
            <input name="choice_${id}" value="${attr(choice.text || "")}" />
          </label>
        `;
      }).join("")}
    </fieldset>
  `;
}

export function questionForm({ banks = [], courses = [], value = {}, errors = {}, saving = false }) {
  const type = value.type || "single_choice";
  return `
    <form class="panel form-grid" data-form="question">
      <input type="hidden" name="id" value="${attr(value.id || "")}" />
      <div class="panel-header"><h2>${value.id ? "编辑题目" : "新建题目"}</h2></div>
      <label>
        <span>题库</span>
        <select name="bankId" required>
          <option value="">请选择题库</option>
          ${banks.map((bank) => `<option value="${attr(bank.id)}" ${bank.id === value.bankId ? "selected" : ""}>${escapeHtml(bank.title)}</option>`).join("")}
        </select>
        ${fieldError(errors.bankId)}
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
        <span>题型</span>
        <select name="type">
          <option value="single_choice" ${type === "single_choice" ? "selected" : ""}>单选题</option>
          <option value="multiple_choice" ${type === "multiple_choice" ? "selected" : ""}>多选题</option>
          <option value="short_answer" ${type === "short_answer" ? "selected" : ""}>简答题</option>
          <option value="code_reading" ${type === "code_reading" ? "selected" : ""}>代码阅读题</option>
        </select>
        ${fieldError(errors.type)}
      </label>
      <label>
        <span>题干</span>
        <textarea name="stem" rows="5" required>${escapeHtml(value.stem || "")}</textarea>
        <small class="helper">题干应清楚说明作答要求。</small>
        ${fieldError(errors.stem)}
      </label>
      ${type === "short_answer" || type === "code_reading" ? "" : choiceEditor(value.choices || [])}
      <label>
        <span>参考答案</span>
        <input name="answer" value="${attr(Array.isArray(value.answer) ? value.answer.join(",") : value.answer || "")}" required />
        <small class="helper">多选题用英文逗号分隔，例如 A,C。</small>
        ${fieldError(errors.answer)}
      </label>
      <label>
        <span>答案解析</span>
        <textarea name="analysis" rows="4" required>${escapeHtml(value.analysis || "")}</textarea>
        ${fieldError(errors.analysis)}
      </label>
      <label>
        <span>知识点</span>
        <input name="concept" value="${attr(value.concept || value.concepts?.join(",") || "")}" />
        <small class="helper">可用逗号填写一个或多个知识点。</small>
      </label>
      <label>
        <span>难度</span>
        <select name="difficulty">
          <option value="easy" ${value.difficulty === "easy" ? "selected" : ""}>简单</option>
          <option value="medium" ${value.difficulty === "medium" || !value.difficulty ? "selected" : ""}>中等</option>
          <option value="hard" ${value.difficulty === "hard" ? "selected" : ""}>困难</option>
        </select>
      </label>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${escapeHtml(buttonLabel("保存题目", "保存中...", saving))}</button>
    </form>
  `;
}
