import { escapeHtml } from "../utils/dom.js";
import { formatDateTime, statusText } from "../utils/format.js";
import { emptyState, statusBadge } from "./cards.js";

export function healthPanel(health) {
  const services = health?.services || [];
  if (!services.length) {
    return emptyState("暂时没有服务健康数据。");
  }
  return `
    <div class="health-grid">
      ${services.map((service) => `
        <article class="health-item">
          <div class="panel-header">
            <strong>${escapeHtml(service.name)}</strong>
            ${statusBadge(service.status || "down")}
          </div>
          <div class="muted">延迟 ${escapeHtml(service.latencyMs ?? "-")} ms</div>
          <div class="muted">状态 ${escapeHtml(statusText(service.status))}</div>
        </article>
      `).join("")}
      <article class="health-item">
        <div class="panel-header">
          <strong>${escapeHtml(health.service || "gateway-service")}</strong>
          ${statusBadge(health.status || "up")}
        </div>
        <div class="muted">时间 ${escapeHtml(formatDateTime(health.time))}</div>
      </article>
    </div>
  `;
}
