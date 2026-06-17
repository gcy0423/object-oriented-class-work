import { attr, escapeHtml } from "../utils/dom.js";

export function filterToolbar({ name, fields, actions = [], submitLabel = "筛选" }) {
  return `
    <form class="filter-toolbar" data-form="${attr(name)}">
      ${fields.map((field) => `
        <label>
          <span>${escapeHtml(field.label)}</span>
          ${field.type === "select" ? `
            <select name="${attr(field.name)}">
              ${(field.options || []).map((option) => `
                <option value="${attr(option.value)}" ${option.value === field.value ? "selected" : ""}>${escapeHtml(option.label)}</option>
              `).join("")}
            </select>
          ` : `
            <input name="${attr(field.name)}" value="${attr(field.value || "")}" placeholder="${attr(field.placeholder || "")}" />
          `}
        </label>
      `).join("")}
      <div class="filter-actions">
        <button class="btn" type="submit">${escapeHtml(submitLabel)}</button>
        ${actions.join("")}
      </div>
    </form>
  `;
}
