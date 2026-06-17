import { emptyState, escapeHtml, formatDate, metric, statusBadge } from "../components.js";

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function roleTone(role) {
  return role === "admin" ? "high" : role === "teacher" ? "active" : "low";
}

function optionList(items = [], selected = "", getValue = (item) => item.id, getLabel = (item) => item.name || item.title || item.id) {
  return items.map((item) => {
    const value = getValue(item);
    return `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(getLabel(item))}</option>`;
  }).join("");
}

function courseOptions(courses = [], selected = "") {
  return optionList(courses, selected, (course) => course.id, (course) => course.title || course.id);
}

function userOptions(users = [], selected = "", role = "") {
  const filtered = role ? users.filter((user) => user.role === role) : users;
  return optionList(filtered, selected, (user) => user.id, (user) => `${user.name || user.id} / ${user.role}`);
}

function classOptions(classrooms = [], selected = "") {
  return optionList(classrooms, selected, (classroom) => classroom.id, (classroom) => `${classroom.name} / ${classroom.courseId}`);
}

function groupOptions(groups = [], selected = "") {
  return optionList(groups, selected, (group) => group.id, (group) => `${group.name} / ${group.classroomId}`);
}

function adminMetrics(dashboard = {}, users = [], classrooms = [], groups = []) {
  const metrics = dashboard.metrics || {};
  return `
    <div class="stats-grid compact-stats identity-metrics">
      ${metric("Users", metrics.userCount ?? users.length)}
      ${metric("Students", metrics.studentCount ?? users.filter((user) => user.role === "student").length)}
      ${metric("Teachers", metrics.teacherCount ?? users.filter((user) => user.role === "teacher").length)}
      ${metric("Classes", metrics.classroomCount ?? classrooms.length)}
      ${metric("Groups", metrics.groupCount ?? groups.length)}
      ${metric("Enrollments", metrics.enrollmentCount ?? 0)}
    </div>
  `;
}

function filterPanel(state) {
  const filter = state.filters.identityAdmin || {};
  const courses = state.dashboard?.courses || [];
  return `
    <form class="panel form-grid identity-filter" data-form="identity-admin-filter">
      <label><span>Role</span><select name="role">
        <option value="">All roles</option>
        <option value="student" ${filter.role === "student" ? "selected" : ""}>Student</option>
        <option value="teacher" ${filter.role === "teacher" ? "selected" : ""}>Teacher</option>
        <option value="admin" ${filter.role === "admin" ? "selected" : ""}>Admin</option>
      </select></label>
      <label><span>Status</span><select name="status">
        <option value="">All statuses</option>
        <option value="active" ${filter.status === "active" ? "selected" : ""}>Active</option>
        <option value="pending" ${filter.status === "pending" ? "selected" : ""}>Pending</option>
        <option value="inactive" ${filter.status === "inactive" ? "selected" : ""}>Inactive</option>
        <option value="archived" ${filter.status === "archived" ? "selected" : ""}>Archived</option>
      </select></label>
      <label><span>Course</span><select name="courseId">
        <option value="">All courses</option>
        ${courseOptions(courses, filter.courseId)}
      </select></label>
      <label><span>Keyword</span><input name="q" value="${escapeHtml(filter.q || "")}" placeholder="name, email, department" /></label>
      <div class="button-row">
        <button class="btn primary" type="submit">Apply</button>
      </div>
    </form>
  `;
}

function userTable(users = [], selectedUserId = "") {
  if (!users.length) {
    return emptyState("No users match the current filters.");
  }
  return `
    <div class="table-wrap identity-user-table">
      <table class="data-table">
        <thead>
          <tr><th>User</th><th>Role</th><th>Status</th><th>Department</th><th>Classrooms</th><th>Groups</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${users.map((user) => `
            <tr class="${user.id === selectedUserId ? "selected-row" : ""}">
              <td>
                <strong>${escapeHtml(user.name || user.id)}</strong>
                <div class="muted">${escapeHtml(user.email || user.id)}</div>
              </td>
              <td>${statusBadge(user.role || "student", roleTone(user.role))}</td>
              <td>${statusBadge(user.status || "active")}</td>
              <td>${escapeHtml(user.department || user.major || "-")}</td>
              <td>${escapeHtml(user.classroomCount ?? 0)}</td>
              <td>${escapeHtml(user.groupCount ?? 0)}</td>
              <td><button class="btn small" data-action="view-identity-profile" data-id="${escapeHtml(user.id)}">Profile</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function profileForm(profile, users = []) {
  const user = profile?.user || users[0] || null;
  if (!user) {
    return emptyState("Select a user to inspect profile, enrollments, and group membership.");
  }
  return `
    <form class="panel form-grid identity-profile-form" data-form="identity-user-profile">
      <input type="hidden" name="id" value="${escapeHtml(user.id)}" />
      <div class="panel-header">
        <h2>User Profile</h2>
        <span class="tag">${escapeHtml(user.email || user.id)}</span>
      </div>
      <label><span>Name</span><input name="name" value="${escapeHtml(user.name || "")}" required /></label>
      <label><span>Role</span><select name="role">
        <option value="student" ${user.role === "student" ? "selected" : ""}>Student</option>
        <option value="teacher" ${user.role === "teacher" ? "selected" : ""}>Teacher</option>
        <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
      </select></label>
      <label><span>Status</span><select name="status">
        <option value="active" ${user.status === "active" ? "selected" : ""}>Active</option>
        <option value="pending" ${user.status === "pending" ? "selected" : ""}>Pending</option>
        <option value="inactive" ${user.status === "inactive" ? "selected" : ""}>Inactive</option>
        <option value="archived" ${user.status === "archived" ? "selected" : ""}>Archived</option>
      </select></label>
      <label><span>Department</span><input name="department" value="${escapeHtml(user.department || "")}" /></label>
      <label><span>Major</span><input name="major" value="${escapeHtml(user.major || "")}" /></label>
      <label><span>Student No.</span><input name="studentNo" value="${escapeHtml(user.studentNo || "")}" /></label>
      <label><span>Teacher No.</span><input name="teacherNo" value="${escapeHtml(user.teacherNo || "")}" /></label>
      <label><span>Phone</span><input name="phone" value="${escapeHtml(user.phone || "")}" /></label>
      <div class="button-row">
        <button class="btn primary" type="submit">Save Profile</button>
      </div>
    </form>
  `;
}

function profileEvidence(profile) {
  if (!profile) {
    return "";
  }
  const enrollments = asList(profile.enrollments);
  const groups = asList(profile.groups);
  return `
    <div class="panel identity-evidence">
      <div class="panel-header"><h2>Profile Evidence</h2></div>
      <div class="identity-evidence-grid">
        <section>
          <h3>Enrollments</h3>
          ${enrollments.length ? `<ul class="plain-list">${enrollments.map((item) => `
            <li>
              <strong>${escapeHtml(item.classroom?.name || item.classroomId)}</strong>
              <span class="muted">${escapeHtml(item.role)} / ${escapeHtml(item.status)} / ${escapeHtml(formatDate(item.joinedAt))}</span>
            </li>
          `).join("")}</ul>` : emptyState("No class enrollment.")}
        </section>
        <section>
          <h3>Groups</h3>
          ${groups.length ? `<ul class="plain-list">${groups.map((item) => `
            <li>
              <strong>${escapeHtml(item.group?.name || item.groupId)}</strong>
              <span class="muted">${escapeHtml(item.role)} / ${escapeHtml(item.status)} / ${escapeHtml(formatDate(item.joinedAt))}</span>
            </li>
          `).join("")}</ul>` : emptyState("No group membership.")}
        </section>
      </div>
    </div>
  `;
}

function classroomList(classrooms = [], selectedClassroomId = "") {
  if (!classrooms.length) {
    return emptyState("No classrooms have been created.");
  }
  return `
    <div class="identity-card-list">
      ${classrooms.map((classroom) => `
        <article class="identity-card ${classroom.id === selectedClassroomId ? "is-selected" : ""}">
          <div class="identity-card-head">
            <div>
              <strong>${escapeHtml(classroom.name)}</strong>
              <div class="muted">${escapeHtml(classroom.courseTitle || classroom.courseId)}</div>
            </div>
            <button class="btn small" data-action="view-classroom" data-id="${escapeHtml(classroom.id)}">Open</button>
          </div>
          <p>${escapeHtml(classroom.description || "No description")}</p>
          <div class="tag-row">
            ${statusBadge(classroom.status || "active")}
            <span class="tag">${escapeHtml(classroom.stats?.studentCount ?? 0)} students</span>
            <span class="tag">${escapeHtml(classroom.stats?.teacherCount ?? 0)} teachers</span>
            <span class="tag">${escapeHtml(classroom.stats?.groupCount ?? 0)} groups</span>
            <span class="tag">${escapeHtml(classroom.stats?.fillRate ?? 0)}% full</span>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function classroomDetailPanel(detail) {
  if (!detail) {
    return emptyState("Open a classroom to inspect enrollments and study groups.");
  }
  const classroom = detail.classroom || {};
  const enrollments = asList(detail.enrollments);
  const groups = asList(detail.groups);
  return `
    <div class="panel identity-classroom-detail">
      <div class="panel-header">
        <h2>Classroom Detail</h2>
        <span class="tag">${escapeHtml(classroom.id || "")}</span>
      </div>
      <div class="detail-block">
        <h3>${escapeHtml(classroom.name || "Classroom")}</h3>
        <p class="muted">${escapeHtml(classroom.description || "")}</p>
        <div class="tag-row">
          ${statusBadge(classroom.status || "active")}
          <span class="tag">${escapeHtml(classroom.courseId || "")}</span>
          <span class="tag">capacity ${escapeHtml(classroom.capacity ?? "-")}</span>
        </div>
      </div>
      <div class="identity-detail-grid">
        <section>
          <h3>Enrollments</h3>
          ${enrollments.length ? `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Source</th></tr></thead>
            <tbody>${enrollments.map((item) => `
              <tr>
                <td><strong>${escapeHtml(item.user?.name || item.userId)}</strong><div class="muted">${escapeHtml(item.user?.email || item.userId)}</div></td>
                <td>${statusBadge(item.role || "student", roleTone(item.role))}</td>
                <td>${statusBadge(item.status || "active")}</td>
                <td>${escapeHtml(item.source || "manual")}</td>
              </tr>
            `).join("")}</tbody>
          </table></div>` : emptyState("No enrollments.")}
        </section>
        <section>
          <h3>Study Groups</h3>
          ${groups.length ? `<ul class="identity-side-list">${groups.map((group) => `
            <li>
              <div>
                <strong>${escapeHtml(group.name)}</strong>
                <p class="muted">${escapeHtml(group.description || "")}</p>
              </div>
              <div class="tag-row">
                ${statusBadge(group.status || "active")}
                <span class="tag">${escapeHtml(group.stats?.memberCount ?? 0)} members</span>
                <span class="tag">${escapeHtml(group.stats?.leaderName || "-")}</span>
              </div>
            </li>
          `).join("")}</ul>` : emptyState("No groups in this classroom.")}
        </section>
      </div>
    </div>
  `;
}

function classroomForm(state) {
  const courses = state.dashboard?.courses || [];
  const users = state.identityAdmin.users || [];
  const filter = state.filters.identityAdmin || {};
  return `
    <form class="panel form-grid compact-form" data-form="identity-classroom">
      <div class="panel-header"><h2>Create Classroom</h2></div>
      <label><span>Name</span><input name="name" required placeholder="Object-Oriented Class 02" /></label>
      <label><span>Course</span><select name="courseId" required>
        <option value="">Select course</option>
        ${courseOptions(courses, filter.courseId)}
      </select></label>
      <label><span>Course Title</span><input name="courseTitle" placeholder="Course display title" /></label>
      <label><span>Owner</span><select name="teacherId">
        <option value="">Current teacher</option>
        ${userOptions(users, "", "teacher")}
      </select></label>
      <label><span>Capacity</span><input name="capacity" type="number" min="1" value="60" /></label>
      <label><span>Status</span><select name="status"><option value="active">Active</option><option value="pending">Pending</option></select></label>
      <label class="full-span"><span>Description</span><textarea name="description" rows="3"></textarea></label>
      <label class="full-span"><span>Tags</span><input name="tags" placeholder="course-project,teamwork" /></label>
      <div class="button-row"><button class="btn primary" type="submit">Create Class</button></div>
    </form>
  `;
}

function enrollmentForm(state) {
  const users = state.identityAdmin.users || [];
  const classrooms = state.identityAdmin.classrooms || [];
  const selected = state.selected.classroomId || state.filters.identityAdmin?.classroomId || classrooms[0]?.id || "";
  return `
    <form class="panel form-grid compact-form" data-form="identity-class-assignment">
      <div class="panel-header"><h2>Assign User</h2></div>
      <label><span>Classroom</span><select name="classroomId" required>
        ${classOptions(classrooms, selected)}
      </select></label>
      <label><span>User</span><select name="userId" required>
        <option value="">Select user</option>
        ${userOptions(users)}
      </select></label>
      <label><span>Role</span><select name="role">
        <option value="student">Student</option>
        <option value="teacher">Teacher</option>
      </select></label>
      <label><span>Status</span><select name="status">
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="inactive">Inactive</option>
      </select></label>
      <div class="button-row"><button class="btn primary" type="submit">Assign</button></div>
    </form>
  `;
}

function groupList(groups = []) {
  if (!groups.length) {
    return emptyState("No study groups have been created.");
  }
  return `
    <ul class="identity-side-list">
      ${groups.map((group) => `
        <li>
          <div>
            <strong>${escapeHtml(group.name)}</strong>
            <p class="muted">${escapeHtml(group.description || group.classroomId)}</p>
            <div class="tag-row">
              ${statusBadge(group.status || "active")}
              ${(group.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>
          <div class="tag-row">
            <span class="tag">${escapeHtml(group.stats?.memberCount ?? 0)} members</span>
            <span class="tag">${escapeHtml(group.stats?.leaderName || "-")}</span>
          </div>
        </li>
      `).join("")}
    </ul>
  `;
}

function groupForms(state) {
  const classrooms = state.identityAdmin.classrooms || [];
  const users = state.identityAdmin.users || [];
  const groups = state.identityAdmin.groups || [];
  const selectedClassroomId = state.selected.classroomId || state.filters.identityAdmin?.classroomId || classrooms[0]?.id || "";
  return `
    <div class="identity-form-stack">
      <form class="panel form-grid compact-form" data-form="identity-group">
        <div class="panel-header"><h2>Create Group</h2></div>
        <label><span>Classroom</span><select name="classroomId" required>
          ${classOptions(classrooms, selectedClassroomId)}
        </select></label>
        <label><span>Name</span><input name="name" required placeholder="Design Review Group" /></label>
        <label><span>Leader</span><select name="leaderId"><option value="">No leader</option>${userOptions(users)}</select></label>
        <label><span>Status</span><select name="status"><option value="active">Active</option><option value="pending">Pending</option></select></label>
        <label class="full-span"><span>Description</span><textarea name="description" rows="3"></textarea></label>
        <label class="full-span"><span>Tags</span><input name="tags" placeholder="frontend,report,assessment" /></label>
        <div class="button-row"><button class="btn primary" type="submit">Create Group</button></div>
      </form>
      <form class="panel form-grid compact-form" data-form="identity-group-member">
        <div class="panel-header"><h2>Add Group Member</h2></div>
        <label><span>Group</span><select name="groupId" required>${groupOptions(groups)}</select></label>
        <label><span>User</span><select name="userId" required><option value="">Select user</option>${userOptions(users)}</select></label>
        <label><span>Role</span><select name="role"><option value="member">Member</option><option value="leader">Leader</option><option value="reviewer">Reviewer</option></select></label>
        <label><span>Status</span><select name="status"><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option></select></label>
        <div class="button-row"><button class="btn primary" type="submit">Add Member</button></div>
      </form>
    </div>
  `;
}

function roleMatrixPanel(matrix) {
  if (!matrix) {
    return emptyState("No role permission matrix is available.");
  }
  return `
    <div class="panel identity-role-matrix">
      <div class="panel-header"><h2>Role Permission Matrix</h2></div>
      <div class="identity-permission-grid">
        ${asList(matrix.matrix).map((row) => `
          <section>
            <h3>${escapeHtml(row.role)}</h3>
            ${asList(row.resources).length ? `<ul class="plain-list">${row.resources.map((permission) => `
              <li>
                <strong>${escapeHtml(permission.resource)}</strong>
                <div class="tag-row">${asList(permission.actions).map((action) => `<span class="tag">${escapeHtml(action)}</span>`).join("")}</div>
                <p class="muted">${escapeHtml(permission.description || "")}</p>
              </li>
            `).join("")}</ul>` : emptyState("No permissions.")}
          </section>
        `).join("")}
      </div>
    </div>
  `;
}

export function identityAdminView(state) {
  const identity = state.identityAdmin || {};
  const users = identity.users || [];
  const classrooms = identity.classrooms || [];
  const groups = identity.groups || [];
  const selectedUserId = state.selected.identityUserId || identity.selectedProfile?.user?.id || users[0]?.id || "";
  const selectedClassroomId = state.selected.classroomId || identity.classroomDetail?.classroom?.id || "";
  return `
    ${filterPanel(state)}
    ${adminMetrics(identity.dashboard, users, classrooms, groups)}
    <div class="identity-layout">
      <section class="identity-main">
        <div class="panel">
          <div class="panel-header"><h2>User Directory</h2><span class="tag">${escapeHtml(users.length)} users</span></div>
          ${userTable(users, selectedUserId)}
        </div>
        ${profileForm(identity.selectedProfile, users)}
        ${profileEvidence(identity.selectedProfile)}
        <div class="panel">
          <div class="panel-header"><h2>Classrooms</h2><span class="tag">${escapeHtml(classrooms.length)} classes</span></div>
          ${classroomList(classrooms, selectedClassroomId)}
        </div>
        ${classroomDetailPanel(identity.classroomDetail)}
      </section>
      <aside class="identity-side">
        ${classroomForm(state)}
        ${enrollmentForm(state)}
        <div class="panel">
          <div class="panel-header"><h2>Study Groups</h2><span class="tag">${escapeHtml(groups.length)} groups</span></div>
          ${groupList(groups)}
        </div>
        ${groupForms(state)}
        ${roleMatrixPanel(identity.roleMatrix)}
      </aside>
    </div>
  `;
}
