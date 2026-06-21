import { selectTeacherAssignmentModel } from "../../state/teacherSelectors.js";
import { escapeHtml } from "../../utils/dom.js";
import { actionRow, cardList, metricStrip, panel } from "./shared.js";

export function teacherAssignmentView(state) {
  const model = selectTeacherAssignmentModel(state);
  return `
    <section class="teacher-hero-panel">
      <div>
        <span class="teacher-eyebrow">作业</span>
        <h2>${escapeHtml(model.title)}</h2>
        <p>${escapeHtml(model.course)} · 截止 ${escapeHtml(model.due)} · ${escapeHtml(model.description)}</p>
      </div>
      ${actionRow([{ label: "进入批改", route: "teacher-review", primary: true }, { label: "查看报告", route: "teacher-report" }])}
    </section>
    ${metricStrip(model.metrics)}
    <section class="teacher-page-grid">
      ${panel({
        eyebrow: "Submissions",
        title: "提交列表",
        body: cardList(model.submissions, (item) => `
          <article class="teacher-list-card">
            <div class="teacher-list-card__head">
              <div>
                <h3>${escapeHtml(item.student)}</h3>
                <p>${escapeHtml(item.submittedAt)} · ${escapeHtml(item.content)}</p>
              </div>
              <span class="teacher-chip">${escapeHtml(item.status)}</span>
            </div>
            ${actionRow([{ label: "查看 AI 证据", action: "teacher-load-submission-insight", id: item.id }])}
          </article>
        `, "暂无提交。")
      })}
      ${panel({
        eyebrow: "AI grading",
        title: "评分一致性",
        body: cardList(model.rows, (item) => `
          <article class="teacher-list-card">
            <h3>${escapeHtml(item.student)}</h3>
            <p>教师分 ${escapeHtml(item.teacherScore)} · AI 分 ${escapeHtml(item.aiScore)} · ${escapeHtml(item.risk)}</p>
          </article>
        `, "暂无评分一致性数据。")
      })}
    </section>
  `;
}
