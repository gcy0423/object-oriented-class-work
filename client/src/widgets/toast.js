import { escapeHtml } from "../utils/dom.js";

export function toastView(message) {
  return message ? `<div class="toast" role="status" aria-live="polite">${escapeHtml(message)}</div>` : "";
}
