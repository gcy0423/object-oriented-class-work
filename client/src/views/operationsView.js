import { emptyState, escapeHtml, formatDate, metric, statusBadge } from "../components.js";

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
  const metrics = dashboard.metrics || {};
  return `
    <div class="stats-grid compact-stats operations-metrics">
      ${metric("Imports", metrics.importBatchCount ?? 0)}
      ${metric("Committed", metrics.committedImportCount ?? 0)}
      ${metric("Queued jobs", metrics.queuedJobCount ?? 0)}
      ${metric("Completed jobs", metrics.completedJobCount ?? 0)}
      ${metric("Audit events", metrics.auditEventCount ?? 0)}
      ${metric("Critical", metrics.criticalAuditCount ?? 0)}
    </div>
  `;
}

function filterPanel(state) {
  const filter = state.filters.operations || {};
  const courses = state.dashboard?.courses || [];
  const catalog = state.operations.catalog;
  return `
    <form class="panel form-grid operations-filter" data-form="operations-filter">
      <label><span>Course</span><select name="courseId">
        <option value="">All courses</option>
        ${courseOptions(courses, filter.courseId)}
      </select></label>
      <label><span>Import Target</span><select name="target">
        <option value="">All targets</option>
        ${catalogTargetOptions(catalog, filter.target)}
      </select></label>
      <label><span>Job Type</span><select name="jobType">
        <option value="">All job types</option>
        ${catalogJobOptions(catalog, filter.jobType)}
      </select></label>
      <label><span>Severity</span><select name="severity">
        <option value="">All severities</option>
        <option value="info" ${filter.severity === "info" ? "selected" : ""}>Info</option>
        <option value="warning" ${filter.severity === "warning" ? "selected" : ""}>Warning</option>
        <option value="critical" ${filter.severity === "critical" ? "selected" : ""}>Critical</option>
      </select></label>
      <label><span>Student</span><input name="studentId" value="${escapeHtml(filter.studentId || "")}" placeholder="user_student" /></label>
      <div class="button-row"><button class="btn primary" type="submit">Apply</button></div>
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
      <div class="panel-header"><h2>Import Preview</h2></div>
      <label><span>Title</span><input name="title" value="${escapeHtml(draft.title || "")}" required /></label>
      <label><span>Course</span><select name="courseId">
        <option value="">No course</option>
        ${courseOptions(courses, filter.courseId || draft.courseId)}
      </select></label>
      <label><span>Target</span><select name="target">
        ${catalogTargetOptions(catalog, filter.target || draft.target || "portfolioEvidence")}
      </select></label>
      <label><span>Format</span><select name="format">
        <option value="json" ${(draft.format || "json") === "json" ? "selected" : ""}>JSON</option>
        <option value="csv" ${draft.format === "csv" ? "selected" : ""}>CSV</option>
        <option value="tsv" ${draft.format === "tsv" ? "selected" : ""}>TSV</option>
      </select></label>
      <label><span>Duplicate policy</span><select name="duplicatePolicy">
        <option value="skip">Skip</option>
        <option value="replace">Replace</option>
        <option value="append">Append</option>
      </select></label>
      <label class="full-span"><span>Payload</span><textarea name="payload" rows="8" required>${escapeHtml(draft.payload || "")}</textarea></label>
      <div class="button-row"><button class="btn primary" type="submit">Validate Import</button></div>
    </form>
  `;
}

function importList(imports = [], selectedId = "") {
  if (!imports.length) {
    return emptyState("No import batches.");
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
              <button class="btn small" data-action="view-operation-import" data-id="${escapeHtml(batch.id)}">Open</button>
              ${batch.status !== "committed" ? `<button class="btn small" data-action="commit-operation-import" data-id="${escapeHtml(batch.id)}">Commit</button>` : ""}
            </div>
          </div>
          <div class="tag-row">
            ${statusBadge(batch.status || "draft")}
            <span class="tag">${escapeHtml(batch.summary?.totalRows ?? 0)} rows</span>
            <span class="tag">${escapeHtml(batch.summary?.validRows ?? 0)} valid</span>
            <span class="tag">${escapeHtml(batch.summary?.errorRows ?? 0)} errors</span>
            <span class="tag">${escapeHtml(formatDate(batch.createdAt))}</span>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function importDetail(detail) {
  if (!detail) {
    return emptyState("Open an import batch to inspect normalized rows.");
  }
  const rows = asList(detail.rows);
  return `
    <div class="panel">
      <div class="panel-header"><h2>Import Rows</h2><span class="tag">${escapeHtml(rows.length)} rows</span></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>#</th><th>Status</th><th>External ID</th><th>Normalized</th><th>Messages</th></tr></thead>
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
      <div class="panel-header"><h2>Create Batch Job</h2></div>
      <label><span>Title</span><input name="title" value="${escapeHtml(draft.title || "")}" required /></label>
      <label><span>Course</span><select name="courseId">
        <option value="">Global</option>
        ${courseOptions(courses, filter.courseId)}
      </select></label>
      <label><span>Type</span><select name="type">
        ${catalogJobOptions(catalog, filter.jobType || draft.type || "portfolio-refresh")}
      </select></label>
      <label><span>Priority</span><select name="priority">
        <option value="low">Low</option>
        <option value="normal" selected>Normal</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select></label>
      <label class="full-span"><span>Params JSON</span><textarea name="params" rows="4">{"studentIds":["${escapeHtml(filter.studentId || "user_student")}"],"includeEvidence":true}</textarea></label>
      <div class="button-row"><button class="btn primary" type="submit">Create Job</button></div>
    </form>
  `;
}

function jobList(jobs = [], selectedId = "") {
  if (!jobs.length) {
    return emptyState("No batch jobs.");
  }
  return `<div class="operations-job-list">${jobs.map((job) => `
    <article class="operations-card ${job.id === selectedId ? "is-selected" : ""}">
      <div class="operations-card-head">
        <div>
          <strong>${escapeHtml(job.title)}</strong>
          <div class="muted">${escapeHtml(job.type)} / ${escapeHtml(job.courseId || "global")}</div>
        </div>
        <div class="inline-actions">
          <button class="btn small" data-action="view-operation-job" data-id="${escapeHtml(job.id)}">Open</button>
          ${["queued", "failed"].includes(job.status) ? `<button class="btn small" data-action="run-operation-job" data-id="${escapeHtml(job.id)}">Run</button>` : ""}
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
    return emptyState("Open a batch job to inspect execution steps.");
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
      <div class="panel-header"><h2>Audit Digest</h2><span class="tag">${escapeHtml(digest.total ?? audits.length)} events</span></div>
      <div class="operations-digest">
        <section>
          <h3>Severity</h3>
          <div class="tag-row">${asList(digest.bySeverity).map((item) => `<span class="tag">${escapeHtml(item.severity)}: ${escapeHtml(item.count)}</span>`).join("")}</div>
        </section>
        <section>
          <h3>Recommendations</h3>
          ${asList(digest.recommendations).length ? `<ul class="plain-list">${digest.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : emptyState("No recommendations.")}
        </section>
      </div>
    </div>
    <form class="panel form-grid compact-form" data-form="operations-audit">
      <div class="panel-header"><h2>Manual Audit Event</h2></div>
      <label><span>Action</span><input name="action" value="${escapeHtml(draft.action || "")}" required /></label>
      <label><span>Resource Type</span><input name="resourceType" value="${escapeHtml(draft.resourceType || "")}" required /></label>
      <label><span>Resource ID</span><input name="resourceId" value="${escapeHtml(filter.studentId || "")}" /></label>
      <label><span>Course</span><input name="courseId" value="${escapeHtml(filter.courseId || "")}" /></label>
      <label><span>Severity</span><select name="severity">
        <option value="info" ${draft.severity === "info" ? "selected" : ""}>Info</option>
        <option value="warning" ${draft.severity === "warning" ? "selected" : ""}>Warning</option>
        <option value="critical" ${draft.severity === "critical" ? "selected" : ""}>Critical</option>
      </select></label>
      <label class="full-span"><span>Summary</span><textarea name="summary" rows="3" required>${escapeHtml(draft.summary || "")}</textarea></label>
      <div class="button-row"><button class="btn primary" type="submit">Record Audit</button></div>
    </form>
    <div class="panel">
      <div class="panel-header"><h2>Audit Trail</h2><span class="tag">${escapeHtml(audits.length)} loaded</span></div>
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
      `).join("")}</ul>` : emptyState("No audit events.")}
    </div>
  `;
}

function deepPortfolioPanel(state) {
  const deep = state.operations.deepPortfolio;
  const evidenceMap = state.operations.evidenceMap;
  const plan = state.operations.interventionPlan;
  const board = state.operations.portfolioBoard;
  if (!deep && !evidenceMap && !plan && !board) {
    return emptyState("Deep portfolio analysis will appear after operations refresh.");
  }
  const quality = deep?.quality || {};
  return `
    <div class="panel">
      <div class="panel-header"><h2>Deep Portfolio</h2><span class="tag">${escapeHtml(quality.tone || "not loaded")}</span></div>
      <div class="stats-grid compact-stats">
        ${metric("Quality", quality.overallScore ?? 0)}
        ${metric("Evidence", evidenceMap?.totalEvidence ?? 0)}
        ${metric("Actions", plan?.actionCount ?? 0)}
        ${metric("Board students", board?.totalStudents ?? 0)}
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
      <div class="panel-header"><h2>Evidence Gaps & Actions</h2></div>
      <div class="operations-digest">
        <section>
          <h3>Evidence Gaps</h3>
          ${asList(evidenceMap?.gaps).length ? `<ul class="plain-list">${evidenceMap.gaps.map((gap) => `<li>${escapeHtml(gap.message)}</li>`).join("")}</ul>` : emptyState("No evidence gaps.")}
        </section>
        <section>
          <h3>Intervention Actions</h3>
          ${asList(plan?.actions).length ? `<ul class="plain-list">${plan.actions.map((action) => `<li><strong>${escapeHtml(action.priority)}</strong> ${escapeHtml(action.title)} - ${escapeHtml(action.reason)}</li>`).join("")}</ul>` : emptyState("No actions.")}
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
        <div class="panel"><div class="panel-header"><h2>Import Batches</h2><span class="tag">${escapeHtml(state.operations.imports?.length || 0)} batches</span></div>${importList(state.operations.imports || [], selectedImportId)}</div>
        ${importDetail(state.operations.selectedImport)}
        <div class="panel"><div class="panel-header"><h2>Batch Jobs</h2><span class="tag">${escapeHtml(state.operations.jobs?.length || 0)} jobs</span></div>${jobList(state.operations.jobs || [], selectedJobId)}</div>
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
