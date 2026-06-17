import { assignmentForm } from "../forms/assignmentForm.js";
import { gradingForm } from "../forms/gradingForm.js";
import { selectAssignmentViewModel } from "../state/selectors.js";
import { attr, escapeHtml } from "../utils/dom.js";
import { formatDate, formatDateTime } from "../utils/format.js";
import { emptyState, statusBadge } from "../widgets/cards.js";
import { filterToolbar } from "../widgets/filters.js";
import { dataTable } from "../widgets/tables.js";

function assignmentStatusOptions() {
  return [
    { value: "", label: "全部状态" },
    { value: "draft", label: "草稿" },
    { value: "published", label: "已发布" },
    { value: "closed", label: "已关闭" }
  ];
}

function courseOptions(courses) {
  return [{ value: "", label: "全部课程" }, ...courses.map((course) => ({ value: course.id, label: course.title }))];
}

function submissionTable(detail, canManage) {
  const submissions = detail?.submissions || [];
  return dataTable({
    columns: [
      { key: "student", label: "学生", render: (row) => escapeHtml(row.studentSnapshot?.name || row.studentId) },
      { key: "status", label: "状态", render: (row) => statusBadge(row.status || "submitted") },
      { key: "submittedAt", label: "提交时间", render: (row) => escapeHtml(formatDateTime(row.submittedAt)) },
      { key: "score", label: "分数", render: (row) => escapeHtml(row.grades?.[0]?.score ?? "-") },
      { key: "feedback", label: "反馈", render: (row) => escapeHtml(row.feedback?.[0]?.summary || row.grades?.[0]?.feedback || "-") },
      { key: "actions", label: "操作", render: (row) => canManage ? `
        <div class="inline-actions">
          <button class="btn small" data-action="prefill-grade" data-id="${attr(row.id)}">评分</button>
          <button class="btn small" data-action="ai-review-submission" data-id="${attr(row.id)}">AI 初评</button>
        </div>
      ` : "-" }
    ],
    rows: submissions,
    emptyText: canManage ? "当前没有学生提交。" : "你还没有提交这份作业。"
  });
}

function assignmentDetailPanel(detail, canManage) {
  if (!detail?.assignment) {
    return emptyState("选择一份作业后，这里会显示说明、评分规则和提交列表。");
  }
  const assignment = detail.assignment;
  return `
    <div class="detail-block">
      <h3>${escapeHtml(assignment.title)}</h3>
      <p class="muted">${escapeHtml(assignment.description || "暂无作业说明。")}</p>
      <div class="tag-row">
        ${statusBadge(assignment.status || "published")}
        <span class="tag">截止 ${escapeHtml(formatDate(assignment.dueAt))}</span>
        <span class="tag">提交 ${escapeHtml(detail.submissionSummary?.submitted ?? 0)}</span>
        <span class="tag">已评分 ${escapeHtml(detail.submissionSummary?.graded ?? 0)}</span>
      </div>
    </div>
    ${detail.rubric ? `
      <div class="subpanel">
        <strong>评分规则</strong>
        <ul class="plain-list">${(detail.rubric.criteria || []).map((item) => `<li>${escapeHtml(item.title)} · ${escapeHtml(item.maxScore)} 分</li>`).join("")}</ul>
      </div>
    ` : ""}
    <div class="subpanel">
      <strong>${canManage ? "提交列表" : "我的提交"}</strong>
      ${submissionTable(detail, canManage)}
    </div>
  `;
}

function assignmentTable(assignments, canManage) {
  return dataTable({
    columns: [
      { key: "title", label: "标题", render: (row) => `<button class="link-button" data-action="select-assignment" data-id="${attr(row.id)}">${escapeHtml(row.title)}</button>` },
      { key: "courseId", label: "课程", render: (row) => escapeHtml(row.courseId) },
      { key: "status", label: "状态", render: (row) => statusBadge(row.status || "published") },
      { key: "dueAt", label: "截止", render: (row) => escapeHtml(formatDate(row.dueAt)) },
      { key: "submitted", label: "提交数", render: (row) => escapeHtml(row.submissionSummary?.submitted ?? row.submitted ?? 0) },
      { key: "actions", label: "操作", render: (row) => canManage ? `
        <div class="inline-actions">
          <button class="btn small" data-action="select-assignment" data-id="${attr(row.id)}">详情</button>
          <button class="btn small" data-action="edit-assignment" data-id="${attr(row.id)}">编辑</button>
          <button class="btn small danger-button" data-action="delete-assignment" data-id="${attr(row.id)}">删除</button>
        </div>
      ` : `<button class="btn small" data-action="select-assignment" data-id="${attr(row.id)}">查看</button>` }
    ],
    rows: assignments,
    emptyText: "没有符合条件的作业。"
  });
}

function submissionForm(detail, saving) {
  const assignment = detail?.assignment;
  if (!assignment) {
    return `<div class="panel">${emptyState("选择作业后可以在这里提交内容。")}</div>`;
  }
  return `
    <form class="panel form-grid" data-form="assignment-submission">
      <input type="hidden" name="assignmentId" value="${attr(assignment.id)}" />
      <div class="panel-header"><h2>提交作业</h2></div>
      <label>
        <span>提交内容</span>
        <textarea name="content" rows="8" required></textarea>
        <small class="helper">本阶段不接入附件上传，先提交文本说明。</small>
      </label>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${saving ? "提交中..." : "提交作业"}</button>
    </form>
  `;
}

export function assignmentManageView(state) {
  const vm = selectAssignmentViewModel(state);
  return `
    <section class="workbench-grid">
      <div class="workbench-main">
        ${filterToolbar({
          name: "assignment-filter",
          fields: [
            { type: "input", name: "keyword", label: "关键字", value: state.filters.assignments.keyword, placeholder: "标题或说明" },
            { type: "select", name: "status", label: "状态", value: state.filters.assignments.status, options: assignmentStatusOptions() },
            { type: "select", name: "courseId", label: "课程", value: state.filters.assignments.courseId, options: courseOptions(vm.courses) }
          ],
          actions: vm.canManage ? [`<button class="btn primary" type="button" data-action="new-assignment">新建作业</button>`] : []
        })}
        <div class="panel"><div class="panel-header"><h2>作业列表</h2></div>${assignmentTable(vm.assignments, vm.canManage)}</div>
        <div class="panel"><div class="panel-header"><h2>作业详情</h2></div>${assignmentDetailPanel(vm.detail, vm.canManage)}</div>
      </div>
      <aside class="workbench-side">
        ${vm.canManage
          ? assignmentForm({ courses: vm.courses, rubrics: vm.rubrics, value: state.draft.assignment || {}, errors: state.errors.assignment || {}, saving: state.saving.assignment })
          : submissionForm(vm.detail, state.saving.submission)}
        ${vm.canManage ? gradingForm({ submission: state.draft.grade, errors: state.errors.grade || {}, saving: state.saving.grading }) : ""}
      </aside>
    </section>
  `;
}
