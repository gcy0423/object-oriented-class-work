import { escapeHtml } from "../utils/dom.js";
import { emptyState } from "./cards.js";

export function horizontalBars(items = [], { max = 100, label = "统计条形图" } = {}) {
  if (!items.length) {
    return emptyState("暂无统计数据。");
  }
  return `
    <div class="bar-list" role="list" aria-label="${escapeHtml(label)}">
      ${items.map((item) => {
        const value = Math.max(0, Math.min(max, Number(item.value || 0)));
        return `
          <div class="bar-row" role="listitem">
            <div class="bar-row__head">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.text || `${value}%`)}</strong>
            </div>
            <div class="bar-track" aria-hidden="true">
              <span class="bar-fill" style="width:${value}%"></span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}
