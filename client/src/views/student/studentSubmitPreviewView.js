import { escapeHtml } from "../../utils/dom.js";
import { selectStudentSubmitModel } from "../../state/studentSelectors.js";
import { studentSection } from "./shared.js";

export function studentSubmitPreviewView(state) {
  const model = selectStudentSubmitModel(state);
  return `
    <section class="student-page-grid">
      ${studentSection("提交预览", `
        <article class="student-detail-card">
          <h2>${escapeHtml(model.assignment?.title || "提交预览")}</h2>
          <p class="student-pre-wrap">${escapeHtml(model.draft.content || "当前没有可预览的正文。")}</p>
          <h3>附件说明</h3>
          <ul class="student-plain-list">
            ${model.draft.attachments.map((item) => `<li>${escapeHtml(item.name || "")}${item.url ? ` · ${escapeHtml(item.url)}` : ""}</li>`).join("") || "<li>无附件说明</li>"}
          </ul>
          <div class="button-row">
            <button class="btn" data-action="student-back">继续编辑</button>
            <button class="btn primary" data-action="student-submit-confirm">确认提交</button>
          </div>
        </article>
      `)}
    </section>
  `;
}
