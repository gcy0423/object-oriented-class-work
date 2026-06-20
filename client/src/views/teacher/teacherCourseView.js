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
        { label: "进入题库补练", route: "teacher-review" }
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
        text: "承接原型的题库缺口分析，把练习入口和题库状态放在学情页内。",
        body: cardList(model.questionBanks, (item) => `
          <article class="teacher-list-card">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            ${actionRow([{ label: "查看批改关联", route: "teacher-review" }])}
          </article>
        `, "暂无题库。")
      })}
      ${panel({
        eyebrow: "Practice",
        title: "练习与错题",
        text: "用于判断是否需要补练或干预。",
        body: `
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
