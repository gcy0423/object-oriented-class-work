import { selectTeacherStudentModel } from "../../state/teacherSelectors.js";
import { formatDateTime } from "../../utils/format.js";
import { escapeHtml } from "../../utils/dom.js";
import { actionRow, cardList, metricStrip, panel } from "./shared.js";

export function teacherStudentView(state) {
  const model = selectTeacherStudentModel(state);
  return `
    <section class="teacher-hero-panel">
      <div>
        <span class="teacher-eyebrow">学生画像</span>
        <h2>${escapeHtml(model.name)}</h2>
        <p>${escapeHtml(model.summary)}</p>
      </div>
      ${actionRow([{ label: "发送干预提醒", action: "teacher-send-intervention", id: model.id, primary: true }])}
    </section>
    ${metricStrip(model.metrics)}
    <section class="teacher-page-grid">
      ${panel({
        eyebrow: "AI results",
        title: "学生 AI 结果",
        body: cardList(model.aiResults, (item) => `
          <article class="teacher-list-card">
            <div class="teacher-list-card__head">
              <div>
                <h3>${escapeHtml(item.result?.summary || item.summary || "AI 学习结果")}</h3>
                <p>${escapeHtml(formatDateTime(item.generatedAt || item.createdAt))}</p>
              </div>
              <span class="teacher-chip">${escapeHtml(item.type || "AI")}</span>
            </div>
          </article>
        `, "暂无学生 AI 结果。")
      })}
      ${panel({
        eyebrow: "Evidence",
        title: "证据时间线",
        body: cardList(model.timeline, (item) => `
          <article class="teacher-list-card">
            <h3>${escapeHtml(formatDateTime(item.at || item.createdAt || item.generatedAt))}</h3>
            <p>${escapeHtml(item.summary || item.title || item.type || "学习证据")}</p>
          </article>
        `, "暂无证据时间线。")
      })}
    </section>
  `;
}
