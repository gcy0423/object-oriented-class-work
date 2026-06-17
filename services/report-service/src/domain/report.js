export function isTeacherRole(role) {
  return role === "teacher" || role === "admin";
}

export function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function average(values = []) {
  const numbers = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!numbers.length) {
    return 0;
  }
  return Math.round((numbers.reduce((sum, value) => sum + value, 0) / numbers.length) * 10) / 10;
}

export function percentage(part, total) {
  const denominator = Number(total || 0);
  if (!denominator) {
    return 0;
  }
  return Math.round((Number(part || 0) / denominator) * 100);
}

export function compactDate(value) {
  if (!value) {
    return "";
  }
  return String(value).slice(0, 10);
}

export function normalizeFormat(value = "") {
  const format = String(value || "json").toLowerCase();
  return ["json", "markdown", "html", "csv"].includes(format) ? format : "json";
}

export function reportId(prefix) {
  return `${prefix}_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
}

export function groupBy(items = [], key) {
  const map = new Map();
  for (const item of items) {
    const value = typeof key === "function" ? key(item) : item?.[key];
    const resolved = value || "unknown";
    if (!map.has(resolved)) {
      map.set(resolved, []);
    }
    map.get(resolved).push(item);
  }
  return map;
}

export function countBy(items = [], key) {
  return [...groupBy(items, key).entries()].map(([name, rows]) => ({ name, count: rows.length }));
}

export function sortDesc(items = [], key = "createdAt") {
  return [...items].sort((left, right) => String(right?.[key] || "").localeCompare(String(left?.[key] || "")));
}

export function asMetric(label, value, hint = "") {
  return { label, value, hint };
}

export function asSection(title, body = "", items = []) {
  return { title, body, items };
}

export function asTable(title, columns = [], rows = []) {
  return { title, columns, rows };
}

export function createReport({ id, type, title, scope, summary, metrics = [], sections = [], tables = [], recommendations = [], evidence = [] }) {
  return {
    id,
    type,
    title,
    scope,
    generatedAt: new Date().toISOString(),
    summary,
    metrics,
    sections,
    tables,
    recommendations,
    evidence
  };
}

function escapeMarkdown(value) {
  return String(value ?? "").replaceAll("|", "\\|");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tableToMarkdown(table) {
  if (!table.rows.length) {
    return `### ${table.title}\n\nNo rows.\n`;
  }
  const header = table.columns.map((column) => escapeMarkdown(column.label)).join(" | ");
  const divider = table.columns.map(() => "---").join(" | ");
  const rows = table.rows.map((row) => table.columns.map((column) => escapeMarkdown(row[column.key] ?? "")).join(" | ")).join("\n");
  return `### ${table.title}\n\n| ${header} |\n| ${divider} |\n${rows.split("\n").map((line) => `| ${line} |`).join("\n")}\n`;
}

function tableToHtml(table) {
  const head = table.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
  const rows = table.rows.length
    ? table.rows.map((row) => `<tr>${table.columns.map((column) => `<td>${escapeHtml(row[column.key] ?? "")}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${table.columns.length || 1}">No rows.</td></tr>`;
  return `<section><h2>${escapeHtml(table.title)}</h2><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></section>`;
}

function flattenCsvValue(value) {
  if (Array.isArray(value)) {
    return value.join("; ");
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return value ?? "";
}

function csvEscape(value) {
  const text = String(flattenCsvValue(value));
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function renderMarkdown(report) {
  const metrics = report.metrics.length
    ? report.metrics.map((item) => `- **${item.label}:** ${item.value}${item.hint ? ` (${item.hint})` : ""}`).join("\n")
    : "- No metrics";
  const sections = report.sections.map((section) => {
    const items = section.items?.length ? section.items.map((item) => `- ${item}`).join("\n") : "";
    return `## ${section.title}\n\n${section.body || ""}${items ? `\n\n${items}` : ""}`;
  }).join("\n\n");
  const tables = report.tables.map((table) => tableToMarkdown(table)).join("\n");
  const recommendations = report.recommendations.length
    ? report.recommendations.map((item) => `- ${item}`).join("\n")
    : "- No recommendations";
  const evidence = report.evidence.length ? report.evidence.map((item) => `- ${item}`).join("\n") : "- No evidence";
  return `# ${report.title}

Generated at: ${report.generatedAt}

${report.summary}

## Metrics

${metrics}

${sections}

## Recommendations

${recommendations}

## Evidence

${evidence}

${tables}`;
}

export function renderHtml(report) {
  const metrics = report.metrics.map((item) => `<article><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong><small>${escapeHtml(item.hint)}</small></article>`).join("");
  const sections = report.sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body || "")}</p><ul>${(section.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`).join("");
  const tables = report.tables.map((table) => tableToHtml(table)).join("");
  const recommendations = report.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const evidence = report.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; margin: 32px; color: #172033; }
    h1 { margin-bottom: 6px; }
    .meta { color: #667085; margin-bottom: 24px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 18px 0; }
    article { border: 1px solid #d6deea; border-radius: 8px; padding: 12px; }
    article span, article small { display: block; color: #667085; }
    article strong { display: block; font-size: 24px; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; }
    th, td { border-bottom: 1px solid #d6deea; padding: 8px; text-align: left; }
    section { margin: 22px 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(report.title)}</h1>
  <div class="meta">Generated at ${escapeHtml(report.generatedAt)}</div>
  <p>${escapeHtml(report.summary)}</p>
  <div class="metrics">${metrics}</div>
  ${sections}
  <section><h2>Recommendations</h2><ul>${recommendations || "<li>No recommendations</li>"}</ul></section>
  <section><h2>Evidence</h2><ul>${evidence || "<li>No evidence</li>"}</ul></section>
  ${tables}
</body>
</html>`;
}

export function renderCsv(report) {
  const lines = [
    ["report_id", report.id],
    ["type", report.type],
    ["title", report.title],
    ["generated_at", report.generatedAt],
    ["summary", report.summary],
    []
  ];
  lines.push(["metric", "value", "hint"]);
  for (const metric of report.metrics) {
    lines.push([metric.label, metric.value, metric.hint || ""]);
  }
  for (const table of report.tables) {
    lines.push([]);
    lines.push([table.title]);
    lines.push(table.columns.map((column) => column.label));
    for (const row of table.rows) {
      lines.push(table.columns.map((column) => row[column.key] ?? ""));
    }
  }
  if (report.recommendations.length) {
    lines.push([]);
    lines.push(["recommendations"]);
    for (const recommendation of report.recommendations) {
      lines.push([recommendation]);
    }
  }
  return lines.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function exportReport(report, format) {
  const normalized = normalizeFormat(format);
  if (normalized === "markdown") {
    return {
      format: "markdown",
      contentType: "text/markdown; charset=utf-8",
      filename: `${report.id}.md`,
      body: renderMarkdown(report)
    };
  }
  if (normalized === "html") {
    return {
      format: "html",
      contentType: "text/html; charset=utf-8",
      filename: `${report.id}.html`,
      body: renderHtml(report)
    };
  }
  if (normalized === "csv") {
    return {
      format: "csv",
      contentType: "text/csv; charset=utf-8",
      filename: `${report.id}.csv`,
      body: renderCsv(report)
    };
  }
  return null;
}
