import { escapeHtml } from "../../utils/dom.js";
import { roleText } from "../../utils/format.js";
import { actionRow, metricStrip, panel } from "./shared.js";

export function teacherSettingsView(state) {
  const user = state.user || {};
  const courses = state.dashboard?.courses || [];
  const metrics = [
    { label: "身份", value: roleText(user.role || "teacher") },
    { label: "课程", value: courses.length || 0 },
    { label: "AI 状态", value: state.provider ? "就绪" : "待配置" },
    { label: "资料", value: user.email ? "已绑定" : "待补充" }
  ];
  return `
    <section class="teacher-hero-panel">
      <div>
        <span class="teacher-eyebrow">个人信息</span>
        <h2>${escapeHtml(user.name || "教师")}</h2>
        <p>${escapeHtml(user.email || "暂无邮箱")} · ${escapeHtml(roleText(user.role || "teacher"))} · ${escapeHtml(metrics[2].value)}</p>
      </div>
      ${actionRow([{ label: "回到教学台", route: "teacher-home", primary: true }, { label: "退出登录", action: "logout" }])}
    </section>
    ${metricStrip(metrics)}
    <section class="teacher-page-grid">
      ${panel({
        eyebrow: "Profile",
        title: "账号信息",
        body: `
          <article class="teacher-list-card">
            <h3>${escapeHtml(user.name || "教师")}</h3>
            <p>${escapeHtml(user.email || "暂无邮箱")} · ${escapeHtml(roleText(user.role || "teacher"))}</p>
          </article>
        `
      })}
      ${panel({
        eyebrow: "Workspace",
        title: "工作区状态",
        text: "当前账号可访问课程、作业、批改、干预和报告。",
        body: `
          <article class="teacher-list-card">
            <h3>${escapeHtml(courses[0]?.title || "课程工作区")}</h3>
            <p>共 ${escapeHtml(courses.length || 0)} 门课程，AI 服务${escapeHtml(metrics[2].value)}。</p>
          </article>
        `
      })}
    </section>
  `;
}
