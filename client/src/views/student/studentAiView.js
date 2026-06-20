import { selectStudentHomeModel } from "../../state/studentSelectors.js";
import { escapeHtml } from "../../utils/dom.js";
import { aiResultBlock, assignmentCard, listCards, studentHero, studentSection } from "./shared.js";

export function studentAiView(state) {
  const model = selectStudentHomeModel(state);
  return `
    <section class="student-page-grid">
      ${studentHero("今天先做什么？", "AI 学习台会把目标、作业、错题和笔记上下文整理成下一步行动。", [
        { label: "当前目标", value: model.metrics.activeGoals || 0, hint: "进行中" },
        { label: "完成率", value: `${model.metrics.completionRate || 0}%`, hint: "任务完成" },
        { label: "学习时长", value: `${model.metrics.studyMinutes || 0} min`, hint: "已完成任务累计" },
        { label: "笔记数", value: model.metrics.noteCount || 0, hint: "当前课程沉淀" }
      ])}
      <div class="student-ai-grid">
        ${studentSection("AI 快捷指令", `
          <div class="student-quick-grid">
            <button class="student-command" data-action="student-build-daily-plan">生成今日建议</button>
            <button class="student-command" data-action="student-open-ai-insight">总结薄弱点</button>
            <button class="student-command" data-action="student-route" data-route="student-assignments">查看作业压力</button>
            <button class="student-command" data-action="student-route" data-route="student-practice">去做一组练习</button>
          </div>
          <form class="student-form-inline" data-form="student-ai-ask">
            <label><span>问 AI</span><textarea name="question" rows="4" placeholder="帮我判断今天应该先复习还是先完成作业"></textarea></label>
            <button class="btn primary" type="submit">生成结构化建议</button>
          </form>
        `)}
        ${studentSection("今日建议", aiResultBlock(model.dailyPlan, { emptyText: "暂无今日建议。" }))}
      </div>
      ${studentSection("AI 学习时间线", `
        <ol class="student-plain-list">
          ${(model.timeline || []).map((item) => `<li><strong>${escapeHtml(item.title || item.type)}</strong> · ${escapeHtml(item.summary || "")}</li>`).join("") || "<li>当前还没有 AI 学习时间线事件。</li>"}
        </ol>
      `)}
      ${studentSection("临近作业", listCards(model.pressure, assignmentCard))}
    </section>
  `;
}
