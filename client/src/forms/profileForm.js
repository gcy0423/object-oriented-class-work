import { attr, escapeHtml, buttonLabel } from "../utils/dom.js";

function fieldError(message) {
  return message ? `<small class="field-error">${escapeHtml(message)}</small>` : "";
}

export function profileForm({ value = {}, errors = {}, saving = false }) {
  return `
    <form class="panel form-grid" data-form="profile">
      <div class="panel-header"><h2>用户资料</h2></div>
      <label>
        <span>姓名</span>
        <input name="name" value="${attr(value.name || "")}" />
        ${fieldError(errors.name)}
      </label>
      <label>
        <span>邮箱</span>
        <input name="email" value="${attr(value.email || "")}" />
        ${fieldError(errors.email)}
      </label>
      <label>
        <span>角色</span>
        <input value="${attr(value.role || "")}" disabled />
        <small class="helper">演示环境中角色由登录身份决定。</small>
      </label>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${escapeHtml(buttonLabel("保存资料", "保存中...", saving))}</button>
    </form>
  `;
}
