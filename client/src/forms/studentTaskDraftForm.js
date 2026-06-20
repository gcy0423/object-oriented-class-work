export function studentTaskDraftForm({ saving }) {
  return `
    <form class="student-form-card" data-form="student-task-draft">
      <label>
        <span>让 AI 帮你拆任务</span>
        <textarea name="request" rows="5" placeholder="例如：帮我把面向对象课程本周的复习拆成 3 个可执行任务"></textarea>
      </label>
      <button class="btn primary" type="submit">${saving ? "生成中..." : "生成任务草稿"}</button>
    </form>
  `;
}
