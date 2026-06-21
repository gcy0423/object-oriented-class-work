import { selectTeacherCourseModel } from "../../state/teacherSelectors.js";
import { escapeHtml } from "../../utils/dom.js";
import { actionRow, cardList, metricStrip, panel } from "./shared.js";

export function teacherCourseView(state) {
  const model = selectTeacherCourseModel(state);
  return `
    <section class="teacher-hero-panel">
      <div>
        <span class="teacher-eyebrow">课程学情</span>
        <h2>${escapeHtml(model.title)}</h2>
        <p>${escapeHtml(model.description)}</p>
      </div>
      ${actionRow([
        { label: "查看风险学生", route: "teacher-intervention", primary: true },
        { label: "生成补练建议", action: "teacher-build-practice-plan" }
      ])}
    </section>
    ${metricStrip(model.metrics)}
    <section class="teacher-page-grid">
      ${panel({
        eyebrow: "Mastery",
        title: "知识点掌握度",
        body: cardList(model.mastery, (item) => `
          <article class="teacher-list-card">
            <div class="teacher-bar-row">
              <span>${escapeHtml(item.label)}</span>
              <b style="width:${Math.max(4, Math.min(100, item.value))}%"></b>
              <strong>${escapeHtml(item.value)}%</strong>
            </div>
          </article>
        `, "暂无知识点掌握数据。")
      })}
      ${panel({
        eyebrow: "Risk",
        title: "风险学生",
        text: "先看证据再干预，避免只按分数判断。",
        body: cardList(model.risks, (item) => `
          <article class="teacher-list-card">
            <div class="teacher-list-card__head">
              <div>
                <h3>${escapeHtml(item.student)}</h3>
                <p>${escapeHtml(item.detail)}</p>
              </div>
              <span class="teacher-chip warning">${escapeHtml(item.level)}</span>
            </div>
            ${actionRow([{ label: "打开画像", action: "teacher-open-student", id: item.studentId }])}
          </article>
        `, "暂无风险学生。")
      })}
    </section>
    <section class="teacher-page-grid">
      ${panel({
        eyebrow: "Question bank",
        title: "题库与补练",
        text: "根据薄弱知识点和错题负载补齐练习材料。",
        body: cardList(model.questionBanks, (item) => `
          <article class="teacher-list-card">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            ${actionRow([{ label: "生成补练建议", action: "teacher-build-practice-plan" }])}
          </article>
        `, "暂无题库。")
      })}
      ${panel({
        eyebrow: "Practice",
        title: "练习与错题",
        text: "用于判断是否需要补练或干预。",
        body: `
          ${model.adaptivePlan ? `
            <article class="teacher-list-card">
              <div class="teacher-list-card__head">
                <div>
                  <h3>补练建议</h3>
                  <p>已选 ${escapeHtml(model.adaptivePlan.selectedCount)}/${escapeHtml(model.adaptivePlan.targetCount)} 题，预计 ${escapeHtml(model.adaptivePlan.estimatedMinutes)} 分钟。${escapeHtml(model.adaptivePlan.strategy)}</p>
                </div>
                <span class="teacher-chip">AI</span>
              </div>
              ${model.adaptivePlan.questions.length ? `
                <ul class="teacher-plain-list">
                  ${model.adaptivePlan.questions.map((item) => `<li><strong>${escapeHtml(item.concept)}</strong>：${escapeHtml(item.stem)} · ${escapeHtml(item.reason)}</li>`).join("")}
                </ul>
              ` : `<div class="teacher-empty">暂无补练题目。</div>`}
            </article>
          ` : ""}
          ${cardList(model.practice, (item) => `
            <article class="teacher-list-card">
              <div class="teacher-list-card__head">
                <div>
                  <h3>${escapeHtml(item.startedAt)}</h3>
                  <p>正确率 ${escapeHtml(item.correctRate)}</p>
                </div>
                <span class="teacher-chip">${escapeHtml(item.status)}</span>
              </div>
            </article>
          `, "暂无练习记录。")}
          ${cardList(model.mistakes, (item) => `
            <article class="teacher-list-card">
              <div class="teacher-list-card__head">
                <div>
                  <h3>${escapeHtml(item.concept)}</h3>
                  <p>${escapeHtml(item.stem)}</p>
                </div>
                <span class="teacher-chip warning">${escapeHtml(item.status)}</span>
              </div>
            </article>
          `, "暂无错题。")}
        `
      })}
    </section>
  `;
}
