import { escapeHtml } from "../utils/dom.js";
import { emptyState } from "./cards.js";

export function dataTable({ columns, rows, emptyText = "暂无数据。" }) {
  if (!rows.length) {
    return emptyState(emptyText);
  }
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map((column) => `<td>${column.render ? column.render(row) : escapeHtml(row[column.key] ?? "-")}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
