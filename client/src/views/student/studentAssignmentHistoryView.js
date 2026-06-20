import { escapeHtml } from "../../utils/dom.js";
import { selectStudentAssignmentDetailModel } from "../../state/studentSelectors.js";
import { studentSection } from "./shared.js";

export function studentAssignmentHistoryView(state) {
  const model = selectStudentAssignmentDetailModel(state);
  return studentSection("作业历史", `
    <ul class="student-plain-list">
      ${model.submissions.map((item) => `<li>${escapeHtml(item.submittedAt || item.updatedAt || "")} · ${escapeHtml(item.content?.slice(0, 80) || "已提交")}</li>`).join("") || "<li>当前没有历史提交记录。</li>"}
    </ul>
  `);
}
