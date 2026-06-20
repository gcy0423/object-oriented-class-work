import { escapeHtml } from "../utils/dom.js";
import { providerText } from "../utils/format.js";

export function modelConfigPanel(config) {
  return `
    <section class="panel">
      <div class="panel-header"><h2>模型配置说明</h2></div>
      <div class="key-value-list">
        <div><strong>当前服务</strong><span>${escapeHtml(providerText(config.provider))}</span></div>
        <div><strong>运行模式</strong><span>${escapeHtml(config.mode === "local-first" ? "本地优先" : config.mode || "-")}</span></div>
        <div><strong>基础地址变量</strong><span>${escapeHtml(config.baseUrlHint || "-")}</span></div>
        <div><strong>模型变量</strong><span>${escapeHtml(config.modelHint || "-")}</span></div>
        <div><strong>推荐启动命令</strong><span>${escapeHtml(config.startCommand || "-")}</span></div>
        <div><strong>推荐测试命令</strong><span>${escapeHtml(config.testCommand || "-")}</span></div>
      </div>
      <p class="muted">设置页不保存真实密钥，只展示当前服务来源和本地运行提示。</p>
    </section>
  `;
}
