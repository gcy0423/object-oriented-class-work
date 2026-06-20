import { escapeHtml } from "../../utils/dom.js";
import { selectStudentAssignmentDetailModel } from "../../state/studentSelectors.js";
import { studentSection } from "./shared.js";

export function studentFeedbackView(state) {
  const model = selectStudentAssignmentDetailModel(state);
  const feedback = model.submissions.flatMap((item) => item.feedback || item.grades || []);
  return studentSection("教师反馈", `
    <ul class="student-plain-list">
      ${feedback.map((item) => `<li>${escapeHtml(item.summary || item.feedback || item.comment || "暂无文字反馈。")}${item.score ? ` · ${escapeHtml(item.score)}分` : ""}</li>`).join("") || "<li>当前还没有反馈。</li>"}
    </ul>
  `);
}
