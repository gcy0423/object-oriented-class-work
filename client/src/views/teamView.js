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
      ${metric("Rooms", rooms.length)}
      ${metric("Members", stats.memberCount ?? 0)}
      ${metric("Messages", (stats.messageCount ?? 0) + (stats.replyCount ?? 0))}
      ${metric("Open tasks", stats.openTaskCount ?? 0)}
    </div>
  `;
}

function roomList(rooms = [], selectedRoomId = "") {
  if (!rooms.length) {
    return emptyState("No collaboration rooms.");
  }
  return `<div class="collab-room-list">${rooms.map((room) => `
    <article class="collab-room ${room.id === selectedRoomId ? "is-selected" : ""}">
      <div class="collab-room-head">
        <div>
          <strong>${escapeHtml(room.title)}</strong>
          <div class="muted">${escapeHtml(room.description || "No description")}</div>
        </div>
        <button class="btn small" data-action="select-collaboration-room" data-id="${escapeHtml(room.id)}">Open</button>
      </div>
      <div class="tag-row">
        ${statusBadge(room.type || "course")}
        ${room.pinned ? statusBadge("pinned", "active") : ""}
        <span class="tag">${escapeHtml(room.stats?.memberCount ?? 0)} members</span>
        <span class="tag">${escapeHtml(room.stats?.openTaskCount ?? 0)} open tasks</span>
        <span class="tag">${escapeHtml(formatDate(room.stats?.lastMessageAt || room.updatedAt))}</span>
      </div>
    </article>
  `).join("")}</div>`;
}

function memberList(members = []) {
  if (!members.length) {
    return emptyState("No room members.");
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
          ${(message.replies || []).length ? `<span class="tag">${escapeHtml(message.replies.length)} replies</span>` : ""}
        </div>
      </div>
      <p>${escapeHtml(message.content)}</p>
      ${replyList(message.replies || [], users)}
      <form class="collab-inline-reply form-grid compact-form" data-form="collaboration-reply">
        <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
        <input type="hidden" name="messageId" value="${escapeHtml(message.id)}" />
        <label><span>Reply</span><textarea name="content" rows="2" required placeholder="Reply or @user_id"></textarea></label>
        <div class="button-row">
          <button class="btn small" type="submit">Reply</button>
        </div>
      </form>
    </article>
  `).join("")}</div>`;
}

function taskBoard(tasks = [], users = []) {
  if (!tasks.length) {
    return emptyState("No collaboration tasks.");
  }
  return `<div class="table-wrap">
    <table class="data-table collab-table">
      <thead><tr><th>Task</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due</th><th>Action</th></tr></thead>
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
              ? `<button class="btn small" data-action="reopen-collaboration-task" data-id="${escapeHtml(task.id)}">Reopen</button>`
              : `<button class="btn small" data-action="complete-collaboration-task" data-id="${escapeHtml(task.id)}">Done</button>`}
          </td>
        </tr>
      `).join("")}</tbody>
    </table>
  </div>`;
}

function mentionList(mentions = []) {
  if (!mentions.length) {
    return emptyState("No mentions.");
  }
  return `<ul class="collab-side-list">${mentions.map((mention) => `
    <li class="${mention.status === "unread" ? "is-unread" : ""}">
      <div>
        <strong>@${escapeHtml(mention.label || mention.targetId)}</strong>
        <p class="muted">${escapeHtml(mention.context || "")}</p>
      </div>
      <div class="inline-actions">
        ${statusBadge(mention.status || "unread", mention.status === "unread" ? "warning" : "low")}
        ${mention.status === "unread" ? `<button class="btn small" data-action="read-collaboration-mention" data-id="${escapeHtml(mention.id)}">Read</button>` : ""}
      </div>
    </li>
  `).join("")}</ul>`;
}

function summaryList(summaries = []) {
  if (!summaries.length) {
    return emptyState("No summaries.");
  }
  return `<div class="collab-summary-list">${summaries.map((summary) => `
    <article>
      <div class="collab-summary-head">
        <strong>${escapeHtml(formatDate(summary.createdAt))}</strong>
        <span class="tag">${escapeHtml(summary.messageCount || 0)} messages</span>
      </div>
      <p>${escapeHtml(summary.summary)}</p>
      ${(summary.decisions || []).length ? `<div class="subpanel"><strong>Decisions</strong><ul class="plain-list">${summary.decisions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
      ${(summary.actionItems || []).length ? `<div class="subpanel"><strong>Actions</strong><ul class="plain-list">${summary.actionItems.map((item) => `<li>${escapeHtml(item.title || item)}</li>`).join("")}</ul></div>` : ""}
      ${(summary.risks || []).length ? `<div class="subpanel"><strong>Risks</strong><ul class="plain-list">${summary.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
    </article>
  `).join("")}</div>`;
}

function auditList(records = []) {
  if (!records.length) {
    return emptyState("No audit records.");
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
    return emptyState("No room insight.");
  }
  const metrics = insight.metrics || {};
  return `
    <div class="stats-grid compact-stats">
      ${metric("Health", metrics.healthScore ?? 0)}
      ${metric("Task done", `${metrics.taskCompletionRate ?? 0}%`)}
      ${metric("Checklist", `${metrics.checklistCompletionRate ?? 0}%`)}
      ${metric("Recent msgs", metrics.recentMessageCount ?? 0)}
    </div>
    ${(insight.risks || []).length ? `<div class="subpanel"><strong>Risks</strong><ul class="plain-list">${insight.risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul></div>` : ""}
    ${(insight.recommendedActions || []).length ? `<div class="subpanel"><strong>Actions</strong><ul class="plain-list">${insight.recommendedActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ul></div>` : ""}
  `;
}

function decisionList(decisions = []) {
  if (!decisions.length) {
    return emptyState("No decisions.");
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
    return emptyState("No resources.");
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
    return emptyState("No checklist items.");
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
          ? `<button class="btn small" data-action="reopen-collaboration-checklist" data-id="${escapeHtml(item.id)}">Reopen</button>`
          : `<button class="btn small" data-action="complete-collaboration-checklist" data-id="${escapeHtml(item.id)}">Done</button>`}
      </div>
    </li>
  `).join("")}</ul>`;
}

function handoffList(items = [], users = []) {
  if (!items.length) {
    return emptyState("No handoffs.");
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
        ${(item.blockers || []).length ? `<div class="subpanel"><strong>Blockers</strong><ul class="plain-list">${item.blockers.map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join("")}</ul></div>` : ""}
        ${(item.nextSteps || []).length ? `<div class="subpanel"><strong>Next</strong><ul class="plain-list">${item.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul></div>` : ""}
      </div>
      <div class="inline-actions">
        ${item.status === "open" ? `<button class="btn small" data-action="accept-collaboration-handoff" data-id="${escapeHtml(item.id)}">Accept</button>` : ""}
        ${item.status !== "closed" ? `<button class="btn small" data-action="close-collaboration-handoff" data-id="${escapeHtml(item.id)}">Close</button>` : `<button class="btn small" data-action="reopen-collaboration-handoff" data-id="${escapeHtml(item.id)}">Reopen</button>`}
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
      <label><span>Course</span><select name="courseId">
        <option value="">All courses</option>
        ${optionList(courses, filter.courseId, (course) => course.id, (course) => course.title)}
      </select></label>
      <label><span>Type</span><select name="type">
        <option value="">All types</option>
        ${["course", "assignment", "group", "ad_hoc"].map((type) => `<option value="${type}" ${filter.type === type ? "selected" : ""}>${type}</option>`).join("")}
      </select></label>
      <label><span>Room</span><select name="roomId">
        <option value="">Auto</option>
        ${optionList(rooms, selectedRoomId, (room) => room.id, (room) => room.title)}
      </select></label>
      <label><span>Task</span><select name="taskStatus">
        <option value="">All tasks</option>
        ${["open", "doing", "blocked", "done"].map((status) => `<option value="${status}" ${filter.taskStatus === status ? "selected" : ""}>${status}</option>`).join("")}
      </select></label>
      <div class="filter-actions">
        <button class="btn primary" type="submit">Apply</button>
      </div>
    </form>
  `;
}

function roomForm(state) {
  const courseId = state.filters.collaboration?.courseId || state.dashboard?.courses?.[0]?.id || "";
  return `
    <form class="panel form-grid" data-form="collaboration-room">
      <div class="panel-header"><h2>New Room</h2></div>
      <label><span>Title</span><input name="title" required placeholder="Room title" /></label>
      <label><span>Course</span><select name="courseId">
        ${optionList(state.dashboard?.courses || [], courseId, (course) => course.id, (course) => course.title)}
      </select></label>
      <div class="grid two-field-row">
        <label><span>Type</span><select name="type">
          <option value="course">course</option>
          <option value="assignment">assignment</option>
          <option value="group">group</option>
          <option value="ad_hoc">ad_hoc</option>
        </select></label>
        <label><span>Visibility</span><select name="visibility">
          <option value="course">course</option>
          <option value="group">group</option>
          <option value="private">private</option>
          <option value="public">public</option>
        </select></label>
      </div>
      <label><span>Description</span><textarea name="description" rows="3"></textarea></label>
      <label><span>Tags</span><input name="tags" placeholder="api, report, review" /></label>
      <button class="btn primary" type="submit">Create Room</button>
    </form>
  `;
}

function memberForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-member">
      <div class="panel-header"><h2>Member</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>User ID</span><input name="userId" required placeholder="user_student" /></label>
      <label><span>Display name</span><input name="displayName" placeholder="Student" /></label>
      <div class="grid two-field-row">
        <label><span>Role</span><select name="role">
          <option value="member">member</option>
          <option value="owner">owner</option>
          <option value="reviewer">reviewer</option>
        </select></label>
        <label><span>Notify</span><select name="notificationLevel">
          <option value="mentions">mentions</option>
          <option value="all">all</option>
          <option value="none">none</option>
        </select></label>
      </div>
      <button class="btn" type="submit">Save Member</button>
    </form>
  `;
}

function messageForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="message">
      <div class="panel-header"><h2>Message</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>Content</span><textarea name="content" rows="5" required placeholder="Use @user_student to mention someone"></textarea></label>
      <button class="btn primary" type="submit">Send</button>
    </form>
  `;
}

function taskForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-task">
      <div class="panel-header"><h2>Task</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>Title</span><input name="title" required placeholder="Task title" /></label>
      <label><span>Description</span><textarea name="description" rows="3"></textarea></label>
      <div class="grid two-field-row">
        <label><span>Assignee</span><input name="assigneeId" placeholder="user_student" /></label>
        <label><span>Due</span><input name="dueAt" type="datetime-local" /></label>
      </div>
      <div class="grid two-field-row">
        <label><span>Priority</span><select name="priority">
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="urgent">urgent</option>
          <option value="low">low</option>
        </select></label>
        <label><span>Status</span><select name="status">
          <option value="open">open</option>
          <option value="doing">doing</option>
          <option value="blocked">blocked</option>
        </select></label>
      </div>
      <label><span>Labels</span><input name="labels" placeholder="api, frontend" /></label>
      <label><span>Acceptance criteria</span><textarea name="acceptanceCriteria" rows="3" placeholder="One item per line"></textarea></label>
      <button class="btn" type="submit">Create Task</button>
    </form>
  `;
}

function summaryForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-summary">
      <div class="panel-header"><h2>Summary</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>Summary</span><textarea name="summary" rows="4" placeholder="Leave empty to generate from discussion"></textarea></label>
      <label><span>Decisions</span><textarea name="decisions" rows="3" placeholder="One decision per line"></textarea></label>
      <label><span>Risks</span><textarea name="risks" rows="3" placeholder="One risk per line"></textarea></label>
      <button class="btn" type="submit">Generate Summary</button>
    </form>
  `;
}

function decisionForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-decision">
      <div class="panel-header"><h2>Decision</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>Title</span><input name="title" required placeholder="Decision title" /></label>
      <label><span>Rationale</span><textarea name="rationale" rows="3"></textarea></label>
      <label><span>Impact</span><textarea name="impact" rows="2"></textarea></label>
      <div class="grid two-field-row">
        <label><span>Status</span><select name="status">
          <option value="proposed">proposed</option>
          <option value="accepted">accepted</option>
          <option value="rejected">rejected</option>
          <option value="superseded">superseded</option>
        </select></label>
        <label><span>Tags</span><input name="tags" placeholder="architecture, risk" /></label>
      </div>
      <button class="btn" type="submit">Record Decision</button>
    </form>
  `;
}

function resourceForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-resource">
      <div class="panel-header"><h2>Resource</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>Title</span><input name="title" required placeholder="Resource title" /></label>
      <label><span>URL</span><input name="url" required placeholder="https://..." /></label>
      <div class="grid two-field-row">
        <label><span>Type</span><select name="type">
          <option value="link">link</option>
          <option value="document">document</option>
          <option value="repository">repository</option>
          <option value="dataset">dataset</option>
          <option value="rubric">rubric</option>
          <option value="meeting_note">meeting_note</option>
        </select></label>
        <label><span>Tags</span><input name="tags" placeholder="doc, api" /></label>
      </div>
      <label><span>Description</span><textarea name="description" rows="2"></textarea></label>
      <button class="btn" type="submit">Share Resource</button>
    </form>
  `;
}

function checklistForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-checklist">
      <div class="panel-header"><h2>Checklist</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>Title</span><input name="title" required placeholder="Checklist item" /></label>
      <label><span>Description</span><textarea name="description" rows="2"></textarea></label>
      <div class="grid two-field-row">
        <label><span>Owner</span><input name="ownerId" placeholder="user_student" /></label>
        <label><span>Due</span><input name="dueAt" type="datetime-local" /></label>
      </div>
      <div class="grid two-field-row">
        <label><span>Status</span><select name="status">
          <option value="open">open</option>
          <option value="doing">doing</option>
          <option value="blocked">blocked</option>
        </select></label>
        <label><span>Order</span><input name="sortOrder" type="number" min="0" value="0" /></label>
      </div>
      <button class="btn" type="submit">Add Checklist</button>
    </form>
  `;
}

function handoffForm(selectedRoomId) {
  return `
    <form class="panel form-grid" data-form="collaboration-handoff">
      <div class="panel-header"><h2>Handoff</h2></div>
      <input type="hidden" name="roomId" value="${escapeHtml(selectedRoomId)}" />
      <label><span>Title</span><input name="title" required placeholder="Handoff title" /></label>
      <label><span>Target user</span><input name="toUserId" required placeholder="user_student" /></label>
      <label><span>Context</span><textarea name="context" rows="3"></textarea></label>
      <label><span>Blockers</span><textarea name="blockers" rows="2" placeholder="One blocker per line"></textarea></label>
      <label><span>Next steps</span><textarea name="nextSteps" rows="3" placeholder="One next step per line"></textarea></label>
      <label><span>Status</span><select name="status">
        <option value="open">open</option>
        <option value="accepted">accepted</option>
      </select></label>
      <button class="btn" type="submit">Create Handoff</button>
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
          <div class="panel-header"><h2>Rooms</h2></div>
          ${roomList(rooms, selectedRoomId)}
        </div>
        ${roomForm(state)}
      </aside>
      <main class="collaboration-main">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2>${escapeHtml(room?.title || "Team Workspace")}</h2>
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
          <div class="panel-header"><h2>Room Insight</h2></div>
          ${insightPanel(state.collaboration?.insight || workspace?.insight)}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>Collaboration Tasks</h2></div>
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
          <div class="panel-header"><h2>Members</h2></div>
          ${memberList(workspace?.members || [])}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>Mentions</h2></div>
          ${mentionList(state.collaboration?.mentions || workspace?.mentions || [])}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>Decisions</h2></div>
          ${decisionList(state.collaboration?.decisions || workspace?.decisions || [])}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>Resources</h2></div>
          ${resourceList(state.collaboration?.resources || workspace?.resources || [])}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>Checklist</h2></div>
          ${checklistList(state.collaboration?.checklist || workspace?.checklist || [], users)}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>Handoffs</h2></div>
          ${handoffList(state.collaboration?.handoffs || workspace?.handoffs || [], users)}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>Summaries</h2></div>
          ${summaryList(workspace?.summaries || [])}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>Audit</h2></div>
          ${auditList(state.collaboration?.audit || workspace?.audit || [])}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>Recent Activity</h2></div>
          ${activityList(state.activity || [])}
        </div>
      </aside>
    </section>
  `;
}
