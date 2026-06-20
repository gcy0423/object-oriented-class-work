import { escapeHtml } from "../../utils/dom.js";
import { studentSubmissionForm } from "../../forms/studentSubmissionForm.js";
import { selectStudentSubmitModel } from "../../state/studentSelectors.js";
import { aiResultBlock, emptyBlock, studentSection } from "./shared.js";

export function studentSubmitView(state) {
  const model = selectStudentSubmitModel(state);
  if (!model.assignment) {
    return studentSection("提交作业", emptyBlock("未找到作业上下文，返回作业详情后再进入提交页。"));
  }
  return `
    <section class="student-detail-layout">
      <div class="student-page-grid">
        ${studentSection("提交内容", studentSubmissionForm({ assignment: model.assignment, draft: model.draft, saving: state.saving.studentSubmission }))}
        ${studentSection("附件预览", `
          <ul class="student-plain-list">
            ${model.draft.attachments.map((item) => `<li>${escapeHtml(item.name || "")}${item.url ? ` · ${escapeHtml(item.url)}` : ""}</li>`).join("") || "<li>当前没有附件说明。</li>"}
          </ul>
        `)}
      </div>
      ${studentSection("AI 自检结果", aiResultBlock(model.check, { emptyText: "点击“AI 自检”后，这里会显示结构化检查结果。" }))}
    </section>
  `;
}
