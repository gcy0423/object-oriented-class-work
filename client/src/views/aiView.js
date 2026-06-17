import { emptyState } from "../widgets/cards.js";
import { escapeHtml } from "../utils/dom.js";

export function aiView(state) {
  const goals = state.dashboard?.goals || [];
  return `
    <section class="grid two-column">
      <form class="panel form-grid" data-form="ai-question">
        <div class="panel-header"><h2>课程问答</h2></div>
        <label><span>问题</span><textarea name="question" rows="7" required></textarea></label>
        <button class="btn primary" type="submit">询问 AI</button>
      </form>
      <div class="panel">
        <div class="panel-header"><h2>AI 输出</h2></div>
        ${state.aiAnswer ? `<div class="ai-answer">${escapeHtml(state.aiAnswer)}</div>` : emptyState("AI 回复会显示在这里。")}
      </div>
      <form class="panel form-grid" data-form="ai-plan">
        <div class="panel-header"><h2>生成学习计划</h2></div>
        <label><span>目标</span><select name="goalId">${goals.map((goal) => `<option value="${escapeHtml(goal.id)}">${escapeHtml(goal.title)}</option>`).join("")}</select></label>
        <button class="btn primary" type="submit">生成计划</button>
      </form>
    </section>
  `;
}
