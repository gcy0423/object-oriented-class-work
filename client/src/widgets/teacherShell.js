import { escapeHtml } from "../utils/dom.js";
import { providerText } from "../utils/format.js";
import { teacherBottomNav } from "./teacherBottomNav.js";
import { teacherSidebar } from "./teacherSidebar.js";

export function teacherShell({ state, title, subtitle, content, aiPanel }) {
  return `
    <div class="teacher-app-shell">
      ${teacherSidebar(state)}
      <main class="teacher-main">
        <header class="teacher-topbar">
          <div class="teacher-topbar__copy">
            <span class="teacher-eyebrow">Teacher AI-first</span>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(subtitle || "把待批改、学生风险、作业证据和干预动作整理成清晰顺序。")}</p>
          </div>
          <div class="status-stack">
            <div class="status-pill"><span class="status-dot"></span><span>${escapeHtml(providerText(state.provider))}</span></div>
            <button class="btn" data-action="refresh">刷新</button>
            <button class="btn teacher-mobile-logout" data-action="logout">退出</button>
          </div>
        </header>
        ${content}
      </main>
      ${aiPanel}
      ${teacherBottomNav(state.route)}
    </div>
  `;
}
