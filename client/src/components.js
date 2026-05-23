export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatDate(value) {
  if (!value) {
    return "未设置";
  }
  return String(value).slice(0, 10);
}

export function metric(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

export function emptyState(text) {
  return `<p class="muted">${escapeHtml(text)}</p>`;
}

export function courseList(courses = []) {
  if (!courses.length) {
    return emptyState("暂无课程。");
  }
  return `<ul class="course-list">${courses
    .map(
      (course) => `<li class="course-item">
        <strong>${escapeHtml(course.title)}</strong>
        <div class="muted">${escapeHtml(course.description)}</div>
        <div class="tag-row">${(course.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      </li>`
    )
    .join("")}</ul>`;
}

export function goalList(goals = []) {
  if (!goals.length) {
    return emptyState("暂无学习目标，请先创建一个目标。");
  }
  return `<ul class="task-list">${goals
    .map(
      (goal) => `<li class="task-item">
        <div class="task-row">
          <div>
            <strong class="task-title">${escapeHtml(goal.title)}</strong>
            <span class="task-meta">截止 ${formatDate(goal.targetDate)} · ${escapeHtml(goal.status)}</span>
          </div>
          <span class="badge ${escapeHtml(goal.priority)}">${escapeHtml(goal.priority)}</span>
        </div>
        <div class="progress-bar"><span style="width:${Number(goal.progress || 0)}%"></span></div>
      </li>`
    )
    .join("")}</ul>`;
}

export function taskList(tasks = []) {
  if (!tasks.length) {
    return emptyState("暂无任务。");
  }
  return `<ul class="task-list">${tasks
    .map(
      (task) => `<li class="task-item">
        <div class="task-row">
          <div>
            <strong class="task-title">${escapeHtml(task.title)}</strong>
            <span class="task-meta">${escapeHtml(task.status)} · 预计 ${escapeHtml(task.estimateMinutes)} 分钟 · ${formatDate(task.dueDate)}</span>
          </div>
          ${
            task.status === "done"
              ? `<span class="badge low">已完成</span>`
              : `<button class="btn small" data-action="complete-task" data-id="${escapeHtml(task.id)}">完成</button>`
          }
        </div>
      </li>`
    )
    .join("")}</ul>`;
}

export function noteList(notes = []) {
  if (!notes.length) {
    return emptyState("暂无笔记。");
  }
  return `<ul class="note-list">${notes
    .map(
      (note) => `<li class="note-item">
        <strong>${escapeHtml(note.title)}</strong>
        <p class="muted">${escapeHtml(note.content).slice(0, 150)}</p>
      </li>`
    )
    .join("")}</ul>`;
}

export function messageList(messages = [], users = []) {
  const userMap = new Map(users.map((user) => [user.id, user]));
  if (!messages.length) {
    return emptyState("协作区暂无消息。");
  }
  return `<ul class="message-list">${messages
    .map((message) => {
      const user = userMap.get(message.authorId);
      return `<li class="message-item">
        <div class="message-meta">${escapeHtml(user?.name || message.authorId)} · ${formatDate(message.createdAt)}</div>
        <div>${escapeHtml(message.content)}</div>
      </li>`;
    })
    .join("")}</ul>`;
}

export function activityList(items = []) {
  if (!items.length) {
    return emptyState("暂无活动记录。");
  }
  return `<ul class="activity-list">${items
    .map((item) => `<li class="activity-item"><div>${escapeHtml(item.summary)}</div><span class="muted">${formatDate(item.createdAt)}</span></li>`)
    .join("")}</ul>`;
}
