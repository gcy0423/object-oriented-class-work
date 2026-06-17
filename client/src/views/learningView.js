import { goalList, noteList, taskList } from "../components.js";
import { escapeHtml } from "../utils/dom.js";

export function learningView(state) {
  const dashboard = state.dashboard || {};
  const goals = dashboard.goals || [];
  const courses = dashboard.courses || [];
  return `
    <section class="grid workbench-grid">
      <div class="grid">
        <div class="panel"><div class="panel-header"><h2>学习目标</h2></div>${goalList(goals)}</div>
        <div class="panel"><div class="panel-header"><h2>任务清单</h2></div>${taskList(dashboard.tasks || [])}</div>
        <div class="panel"><div class="panel-header"><h2>学习笔记</h2></div>${noteList(dashboard.notes || [])}</div>
      </div>
      <div class="grid">
        <form class="panel form-grid" data-form="goal">
          <div class="panel-header"><h2>新增目标</h2></div>
          <label><span>课程</span><select name="courseId">${courses.map((course) => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.title)}</option>`).join("")}</select></label>
          <label><span>目标</span><input name="title" required /></label>
          <label><span>截止日期</span><input name="targetDate" type="date" /></label>
          <label><span>优先级</span><select name="priority"><option value="high">high</option><option value="medium">medium</option><option value="low">low</option></select></label>
          <button class="btn primary" type="submit">创建目标</button>
        </form>
        <form class="panel form-grid" data-form="task">
          <div class="panel-header"><h2>新增任务</h2></div>
          <label><span>目标</span><select name="goalId">${goals.map((goal) => `<option value="${escapeHtml(goal.id)}">${escapeHtml(goal.title)}</option>`).join("")}</select></label>
          <label><span>任务</span><input name="title" required /></label>
          <label><span>预计分钟</span><input name="estimateMinutes" type="number" value="60" /></label>
          <button class="btn primary" type="submit">添加任务</button>
        </form>
        <form class="panel form-grid" data-form="note">
          <div class="panel-header"><h2>新增笔记</h2></div>
          <label><span>课程</span><select name="courseId">${courses.map((course) => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.title)}</option>`).join("")}</select></label>
          <label><span>标题</span><input name="title" required /></label>
          <label><span>内容</span><textarea name="content" rows="6" required></textarea></label>
          <button class="btn primary" type="submit">保存笔记</button>
        </form>
      </div>
    </section>
  `;
}
