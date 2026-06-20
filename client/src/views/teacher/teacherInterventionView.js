import { selectTeacherInterventionModel } from "../../state/teacherSelectors.js";
import { escapeHtml } from "../../utils/dom.js";
import { actionRow, cardList, panel } from "./shared.js";

export function teacherInterventionView(state) {
  const model = selectTeacherInterventionModel(state);
  return `
    <section class="teacher-hero-panel">
      <div>
        <span class="teacher-eyebrow">干预队列</span>
        <h2>先确认对象、证据和语气，再发送提醒。</h2>
        <p>AI 可以生成建议，但不会替教师直接发送给学生。</p>
      </div>
      ${actionRow([{ label: "查看学生画像", route: "teacher-student", primary: true }, { label: "查看课程学情", route: "teacher-course" }])}
    </section>
    <section class="teacher-page-grid">
      ${panel({
        eyebrow: "Candidates",
        title: "干预候选",
        body: cardList(model.risks, (item) => `
          <article class="teacher-list-card">
            <div class="teacher-list-card__head">
              <div>
                <h3>${escapeHtml(item.student)}</h3>
                <p>${escapeHtml(item.reason)}</p>
              </div>
              <span class="teacher-chip warning">${escapeHtml(item.level)}</span>
            </div>
            ${actionRow([{ label: "打开画像", action: "teacher-open-student", id: item.studentId }, { label: "发送提醒", action: "teacher-send-intervention", id: item.studentId, primary: true }])}
          </article>
        `, "暂无需要干预的学生。")
      })}
      ${panel({
        eyebrow: "Drafts",
        title: "AI 跟进建议",
        body: cardList(model.actions, (item) => `
          <article class="teacher-list-card">
            <div class="teacher-list-card__head">
              <div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.reason)}</p>
              </div>
              <span class="teacher-chip">${escapeHtml(item.priority)}</span>
            </div>
          </article>
        `, "暂无跟进建议。")
      })}
    </section>
  `;
}
