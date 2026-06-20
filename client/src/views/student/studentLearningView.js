import { attr, escapeHtml } from "../../utils/dom.js";
import { studentTaskDraftForm } from "../../forms/studentTaskDraftForm.js";
import { selectStudentLearningModel } from "../../state/studentSelectors.js";
import { courseTabs, listCards, studentHero, studentSection, taskCard } from "./shared.js";

export function studentLearningView(state) {
  const model = selectStudentLearningModel(state);
  return `
    <section class="student-page-grid">
      ${studentHero("学习页", "围绕当前课程、目标和任务组织学习行动，AI 只负责给建议，真实写操作仍需你确认。", [
        { label: "课程", value: model.courses.length },
        { label: "目标", value: model.goals.length },
        { label: "任务", value: model.tasks.length },
        { label: "草稿", value: model.taskDrafts.length, hint: "待确认" }
      ])}
      ${studentSection("课程筛选", courseTabs(model.courses, model.selectedCourseId))}
      <div class="student-split-grid">
        ${studentSection("当前课程任务", listCards(model.tasks, taskCard))}
        ${studentSection("任务规划区", `
          <form class="student-form-card" data-form="student-task-create">
            <label><span>标题</span><input name="title" required /></label>
            <label><span>任务类型</span><select name="taskType"><option>预习/复习</option><option>文档产出</option><option>练习巩固</option><option>作业推进</option><option>笔记整理</option></select></label>
            <label><span>预计分钟</span><input name="estimateMinutes" type="number" value="45" /></label>
            <button class="btn primary" type="submit">创建任务</button>
          </form>
          ${studentTaskDraftForm({ saving: state.saving.studentAi })}
          <div class="student-draft-stack">
            ${model.taskDrafts.map((item, index) => `
              <article class="student-list-card">
                <div class="student-list-card__head"><strong>${escapeHtml(item.title || item.draft?.title || "")}</strong><span>${escapeHtml(item.type || item.draft?.type || "")}</span></div>
                <p>${escapeHtml(item.summary || "")}</p>
                <div class="button-row">
                  <button class="btn primary" data-action="student-apply-task-draft" data-index="${attr(index)}">确认加入</button>
                </div>
              </article>
            `).join("") || '<div class="student-empty">当前没有待确认草稿。</div>'}
          </div>
        `)}
      </div>
    </section>
  `;
}
