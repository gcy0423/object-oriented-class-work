# v6 代码蓝图

本文件给实现者提供更高代码量的落地骨架。代码片段不是最终实现，但命名、模块边界和 DTO 应尽量沿用。

## 1. 工具层

### `client/src/utils/dom.js`

```js
export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function attr(value) {
  return escapeHtml(value);
}

export function readFormData(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

export function readCheckedValues(form, name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((item) => item.value);
}

export function formatDate(value) {
  if (!value) {
    return "未设置";
  }
  return String(value).slice(0, 10);
}

export function buttonLabel(label, loadingLabel, isLoading) {
  return isLoading ? loadingLabel : label;
}
```

### `client/src/utils/query.js`

```js
export function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const value = search.toString();
  return value ? `?${value}` : "";
}
```

### `client/src/utils/validation.js`

```js
export function required(value, message) {
  return String(value ?? "").trim() ? "" : message;
}

export function minNumber(value, min, message) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min ? "" : message;
}

export function validateAssignment(input) {
  return {
    title: required(input.title, "请输入作业标题。"),
    courseId: required(input.courseId, "请选择课程。"),
    dueAt: required(input.dueAt, "请选择截止日期。")
  };
}

export function validateQuestion(input) {
  return {
    stem: required(input.stem, "请输入题干。"),
    type: required(input.type, "请选择题型。"),
    answer: required(input.answer, "请输入参考答案。"),
    analysis: required(input.analysis, "请输入答案解析。")
  };
}

export function compactErrors(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => value));
}
```

## 2. 状态层

### `client/src/state/selectors.js`

```js
export function canManageAssessment(user) {
  return user?.role === "teacher" || user?.role === "admin";
}

export function canViewAnalytics(user) {
  return user?.role === "teacher" || user?.role === "admin";
}

export function selectAssignments(state) {
  const filters = state.filters.assignments;
  return (state.assessment.assignments || []).filter((assignment) => {
    const keyword = filters.keyword.trim().toLowerCase();
    return (!filters.courseId || assignment.courseId === filters.courseId)
      && (!filters.status || assignment.status === filters.status)
      && (!keyword || `${assignment.title} ${assignment.description}`.toLowerCase().includes(keyword));
  });
}

export function selectQuestionBanks(state) {
  const filters = state.filters.questionBanks;
  return (state.assessment.questionBanks || []).filter((bank) => {
    const keyword = filters.keyword.trim().toLowerCase();
    return (!filters.courseId || bank.courseId === filters.courseId)
      && (!keyword || `${bank.title} ${bank.description}`.toLowerCase().includes(keyword));
  });
}

export function selectQuestionsForBank(state) {
  const bankId = state.selected.questionBankId;
  const filters = state.filters.questionBanks;
  return (state.assessment.questions || []).filter((question) => {
    return (!bankId || question.bankId === bankId)
      && (!filters.type || question.type === filters.type)
      && (!filters.difficulty || question.difficulty === filters.difficulty);
  });
}

export function selectPracticeProgress(session) {
  const questions = session?.questions || [];
  const answers = session?.answers || [];
  return {
    total: questions.length,
    answered: answers.length,
    percent: questions.length ? Math.round((answers.length / questions.length) * 100) : 0
  };
}
```

## 3. Widget 层

### `client/src/widgets/tables.js`

```js
import { escapeHtml } from "../utils/dom.js";

export function dataTable({ columns, rows, emptyText = "暂无数据。" }) {
  if (!rows.length) {
    return `<div class="empty-state"><p class="muted">${escapeHtml(emptyText)}</p></div>`;
  }

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map((column) => `<td>${column.render ? column.render(row) : escapeHtml(row[column.key] ?? "-")}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
```

### `client/src/widgets/charts.js`

```js
import { escapeHtml } from "../utils/dom.js";

export function horizontalBars(items = [], { max = 100, label = "value" } = {}) {
  if (!items.length) {
    return `<div class="empty-state"><p class="muted">暂无统计数据。</p></div>`;
  }
  return `
    <div class="bar-list" role="list" aria-label="${escapeHtml(label)}">
      ${items.map((item) => {
        const value = Math.max(0, Math.min(max, Number(item.value || 0)));
        return `
          <div class="bar-row" role="listitem">
            <div class="bar-row__head">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(value)}%</strong>
            </div>
            <div class="bar-track" aria-hidden="true">
              <span class="bar-fill" style="width:${value}%"></span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}
```

### `client/src/widgets/filters.js`

```js
import { escapeHtml } from "../utils/dom.js";

export function filterToolbar({ name, fields, actions = [] }) {
  return `
    <form class="filter-toolbar" data-form="${escapeHtml(name)}">
      ${fields.map((field) => `
        <label>
          <span>${escapeHtml(field.label)}</span>
          ${field.type === "select" ? `
            <select name="${escapeHtml(field.name)}">
              ${(field.options || []).map((option) => `
                <option value="${escapeHtml(option.value)}" ${option.value === field.value ? "selected" : ""}>${escapeHtml(option.label)}</option>
              `).join("")}
            </select>
          ` : `
            <input name="${escapeHtml(field.name)}" value="${escapeHtml(field.value || "")}" placeholder="${escapeHtml(field.placeholder || "")}" />
          `}
        </label>
      `).join("")}
      <div class="filter-actions">
        <button class="btn" type="submit">筛选</button>
        ${actions.join("")}
      </div>
    </form>
  `;
}
```

## 4. 表单层

### `client/src/forms/assignmentForm.js`

```js
import { escapeHtml } from "../utils/dom.js";

export function assignmentForm({ courses = [], rubrics = [], value = {}, errors = {}, saving = false }) {
  return `
    <form class="panel form-grid" data-form="assignment">
      <input type="hidden" name="id" value="${escapeHtml(value.id || "")}" />
      <div class="panel-header">
        <h2>${value.id ? "编辑作业" : "发布作业"}</h2>
      </div>
      <label>
        <span>作业标题</span>
        <input name="title" value="${escapeHtml(value.title || "")}" required />
        ${fieldError(errors.title)}
      </label>
      <label>
        <span>课程</span>
        <select name="courseId" required>
          <option value="">请选择课程</option>
          ${courses.map((course) => `<option value="${escapeHtml(course.id)}" ${course.id === value.courseId ? "selected" : ""}>${escapeHtml(course.title)}</option>`).join("")}
        </select>
        ${fieldError(errors.courseId)}
      </label>
      <label>
        <span>说明</span>
        <textarea name="description" rows="4">${escapeHtml(value.description || "")}</textarea>
      </label>
      <label>
        <span>截止日期</span>
        <input name="dueAt" type="date" value="${escapeHtml(String(value.dueAt || "").slice(0, 10))}" required />
        ${fieldError(errors.dueAt)}
      </label>
      <label>
        <span>评分规则</span>
        <select name="rubricId">
          <option value="">不绑定评分规则</option>
          ${rubrics.map((rubric) => `<option value="${escapeHtml(rubric.id)}" ${rubric.id === value.rubricId ? "selected" : ""}>${escapeHtml(rubric.title)}</option>`).join("")}
        </select>
      </label>
      <label>
        <span>状态</span>
        <select name="status">
          <option value="draft" ${value.status === "draft" ? "selected" : ""}>草稿</option>
          <option value="published" ${value.status === "published" ? "selected" : ""}>发布</option>
          <option value="closed" ${value.status === "closed" ? "selected" : ""}>关闭</option>
        </select>
      </label>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${saving ? "保存中..." : "保存作业"}</button>
    </form>
  `;
}

function fieldError(message) {
  return message ? `<small class="field-error">${escapeHtml(message)}</small>` : "";
}
```

### `client/src/forms/questionForm.js`

```js
import { escapeHtml } from "../utils/dom.js";

export function questionForm({ banks = [], value = {}, errors = {}, saving = false }) {
  const type = value.type || "single_choice";
  return `
    <form class="panel form-grid" data-form="question">
      <input type="hidden" name="id" value="${escapeHtml(value.id || "")}" />
      <label>
        <span>题库</span>
        <select name="bankId" required>
          ${banks.map((bank) => `<option value="${escapeHtml(bank.id)}" ${bank.id === value.bankId ? "selected" : ""}>${escapeHtml(bank.title)}</option>`).join("")}
        </select>
      </label>
      <label>
        <span>题型</span>
        <select name="type" data-action="question-type-change">
          <option value="single_choice" ${type === "single_choice" ? "selected" : ""}>单选题</option>
          <option value="multiple_choice" ${type === "multiple_choice" ? "selected" : ""}>多选题</option>
          <option value="short_answer" ${type === "short_answer" ? "selected" : ""}>简答题</option>
          <option value="code_reading" ${type === "code_reading" ? "selected" : ""}>代码阅读题</option>
        </select>
      </label>
      <label>
        <span>题干</span>
        <textarea name="stem" rows="5" required>${escapeHtml(value.stem || "")}</textarea>
        ${fieldError(errors.stem)}
      </label>
      ${choiceEditor(value.choices || [])}
      <label>
        <span>参考答案</span>
        <input name="answer" value="${escapeHtml(Array.isArray(value.answer) ? value.answer.join(",") : value.answer || "")}" required />
        <small class="helper">多选题用英文逗号分隔，例如 A,C。</small>
        ${fieldError(errors.answer)}
      </label>
      <label>
        <span>答案解析</span>
        <textarea name="analysis" rows="4" required>${escapeHtml(value.analysis || "")}</textarea>
        ${fieldError(errors.analysis)}
      </label>
      <label>
        <span>难度</span>
        <select name="difficulty">
          <option value="easy" ${value.difficulty === "easy" ? "selected" : ""}>简单</option>
          <option value="medium" ${value.difficulty === "medium" ? "selected" : ""}>中等</option>
          <option value="hard" ${value.difficulty === "hard" ? "selected" : ""}>困难</option>
        </select>
      </label>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${saving ? "保存中..." : "保存题目"}</button>
    </form>
  `;
}

function choiceEditor(choices) {
  return `
    <fieldset class="choice-editor">
      <legend>选项</legend>
      ${["A", "B", "C", "D"].map((id) => {
        const choice = choices.find((item) => item.id === id) || { id, text: "" };
        return `
          <label>
            <span>${id}</span>
            <input name="choice_${id}" value="${escapeHtml(choice.text)}" />
          </label>
        `;
      }).join("")}
    </fieldset>
  `;
}

function fieldError(message) {
  return message ? `<small class="field-error">${escapeHtml(message)}</small>` : "";
}
```

## 5. 页面层

### `client/src/views/assignmentManageView.js`

```js
import { assignmentForm } from "../forms/assignmentForm.js";
import { gradingForm } from "../forms/gradingForm.js";
import { filterToolbar } from "../widgets/filters.js";
import { dataTable } from "../widgets/tables.js";
import { statusBadge } from "../widgets/cards.js";
import { canManageAssessment, selectAssignments } from "../state/selectors.js";
import { escapeHtml, formatDate } from "../utils/dom.js";

export function assignmentManageView(state) {
  const canManage = canManageAssessment(state.user);
  const assignments = selectAssignments(state);
  const detail = state.assessment.assignmentDetail;

  return `
    <section class="workbench-grid">
      <div class="workbench-main">
        ${filterToolbar({
          name: "assignment-filter",
          fields: [
            { type: "input", name: "keyword", label: "关键字", value: state.filters.assignments.keyword },
            { type: "select", name: "status", label: "状态", value: state.filters.assignments.status, options: assignmentStatusOptions() },
            { type: "select", name: "courseId", label: "课程", value: state.filters.assignments.courseId, options: courseOptions(state.dashboard?.courses || []) }
          ],
          actions: canManage ? [`<button class="btn primary" type="button" data-action="new-assignment">新建作业</button>`] : []
        })}
        <div class="panel">
          <div class="panel-header"><h2>作业列表</h2></div>
          ${assignmentTable(assignments, canManage)}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>作业详情</h2></div>
          ${assignmentDetailPanel(detail, state.user.role)}
        </div>
      </div>
      <aside class="workbench-side">
        ${canManage ? assignmentForm({
          courses: state.dashboard?.courses || [],
          rubrics: state.assessment.rubrics || [],
          value: state.draft.assignment || {},
          errors: state.errors.assignment || {},
          saving: state.saving.assignment
        }) : studentSubmitPanel(detail, state.saving.assignment)}
      </aside>
    </section>
  `;
}

function assignmentTable(assignments, canManage) {
  return dataTable({
    columns: [
      { key: "title", label: "标题", render: (row) => `<button class="link-button" data-action="select-assignment" data-id="${escapeHtml(row.id)}">${escapeHtml(row.title)}</button>` },
      { key: "status", label: "状态", render: (row) => statusBadge(row.status || "draft") },
      { key: "dueAt", label: "截止", render: (row) => escapeHtml(formatDate(row.dueAt)) },
      { key: "submitted", label: "提交", render: (row) => escapeHtml(row.submissionSummary?.submitted ?? row.submitted ?? 0) },
      { key: "actions", label: "操作", render: (row) => canManage ? rowActions(row) : `<button class="btn small" data-action="select-assignment" data-id="${escapeHtml(row.id)}">查看</button>` }
    ],
    rows: assignments,
    emptyText: "没有符合筛选条件的作业。"
  });
}
```

### `client/src/views/practiceView.js`

```js
import { horizontalBars } from "../widgets/charts.js";
import { dataTable } from "../widgets/tables.js";
import { selectPracticeProgress } from "../state/selectors.js";
import { escapeHtml } from "../utils/dom.js";

export function practiceView(state) {
  const session = state.assessment.practiceSession;
  const progress = selectPracticeProgress(session);
  return `
    <section class="practice-layout">
      <div class="panel">
        <div class="panel-header"><h2>练习入口</h2></div>
        ${questionBankCards(state.assessment.questionBanks || [])}
      </div>
      <div class="panel">
        <div class="panel-header">
          <h2>当前练习</h2>
          <span class="tag">已答 ${escapeHtml(progress.answered)} / ${escapeHtml(progress.total)}</span>
        </div>
        ${horizontalBars([{ label: "练习进度", value: progress.percent }], { label: "练习进度" })}
        ${answerSheet(session)}
        ${questionRunner(session, state.saving.practiceAnswer)}
      </div>
      <div class="panel">
        <div class="panel-header"><h2>错题回放</h2></div>
        ${mistakeReplay(state.assessment.mistakes || [])}
      </div>
      <div class="panel">
        <div class="panel-header"><h2>练习历史</h2></div>
        ${practiceHistoryTable(state.assessment.practiceHistory || [])}
      </div>
    </section>
  `;
}
```

## 6. CSS 增量

```css
.workbench-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
  gap: 16px;
  align-items: start;
}

.filter-toolbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  gap: 12px;
  align-items: end;
  padding: 14px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  margin-bottom: 16px;
}

.filter-toolbar label,
.form-grid label {
  display: grid;
  gap: 6px;
  color: var(--ink);
  font-weight: 600;
}

.filter-toolbar input,
.filter-toolbar select,
.form-grid input,
.form-grid select,
.form-grid textarea {
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 9px 11px;
  background: #fff;
  color: var(--ink);
}

.field-error {
  color: var(--danger);
  font-weight: 500;
}

.helper {
  color: var(--muted);
  font-weight: 400;
}

.bar-list {
  display: grid;
  gap: 12px;
}

.bar-row {
  display: grid;
  gap: 6px;
}

.bar-row__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
}

.bar-track {
  height: 10px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  background: var(--accent);
}

.answer-sheet {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 8px;
  margin: 16px 0;
}

.answer-sheet button {
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

.answer-sheet button.answered {
  border-color: var(--accent);
  background: var(--success-soft);
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.health-item {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

@media (max-width: 980px) {
  .workbench-grid {
    grid-template-columns: 1fr;
  }

  .filter-toolbar {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .filter-toolbar {
    grid-template-columns: 1fr;
  }

  .data-table {
    min-width: 720px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
