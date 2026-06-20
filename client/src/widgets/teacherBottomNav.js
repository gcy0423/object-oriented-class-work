import { attr, escapeHtml } from "../utils/dom.js";

const TEACHER_MOBILE_ROUTES = [
  { route: "teacher-home", label: "AI", icon: "AI" },
  { route: "teacher-assignment", label: "作业", icon: "作" },
  { route: "teacher-review", label: "批改", icon: "批" },
  { route: "teacher-course", label: "题库", icon: "题" },
  { route: "teacher-intervention", label: "学情", icon: "学" }
];

export function teacherBottomNav(route) {
  return `
    <nav class="teacher-bottom-nav" aria-label="教师端移动主导航">
      ${TEACHER_MOBILE_ROUTES.map((item) => `
        <button class="teacher-bottom-link ${route === item.route ? "is-active" : ""}" data-action="teacher-route" data-route="${attr(item.route)}">
          <span aria-hidden="true">${escapeHtml(item.icon)}</span>
          <strong>${escapeHtml(item.label)}</strong>
        </button>
      `).join("")}
    </nav>
  `;
}
