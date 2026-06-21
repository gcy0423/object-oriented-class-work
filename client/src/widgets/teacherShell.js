import { escapeHtml } from "../utils/dom.js";
import { providerText } from "../utils/format.js";
import { teacherBottomNav } from "./teacherBottomNav.js";
import { teacherSidebar } from "./teacherSidebar.js";

function teacherLoadingNotice(state) {
  const isLoading = state.loading?.session || state.loading?.dashboard || state.loading?.analytics || state.loading?.assignments;
  if (!isLoading) {
    return "";
  }
  return `
    <section class="teacher-loading-strip" role="status" aria-live="polite">
      <span class="status-dot"></span>
      <span>正在同步课程、作业和学情数据。</span>
    </section>
  `;
}

export function teacherShell({ state, title, subtitle, content, aiPanel }) {
  return `
    <div class="teacher-app-shell">
      ${teacherSidebar(state)}
      <main class="teacher-main">
        <header class="teacher-topbar">
          <div class="teacher-topbar__copy">
            <span class="teacher-eyebrow">教师工作台</span>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(subtitle || "跟进作业、批改、学情、干预和报告。")}</p>
          </div>
          <div class="status-stack">
            <div class="status-pill"><span class="status-dot"></span><span>${escapeHtml(providerText(state.provider))}</span></div>
            <button class="btn" data-action="refresh">刷新</button>
            <button class="btn teacher-mobile-logout" data-action="logout">退出</button>
          </div>
        </header>
        ${teacherLoadingNotice(state)}
        ${content}
      </main>
      ${aiPanel}
      ${teacherBottomNav(state.route)}
    </div>
  `;
}
