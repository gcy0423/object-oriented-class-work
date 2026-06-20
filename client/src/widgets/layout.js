import { escapeHtml } from "../utils/dom.js";
import { providerText, roleText } from "../utils/format.js";

export const routeTable = {
  workbench: { label: "工作台", roles: ["student", "teacher", "admin"] },
  knowledge: { label: "知识库", roles: ["student", "teacher", "admin"] },
  dashboard: { label: "总览", roles: ["student", "teacher", "admin"] },
  learning: { label: "学习", roles: ["student", "teacher", "admin"] },
  assignments: { label: "作业", roles: ["student", "teacher", "admin"] },
  "question-banks": { label: "题库", roles: ["teacher", "admin"] },
  practice: { label: "练习", roles: ["student", "teacher", "admin"] },
  "assessment-insight": { label: "评测洞察", roles: ["student", "teacher", "admin"] },
  reports: { label: "报告", roles: ["student", "teacher", "admin"] },
  "identity-admin": { label: "班级与成员", roles: ["teacher", "admin"] },
  operations: { label: "运维", roles: ["teacher", "admin"] },
  analytics: { label: "统计", roles: ["teacher", "admin"] },
  ai: { label: "AI", roles: ["student", "teacher", "admin"] },
  team: { label: "协作", roles: ["student", "teacher", "admin"] },
  settings: { label: "设置", roles: ["student", "teacher", "admin"] }
};

export function titleFor(route) {
  return routeTable[route]?.label || "总览";
}

export function subtitleFor(route, user) {
  return {
    workbench: "集中处理提醒、待办、风险和课程进度。",
    knowledge: "检索课程知识库，查看概念关系并生成学习路径。",
    dashboard: "统一查看学习、作业、练习、协作和服务状态。",
    learning: "管理目标、任务和课程笔记。",
    assignments: user?.role === "student" ? "查看作业、提交内容和阅读评分反馈。" : "发布、筛选、评分并查看 AI 初评。",
    "question-banks": "维护题库、题目、答案和解析。",
    practice: "从题库开始练习，查看答题卡、错题和历史。",
    "assessment-insight": "查看评分质量、练习复盘、错题分析和课程风险。",
    reports: "生成教学报告并导出结构化材料。",
    "identity-admin": "管理成员、班级、选课、小组和权限。",
    operations: "处理导入预览、批量任务、审计和档案分析。",
    analytics: "按课程和学生查看教师统计工作台。",
    ai: "发起课程问答并生成学习计划。",
    team: "查看活动和发送协作消息。",
    settings: "查看个人资料、模型说明和服务健康状态。"
  }[route] || "";
}

function visibleRoutes(user) {
  return Object.entries(routeTable).filter(([, item]) => item.roles.includes(user?.role || "student"));
}

export function shellLayout({ state, title, subtitle, content }) {
  return `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand"><strong>EduMind Agent</strong><span>教师与学生评测工作台</span></div>
        <nav class="nav">
          ${visibleRoutes(state.user).map(([route, item]) => `
            <button class="${route === state.route ? "active" : ""}" data-action="route" data-route="${escapeHtml(route)}">
              <strong>${escapeHtml(item.label)}</strong>
              <span>›</span>
            </button>
          `).join("")}
        </nav>
        <div class="user-block">
          <div class="avatar-line">
            <div class="avatar">${escapeHtml(state.user.avatar || state.user.name?.slice(0, 1) || "学")}</div>
            <div><strong>${escapeHtml(state.user.name)}</strong><br /><small>${escapeHtml(roleText(state.user.role))}</small></div>
          </div>
          <button class="btn ghost" data-action="logout">退出登录</button>
        </div>
      </aside>
      <main class="main">
        <div class="topbar">
          <div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>
          <div class="status-stack">
            <div class="status-pill"><span class="status-dot"></span><span>${escapeHtml(providerText(state.provider))}</span></div>
            <button class="btn" data-action="refresh">刷新</button>
          </div>
        </div>
        ${content}
      </main>
    </div>
  `;
}
