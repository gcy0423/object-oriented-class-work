import { activityList, emptyState, escapeHtml, formatDate, metric, statusBadge } from "../components.js";

function userName(users = [], id = "") {
  return users.find((user) => user.id === id)?.name || id || "-";
}

function optionList(items = [], selected = "", getValue = (item) => item.id, getLabel = (item) => item.title || item.name || item.id) {
  return items
    .map((item) => {
      const value = getValue(item);
      return `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(getLabel(item))}</option>`;
    })
    .join("");
}

function roomMetrics(rooms = [], workspace) {
  const stats = workspace?.room?.stats || {};
  return `
    <div class="stats-grid compact-stats">
      ${metric("协作空间", rooms.length)}
      ${metric("成员", stats.memberCount ?? 0)}
      ${metric("消息", (stats.messageCount ?? 0) + (stats.replyCount ?? 0))}
      ${metric("待办", stats.openTaskCount ?? 0)}
    </div>
  `;
}

function roomList(rooms = [], selectedRoomId = "") {
  if (!rooms.length) {
    return emptyState("暂无协作空间。");
  }
  return `<div class="collab-room-list">${rooms.map((room) => `
    <article class="collab-room ${room.id === selectedRoomId ? "is-selected" : ""}">
      <div class="collab-room-head">
        <div>
          <strong>${escapeHtml(room.title)}</strong>
          <div class="muted">${escapeHtml(room.description || "暂无描述")}</div>
        </div>
        <button class="btn small" data-action="select-collaboration-room" data-id="${escapeHtml(room.id)}">打开</button>
      </div>
      <div class="tag-row">
        ${statusBadge(room.type || "course")}
        ${room.pinned ? statusBadge("pinned", "active") : ""}
        <span class="tag">${escapeHtml(room.stats?.memberCount ?? 0)} 人</span>
        <span class="tag">${escapeHtml(room.stats?.openTaskCount ?? 0)} 个待办</span>
        <span class="tag">${escapeHtml(formatDate(room.stats?.lastMessageAt || room.updatedAt))}</span>
      </div>
    </article>
  `).join("")}</div>`;
}

function memberList(members = []) {
  if (!members.length) {
    return emptyState("暂无成员。");
  }
  return `<ul class="collab-member-list">${members.map((member) => `
    <li>
      <div>
        <strong>${escapeHtml(member.displayName || member.userId)}</strong>
        <span class="muted">${escapeHtml(member.userId)}</span>
      </div>
      <div class="tag-row">
        ${statusBadge(member.role || "member")}
        ${statusBadge(member.notificationLevel || "mentions", "active")}
      </div>
    </li>
  `).join("")}</ul>`;
}

function replyList(replies = [], users = []) {
  if (!replies.length) {
    return "";
  }
  return `<div class="collab-replies">${replies.map((reply) => `
    <article>
      <div class="message-meta">${escapeHtml(userName(users, reply.authorId))} · ${escapeHtml(formatDate(reply.createdAt))}</div>
      <p>${escapeHtml(reply.content)}</p>
      ${(reply.mentions || []).length ? `<div class="tag-row">${reply.mentions.map((mention) => statusBadge(`@${mention.label || mention.targetId}`, mention.status === "unread" ? "warning" : "low")).join("")}</div>` : ""}
    </article>
  `).join("")}</div>`;
}

function messageThreadList(messages = [], users = [], selectedRoomId = "") {
  if (!messages.length) {
    return emptyState("No messages in this room.");
  }
  return `<div class="collab-thread-list">${messages.map((message) => `
    <article class="collab-thread">
      <div class="collab-thread-head">
        <div>
          <strong>${escapeHtml(userName(users, message.authorId))}</strong>
          <span class="muted">${escapeHtml(formatDate(message.createdAt))}</span>
        </div>
        <div class="tag-row">
          ${(message.mentions || []).map((mention) => statusBadge(`@${mention.label || mention.targetId}`, mention.status === "unread" ? "warning" : "low")).join("")}
          ${(message.replies || []).length ? `<span class="tag">${escapeHtml(message.replies.length)} 条回复</span>` : ""}
        </div>
      </div>
      <p>${escapeHtml(message.content)}</p>
      ${replyList(message.replies || [], users)}
      <form class="collab-inline-reply form-grid compact-form" data-form="collaboration-reply">
        <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
        <input type="hidden" name="messageId" value="${escapeHtml(message.id)}" />
        <label><span>回复</span><textarea name="content" rows="2" required placeholder="输入回复或 @成员"></textarea></label>
        <div class="button-row">
          <button class="btn small" type="submit">回复</button>
        </div>
      </form>
    </article>
  `).join("")}</div>`;
}

function taskBoard(tasks = [], users = []) {
  if (!tasks.length) {
    return emptyState("暂无协作任务。");
  }
  return `<div class="table-wrap">
    <table class="data-table collab-table">
      <thead><tr><th>任务</th><th>负责人</th><th>状态</th><th>优先级</th><th>截止</th><th>操作</th></tr></thead>
      <tbody>${tasks.map((task) => `
        <tr>
          <td>
            <strong>${escapeHtml(task.title)}</strong>
            <div class="muted">${escapeHtml(task.description || "")}</div>
            ${(task.labels || []).length ? `<div class="tag-row">${task.labels.map((label) => `<span class="tag">${escapeHtml(label)}</span>`).join("")}</div>` : ""}
          </td>
          <td>${escapeHtml(userName(users, task.assigneeId))}</td>
          <td>${statusBadge(task.status || "open")}</td>
          <td>${statusBadge(task.priority || "medium", task.priority || "medium")}</td>
          <td>${escapeHtml(formatDate(task.dueAt))}</td>
          <td>
            ${task.status === "done"
              ? `<button class="btn small" data-action="reopen-collaboration-task" data-id="${escapeHtml(task.id)}">重开</button>`
              : `<button class="btn small" data-action="complete-collaboration-task" data-id="${escapeHtml(task.id)}">完成</button>`}
          </td>
        </tr>
      `).join("")}</tbody>
    </table>
  </div>`;
}

function mentionList(mentions = []) {
  if (!mentions.length) {
    return emptyState("暂无提及。");
  }
  return `<ul class="collab-side-list">${mentions.map((mention) => `
    <li class="${mention.status === "unread" ? "is-unread" : ""}">
      <div>
        <strong>@${escapeHtml(mention.label || mention.targetId)}</strong>
        <p class="muted">${escapeHtml(mention.context || "")}</p>
      </div>
      <div class="inline-actions">
        ${statusBadge(mention.status || "unread", mention.status === "unread" ? "warning" : "low")}
        ${mention.status === "unread" ? `<button class="btn small" data-action="read-collaboration-mention" data-id="${escapeHtml(mention.id)}">已读</button>` : ""}
      </div>
    </li>
  `).join("")}</ul>`;
}

function summaryList(summaries = []) {
  if (!summaries.length) {
    return emptyState("暂无摘要。");
  }
  return `<div class="collab-summary-list">${summaries.map((summary) => `
    <article>
      <div class="collab-summary-head">
        <strong>${escapeHtml(formatDate(summary.createdAt))}</strong>
        <span class="tag">${escapeHtml(summary.messageCount || 0)} 条消息</span>
      </div>
      <p>${escapeHtml(summary.summary)}</p>
      ${(summary.decisions || []).length ? `<div class="subpanel"><strong>决策</strong><ul class="plain-list">${summary.decisions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
      ${(summary.actionItems || []).length ? `<div class="subpanel"><strong>行动</strong><ul class="plain-list">${summary.actionItems.map((item) => `<li>${escapeHtml(item.title || item)}</li>`).join("")}</ul></div>` : ""}
      ${(summary.risks || []).length ? `<div class="subpanel"><strong>风险</strong><ul class="plain-list">${summary.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
    </article>
  `).join("")}</div>`;
}

function auditList(records = []) {
  if (!records.length) {
    return emptyState("暂无审计记录。");
  }
  return `<ul class="collab-side-list">${records.map((record) => `
    <li>
      <div>
        <strong>${escapeHtml(record.action)}</strong>
        <p class="muted">${escapeHtml(record.summary || record.resourceId)}</p>
      </div>
      <span class="muted">${escapeHtml(formatDate(record.occurredAt || record.createdAt))}</span>
    </li>
  `).join("")}</ul>`;
}

function insightPanel(insight) {
  if (!insight) {
    return emptyState("暂无空间洞察。");
  }
  const metrics = insight.metrics || {};
  return `
    <div class="stats-grid compact-stats">
      ${metric("健康度", metrics.healthScore ?? 0)}
      ${metric("任务完成", `${metrics.taskCompletionRate ?? 0}%`)}
      ${metric("清单完成", `${metrics.checklistCompletionRate ?? 0}%`)}
      ${metric("近期消息", metrics.recentMessageCount ?? 0)}
    </div>
    ${(insight.risks || []).length ? `<div class="subpanel"><strong>风险</strong><ul class="plain-list">${insight.risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul></div>` : ""}
    ${(insight.recommendedActions || []).length ? `<div class="subpanel"><strong>行动</strong><ul class="plain-list">${insight.recommendedActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ul></div>` : ""}
  `;
}

function decisionList(decisions = []) {
  if (!decisions.length) {
    return emptyState("暂无决策。");
  }
  return `<div class="collab-summary-list">${decisions.map((decision) => `
    <article>
      <div class="collab-summary-head">
        <strong>${escapeHtml(decision.title)}</strong>
        ${statusBadge(decision.status || "proposed", decision.status || "active")}
      </div>
      <p>${escapeHtml(decision.rationale || "")}</p>
      ${decision.impact ? `<p class="muted">${escapeHtml(decision.impact)}</p>` : ""}
      ${(decision.tags || []).length ? `<div class="tag-row">${decision.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
    </article>
  `).join("")}</div>`;
}

function resourceList(resources = []) {
  if (!resources.length) {
    return emptyState("暂无资源。");
  }
  return `<ul class="collab-side-list">${resources.map((resource) => `
    <li>
      <div>
        <strong>${escapeHtml(resource.title)}</strong>
        <p class="muted">${escapeHtml(resource.description || resource.url)}</p>
        <div class="tag-row">
          ${statusBadge(resource.type || "link", "active")}
          ${(resource.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
    </li>
  `).join("")}</ul>`;
}

function checklistList(items = [], users = []) {
  if (!items.length) {
    return emptyState("暂无清单项。");
  }
  return `<ul class="collab-side-list">${items.map((item) => `
    <li>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p class="muted">${escapeHtml(item.description || "")}</p>
        <div class="tag-row">
          ${statusBadge(item.status || "open")}
          <span class="tag">${escapeHtml(userName(users, item.ownerId))}</span>
          <span class="tag">${escapeHtml(formatDate(item.dueAt))}</span>
        </div>
      </div>
      <div class="inline-actions">
        ${item.status === "done"
          ? `<button class="btn small" data-action="reopen-collaboration-checklist" data-id="${escapeHtml(item.id)}">重开</button>`
          : `<button class="btn small" data-action="complete-collaboration-checklist" data-id="${escapeHtml(item.id)}">完成</button>`}
      </div>
    </li>
  `).join("")}</ul>`;
}

function handoffList(items = [], users = []) {
  if (!items.length) {
    return emptyState("暂无交接。");
  }
  return `<ul class="collab-side-list">${items.map((item) => `
    <li>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p class="muted">${escapeHtml(item.context || "")}</p>
        <div class="tag-row">
          ${statusBadge(item.status || "open")}
          <span class="tag">${escapeHtml(userName(users, item.fromUserId))} -> ${escapeHtml(userName(users, item.toUserId))}</span>
        </div>
        ${(item.blockers || []).length ? `<div class="subpanel"><strong>阻塞</strong><ul class="plain-list">${item.blockers.map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join("")}</ul></div>` : ""}
        ${(item.nextSteps || []).length ? `<div class="subpanel"><strong>下一步</strong><ul class="plain-list">${item.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul></div>` : ""}
      </div>
      <div class="inline-actions">
        ${item.status === "open" ? `<button class="btn small" data-action="accept-collaboration-handoff" data-id="${escapeHtml(item.id)}">接受</button>` : ""}
        ${item.status !== "closed" ? `<button class="btn small" data-action="close-collaboration-handoff" data-id="${escapeHtml(item.id)}">关闭</button>` : `<button class="btn small" data-action="reopen-collaboration-handoff" data-id="${escapeHtml(item.id)}">重开</button>`}
      </div>
    </li>
  `).join("")}</ul>`;
}

function filterForm(state, selectedRoomId) {
  const courses = state.dashboard?.courses || [];
  const rooms = state.collaboration?.rooms || [];
  const filter = state.filters.collaboration || {};
  return `
    <form class="filter-toolbar collaboration-filter" data-form="collaboration-filter">
      <label><span>课程</span><select name="courseId">
        <option value="">全部课程</option>
        ${optionList(courses, filter.courseId, (course) => course.id, (course) => course.title)}
      </select></label>
      <label><span>类型</span><select name="type">
        <option value="">全部类型</option>
        ${["course", "assignment", "group", "ad_hoc"].map((type) => `<option value="${type}" ${filter.type === type ? "selected" : ""}>${type}</option>`).join("")}
      </select></label>
      <label><span>空间</span><select name="roomId">
        <option value="">自动选择</option>
        ${optionList(rooms, selectedRoomId, (room) => room.id, (room) => room.title)}
      </select></label>
      <label><span>任务</span><select name="taskStatus">
        <option value="">全部任务</option>
        ${["open", "doing", "blocked", "done"].map((status) => `<option value="${status}" ${filter.taskStatus === status ? "selected" : ""}>${status}</option>`).join("")}
      </select></label>
      <div class="filter-actions">
        <button class="btn primary" type="submit">应用</button>
      </div>
    </form>
  `;
}

function roomForm(state) {
  const courseId = state.filters.collaboration?.courseId || state.dashboard?.courses?.[0]?.id || "";
  return `
    <form class="panel form-grid" data-form="collaboration-room">
      <div class="panel-header"><h2>新建空间</h2></div>
      <label><span>标题</span><input name="title" required placeholder="输入空间标题" /></label>
      <label><span>课程</span><select name="courseId">
        ${optionList(state.dashboard?.courses || [], courseId, (course) => course.id, (course) => course.title)}
      </select></label>
      <div class="grid two-field-row">
        <label><span>类型</span><select name="type">
          <option value="course">course</option>
          <option value="assignment">assignment</option>
          <option value="group">group</option>
          <option value="ad_hoc">ad_hoc</option>
        </select></label>
        <label><span>可见范围</span><select name="visibility">
          <option value="course">course</option>
          <option value="group">group</option>
          <option value="private">private</option>
          <option value="public">public</option>
        </select></label>
      </div>
      <label><span>描述</span><textarea name="description" rows="3"></textarea></label>
      <label><span>标签</span><input name="tags" placeholder="接口, 报告, 评审" /></label>
      <button class="btn primary" type="submit">创建空间</button>
    </form>
  `;
}

function memberForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-member">
      <div class="panel-header"><h2>成员</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>用户编号</span><input name="userId" required placeholder="用户编号" /></label>
      <label><span>显示名称</span><input name="displayName" placeholder="成员名称" /></label>
      <div class="grid two-field-row">
        <label><span>角色</span><select name="role">
          <option value="member">member</option>
          <option value="owner">owner</option>
          <option value="reviewer">reviewer</option>
        </select></label>
        <label><span>提醒</span><select name="notificationLevel">
          <option value="mentions">mentions</option>
          <option value="all">all</option>
          <option value="none">none</option>
        </select></label>
      </div>
      <button class="btn" type="submit">保存成员</button>
    </form>
  `;
}

function messageForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="message">
      <div class="panel-header"><h2>消息</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>内容</span><textarea name="content" rows="5" required placeholder="输入消息，可 @成员"></textarea></label>
      <button class="btn primary" type="submit">发送</button>
    </form>
  `;
}

function taskForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-task">
      <div class="panel-header"><h2>任务</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>标题</span><input name="title" required placeholder="输入任务标题" /></label>
      <label><span>描述</span><textarea name="description" rows="3"></textarea></label>
      <div class="grid two-field-row">
        <label><span>负责人</span><input name="assigneeId" placeholder="用户编号" /></label>
        <label><span>截止时间</span><input name="dueAt" type="datetime-local" /></label>
      </div>
      <div class="grid two-field-row">
        <label><span>优先级</span><select name="priority">
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="urgent">urgent</option>
          <option value="low">low</option>
        </select></label>
        <label><span>状态</span><select name="status">
          <option value="open">open</option>
          <option value="doing">doing</option>
          <option value="blocked">blocked</option>
        </select></label>
      </div>
      <label><span>标签</span><input name="labels" placeholder="接口, 前端" /></label>
      <label><span>验收标准</span><textarea name="acceptanceCriteria" rows="3" placeholder="每行一条标准"></textarea></label>
      <button class="btn" type="submit">创建任务</button>
    </form>
  `;
}

function summaryForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-summary">
      <div class="panel-header"><h2>摘要</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>摘要</span><textarea name="summary" rows="4" placeholder="留空则根据讨论生成"></textarea></label>
      <label><span>决策</span><textarea name="decisions" rows="3" placeholder="每行一条决策"></textarea></label>
      <label><span>风险</span><textarea name="risks" rows="3" placeholder="每行一条风险"></textarea></label>
      <button class="btn" type="submit">生成摘要</button>
    </form>
  `;
}

function decisionForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-decision">
      <div class="panel-header"><h2>决策</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>标题</span><input name="title" required placeholder="输入决策标题" /></label>
      <label><span>理由</span><textarea name="rationale" rows="3"></textarea></label>
      <label><span>影响</span><textarea name="impact" rows="2"></textarea></label>
      <div class="grid two-field-row">
        <label><span>状态</span><select name="status">
          <option value="proposed">proposed</option>
          <option value="accepted">accepted</option>
          <option value="rejected">rejected</option>
          <option value="superseded">superseded</option>
        </select></label>
        <label><span>标签</span><input name="tags" placeholder="架构, 风险" /></label>
      </div>
      <button class="btn" type="submit">记录决策</button>
    </form>
  `;
}

function resourceForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-resource">
      <div class="panel-header"><h2>资源</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>标题</span><input name="title" required placeholder="输入资源标题" /></label>
      <label><span>链接</span><input name="url" required placeholder="https://..." /></label>
      <div class="grid two-field-row">
        <label><span>类型</span><select name="type">
          <option value="link">link</option>
          <option value="document">document</option>
          <option value="repository">repository</option>
          <option value="dataset">dataset</option>
          <option value="rubric">rubric</option>
          <option value="meeting_note">meeting_note</option>
        </select></label>
        <label><span>标签</span><input name="tags" placeholder="文档, 接口" /></label>
      </div>
      <label><span>描述</span><textarea name="description" rows="2"></textarea></label>
      <button class="btn" type="submit">共享资源</button>
    </form>
  `;
}

function checklistForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-checklist">
      <div class="panel-header"><h2>清单</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>标题</span><input name="title" required placeholder="输入清单项" /></label>
      <label><span>描述</span><textarea name="description" rows="2"></textarea></label>
      <div class="grid two-field-row">
        <label><span>负责人</span><input name="ownerId" placeholder="用户编号" /></label>
        <label><span>截止时间</span><input name="dueAt" type="datetime-local" /></label>
      </div>
      <div class="grid two-field-row">
        <label><span>状态</span><select name="status">
          <option value="open">open</option>
          <option value="doing">doing</option>
          <option value="blocked">blocked</option>
        </select></label>
        <label><span>排序</span><input name="sortOrder" type="number" min="0" value="0" /></label>
      </div>
      <button class="btn" type="submit">添加清单</button>
    </form>
  `;
}

function handoffForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-handoff">
      <div class="panel-header"><h2>交接</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>标题</span><input name="title" required placeholder="输入交接标题" /></label>
      <label><span>接收人</span><input name="toUserId" required placeholder="用户编号" /></label>
      <label><span>上下文</span><textarea name="context" rows="3"></textarea></label>
      <label><span>阻塞</span><textarea name="blockers" rows="2" placeholder="每行一条阻塞"></textarea></label>
      <label><span>下一步</span><textarea name="nextSteps" rows="3" placeholder="每行一条行动"></textarea></label>
      <label><span>状态</span><select name="status">
        <option value="open">open</option>
        <option value="accepted">accepted</option>
      </select></label>
      <button class="btn" type="submit">创建交接</button>
    </form>
  `;
}

export function teamView(state) {
  const users = state.dashboard?.users || [];
  const rooms = state.collaboration?.rooms || [];
  const workspace = state.collaboration?.workspace || null;
  const selectedRoomId = state.selected.collaborationRoomId || workspace?.room?.id || rooms[0]?.id || "room_ood";
  const room = workspace?.room || rooms.find((item) => item.id === selectedRoomId) || null;
  return `
    ${filterForm(state, selectedRoomId)}
    ${roomMetrics(rooms, workspace)}
    <section class="collaboration-layout">
      <aside class="collaboration-left">
        <div class="panel">
          <div class="panel-header"><h2>协作空间</h2></div>
          ${roomList(rooms, selectedRoomId)}
        </div>
        ${roomForm(state)}
      </aside>
      <main class="collaboration-main">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2>${escapeHtml(room?.title || "团队协作")}</h2>
              <p class="muted">${escapeHtml(room?.description || "")}</p>
            </div>
            <div class="tag-row">
              ${room ? statusBadge(room.type || "course") : ""}
              ${room ? statusBadge(room.status || "active", room.status || "active") : ""}
            </div>
          </div>
          ${messageThreadList(workspace?.messages || state.messages || [], users, selectedRoomId)}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>空间洞察</h2></div>
          ${insightPanel(state.collaboration?.insight || workspace?.insight)}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>协作任务</h2></div>
          ${taskBoard(state.collaboration?.tasks || workspace?.tasks || [], users)}
        </div>
      </main>
      <aside class="collaboration-right">
        ${messageForm(selectedRoomId)}
        ${taskForm(selectedRoomId)}
        ${decisionForm(selectedRoomId)}
        ${resourceForm(selectedRoomId)}
        ${checklistForm(selectedRoomId)}
        ${handoffForm(selectedRoomId)}
        ${memberForm(selectedRoomId)}
        ${summaryForm(selectedRoomId)}
        <div class="panel">
          <div class="panel-header"><h2>成员</h2></div>
          ${memberList(workspace?.members || [])}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>提及</h2></div>
          ${mentionList(state.collaboration?.mentions || workspace?.mentions || [])}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>决策</h2></div>
          ${decisionList(state.collaboration?.decisions || workspace?.decisions || [])}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>资源</h2></div>
          ${resourceList(state.collaboration?.resources || workspace?.resources || [])}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>清单</h2></div>
          ${checklistList(state.collaboration?.checklist || workspace?.checklist || [], users)}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>交接</h2></div>
          ${handoffList(state.collaboration?.handoffs || workspace?.handoffs || [], users)}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>摘要</h2></div>
          ${summaryList(workspace?.summaries || [])}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>审计</h2></div>
          ${auditList(state.collaboration?.audit || workspace?.audit || [])}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>近期活动</h2></div>
          ${activityList(state.activity || [])}
        </div>
      </aside>
    </section>
  `;
}
