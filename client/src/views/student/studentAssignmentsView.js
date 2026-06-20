import { escapeHtml } from "../../utils/dom.js";
import { selectStudentAssignmentsModel } from "../../state/studentSelectors.js";
import { assignmentCard, listCards, studentSection } from "./shared.js";

function modeTabs(mode) {
  return `
    <div class="student-tab-row">
      <button class="student-tab ${mode === "course" ? "is-active" : ""}" data-action="student-set-assignment-mode" data-mode="course">按课程</button>
      <button class="student-tab ${mode === "calendar" ? "is-active" : ""}" data-action="student-set-assignment-mode" data-mode="calendar">按日历</button>
      <button class="student-tab ${mode === "deadline" ? "is-active" : ""}" data-action="student-set-assignment-mode" data-mode="deadline">按截止时间</button>
    </div>
  `;
}

export function studentAssignmentsView(state) {
  const model = selectStudentAssignmentsModel(state);
  const body = model.mode === "calendar"
    ? model.calendarDays.map((day) => `<section><h4>${escapeHtml(day.date || "")}</h4>${listCards(day.assignments, assignmentCard)}</section>`).join("")
    : model.mode === "deadline"
      ? listCards(model.deadlineList.map((item) => ({ ...item, urgency: item.urgency || "medium" })), assignmentCard)
      : model.byCourse.map((group) => `<section><h4>${escapeHtml(group.courseTitle || "")}</h4>${listCards(group.assignments, assignmentCard)}</section>`).join("");
  return `
    <section class="student-page-grid">
      ${studentSection("作业三视图", `${modeTabs(model.mode)}<div class="student-stack">${body || '<div class="student-empty">当前没有作业。</div>'}</div>`)}
    </section>
  `;
}
