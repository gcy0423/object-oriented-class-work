import { emptyState, escapeHtml, formatDate, metric, statusBadge } from "../components.js";

function optionList(items = [], selected = "", getValue = (item) => item.id, getLabel = (item) => item.title || item.name || item.id) {
  return items.map((item) => {
    const value = getValue(item);
    return `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(getLabel(item))}</option>`;
  }).join("");
}

function reportPayload(payload) {
  return payload?.report || payload || null;
}

function metricGrid(report) {
  const metrics = report?.metrics || [];
  if (!metrics.length) {
    return emptyState("No report metrics.");
  }
  return `<div class="stats-grid report-metrics">${metrics.map((item) => metric(item.label, item.value)).join("")}</div>`;
}

function sectionList(report) {
  const sections = report?.sections || [];
  if (!sections.length) {
    return "";
  }
  return `<div class="report-section-list">${sections.map((section) => `
    <article>
      <h3>${escapeHtml(section.title)}</h3>
      <p class="muted">${escapeHtml(section.body || "")}</p>
      ${(section.items || []).length ? `<ul class="plain-list">${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    </article>
  `).join("")}</div>`;
}

function recommendationList(report) {
  const recommendations = report?.recommendations || [];
  if (!recommendations.length) {
    return emptyState("No recommendations.");
  }
  return `<ul class="report-recommendations">${recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function tablePreview(table) {
  if (!table?.rows?.length) {
    return "";
  }
  return `<div class="table-wrap">
    <table class="data-table report-table">
      <thead><tr>${table.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
      <tbody>${table.rows.slice(0, 8).map((row) => `<tr>${table.columns.map((column) => `<td>${escapeHtml(row[column.key] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function reportCard(title, payload, type, filter) {
  const report = reportPayload(payload);
  if (!report) {
    return `<div class="panel"><div class="panel-header"><h2>${escapeHtml(title)}</h2></div>${emptyState("Report not loaded.")}</div>`;
  }
  return `
    <div class="panel report-card">
      <div class="panel-header">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p class="muted">${escapeHtml(report.summary || "")}</p>
        </div>
        <div class="tag-row">
          ${statusBadge(report.type || type, "active")}
          <span class="tag">${escapeHtml(formatDate(report.generatedAt))}</span>
        </div>
      </div>
      ${metricGrid(report)}
      ${sectionList(report)}
      <div class="subpanel">
        <strong>Recommendations</strong>
        ${recommendationList(report)}
      </div>
      ${(report.tables || []).length ? `<div class="subpanel"><strong>${escapeHtml(report.tables[0].title)}</strong>${tablePreview(report.tables[0])}</div>` : ""}
      <form class="button-row report-export-form" data-form="report-export">
        <input type="hidden" name="type" value="${escapeHtml(type)}" />
        <input type="hidden" name="courseId" value="${escapeHtml(filter.courseId || "")}" />
        <input type="hidden" name="studentId" value="${escapeHtml(filter.studentId || "")}" />
        <input type="hidden" name="assignmentId" value="${escapeHtml(filter.assignmentId || "")}" />
        <select name="format">
          ${["markdown", "html", "csv"].map((format) => `<option value="${format}" ${filter.format === format ? "selected" : ""}>${format}</option>`).join("")}
        </select>
        <button class="btn small" type="submit">Build Export</button>
      </form>
    </div>
  `;
}

function catalogPanel(catalog) {
  const reports = catalog?.reports || [];
  return `
    <div class="panel">
      <div class="panel-header"><h2>Report Catalog</h2></div>
      ${reports.length ? `<div class="report-catalog">${reports.map((item) => `
        <article>
          <strong>${escapeHtml(item.title)}</strong>
          <div class="tag-row">
            ${(item.roles || []).map((role) => `<span class="tag">${escapeHtml(role)}</span>`).join("")}
            ${(item.formats || []).map((format) => `<span class="tag">${escapeHtml(format)}</span>`).join("")}
          </div>
        </article>
      `).join("")}</div>` : emptyState("No report catalog.")}
    </div>
  `;
}

function exportPreview(preview) {
  if (!preview?.export) {
    return "";
  }
  return `
    <div class="panel report-export-preview">
      <div class="panel-header">
        <div>
          <h2>Export Preview</h2>
          <p class="muted">${escapeHtml(preview.export.filename)} · ${escapeHtml(preview.export.contentType)}</p>
        </div>
        ${statusBadge(preview.export.format, "active")}
      </div>
      <pre>${escapeHtml(String(preview.export.body || "").slice(0, 6000))}</pre>
    </div>
  `;
}

function filterForm(state) {
  const filter = state.filters.reports || {};
  const courses = state.dashboard?.courses || [];
  const users = state.dashboard?.users || [];
  const assignments = state.assessment?.assignments || [];
  return `
    <form class="filter-toolbar report-filter" data-form="report-filter">
      <label><span>Course</span><select name="courseId">
        <option value="">Auto</option>
        ${optionList(courses, filter.courseId, (course) => course.id, (course) => course.title)}
      </select></label>
      <label><span>Student</span><select name="studentId">
        <option value="">Current</option>
        ${optionList(users.filter((user) => user.role === "student"), filter.studentId, (user) => user.id, (user) => user.name)}
      </select></label>
      <label><span>Assignment</span><select name="assignmentId">
        <option value="">Auto</option>
        ${optionList(assignments, filter.assignmentId, (assignment) => assignment.id, (assignment) => assignment.title)}
      </select></label>
      <label><span>Format</span><select name="format">
        ${["markdown", "html", "csv"].map((format) => `<option value="${format}" ${filter.format === format ? "selected" : ""}>${format}</option>`).join("")}
      </select></label>
      <div class="filter-actions">
        <button class="btn primary" type="submit">Refresh</button>
      </div>
    </form>
  `;
}

export function reportView(state) {
  const filter = state.filters.reports || {};
  const reports = state.reports || {};
  const teacher = state.user?.role === "teacher" || state.user?.role === "admin";
  return `
    ${filterForm(state)}
    <section class="report-layout">
      <div class="report-main">
        ${reportCard("Student Learning Weekly Report", reports.studentWeekly, "student-weekly", filter)}
        ${teacher ? reportCard("Teacher Course Weekly Report", reports.courseWeekly, "course-weekly", filter) : ""}
        ${teacher ? reportCard("Assignment Grading Report", reports.assignmentGrading, "assignment-grading", filter) : ""}
        ${reportCard("Mistake Review Report", reports.mistakeReview, "mistake-review", filter)}
        ${reportCard("AI Usage Report", reports.aiUsage, "ai-usage", filter)}
      </div>
      <aside class="report-side">
        ${catalogPanel(reports.catalog)}
        ${exportPreview(reports.exportPreview)}
      </aside>
    </section>
  `;
}
