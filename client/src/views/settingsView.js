import { modelConfigPanel } from "../forms/modelConfigPanel.js";
import { profileForm } from "../forms/profileForm.js";
import { healthPanel } from "../widgets/health.js";

export function settingsView(state) {
  return `
    <section class="workbench-grid">
      <div class="grid">
        ${modelConfigPanel(state.settings.modelConfig || {})}
        <section class="panel">
          <div class="panel-header"><h2>服务健康面板</h2><button class="btn" data-action="refresh-health">刷新健康</button></div>
          ${healthPanel(state.settings.health)}
        </section>
      </div>
      <aside class="workbench-side">
        ${profileForm({ value: state.draft.profile || state.user || {}, errors: state.errors.profile || {}, saving: state.saving.profile })}
      </aside>
    </section>
  `;
}
