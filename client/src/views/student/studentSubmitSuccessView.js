import { escapeHtml } from "../../utils/dom.js";
import { studentSection } from "./shared.js";

export function studentSubmitSuccessView(state) {
  const submission = state.student?.assignments?.lastSubmission || null;
  return `
    <section class="student-page-grid">
      ${studentSection("提交成功", `
        <article class="student-success-card">
          <h2>提交已完成</h2>
          <p>系统已经保存你的正文与附件说明。</p>
          <ul class="student-plain-list">
            <li>提交时间：${escapeHtml(submission?.submittedAt || submission?.updatedAt || "刚刚")}</li>
            <li>提交记录：${escapeHtml(submission?.id || "本地成功状态")}</li>
          </ul>
          <div class="button-row">
            <button class="btn primary" data-action="student-route" data-route="student-assignments">返回作业页</button>
            <button class="btn" data-action="student-open-history">查看历史</button>
          </div>
        </article>
      `)}
    </section>
  `;
}
