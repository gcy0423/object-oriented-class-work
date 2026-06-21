import { selectTeacherHomeModel } from "../../state/teacherSelectors.js";
import { escapeHtml } from "../../utils/dom.js";
import { actionRow, cardList, metricStrip, panel } from "./shared.js";

export function teacherHomeView(state) {
  const model = selectTeacherHomeModel(state);
  return `
    <section class="teacher-hero-panel">
      <div>
        <span class="teacher-eyebrow">今日教学顺序</span>
        <h2>先批改，再确认风险学生，最后补齐题库缺口。</h2>
        <p>待批改 ${escapeHtml(model.metrics[1].value)} 份，风险学生 ${escapeHtml(model.metrics[2].value)} 位，待复盘错题 ${escapeHtml(model.metrics[3].value)} 个。</p>
      </div>
      ${actionRow([
        { label: "查看批改队列", route: "teacher-review", primary: true },
        { label: "查看干预队列", route: "teacher-intervention" }
      ])}
    </section>
    ${metricStrip(model.metrics)}
    <section class="teacher-page-grid">
      ${panel({
        eyebrow: "Core workflow",
        title: "核心任务",
        text: "按当前班级证据排序，优先处理会影响学生反馈的事项。",
        body: cardList(model.tasks, (item, index) => `
          <article class="teacher-list-card">
            <div class="teacher-list-card__head">
              <span class="teacher-index">${index + 1}</span>
              <div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.detail)}</p>
              </div>
            </div>
            ${actionRow([{ label: "打开", route: item.route }])}
          </article>
        `)
      })}
      ${panel({
        eyebrow: "Assignments",
        title: "近期作业",
        text: "优先查看临近截止和存在未评分提交的作业。",
        body: cardList(model.assignments, (item) => `
          <article class="teacher-list-card">
            <div class="teacher-list-card__head">
              <div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.course)} · 截止 ${escapeHtml(item.due)}</p>
              </div>
              <span class="teacher-chip">${escapeHtml(item.status)}</span>
            </div>
            ${actionRow([{ label: "查看作业", action: "teacher-open-assignment", id: item.id }])}
          </article>
        `, "暂无作业。")
      })}
    </section>
  `;
}
