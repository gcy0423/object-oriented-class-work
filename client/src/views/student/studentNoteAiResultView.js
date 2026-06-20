import { escapeHtml } from "../../utils/dom.js";
import { selectStudentNotesModel } from "../../state/studentSelectors.js";
import { aiResultBlock, studentSection } from "./shared.js";

export function studentNoteAiResultView(state) {
  const model = selectStudentNotesModel(state);
  const result = model.organized;
  return `
    <section class="student-page-grid">
      ${studentSection("AI 整理结果", aiResultBlock(result, { emptyText: "先在笔记编辑页触发 AI 整理。" }))}
      ${studentSection("复习卡片", `
        <ul class="student-plain-list">
          ${(result?.cards || []).map((item) => `<li><strong>${escapeHtml(item.front || "")}</strong><br />${escapeHtml(item.back || "")}</li>`).join("") || "<li>当前没有复习卡片。</li>"}
        </ul>
      `)}
      ${studentSection("作业段落", `
        <ul class="student-plain-list">
          ${(result?.assignmentParagraphs || []).map((item) => `<li>${escapeHtml(item || "")}</li>`).join("") || "<li>当前没有作业段落。</li>"}
        </ul>
        <div class="button-row"><button class="btn primary" data-action="student-save-note-organize">保存整理结果为新笔记</button></div>
      `)}
    </section>
  `;
}
