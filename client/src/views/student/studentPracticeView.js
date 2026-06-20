import { attr, escapeHtml } from "../../utils/dom.js";
import { selectStudentPracticeModel } from "../../state/studentSelectors.js";
import { studentSection } from "./shared.js";

export function studentPracticeView(state) {
  const model = selectStudentPracticeModel(state);
  return `
    <section class="student-page-grid">
      ${studentSection("练习入口", `
        <div class="student-card-list">
          ${model.banks.map((item) => `
            <article class="student-list-card">
              <div class="student-list-card__head"><strong>${escapeHtml(item.title || "")}</strong>${item.courseTitle ? `<span>${escapeHtml(item.courseTitle)}</span>` : ""}</div>
              <p>${escapeHtml(item.description || "暂无题库说明。")}</p>
              <div class="button-row">
                <button class="btn primary" data-action="student-start-practice" data-id="${attr(item.id)}" data-course-id="${attr(item.courseId)}">开始练习</button>
              </div>
            </article>
          `).join("") || '<div class="student-empty">当前没有可用题库。</div>'}
        </div>
      `)}
      <div class="student-split-grid">
        ${studentSection("AI 推荐练习", `
          <div class="student-list-card">
            <p>${escapeHtml(model.adaptivePlan?.strategy || "可以先根据当前错题和薄弱点推荐一组练习。")}</p>
            <button class="btn" data-action="student-build-adaptive-plan">生成推荐练习</button>
          </div>
        `)}
        ${studentSection("错题回放", `
          <ul class="student-plain-list">
            ${model.mistakes.map((item) => `<li><button class="link-button" data-action="student-open-mistake" data-id="${attr(item.id)}">${escapeHtml(item.questionId || item.id || "")}</button> · ${escapeHtml(item.status || "")}</li>`).join("") || "<li>当前没有错题。</li>"}
          </ul>
        `)}
      </div>
      ${studentSection("练习历史", `
        <ul class="student-plain-list">
          ${model.history.map((item) => `<li><button class="link-button" data-action="student-resume-practice" data-id="${attr(item.id)}">${escapeHtml(item.startedAt || item.id || "")}</button> · 正确率 ${escapeHtml(item.correctRate || 0)}%</li>`).join("") || "<li>当前还没有练习历史。</li>"}
        </ul>
      `)}
    </section>
  `;
}
