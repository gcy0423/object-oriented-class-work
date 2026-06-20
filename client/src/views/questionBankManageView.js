import { questionBankForm } from "../forms/questionBankForm.js";
import { questionForm } from "../forms/questionForm.js";
import { selectQuestionBankViewModel } from "../state/selectors.js";
import { attr, escapeHtml } from "../utils/dom.js";
import { emptyState, statusBadge } from "../widgets/cards.js";
import { filterToolbar } from "../widgets/filters.js";
import { dataTable } from "../widgets/tables.js";

function courseOptions(courses) {
  return [{ value: "", label: "全部课程" }, ...courses.map((course) => ({ value: course.id, label: course.title }))];
}

function typeOptions() {
  return [
    { value: "", label: "全部题型" },
    { value: "single_choice", label: "单选题" },
    { value: "multiple_choice", label: "多选题" },
    { value: "short_answer", label: "简答题" },
    { value: "code_reading", label: "代码阅读题" }
  ];
}

function difficultyOptions() {
  return [
    { value: "", label: "全部难度" },
    { value: "easy", label: "简单" },
    { value: "medium", label: "中等" },
    { value: "hard", label: "困难" }
  ];
}

function banksTable(banks) {
  return dataTable({
    columns: [
      { key: "title", label: "题库", render: (row) => `<button class="link-button" data-action="select-bank" data-id="${attr(row.id)}">${escapeHtml(row.title)}</button>` },
      { key: "courseId", label: "课程", render: (row) => escapeHtml(row.courseTitle || row.courseId) },
      { key: "description", label: "说明", render: (row) => escapeHtml(row.description || "-") },
      { key: "actions", label: "操作", render: (row) => `
        <div class="inline-actions">
          <button class="btn small" data-action="edit-bank" data-id="${attr(row.id)}">编辑</button>
          <button class="btn small danger-button" data-action="delete-bank" data-id="${attr(row.id)}">删除</button>
        </div>
      ` }
    ],
    rows: banks,
    emptyText: "当前没有题库。"
  });
}

function questionsTable(questions) {
  return dataTable({
    columns: [
      { key: "stem", label: "题干", render: (row) => `<button class="link-button" data-action="edit-question" data-id="${attr(row.id)}">${escapeHtml(row.stem)}</button>` },
      { key: "type", label: "题型", render: (row) => statusBadge(row.type) },
      { key: "difficulty", label: "难度", render: (row) => escapeHtml(row.difficulty || "-") },
      { key: "analysis", label: "解析", render: (row) => escapeHtml(row.analysis || "-") },
      { key: "actions", label: "操作", render: (row) => `
        <div class="inline-actions">
          <button class="btn small" data-action="edit-question" data-id="${attr(row.id)}">编辑</button>
          <button class="btn small danger-button" data-action="delete-question" data-id="${attr(row.id)}">删除</button>
        </div>
      ` }
    ],
    rows: questions,
    emptyText: "当前筛选条件下没有题目。"
  });
}

export function questionBankManageView(state) {
  const vm = selectQuestionBankViewModel(state);
  if (!vm.canManage) {
    return `<div class="panel">${emptyState("学生视角不显示题库管理。")}</div>`;
  }
  return `
    <section class="workbench-grid">
      <div class="workbench-main">
        ${filterToolbar({
          name: "question-bank-filter",
          fields: [
            { type: "input", name: "keyword", label: "关键字", value: state.filters.questionBanks.keyword, placeholder: "题库标题、题干、解析" },
            { type: "select", name: "courseId", label: "课程", value: state.filters.questionBanks.courseId, options: courseOptions(vm.courses) },
            { type: "select", name: "type", label: "题型", value: state.filters.questionBanks.type, options: typeOptions() },
            { type: "select", name: "difficulty", label: "难度", value: state.filters.questionBanks.difficulty, options: difficultyOptions() }
          ],
          actions: [`<button class="btn primary" type="button" data-action="new-bank">新建题库</button>`, `<button class="btn primary" type="button" data-action="new-question">新建题目</button>`]
        })}
        <div class="panel"><div class="panel-header"><h2>题库列表</h2></div>${banksTable(vm.banks)}</div>
        <div class="panel"><div class="panel-header"><h2>${escapeHtml(vm.selectedBank?.title || "题目列表")}</h2></div>${questionsTable(vm.questions)}</div>
      </div>
      <aside class="workbench-side">
        ${questionBankForm({ courses: vm.courses, value: state.draft.questionBank || {}, errors: state.errors.questionBank || {}, saving: state.saving.questionBank })}
        ${questionForm({ banks: vm.banks, courses: vm.courses, value: state.draft.question || {}, errors: state.errors.question || {}, saving: state.saving.question })}
      </aside>
    </section>
  `;
}
