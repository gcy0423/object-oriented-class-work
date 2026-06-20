import { emptyState, escapeHtml, formatDate, metric, statusBadge } from "../components.js";
import { roleText, statusText } from "../utils/format.js";

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
  return optionList(filtered, selected, (user) => user.id, (user) => `${user.name || user.id} / ${roleText(user.role)}`);
}

function classOptions(classrooms = [], selected = "") {
  return optionList(classrooms, selected, (classroom) => classroom.id, (classroom) => classroom.name);
}

function groupOptions(groups = [], selected = "") {
  return optionList(groups, selected, (group) => group.id, (group) => `${group.name} / ${group.classroomId}`);
}

function adminMetrics(dashboard = {}, users = [], classrooms = [], groups = []) {
  const metrics = (dashboard || {}).metrics || {};
  return `
    <div class="stats-grid compact-stats identity-metrics">
      ${metric("用户", metrics.userCount ?? users.length)}
      ${metric("学生", metrics.studentCount ?? users.filter((user) => user.role === "student").length)}
      ${metric("教师", metrics.teacherCount ?? users.filter((user) => user.role === "teacher").length)}
      ${metric("班级", metrics.classroomCount ?? classrooms.length)}
      ${metric("小组", metrics.groupCount ?? groups.length)}
      ${metric("选课关系", metrics.enrollmentCount ?? 0)}
    </div>
  `;
}

function filterPanel(state) {
  const filter = state.filters.identityAdmin || {};
  const courses = state.dashboard?.courses || [];
  return `
    <form class="panel form-grid identity-filter" data-form="identity-admin-filter">
      <label><span>角色</span><select name="role">
        <option value="">全部角色</option>
        <option value="student" ${filter.role === "student" ? "selected" : ""}>学生</option>
        <option value="teacher" ${filter.role === "teacher" ? "selected" : ""}>教师</option>
        <option value="admin" ${filter.role === "admin" ? "selected" : ""}>管理员</option>
      </select></label>
      <label><span>状态</span><select name="status">
        <option value="">全部状态</option>
        <option value="active" ${filter.status === "active" ? "selected" : ""}>进行中</option>
        <option value="pending" ${filter.status === "pending" ? "selected" : ""}>待处理</option>
        <option value="inactive" ${filter.status === "inactive" ? "selected" : ""}>未启用</option>
        <option value="archived" ${filter.status === "archived" ? "selected" : ""}>已归档</option>
      </select></label>
      <label><span>课程</span><select name="courseId">
        <option value="">全部课程</option>
        ${courseOptions(courses, filter.courseId)}
      </select></label>
      <label><span>关键词</span><input name="q" value="${escapeHtml(filter.q || "")}" placeholder="姓名、邮箱、院系" /></label>
      <div class="button-row">
        <button class="btn primary" type="submit">应用筛选</button>
      </div>
    </form>
  `;
}

function userTable(users = [], selectedUserId = "") {
  if (!users.length) {
    return emptyState("没有匹配当前筛选的用户。");
  }
  return `
    <div class="table-wrap identity-user-table">
      <table class="data-table">
        <thead>
          <tr><th>用户</th><th>角色</th><th>状态</th><th>院系</th><th>班级</th><th>小组</th><th>操作</th></tr>
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
              <td><button class="btn small" data-action="view-identity-profile" data-id="${escapeHtml(user.id)}">查看</button></td>
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
    return emptyState("选择用户后查看档案、选课和小组关系。");
  }
  return `
    <form class="panel form-grid identity-profile-form" data-form="identity-user-profile">
      <input type="hidden" name="id" value="${escapeHtml(user.id)}" />
      <div class="panel-header">
        <h2>用户档案</h2>
        <span class="tag">${escapeHtml(user.email || user.id)}</span>
      </div>
      <label><span>姓名</span><input name="name" value="${escapeHtml(user.name || "")}" required /></label>
      <label><span>角色</span><select name="role">
        <option value="student" ${user.role === "student" ? "selected" : ""}>学生</option>
        <option value="teacher" ${user.role === "teacher" ? "selected" : ""}>教师</option>
        <option value="admin" ${user.role === "admin" ? "selected" : ""}>管理员</option>
      </select></label>
      <label><span>状态</span><select name="status">
        <option value="active" ${user.status === "active" ? "selected" : ""}>进行中</option>
        <option value="pending" ${user.status === "pending" ? "selected" : ""}>待处理</option>
        <option value="inactive" ${user.status === "inactive" ? "selected" : ""}>未启用</option>
        <option value="archived" ${user.status === "archived" ? "selected" : ""}>已归档</option>
      </select></label>
      <label><span>院系</span><input name="department" value="${escapeHtml(user.department || "")}" /></label>
      <label><span>专业</span><input name="major" value="${escapeHtml(user.major || "")}" /></label>
      <label><span>学号</span><input name="studentNo" value="${escapeHtml(user.studentNo || "")}" /></label>
      <label><span>工号</span><input name="teacherNo" value="${escapeHtml(user.teacherNo || "")}" /></label>
      <label><span>电话</span><input name="phone" value="${escapeHtml(user.phone || "")}" /></label>
      <div class="button-row">
        <button class="btn primary" type="submit">保存档案</button>
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
      <div class="panel-header"><h2>档案关系</h2></div>
      <div class="identity-evidence-grid">
        <section>
          <h3>班级关系</h3>
          ${enrollments.length ? `<ul class="plain-list">${enrollments.map((item) => `
            <li>
              <strong>${escapeHtml(item.classroom?.name || item.classroomId)}</strong>
              <span class="muted">${escapeHtml(roleText(item.role))} / ${escapeHtml(statusText(item.status))} / ${escapeHtml(formatDate(item.joinedAt))}</span>
            </li>
          `).join("")}</ul>` : emptyState("暂无班级关系。")}
        </section>
        <section>
          <h3>小组关系</h3>
          ${groups.length ? `<ul class="plain-list">${groups.map((item) => `
            <li>
              <strong>${escapeHtml(item.group?.name || item.groupId)}</strong>
              <span class="muted">${escapeHtml(roleText(item.role))} / ${escapeHtml(statusText(item.status))} / ${escapeHtml(formatDate(item.joinedAt))}</span>
            </li>
          `).join("")}</ul>` : emptyState("暂无小组关系。")}
        </section>
      </div>
    </div>
  `;
}

function classroomList(classrooms = [], selectedClassroomId = "") {
  if (!classrooms.length) {
    return emptyState("还没有创建班级。");
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
            <button class="btn small" data-action="view-classroom" data-id="${escapeHtml(classroom.id)}">打开</button>
          </div>
          <p>${escapeHtml(classroom.description || "暂无描述")}</p>
          <div class="tag-row">
            ${statusBadge(classroom.status || "active")}
            <span class="tag">${escapeHtml(classroom.stats?.studentCount ?? 0)} 名学生</span>
            <span class="tag">${escapeHtml(classroom.stats?.teacherCount ?? 0)} 名教师</span>
            <span class="tag">${escapeHtml(classroom.stats?.groupCount ?? 0)} 个小组</span>
            <span class="tag">容量 ${escapeHtml(classroom.stats?.fillRate ?? 0)}%</span>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function classroomDetailPanel(detail) {
  if (!detail) {
    return emptyState("打开班级后查看成员和学习小组。");
  }
  const classroom = detail.classroom || {};
  const enrollments = asList(detail.enrollments);
  const groups = asList(detail.groups);
  return `
    <div class="panel identity-classroom-detail">
      <div class="panel-header">
        <h2>班级详情</h2>
        <span class="tag">${escapeHtml(classroom.name || "")}</span>
      </div>
      <div class="detail-block">
        <h3>${escapeHtml(classroom.name || "班级")}</h3>
        <p class="muted">${escapeHtml(classroom.description || "")}</p>
        <div class="tag-row">
          ${statusBadge(classroom.status || "active")}
          <span class="tag">容量 ${escapeHtml(classroom.capacity ?? "-")}</span>
        </div>
      </div>
      <div class="identity-detail-grid">
        <section>
          <h3>班级成员</h3>
          ${enrollments.length ? `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>用户</th><th>角色</th><th>状态</th><th>来源</th></tr></thead>
            <tbody>${enrollments.map((item) => `
              <tr>
                <td><strong>${escapeHtml(item.user?.name || item.userId)}</strong><div class="muted">${escapeHtml(item.user?.email || item.userId)}</div></td>
                <td>${statusBadge(item.role || "student", roleTone(item.role))}</td>
                <td>${statusBadge(item.status || "active")}</td>
                <td>${escapeHtml(item.source === "manual" ? "手动加入" : item.source || "手动加入")}</td>
              </tr>
            `).join("")}</tbody>
          </table></div>` : emptyState("暂无成员。")}
        </section>
        <section>
          <h3>学习小组</h3>
          ${groups.length ? `<ul class="identity-side-list">${groups.map((group) => `
            <li>
              <div>
                <strong>${escapeHtml(group.name)}</strong>
                <p class="muted">${escapeHtml(group.description || "")}</p>
              </div>
              <div class="tag-row">
                ${statusBadge(group.status || "active")}
                <span class="tag">${escapeHtml(group.stats?.memberCount ?? 0)} 名成员</span>
                <span class="tag">${escapeHtml(group.stats?.leaderName || "-")}</span>
              </div>
            </li>
          `).join("")}</ul>` : emptyState("当前班级暂无小组。")}
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
      <div class="panel-header"><h2>创建班级</h2></div>
      <label><span>名称</span><input name="name" required placeholder="面向对象 02 班" /></label>
      <label><span>课程</span><select name="courseId" required>
        <option value="">请选择课程</option>
        ${courseOptions(courses, filter.courseId)}
      </select></label>
      <label><span>课程标题</span><input name="courseTitle" placeholder="课程显示名称" /></label>
      <label><span>负责人</span><select name="teacherId">
        <option value="">当前教师</option>
        ${userOptions(users, "", "teacher")}
      </select></label>
      <label><span>容量</span><input name="capacity" type="number" min="1" value="60" /></label>
      <label><span>状态</span><select name="status"><option value="active">进行中</option><option value="pending">待处理</option></select></label>
      <label class="full-span"><span>描述</span><textarea name="description" rows="3"></textarea></label>
      <label class="full-span"><span>标签</span><input name="tags" placeholder="课程项目,团队协作" /></label>
      <div class="button-row"><button class="btn primary" type="submit">创建班级</button></div>
    </form>
  `;
}

function enrollmentForm(state) {
  const users = state.identityAdmin.users || [];
  const classrooms = state.identityAdmin.classrooms || [];
  const selected = state.selected.classroomId || state.filters.identityAdmin?.classroomId || classrooms[0]?.id || "";
  return `
    <form class="panel form-grid compact-form" data-form="identity-class-assignment">
      <div class="panel-header"><h2>分配用户</h2></div>
      <label><span>班级</span><select name="classroomId" required>
        ${classOptions(classrooms, selected)}
      </select></label>
      <label><span>用户</span><select name="userId" required>
        <option value="">请选择用户</option>
        ${userOptions(users)}
      </select></label>
      <label><span>角色</span><select name="role">
        <option value="student">学生</option>
        <option value="teacher">教师</option>
      </select></label>
      <label><span>状态</span><select name="status">
        <option value="active">进行中</option>
        <option value="pending">待处理</option>
        <option value="inactive">未启用</option>
      </select></label>
      <div class="button-row"><button class="btn primary" type="submit">分配</button></div>
    </form>
  `;
}

function groupList(groups = []) {
  if (!groups.length) {
    return emptyState("还没有创建学习小组。");
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
            <span class="tag">${escapeHtml(group.stats?.memberCount ?? 0)} 名成员</span>
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
        <div class="panel-header"><h2>创建小组</h2></div>
        <label><span>班级</span><select name="classroomId" required>
          ${classOptions(classrooms, selectedClassroomId)}
        </select></label>
        <label><span>名称</span><input name="name" required placeholder="设计复盘小组" /></label>
        <label><span>组长</span><select name="leaderId"><option value="">暂不指定</option>${userOptions(users)}</select></label>
        <label><span>状态</span><select name="status"><option value="active">进行中</option><option value="pending">待处理</option></select></label>
        <label class="full-span"><span>描述</span><textarea name="description" rows="3"></textarea></label>
        <label class="full-span"><span>标签</span><input name="tags" placeholder="前端,报告,评测" /></label>
        <div class="button-row"><button class="btn primary" type="submit">创建小组</button></div>
      </form>
      <form class="panel form-grid compact-form" data-form="identity-group-member">
        <div class="panel-header"><h2>添加小组成员</h2></div>
        <label><span>小组</span><select name="groupId" required>${groupOptions(groups)}</select></label>
        <label><span>用户</span><select name="userId" required><option value="">请选择用户</option>${userOptions(users)}</select></label>
        <label><span>角色</span><select name="role"><option value="member">成员</option><option value="leader">组长</option><option value="reviewer">评阅人</option></select></label>
        <label><span>状态</span><select name="status"><option value="active">进行中</option><option value="pending">待处理</option><option value="inactive">未启用</option></select></label>
        <div class="button-row"><button class="btn primary" type="submit">添加成员</button></div>
      </form>
    </div>
  `;
}

function roleMatrixPanel(matrix) {
  if (!matrix) {
    return emptyState("暂无角色权限矩阵。");
  }
  return `
    <div class="panel identity-role-matrix">
      <div class="panel-header"><h2>角色权限矩阵</h2></div>
      <div class="identity-permission-grid">
        ${asList(matrix.matrix).map((row) => `
          <section>
            <h3>${escapeHtml(roleText(row.role))}</h3>
            ${asList(row.resources).length ? `<ul class="plain-list">${row.resources.map((permission) => `
              <li>
                <strong>${escapeHtml(permission.resource)}</strong>
                <div class="tag-row">${asList(permission.actions).map((action) => `<span class="tag">${escapeHtml(action)}</span>`).join("")}</div>
                <p class="muted">${escapeHtml(permission.description || "")}</p>
              </li>
            `).join("")}</ul>` : emptyState("暂无权限。")}
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
          <div class="panel-header"><h2>用户目录</h2><span class="tag">${escapeHtml(users.length)} 人</span></div>
          ${userTable(users, selectedUserId)}
        </div>
        ${profileForm(identity.selectedProfile, users)}
        ${profileEvidence(identity.selectedProfile)}
        <div class="panel">
          <div class="panel-header"><h2>班级</h2><span class="tag">${escapeHtml(classrooms.length)} 个</span></div>
          ${classroomList(classrooms, selectedClassroomId)}
        </div>
        ${classroomDetailPanel(identity.classroomDetail)}
      </section>
      <aside class="identity-side">
        ${classroomForm(state)}
        ${enrollmentForm(state)}
        <div class="panel">
          <div class="panel-header"><h2>学习小组</h2><span class="tag">${escapeHtml(groups.length)} 个</span></div>
          ${groupList(groups)}
        </div>
        ${groupForms(state)}
        ${roleMatrixPanel(identity.roleMatrix)}
      </aside>
    </div>
  `;
}
