import { selectTeacherReportModel } from "../../state/teacherSelectors.js";
import { escapeHtml } from "../../utils/dom.js";
import { actionRow, cardList, metricStrip, panel } from "./shared.js";

export function teacherReportView(state) {
  const model = selectTeacherReportModel(state);
  return `
    <section class="teacher-hero-panel">
      <div>
        <span class="teacher-eyebrow">报告</span>
        <h2>报告与导出</h2>
        <p>已生成 ${escapeHtml(model.metrics[1].value)} 份报告，当前导出格式为 ${escapeHtml(model.metrics[2].value)}。</p>
      </div>
      ${actionRow([
        { label: "生成课程周报", action: "teacher-generate-course-report", primary: true },
        { label: "生成作业评阅", action: "teacher-generate-assignment-report" },
        { label: "AI 使用报告", action: "teacher-generate-ai-usage-report" }
      ])}
    </section>
    ${metricStrip(model.metrics)}
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
