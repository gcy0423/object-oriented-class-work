import { activityList, messageList } from "../components.js";

export function teamView(state) {
  return `
    <section class="grid two-column">
      <div class="grid">
        <div class="panel"><div class="panel-header"><h2>协作消息</h2></div>${messageList(state.messages || [], state.dashboard?.users || [])}</div>
        <div class="panel"><div class="panel-header"><h2>近期活动</h2></div>${activityList(state.activity || [])}</div>
      </div>
      <form class="panel form-grid" data-form="message">
        <div class="panel-header"><h2>发送消息</h2></div>
        <label><span>内容</span><textarea name="content" rows="8" required></textarea></label>
        <button class="btn primary" type="submit">发送</button>
      </form>
    </section>
  `;
}
