import { attr, escapeHtml } from "../utils/dom.js";
import { roleText } from "../utils/format.js";
import { TEACHER_PRIMARY_ROUTES } from "../views/teacherRouteTable.js";

export function teacherSidebar(state) {
  return `
    <aside class="teacher-sidebar">
      <div class="teacher-brand-row">
        <div class="teacher-brand-mark">E</div>
        <div class="teacher-brand-copy">
          <strong>EduMind</strong>
          <span>AI 教师工作台</span>
        </div>
      </div>
      <nav class="teacher-nav" aria-label="教师端主导航">
        ${TEACHER_PRIMARY_ROUTES.map((item) => `
          <button class="teacher-nav-link ${state.route === item.route ? "is-active" : ""}" data-action="teacher-route" data-route="${attr(item.route)}">
            <span class="teacher-nav-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
            <span>${escapeHtml(item.label)}</span>
          </button>
        `).join("")}
      </nav>
      <div class="teacher-user-card">
        <div class="avatar-line">
          <div class="avatar">${escapeHtml(state.user?.avatar || state.user?.name?.slice(0, 1) || "师")}</div>
          <div>
            <strong>${escapeHtml(state.user?.name || "教师")}</strong>
            <small>${escapeHtml(roleText(state.user?.role || "teacher"))}</small>
          </div>
        </div>
        <button class="btn ghost teacher-logout" data-action="logout">退出登录</button>
      </div>
    </aside>
  `;
}
