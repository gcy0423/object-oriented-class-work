import { selectTeacherReviewModel } from "../../state/teacherSelectors.js";
import { escapeHtml } from "../../utils/dom.js";
import { actionRow, cardList, metricStrip, panel } from "./shared.js";

export function teacherReviewView(state) {
  const model = selectTeacherReviewModel(state);
  return `
    <section class="teacher-hero-panel">
      <div>
        <span class="teacher-eyebrow">批改</span>
        <h2>${escapeHtml(model.title)}</h2>
        <p>${escapeHtml(model.insightSummary)}</p>
      </div>
      ${actionRow([{ label: "回到作业", route: "teacher-assignment" }, { label: "生成作业评阅", action: "teacher-generate-assignment-report", primary: true }])}
    </section>
    ${metricStrip(model.metrics)}
    <section class="teacher-page-grid">
      ${panel({
        eyebrow: "Queue",
        title: "待批改队列",
        body: cardList(model.submissions, (item) => `
          <article class="teacher-list-card">
            <div class="teacher-list-card__head">
              <div>
                <h3>${escapeHtml(item.student)}</h3>
                <p>${escapeHtml(item.submittedAt)} · ${escapeHtml(item.content)}</p>
              </div>
              <span class="teacher-chip">${escapeHtml(item.status)}</span>
            </div>
            ${actionRow([{ label: "载入洞察", action: "teacher-load-submission-insight", id: item.id }, { label: "AI 初评", action: "teacher-run-ai-review", id: item.id, primary: true }])}
          </article>
        `, "暂无待批改提交。")
      })}
      ${panel({
        eyebrow: "Evidence",
        title: "学生 AI 自检证据",
        body: cardList(model.evidence, (item) => `
          <article class="teacher-list-card">
            <h3>${escapeHtml(item.title || item.type || "自检证据")}</h3>
            <p>${escapeHtml(item.summary || item.detail || item.content || "暂无证据摘要")}</p>
          </article>
        `, "选择提交后展示学生 AI 自检证据。")
      })}
    </section>
  `;
}
