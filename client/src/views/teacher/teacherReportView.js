import { selectTeacherReportModel } from "../../state/teacherSelectors.js";
import { escapeHtml } from "../../utils/dom.js";
import { actionRow, cardList, panel } from "./shared.js";

export function teacherReportView(state) {
  const model = selectTeacherReportModel(state);
  return `
    <section class="teacher-hero-panel">
      <div>
        <span class="teacher-eyebrow">报告</span>
        <h2>把课程、作业、错题和 AI 使用证据整理成可导出的材料。</h2>
        <p>报告页保留教师确认和导出入口，不显示内部报告编号。</p>
      </div>
      ${actionRow([{ label: "刷新报告", action: "refresh", primary: true }, { label: "回到教学台", route: "teacher-home" }])}
    </section>
    <section class="teacher-page-grid">
      ${panel({
        eyebrow: "Catalog",
        title: "报告目录",
        body: cardList(model.catalog, (item) => `
          <article class="teacher-list-card">
            <h3>${escapeHtml(item.title)}</h3>
            <p>支持格式：${escapeHtml(item.formats)}</p>
          </article>
        `, "暂无报告目录。")
      })}
      ${panel({
        eyebrow: "Generated",
        title: "已生成报告",
        body: cardList(model.reports, (item) => `
          <article class="teacher-list-card">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.summary)}</p>
            <span class="teacher-muted">${escapeHtml(item.generatedAt)}</span>
          </article>
        `, "暂无已生成报告。")
      })}
    </section>
    ${model.preview ? panel({
      eyebrow: "Export",
      title: "导出预览",
      body: `<pre class="teacher-export-preview">${escapeHtml(model.preview.body || "")}</pre>`
    }) : ""}
  `;
}
