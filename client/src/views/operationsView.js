import { emptyState, escapeHtml, formatDate, metric, statusBadge } from "../components.js";
import { statusText } from "../utils/format.js";

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function optionList(items = [], selected = "", getValue = (item) => item.id, getLabel = (item) => item.title || item.name || item.key || item.id) {
  return items.map((item) => {
    const value = getValue(item);
    return `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(getLabel(item))}</option>`;
  }).join("");
}

function courseOptions(courses = [], selected = "") {
  return optionList(courses, selected, (course) => course.id, (course) => course.title || course.id);
}

function userOptions(users = [], selected = "") {
  return optionList(users, selected, (user) => user.id, (user) => `${user.name || user.id} / ${user.role || "user"}`);
}

function catalogTargetOptions(catalog, selected = "") {
  return optionList(catalog?.importTargets || [], selected, (item) => item.key, (item) => `${item.key} (${item.required.join(", ")})`);
}

function catalogJobOptions(catalog, selected = "") {
  return optionList(catalog?.jobTypes || [], selected, (item) => item.key, (item) => `${item.key} / ${item.stepCount} steps`);
}

function operationMetrics(dashboard = {}) {
  const metrics = (dashboard || {}).metrics || {};
  return `
    <div class="stats-grid compact-stats operations-metrics">
      ${metric("导入批次", metrics.importBatchCount ?? 0)}
      ${metric("已提交", metrics.committedImportCount ?? 0)}
      ${metric("排队任务", metrics.queuedJobCount ?? 0)}
      ${metric("已完成任务", metrics.completedJobCount ?? 0)}
      ${metric("审计事件", metrics.auditEventCount ?? 0)}
      ${metric("严重事件", metrics.criticalAuditCount ?? 0)}
    </div>
  `;
}

function filterPanel(state) {
  const filter = state.filters.operations || {};
  const courses = state.dashboard?.courses || [];
  const catalog = state.operations.catalog;
  return `
    <form class="panel form-grid operations-filter" data-form="operations-filter">
      <label><span>课程</span><select name="courseId">
        <option value="">全部课程</option>
        ${courseOptions(courses, filter.courseId)}
      </select></label>
      <label><span>导入对象</span><select name="target">
        <option value="">全部对象</option>
        ${catalogTargetOptions(catalog, filter.target)}
      </select></label>
      <label><span>任务类型</span><select name="jobType">
        <option value="">全部任务</option>
        ${catalogJobOptions(catalog, filter.jobType)}
      </select></label>
      <label><span>严重程度</span><select name="severity">
        <option value="">全部级别</option>
        <option value="info" ${filter.severity === "info" ? "selected" : ""}>提示</option>
        <option value="warning" ${filter.severity === "warning" ? "selected" : ""}>注意</option>
        <option value="critical" ${filter.severity === "critical" ? "selected" : ""}>严重</option>
      </select></label>
      <label><span>学生</span><input name="studentId" value="${escapeHtml(filter.studentId || "")}" placeholder="学生 ID" /></label>
      <div class="button-row"><button class="btn primary" type="submit">应用筛选</button></div>
    </form>
  `;
}

function importForm(state) {
  const filter = state.filters.operations || {};
  const catalog = state.operations.catalog;
  const courses = state.dashboard?.courses || [];
  const draft = state.draft.operationImport || {};
  return `
    <form class="panel form-grid operations-import-form" data-form="operations-import-preview">
      <div class="panel-header"><h2>导入预览</h2></div>
      <label><span>标题</span><input name="title" value="${escapeHtml(draft.title || "")}" required /></label>
      <label><span>课程</span><select name="courseId">
        <option value="">不关联课程</option>
        ${courseOptions(courses, filter.courseId || draft.courseId)}
      </select></label>
      <label><span>对象</span><select name="target">
        ${catalogTargetOptions(catalog, filter.target || draft.target || "portfolioEvidence")}
      </select></label>
      <label><span>格式</span><select name="format">
        <option value="json" ${(draft.format || "json") === "json" ? "selected" : ""}>JSON</option>
        <option value="csv" ${draft.format === "csv" ? "selected" : ""}>CSV</option>
        <option value="tsv" ${draft.format === "tsv" ? "selected" : ""}>TSV</option>
      </select></label>
      <label><span>重复处理</span><select name="duplicatePolicy">
        <option value="skip">跳过</option>
        <option value="replace">替换</option>
        <option value="append">追加</option>
      </select></label>
      <label class="full-span"><span>数据内容</span><textarea name="payload" rows="8" required>${escapeHtml(draft.payload || "")}</textarea></label>
      <div class="button-row"><button class="btn primary" type="submit">校验导入</button></div>
    </form>
  `;
}

function importList(imports = [], selectedId = "") {
  if (!imports.length) {
    return emptyState("暂无导入批次。");
  }
  return `
    <div class="operations-card-list">
      ${imports.map((batch) => `
        <article class="operations-card ${batch.id === selectedId ? "is-selected" : ""}">
          <div class="operations-card-head">
            <div>
              <strong>${escapeHtml(batch.title)}</strong>
              <div class="muted">${escapeHtml(batch.target)} / ${escapeHtml(batch.courseId || "global")}</div>
            </div>
            <div class="inline-actions">
              <button class="btn small" data-action="view-operation-import" data-id="${escapeHtml(batch.id)}">打开</button>
              ${batch.status !== "committed" ? `<button class="btn small" data-action="commit-operation-import" data-id="${escapeHtml(batch.id)}">提交</button>` : ""}
            </div>
          </div>
          <div class="tag-row">
            ${statusBadge(batch.status || "draft")}
            <span class="tag">${escapeHtml(batch.summary?.totalRows ?? 0)} 行</span>
            <span class="tag">${escapeHtml(batch.summary?.validRows ?? 0)} 有效</span>
            <span class="tag">${escapeHtml(batch.summary?.errorRows ?? 0)} 错误</span>
            <span class="tag">${escapeHtml(formatDate(batch.createdAt))}</span>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function importDetail(detail) {
  if (!detail) {
    return emptyState("打开导入批次后查看校验结果。");
  }
  const rows = asList(detail.rows);
  return `
    <div class="panel">
      <div class="panel-header"><h2>导入明细</h2><span class="tag">${escapeHtml(rows.length)} 行</span></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>#</th><th>状态</th><th>外部标识</th><th>规范化数据</th><th>消息</th></tr></thead>
          <tbody>${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.rowNumber)}</td>
              <td>${statusBadge(row.status || "pending")}</td>
              <td>${escapeHtml(row.externalId || "-")}</td>
              <td><code>${escapeHtml(JSON.stringify(row.normalized || {})).slice(0, 220)}</code></td>
              <td>
                ${asList(row.errors).map((item) => `<div class="danger-text">${escapeHtml(item.field)}: ${escapeHtml(item.message)}</div>`).join("")}
                ${asList(row.warnings).map((item) => `<div class="muted">${escapeHtml(item.field)}: ${escapeHtml(item.message)}</div>`).join("")}
              </td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}

function jobForm(state) {
  const filter = state.filters.operations || {};
  const catalog = state.operations.catalog;
  const courses = state.dashboard?.courses || [];
  const draft = state.draft.operationJob || {};
  return `
    <form class="panel form-grid compact-form" data-form="operations-batch-job">
      <div class="panel-header"><h2>创建批量任务</h2></div>
      <label><span>标题</span><input name="title" value="${escapeHtml(draft.title || "")}" required /></label>
      <label><span>课程</span><select name="courseId">
        <option value="">全局</option>
        ${courseOptions(courses, filter.courseId)}
      </select></label>
      <label><span>类型</span><select name="type">
        ${catalogJobOptions(catalog, filter.jobType || draft.type || "portfolio-refresh")}
      </select></label>
      <label><span>优先级</span><select name="priority">
        <option value="low">低</option>
        <option value="normal" selected>普通</option>
        <option value="high">高</option>
        <option value="urgent">紧急</option>
      </select></label>
      <label class="full-span"><span>参数</span><textarea name="params" rows="4">{"studentIds":["${escapeHtml(filter.studentId || "student-demo")}"],"includeEvidence":true}</textarea></label>
      <div class="button-row"><button class="btn primary" type="submit">创建任务</button></div>
    </form>
  `;
}

function jobList(jobs = [], selectedId = "") {
  if (!jobs.length) {
    return emptyState("暂无批量任务。");
  }
  return `<div class="operations-job-list">${jobs.map((job) => `
    <article class="operations-card ${job.id === selectedId ? "is-selected" : ""}">
      <div class="operations-card-head">
        <div>
          <strong>${escapeHtml(job.title)}</strong>
          <div class="muted">${escapeHtml(job.type)} / ${escapeHtml(job.courseId || "global")}</div>
        </div>
        <div class="inline-actions">
          <button class="btn small" data-action="view-operation-job" data-id="${escapeHtml(job.id)}">打开</button>
          ${["queued", "failed"].includes(job.status) ? `<button class="btn small" data-action="run-operation-job" data-id="${escapeHtml(job.id)}">执行</button>` : ""}
        </div>
      </div>
      <div class="progress-bar"><span style="width:${Number(job.progress || 0)}%"></span></div>
      <div class="tag-row">
        ${statusBadge(job.status || "queued")}
        ${statusBadge(job.priority || "normal")}
        <span class="tag">${escapeHtml(asList(job.steps).length)} steps</span>
        <span class="tag">${escapeHtml(formatDate(job.updatedAt))}</span>
      </div>
    </article>
  `).join("")}</div>`;
}

function jobDetail(detail) {
  if (!detail) {
    return emptyState("打开批量任务后查看执行步骤。");
  }
  const job = detail.job || {};
  const steps = asList(detail.steps);
  return `
    <div class="panel">
      <div class="panel-header"><h2>Batch Steps</h2><span class="tag">${escapeHtml(job.status || "queued")}</span></div>
      <ul class="operations-step-list">
        ${steps.map((step) => `
          <li>
            <div>
              <strong>${escapeHtml(step.order)}. ${escapeHtml(step.title)}</strong>
              <p class="muted">${escapeHtml(step.key)}</p>
              ${Object.keys(step.output || {}).length ? `<code>${escapeHtml(JSON.stringify(step.output)).slice(0, 180)}</code>` : ""}
            </div>
            ${statusBadge(step.status || "pending")}
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

function auditPanel(state) {
  const audits = state.operations.audits || [];
  const digest = state.operations.auditDigest || {};
  const filter = state.filters.operations || {};
  const draft = state.draft.operationAudit || {};
  return `
    <div class="panel">
      <div class="panel-header"><h2>审计摘要</h2><span class="tag">${escapeHtml(digest.total ?? audits.length)} 条</span></div>
      <div class="operations-digest">
        <section>
          <h3>严重程度</h3>
          <div class="tag-row">${asList(digest.bySeverity).map((item) => `<span class="tag">${escapeHtml(statusText(item.severity))}: ${escapeHtml(item.count)}</span>`).join("")}</div>
        </section>
        <section>
          <h3>建议</h3>
          ${asList(digest.recommendations).length ? `<ul class="plain-list">${digest.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : emptyState("暂无建议。")}
        </section>
      </div>
    </div>
    <form class="panel form-grid compact-form" data-form="operations-audit">
      <div class="panel-header"><h2>手动审计事件</h2></div>
      <label><span>动作</span><input name="action" value="${escapeHtml(draft.action || "")}" required /></label>
      <label><span>资源类型</span><input name="resourceType" value="${escapeHtml(draft.resourceType || "")}" required /></label>
      <label><span>资源标识</span><input name="resourceId" value="${escapeHtml(filter.studentId || "")}" /></label>
      <label><span>课程</span><input name="courseId" value="${escapeHtml(filter.courseId || "")}" /></label>
      <label><span>严重程度</span><select name="severity">
        <option value="info" ${draft.severity === "info" ? "selected" : ""}>提示</option>
        <option value="warning" ${draft.severity === "warning" ? "selected" : ""}>注意</option>
        <option value="critical" ${draft.severity === "critical" ? "selected" : ""}>严重</option>
      </select></label>
      <label class="full-span"><span>摘要</span><textarea name="summary" rows="3" required>${escapeHtml(draft.summary || "")}</textarea></label>
      <div class="button-row"><button class="btn primary" type="submit">记录审计</button></div>
    </form>
    <div class="panel">
      <div class="panel-header"><h2>审计轨迹</h2><span class="tag">${escapeHtml(audits.length)} 条</span></div>
      ${audits.length ? `<ul class="operations-audit-list">${audits.map((event) => `
        <li>
          <div>
            <strong>${escapeHtml(event.action)}</strong>
            <p>${escapeHtml(event.summary)}</p>
            <div class="tag-row">
              <span class="tag">${escapeHtml(event.resourceType)}:${escapeHtml(event.resourceId || "-")}</span>
              <span class="tag">${escapeHtml(event.actorId)}</span>
              <span class="tag">${escapeHtml(formatDate(event.createdAt))}</span>
            </div>
          </div>
          ${statusBadge(event.severity || "info", event.severity || "info")}
        </li>
      `).join("")}</ul>` : emptyState("暂无审计事件。")}
    </div>
  `;
}

function deepPortfolioPanel(state) {
  const deep = state.operations.deepPortfolio;
  const evidenceMap = state.operations.evidenceMap;
  const plan = state.operations.interventionPlan;
  const board = state.operations.portfolioBoard;
  if (!deep && !evidenceMap && !plan && !board) {
    return emptyState("刷新运维数据后查看学习档案分析。");
  }
  const quality = deep?.quality || {};
  return `
    <div class="panel">
      <div class="panel-header"><h2>学习档案深度分析</h2><span class="tag">${escapeHtml(statusText(quality.tone || "missing"))}</span></div>
      <div class="stats-grid compact-stats">
        ${metric("质量", quality.overallScore ?? 0)}
        ${metric("证据", evidenceMap?.totalEvidence ?? 0)}
        ${metric("行动", plan?.actionCount ?? 0)}
        ${metric("看板学生", board?.totalStudents ?? 0)}
      </div>
      ${deep?.defenseNarrative ? `<div class="subpanel">
        <strong>${escapeHtml(deep.defenseNarrative.headline)}</strong>
        <ul class="plain-list">${asList(deep.defenseNarrative.paragraphs).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>` : ""}
      ${asList(quality.dimensions).length ? `<div class="operations-dimension-grid">${quality.dimensions.map((dimension) => `
        <section>
          <strong>${escapeHtml(dimension.label)}</strong>
          <div class="progress-bar"><span style="width:${Number(dimension.score || 0)}%"></span></div>
          <span class="muted">${escapeHtml(dimension.score ?? 0)} / 100</span>
        </section>
      `).join("")}</div>` : ""}
    </div>
    <div class="panel">
      <div class="panel-header"><h2>证据缺口与行动</h2></div>
      <div class="operations-digest">
        <section>
          <h3>证据缺口</h3>
          ${asList(evidenceMap?.gaps).length ? `<ul class="plain-list">${evidenceMap.gaps.map((gap) => `<li>${escapeHtml(gap.message)}</li>`).join("")}</ul>` : emptyState("暂无证据缺口。")}
        </section>
        <section>
          <h3>干预行动</h3>
          ${asList(plan?.actions).length ? `<ul class="plain-list">${plan.actions.map((action) => `<li><strong>${escapeHtml(statusText(action.priority))}</strong> ${escapeHtml(action.title)} - ${escapeHtml(action.reason)}</li>`).join("")}</ul>` : emptyState("暂无行动。")}
        </section>
      </div>
    </div>
  `;
}

export function operationsView(state) {
  const selectedImportId = state.selected.operationImportId || state.operations.selectedImport?.batch?.id || "";
  const selectedJobId = state.selected.operationJobId || state.operations.selectedJob?.job?.id || "";
  return `
    ${filterPanel(state)}
    ${operationMetrics(state.operations.dashboard)}
    <div class="operations-layout">
      <section class="operations-main">
        ${importForm(state)}
        <div class="panel"><div class="panel-header"><h2>导入批次</h2><span class="tag">${escapeHtml(state.operations.imports?.length || 0)} 个</span></div>${importList(state.operations.imports || [], selectedImportId)}</div>
        ${importDetail(state.operations.selectedImport)}
        <div class="panel"><div class="panel-header"><h2>批量任务</h2><span class="tag">${escapeHtml(state.operations.jobs?.length || 0)} 个</span></div>${jobList(state.operations.jobs || [], selectedJobId)}</div>
        ${jobDetail(state.operations.selectedJob)}
      </section>
      <aside class="operations-side">
        ${jobForm(state)}
        ${auditPanel(state)}
        ${deepPortfolioPanel(state)}
      </aside>
    </div>
  `;
}
