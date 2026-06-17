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

export function statusBadge(value, tone = "") {
  const resolved = tone || String(value || "").toLowerCase().replaceAll("_", "-");
  return `<span class="badge ${escapeHtml(resolved)}">${escapeHtml(value || "-")}</span>`;
}

export function emptyState(text) {
  return `<div class="empty-state"><p class="muted">${escapeHtml(text)}</p></div>`;
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

export function analyticsCards(title, group = {}) {
  return `
    <div class="panel">
      <div class="panel-header"><h2>${escapeHtml(title)}</h2></div>
      <div class="stats-grid">
        ${Object.entries(group).map(([label, value]) => metric(label, typeof value === "number" ? value : value || "-")).join("")}
      </div>
    </div>
  `;
}

export function assignmentList(assignments = [], selectedId = "") {
  if (!assignments.length) {
    return emptyState("暂无作业。");
  }
  return `<ul class="task-list">${assignments.map((assignment) => `
    <li class="task-item ${assignment.id === selectedId ? "selected-card" : ""}">
      <div class="task-row">
        <div>
          <strong class="task-title">${escapeHtml(assignment.title)}</strong>
          <span class="task-meta">${escapeHtml(assignment.description || "暂无描述")}</span>
        </div>
        <div class="inline-actions">
          ${assignment.submitted ? statusBadge("已提交", "low") : ""}
          <button class="btn small" data-action="select-assignment" data-id="${escapeHtml(assignment.id)}">查看</button>
        </div>
      </div>
      <div class="tag-row">
        ${statusBadge(assignment.status || "published")}
        ${assignment.dueAt ? `<span class="tag">截止 ${escapeHtml(formatDate(assignment.dueAt))}</span>` : ""}
      </div>
    </li>
  `).join("")}</ul>`;
}

export function questionBankList(banks = []) {
  if (!banks.length) {
    return emptyState("暂无题库。");
  }
  return `<ul class="course-list">${banks.map((bank) => `
    <li class="course-item">
      <strong>${escapeHtml(bank.title)}</strong>
      <div class="muted">${escapeHtml(bank.description || "暂无描述")}</div>
      <div class="button-row" style="margin-top:10px">
        <button class="btn small" data-action="start-practice" data-id="${escapeHtml(bank.id)}" data-course-id="${escapeHtml(bank.courseId)}">开始练习</button>
      </div>
    </li>
  `).join("")}</ul>`;
}

export function mistakeList(items = []) {
  if (!items.length) {
    return emptyState("当前没有待复习错题。");
  }
  return `<ul class="note-list">${items.map((item) => `
    <li class="note-item">
      <div class="task-row">
        <div>
          <strong>${escapeHtml(item.question?.stem || item.questionId)}</strong>
          <div class="muted">${escapeHtml(item.question?.analysis || "可在完成复习后标记为已处理。")}</div>
        </div>
        ${item.status === "reviewed"
          ? statusBadge("已复习", "low")
          : `<button class="btn small" data-action="review-mistake" data-id="${escapeHtml(item.id)}">标记已复习</button>`}
      </div>
    </li>
  `).join("")}</ul>`;
}

export function practiceSessionView(session) {
  if (!session) {
    return emptyState("从左侧题库开始一次练习。");
  }
  return `
    <div class="practice-summary">
      <div class="tag-row">
        ${statusBadge(session.status || "active")}
        <span class="tag">已答 ${escapeHtml((session.answers || []).length)}</span>
        <span class="tag">正确率 ${escapeHtml(session.correctRate ?? 0)}%</span>
      </div>
    </div>
    <div class="grid">
      ${(session.questions || []).map((question) => {
        const answer = (session.answers || []).find((item) => item.questionId === question.id);
        return `
          <form class="panel form-grid compact-form" data-form="practice-answer">
            <input type="hidden" name="sessionId" value="${escapeHtml(session.id)}" />
            <input type="hidden" name="questionId" value="${escapeHtml(question.id)}" />
            <div class="question-stem">${escapeHtml(question.stem)}</div>
            ${question.choices?.length ? `<div class="choice-list">${question.choices.map((choice) => `<div class="choice-item">${escapeHtml(choice.id)}. ${escapeHtml(choice.text)}</div>`).join("")}</div>` : ""}
            <label>答案<input name="answer" value="${escapeHtml(Array.isArray(answer?.answer) ? answer.answer.join(",") : answer?.answer || "")}" placeholder="输入选项或简答内容" /></label>
            ${answer ? `<div class="inline-feedback ${answer.correct === false ? "danger-text" : ""}">${escapeHtml(answer.explanation || (answer.correct ? "回答正确。" : "答案已保存。"))}</div>` : ""}
            <div class="button-row">
              <button class="btn primary" type="submit">提交答案</button>
            </div>
          </form>
        `;
      }).join("")}
      <div class="button-row">
        <button class="btn" data-action="finish-practice" data-id="${escapeHtml(session.id)}">完成练习</button>
      </div>
    </div>
  `;
}

export function assignmentDetailView(detail, currentUserRole) {
  if (!detail) {
    return emptyState("选择一份作业后，这里会显示详情。");
  }
  const assignment = detail.assignment || {};
  const submissions = detail.submissions || [];
  return `
    <div class="detail-block">
      <h3>${escapeHtml(assignment.title || "作业详情")}</h3>
      <p class="muted">${escapeHtml(assignment.description || "暂无描述")}</p>
      <div class="tag-row">
        ${assignment.dueAt ? `<span class="tag">截止 ${escapeHtml(formatDate(assignment.dueAt))}</span>` : ""}
        ${statusBadge(assignment.status || "published")}
        <span class="tag">已提交 ${escapeHtml(detail.submissionSummary?.submitted ?? 0)}</span>
        <span class="tag">已评分 ${escapeHtml(detail.submissionSummary?.graded ?? 0)}</span>
      </div>
    </div>
    ${detail.rubric ? `
      <div class="subpanel">
        <strong>评分规则</strong>
        <ul class="plain-list">${(detail.rubric.criteria || []).map((criterion) => `<li>${escapeHtml(criterion.title)} · ${escapeHtml(criterion.maxScore)} 分</li>`).join("")}</ul>
      </div>
    ` : ""}
    <div class="subpanel">
      <strong>${currentUserRole === "student" ? "我的提交" : "提交列表"}</strong>
      ${submissions.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>学生</th><th>状态</th><th>成绩</th><th>反馈</th><th>操作</th></tr></thead>
            <tbody>
              ${submissions.map((submission) => `
                <tr>
                  <td>${escapeHtml(submission.studentSnapshot?.name || submission.studentId)}</td>
                  <td>${escapeHtml(submission.status)}</td>
                  <td>${escapeHtml(submission.grades?.[0]?.score ?? "-")}</td>
                  <td>${escapeHtml(submission.feedback?.[0]?.summary || submission.grades?.[0]?.feedback || "-")}</td>
                  <td>
                    <div class="inline-actions">
                      ${currentUserRole !== "student" ? `<button class="btn small" data-action="ai-review-submission" data-id="${escapeHtml(submission.id)}">AI 初评</button><button class="btn small" data-action="grade-submission" data-id="${escapeHtml(submission.id)}">人工评分</button>` : "-"}
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : emptyState("暂无提交。")}
    </div>
  `;
}

export function teacherOverviewTables(teacher = {}) {
  return `
    <div class="panel">
      <div class="panel-header"><h2>课程统计</h2></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>课程</th><th>作业完成率</th><th>练习正确率</th><th>开放错题</th></tr></thead>
          <tbody>
            ${(teacher.courses || []).map((course) => `
              <tr>
                <td>${escapeHtml(course.courseTitle)}</td>
                <td>${escapeHtml(course.assignments?.completionRate ?? 0)}%</td>
                <td>${escapeHtml(course.practice?.averageCorrectRate ?? 0)}%</td>
                <td>${escapeHtml(course.practice?.openMistakes ?? 0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h2>学生概览</h2></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>学生</th><th>完成率</th><th>学习分钟</th><th>错题</th><th>掌握度</th></tr></thead>
          <tbody>
            ${(teacher.students || []).map((student) => `
              <tr>
                <td>${escapeHtml(student.name)}</td>
                <td>${escapeHtml(student.learning?.completionRate ?? 0)}%</td>
                <td>${escapeHtml(student.learning?.studyMinutes ?? 0)}</td>
                <td>${escapeHtml(student.assessment?.mistakeCount ?? 0)}</td>
                <td>${escapeHtml(student.assessment?.masteryScore ?? 0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function riskList(items = []) {
  if (!items.length) {
    return emptyState("当前没有高风险学生。");
  }
  return `<ul class="course-list">${items.map((item) => `
    <li class="course-item">
      <strong>${escapeHtml(item.name)}</strong>
      <div class="tag-row">${(item.reasons || []).map((reason) => `<span class="badge high">${escapeHtml(reason)}</span>`).join("")}</div>
    </li>
  `).join("")}</ul>`;
}
