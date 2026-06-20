import { attr, escapeHtml } from "../utils/dom.js";
import { providerText, roleText } from "../utils/format.js";
import { STUDENT_PRIMARY_ROUTES, isStudentRoute } from "../views/studentRouteTable.js";
import { studentBottomNav } from "./studentBottomNav.js";

function primaryNav(route) {
  return `
    <nav class="student-nav" aria-label="学生端主导航">
      ${STUDENT_PRIMARY_ROUTES.map((item) => `
        <button class="student-nav-link ${route === item.route ? "is-active" : ""}" data-action="student-route" data-route="${attr(item.route)}">
          <span class="student-nav-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
          <span>${escapeHtml(item.label)}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

export function studentShell({ state, title, subtitle, content, aiPanel }) {
  const showBack = isStudentRoute(state.route) && !STUDENT_PRIMARY_ROUTES.some((item) => item.route === state.route);
  return `
    <div class="student-app-shell">
      <aside class="student-sidebar">
        <div class="student-brand">
          <strong>EduMind</strong>
          <span>智能学习工作台</span>
        </div>
        ${primaryNav(state.route)}
        <div class="student-user-card">
          <div class="avatar-line">
            <div class="avatar">${escapeHtml(state.user?.avatar || state.user?.name?.slice(0, 1) || "学")}</div>
            <div>
              <strong>${escapeHtml(state.user?.name || "学生")}</strong>
              <small>${escapeHtml(roleText(state.user?.role || "student"))}</small>
            </div>
          </div>
          <button class="btn ghost student-logout" data-action="logout">退出登录</button>
        </div>
      </aside>
      <main class="student-main">
        <header class="student-topbar">
          <div class="student-topbar__copy">
            ${showBack ? `<button class="student-back-btn" data-action="student-back" aria-label="返回上一级">返回</button>` : ""}
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(subtitle || "把目标、作业、错题和笔记整理成清晰的下一步。")}</p>
          </div>
          <div class="status-stack">
            <div class="status-pill"><span class="status-dot"></span><span>${escapeHtml(providerText(state.provider))}</span></div>
            <button class="btn" data-action="refresh">刷新</button>
          </div>
        </header>
        ${content}
      </main>
      ${aiPanel}
      ${studentBottomNav(state.route)}
    </div>
  `;
}
