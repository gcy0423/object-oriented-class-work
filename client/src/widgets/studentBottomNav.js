import { attr, escapeHtml } from "../utils/dom.js";
import { STUDENT_PRIMARY_ROUTES } from "../views/studentRouteTable.js";

export function studentBottomNav(currentRoute) {
  return `
    <nav class="student-bottom-nav" aria-label="学生端主导航">
      ${STUDENT_PRIMARY_ROUTES.map((item) => `
        <button class="student-bottom-link ${currentRoute === item.route ? "is-active" : ""}" data-action="student-route" data-route="${attr(item.route)}">
          <span class="student-nav-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
          <span>${escapeHtml(item.label)}</span>
        </button>
      `).join("")}
    </nav>
  `;
}
