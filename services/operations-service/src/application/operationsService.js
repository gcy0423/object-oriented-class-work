import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { AuditEvent, AuditSeverities, BatchJob, BatchStatuses, BatchStep, ImportBatch, ImportRow, ImportStatuses } from "../domain/operations.js";

const TARGET_SCHEMAS = Object.freeze({
  students: {
    required: ["name", "email"],
    optional: ["studentNo", "major", "department", "classroomId"],
    defaults: { role: "student", status: "active" },
    identity: "email"
  },
  enrollments: {
    required: ["userId", "classroomId"],
    optional: ["role", "status", "source"],
    defaults: { role: "student", status: "active", source: "import" },
    identity: "userId"
  },
  assignments: {
    required: ["title", "courseId", "dueAt"],
    optional: ["description", "rubricId", "classroomId", "status"],
    defaults: { status: "draft" },
    identity: "title"
  },
  questions: {
    required: ["stem", "type", "courseId", "bankId"],
    optional: ["answer", "analysis", "difficulty", "concept", "choices"],
    defaults: { difficulty: "medium" },
    identity: "stem"
  },
  portfolioEvidence: {
    required: ["studentId", "courseId", "type", "summary"],
    optional: ["artifactUrl", "score", "concept", "occurredAt"],
    defaults: { type: "manual-evidence" },
    identity: "summary"
  }
});

const JOB_TEMPLATES = Object.freeze({
  "portfolio-refresh": [
    { key: "collect-evidence", title: "Collect assessment, practice, and mistake evidence" },
    { key: "recompute-quality", title: "Recompute portfolio quality dimensions" },
    { key: "build-interventions", title: "Build intervention candidates" },
    { key: "write-audit", title: "Write portfolio refresh audit event" }
  ],
  "risk-recalculation": [
    { key: "load-risk-inputs", title: "Load assignment, grade, mistake, and mastery inputs" },
    { key: "score-students", title: "Score each student risk register row" },
    { key: "rank-actions", title: "Rank intervention actions" },
    { key: "write-audit", title: "Write risk recalculation audit event" }
  ],
  "import-commit": [
    { key: "lock-batch", title: "Lock validated import batch" },
    { key: "apply-valid-rows", title: "Apply valid normalized rows" },
    { key: "collect-skipped-rows", title: "Collect skipped rows and warnings" },
    { key: "write-audit", title: "Write import commit audit event" }
  ],
  "notification-digest": [
    { key: "select-recipients", title: "Select recipients by role and course" },
    { key: "compose-digest", title: "Compose digest payload" },
    { key: "queue-notifications", title: "Queue notification tasks" },
    { key: "write-audit", title: "Write notification digest audit event" }
  ]
});

function isManager(user) {
  return user?.role === "teacher" || user?.role === "admin";
}

function requireManager(user) {
  if (!isManager(user)) {
    throw new ForbiddenError("operations center requires teacher or admin role");
  }
}

function text(value) {
  return String(value ?? "").trim();
}

function normalizeSeverity(value) {
  return Object.values(AuditSeverities).includes(value) ? value : AuditSeverities.INFO;
}

function normalizePriority(value) {
  return ["low", "normal", "high", "urgent"].includes(value) ? value : "normal";
}

function normalizeFormat(value, fallback = "json") {
  return ["json", "csv", "tsv"].includes(value) ? value : fallback;
}

function splitLines(raw) {
  return String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseDelimited(raw, delimiter = ",") {
  const lines = splitLines(raw);
  if (!lines.length) {
    return [];
  }
  const headers = lines[0].split(delimiter).map((header) => text(header));
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter);
    return headers.reduce((row, header, index) => {
      row[header] = text(values[index]);
      return row;
    }, {});
  });
}

function parsePayload(input = {}) {
  if (Array.isArray(input.rows)) {
    return input.rows;
  }
  if (Array.isArray(input.items)) {
    return input.items;
  }
  if (typeof input.payload === "string") {
    const format = normalizeFormat(input.format);
    if (format === "csv") {
      return parseDelimited(input.payload, ",");
    }
    if (format === "tsv") {
      return parseDelimited(input.payload, "\t");
    }
    try {
      const parsed = JSON.parse(input.payload);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      throw new ValidationError("payload must be valid JSON, CSV, or TSV");
    }
  }
  if (input.payload && typeof input.payload === "object") {
    return Array.isArray(input.payload) ? input.payload : [input.payload];
  }
  return [];
}

function normalizeScalar(value) {
  if (Array.isArray(value)) {
    return value.map((item) => text(item)).filter(Boolean);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return text(value);
}

function normalizeChoices(value) {
  if (Array.isArray(value)) {
    return value.map((choice, index) => {
      if (typeof choice === "object") {
        return { id: text(choice.id || String.fromCharCode(65 + index)), text: text(choice.text || choice.label || choice.value) };
      }
      return { id: String.fromCharCode(65 + index), text: text(choice) };
    }).filter((choice) => choice.text);
  }
  return text(value)
    .split(/[;|]/)
    .map((item, index) => ({ id: String.fromCharCode(65 + index), text: text(item) }))
    .filter((choice) => choice.text);
}

function normalizeRow(target, row = {}) {
  const schema = TARGET_SCHEMAS[target] || TARGET_SCHEMAS.portfolioEvidence;
  const normalized = { ...schema.defaults };
  for (const key of [...schema.required, ...schema.optional]) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      normalized[key] = key === "choices" ? normalizeChoices(row[key]) : normalizeScalar(row[key]);
    }
  }
  if (target === "questions" && normalized.type === "multiple_choice" && typeof normalized.answer === "string") {
    normalized.answer = normalized.answer.split(/[;,]/).map((item) => text(item)).filter(Boolean);
  }
  if (target === "portfolioEvidence" && normalized.score !== undefined && normalized.score !== "") {
    normalized.score = Number(normalized.score);
  }
  return normalized;
}

function validateRow(target, normalized = {}) {
  const schema = TARGET_SCHEMAS[target] || TARGET_SCHEMAS.portfolioEvidence;
  const errors = [];
  const warnings = [];
  for (const key of schema.required) {
    if (normalized[key] === undefined || normalized[key] === null || normalized[key] === "") {
      errors.push({ field: key, message: `${key} is required` });
    }
  }
  if (normalized.email && !String(normalized.email).includes("@")) {
    errors.push({ field: "email", message: "email must include @" });
  }
  if (normalized.dueAt && Number.isNaN(Date.parse(normalized.dueAt))) {
    warnings.push({ field: "dueAt", message: "dueAt is not an ISO date; downstream service may reject it" });
  }
  if (normalized.score !== undefined && (Number.isNaN(Number(normalized.score)) || Number(normalized.score) < 0)) {
    errors.push({ field: "score", message: "score must be a non-negative number" });
  }
  if (target === "questions" && normalized.type === "multiple_choice" && !Array.isArray(normalized.answer)) {
    warnings.push({ field: "answer", message: "multiple_choice answer should be an array or comma-separated list" });
  }
  if (target === "questions" && (!normalized.analysis || String(normalized.analysis).length < 10)) {
    warnings.push({ field: "analysis", message: "question analysis is short; answer review evidence may be weak" });
  }
  return { errors, warnings };
}

function summarizeRows(rows = []) {
  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.status === "valid").length,
    warningRows: rows.filter((row) => row.status === "warning").length,
    errorRows: rows.filter((row) => row.status === "error").length,
    pendingRows: rows.filter((row) => row.status === "pending").length
  };
}

function visibleByCourse(items, filters = {}) {
  return items.filter((item) => !filters.courseId || item.courseId === filters.courseId);
}

function sortRecent(items = []) {
  return [...items].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function buildJobSteps(type) {
  return JOB_TEMPLATES[type] || [
    { key: "prepare", title: "Prepare job inputs" },
    { key: "execute", title: "Execute job work" },
    { key: "summarize", title: "Summarize job result" },
    { key: "write-audit", title: "Write audit event" }
  ];
}

export class OperationsService {
  constructor({ database, importBatches, importRows, batchJobs, batchSteps, auditEvents }) {
    this.database = database;
    this.importBatches = importBatches;
    this.importRows = importRows;
    this.batchJobs = batchJobs;
    this.batchSteps = batchSteps;
    this.auditEvents = auditEvents;
  }

  catalog() {
    return {
      importTargets: Object.entries(TARGET_SCHEMAS).map(([key, schema]) => ({
        key,
        required: schema.required,
        optional: schema.optional,
        identity: schema.identity
      })),
      jobTypes: Object.entries(JOB_TEMPLATES).map(([key, steps]) => ({
        key,
        stepCount: steps.length,
        steps: steps.map((step) => step.key)
      })),
      auditSeverities: Object.values(AuditSeverities)
    };
  }

  dashboard(user, filters = {}) {
    requireManager(user);
    const batches = visibleByCourse(this.importBatches.all(), filters);
    const jobs = visibleByCourse(this.batchJobs.all(), filters);
    const audits = visibleByCourse(this.auditEvents.all(), filters);
    const recentFailures = [
      ...batches.filter((batch) => batch.status === ImportStatuses.FAILED).map((batch) => ({
        type: "import",
        id: batch.id,
        title: batch.title,
        at: batch.updatedAt
      })),
      ...jobs.filter((job) => job.status === BatchStatuses.FAILED).map((job) => ({
        type: "job",
        id: job.id,
        title: job.title,
        at: job.updatedAt
      })),
      ...audits.filter((event) => event.severity === AuditSeverities.CRITICAL).map((event) => ({
        type: "audit",
        id: event.id,
        title: event.summary,
        at: event.createdAt
      }))
    ].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 8);
    return {
      metrics: {
        importBatchCount: batches.length,
        committedImportCount: batches.filter((batch) => batch.status === ImportStatuses.COMMITTED).length,
        queuedJobCount: jobs.filter((job) => job.status === BatchStatuses.QUEUED).length,
        completedJobCount: jobs.filter((job) => job.status === BatchStatuses.COMPLETED).length,
        auditEventCount: audits.length,
        warningAuditCount: audits.filter((event) => event.severity === AuditSeverities.WARNING).length,
        criticalAuditCount: audits.filter((event) => event.severity === AuditSeverities.CRITICAL).length
      },
      recentImports: sortRecent(batches).slice(0, 6),
      recentJobs: sortRecent(jobs).slice(0, 6),
      recentAudits: sortRecent(audits).slice(0, 8),
      recentFailures
    };
  }

  listImports(user, filters = {}) {
    requireManager(user);
    return sortRecent(this.importBatches.all())
      .filter((batch) => !filters.courseId || batch.courseId === filters.courseId)
      .filter((batch) => !filters.target || batch.target === filters.target)
      .filter((batch) => !filters.status || batch.status === filters.status)
      .map((batch) => ({
        ...batch.toJSON(),
        rowPreview: this.importRows.findByBatch(batch.id).slice(0, 5).map((row) => row.toJSON())
      }));
  }

  getImport(user, batchId) {
    requireManager(user);
    const batch = this.importBatches.findById(batchId);
    if (!batch) {
      throw new NotFoundError("import batch not found");
    }
    return {
      batch: batch.toJSON(),
      rows: this.importRows.findByBatch(batchId).map((row) => row.toJSON())
    };
  }

  async previewImport(user, input = {}) {
    requireManager(user);
    const target = text(input.target || "portfolioEvidence");
    if (!TARGET_SCHEMAS[target]) {
      throw new ValidationError(`unsupported import target: ${target}`);
    }
    const rows = parsePayload(input);
    if (!rows.length) {
      throw new ValidationError("at least one import row is required");
    }
    const now = new Date().toISOString();
    const batchId = this.database.nextId("import");
    const rowEntities = rows.map((row, index) => {
      const normalized = normalizeRow(target, row);
      const { errors, warnings } = validateRow(target, normalized);
      const status = errors.length ? "error" : warnings.length ? "warning" : "valid";
      const externalKey = TARGET_SCHEMAS[target].identity;
      return new ImportRow({
        id: this.database.nextId("irow"),
        batchId,
        rowNumber: index + 1,
        externalId: text(normalized[externalKey] || row.id || row.externalId || `${target}-${index + 1}`),
        status,
        payload: row,
        normalized,
        errors,
        warnings,
        createdAt: now,
        updatedAt: now
      });
    });
    const summary = summarizeRows(rowEntities);
    const batch = new ImportBatch({
      id: batchId,
      title: text(input.title) || `${target} import ${now.slice(0, 10)}`,
      target,
      source: text(input.source) || "manual",
      format: normalizeFormat(input.format),
      ownerId: user.id,
      courseId: text(input.courseId),
      status: summary.errorRows ? ImportStatuses.DRAFT : ImportStatuses.VALIDATED,
      summary,
      options: {
        duplicatePolicy: input.duplicatePolicy || "skip",
        dryRun: input.dryRun !== false,
        validateOnly: input.validateOnly !== false
      },
      committedAt: null,
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.importBatches.save(batch);
    for (const row of rowEntities) {
      await this.importRows.save(row);
    }
    await this.recordAudit(user, {
      action: "operations.import.previewed",
      resourceType: "import-batch",
      resourceId: saved.id,
      courseId: saved.courseId,
      severity: summary.errorRows ? AuditSeverities.WARNING : AuditSeverities.INFO,
      summary: `Previewed ${summary.totalRows} ${target} import rows.`,
      after: { status: saved.status, summary },
      metadata: { target, source: saved.source }
    });
    return {
      batch: saved.toJSON(),
      rows: rowEntities.map((row) => row.toJSON())
    };
  }

  async commitImport(user, batchId, input = {}) {
    requireManager(user);
    const batch = this.importBatches.findById(batchId);
    if (!batch) {
      throw new NotFoundError("import batch not found");
    }
    const rows = this.importRows.findByBatch(batchId);
    const validRows = rows.filter((row) => row.status === "valid" || (input.allowWarnings && row.status === "warning"));
    if (!validRows.length) {
      throw new ValidationError("no valid import rows can be committed");
    }
    const now = new Date().toISOString();
    const committed = new ImportBatch({
      ...batch.toJSON(),
      status: ImportStatuses.COMMITTED,
      committedAt: now,
      summary: {
        ...batch.summary,
        committedRows: validRows.length,
        skippedRows: rows.length - validRows.length
      },
      options: { ...batch.options, dryRun: false, committedBy: user.id },
      updatedAt: now
    });
    const saved = await this.importBatches.save(committed);
    const job = await this.createBatchJob(user, {
      title: `Commit import ${saved.title}`,
      type: "import-commit",
      courseId: saved.courseId,
      priority: input.priority || "normal",
      params: {
        batchId: saved.id,
        target: saved.target,
        committedRows: validRows.map((row) => row.id),
        skippedRows: rows.filter((row) => !validRows.some((valid) => valid.id === row.id)).map((row) => row.id)
      }
    });
    await this.recordAudit(user, {
      action: "operations.import.committed",
      resourceType: "import-batch",
      resourceId: saved.id,
      courseId: saved.courseId,
      severity: AuditSeverities.INFO,
      summary: `Committed ${validRows.length} rows from import batch ${saved.title}.`,
      before: { status: batch.status },
      after: { status: saved.status, committedRows: validRows.length },
      metadata: { jobId: job.job.id, target: saved.target }
    });
    return {
      batch: saved.toJSON(),
      committedRows: validRows.map((row) => row.toJSON()),
      job: job.job
    };
  }

  listJobs(user, filters = {}) {
    requireManager(user);
    return sortRecent(this.batchJobs.all())
      .filter((job) => !filters.courseId || job.courseId === filters.courseId)
      .filter((job) => !filters.type || job.type === filters.type)
      .filter((job) => !filters.status || job.status === filters.status)
      .map((job) => ({
        ...job.toJSON(),
        steps: this.batchSteps.findByJob(job.id).map((step) => step.toJSON())
      }));
  }

  getJob(user, jobId) {
    requireManager(user);
    const job = this.batchJobs.findById(jobId);
    if (!job) {
      throw new NotFoundError("batch job not found");
    }
    return {
      job: job.toJSON(),
      steps: this.batchSteps.findByJob(jobId).map((step) => step.toJSON())
    };
  }

  async createBatchJob(user, input = {}) {
    requireManager(user);
    const now = new Date().toISOString();
    const type = text(input.type || "portfolio-refresh");
    const job = new BatchJob({
      id: this.database.nextId("job"),
      title: text(input.title) || `${type} job`,
      type,
      courseId: text(input.courseId),
      ownerId: user.id,
      status: BatchStatuses.QUEUED,
      priority: normalizePriority(input.priority),
      params: input.params && typeof input.params === "object" ? input.params : {},
      progress: 0,
      result: null,
      error: "",
      startedAt: null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.batchJobs.save(job);
    const steps = buildJobSteps(type).map((step, index) => new BatchStep({
      id: this.database.nextId("step"),
      jobId: saved.id,
      key: step.key,
      title: step.title,
      status: "pending",
      order: index + 1,
      input: { params: saved.params },
      output: {},
      error: "",
      startedAt: null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now
    }));
    for (const step of steps) {
      await this.batchSteps.save(step);
    }
    await this.recordAudit(user, {
      action: "operations.batch.created",
      resourceType: "batch-job",
      resourceId: saved.id,
      courseId: saved.courseId,
      severity: AuditSeverities.INFO,
      summary: `Created batch job ${saved.title}.`,
      after: { status: saved.status, type: saved.type },
      metadata: { stepCount: steps.length }
    });
    return {
      job: saved.toJSON(),
      steps: steps.map((step) => step.toJSON())
    };
  }

  async runJob(user, jobId) {
    requireManager(user);
    const job = this.batchJobs.findById(jobId);
    if (!job) {
      throw new NotFoundError("batch job not found");
    }
    if (![BatchStatuses.QUEUED, BatchStatuses.FAILED].includes(job.status)) {
      throw new ValidationError("only queued or failed jobs can be run");
    }
    const now = new Date().toISOString();
    const steps = this.batchSteps.findByJob(jobId);
    let completed = 0;
    for (const step of steps) {
      const started = new BatchStep({ ...step.toJSON(), status: "running", startedAt: now, updatedAt: now });
      await this.batchSteps.save(started);
      const output = this.executeStep(job, step);
      const finished = new BatchStep({
        ...started.toJSON(),
        status: "completed",
        output,
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await this.batchSteps.save(finished);
      completed += 1;
    }
    const finishedJob = new BatchJob({
      ...job.toJSON(),
      status: BatchStatuses.COMPLETED,
      progress: 100,
      startedAt: now,
      finishedAt: new Date().toISOString(),
      result: {
        completedSteps: completed,
        stepCount: steps.length,
        summary: this.buildJobResultSummary(job, steps)
      },
      error: "",
      updatedAt: new Date().toISOString()
    });
    const saved = await this.batchJobs.save(finishedJob);
    await this.recordAudit(user, {
      action: "operations.batch.completed",
      resourceType: "batch-job",
      resourceId: saved.id,
      courseId: saved.courseId,
      severity: AuditSeverities.INFO,
      summary: `Completed batch job ${saved.title}.`,
      before: { status: job.status },
      after: { status: saved.status, progress: 100 },
      metadata: { type: saved.type, completedSteps: completed }
    });
    return this.getJob(user, jobId);
  }

  executeStep(job, step) {
    const params = job.params || {};
    if (step.key === "collect-evidence" || step.key === "load-risk-inputs") {
      return {
        courseId: job.courseId,
        studentCount: Array.isArray(params.studentIds) ? params.studentIds.length : 1,
        evidenceKinds: ["assignment", "grade", "practice", "mistake", "mastery"]
      };
    }
    if (step.key === "recompute-quality" || step.key === "score-students") {
      return {
        scored: Array.isArray(params.studentIds) ? params.studentIds.length : 1,
        dimensions: ["completion", "quality", "consistency", "reflection"],
        averageScore: 82
      };
    }
    if (step.key === "build-interventions" || step.key === "rank-actions") {
      return {
        interventions: [
          "Review missing submissions",
          "Schedule mistake recovery",
          "Ask for portfolio reflection evidence"
        ]
      };
    }
    if (step.key === "apply-valid-rows") {
      return {
        appliedRows: Array.isArray(params.committedRows) ? params.committedRows.length : 0,
        target: params.target || "generic"
      };
    }
    if (step.key === "collect-skipped-rows") {
      return {
        skippedRows: Array.isArray(params.skippedRows) ? params.skippedRows.length : 0
      };
    }
    if (step.key === "queue-notifications") {
      return {
        queued: Number(params.recipientCount || 0),
        channels: params.channels || ["in_app"]
      };
    }
    if (step.key === "write-audit") {
      return {
        auditAction: `operations.${job.type}.step.audit`,
        resourceId: job.id
      };
    }
    return {
      ok: true,
      key: step.key
    };
  }

  buildJobResultSummary(job, steps = []) {
    if (job.type === "import-commit") {
      return `Applied import batch ${job.params?.batchId || ""} with ${job.params?.committedRows?.length || 0} committed rows.`;
    }
    if (job.type === "portfolio-refresh") {
      return `Refreshed portfolio evidence for ${job.params?.studentIds?.length || 1} student scope(s).`;
    }
    if (job.type === "risk-recalculation") {
      return `Recalculated risk register using ${steps.length} controlled steps.`;
    }
    if (job.type === "notification-digest") {
      return `Prepared notification digest for ${job.params?.recipientCount || 0} recipients.`;
    }
    return `Completed ${steps.length} batch steps.`;
  }

  listAudits(user, filters = {}) {
    requireManager(user);
    return sortRecent(this.auditEvents.all())
      .filter((event) => !filters.courseId || event.courseId === filters.courseId)
      .filter((event) => !filters.actorId || event.actorId === filters.actorId)
      .filter((event) => !filters.action || event.action.includes(filters.action))
      .filter((event) => !filters.resourceType || event.resourceType === filters.resourceType)
      .filter((event) => !filters.severity || event.severity === filters.severity)
      .slice(0, Number(filters.limit || 100))
      .map((event) => event.toJSON());
  }

  async recordAudit(user, input = {}) {
    requireManager(user);
    const now = new Date().toISOString();
    const event = new AuditEvent({
      id: this.database.nextId("audit"),
      actorId: user.id,
      actorRole: user.role,
      action: text(input.action || "operations.audit.recorded"),
      resourceType: text(input.resourceType || "operation"),
      resourceId: text(input.resourceId || ""),
      courseId: text(input.courseId || ""),
      severity: normalizeSeverity(input.severity),
      summary: text(input.summary || input.action || "Audit event recorded."),
      before: input.before || null,
      after: input.after || null,
      metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
      ip: text(input.ip),
      userAgent: text(input.userAgent),
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.auditEvents.save(event);
    return saved.toJSON();
  }

  auditDigest(user, filters = {}) {
    requireManager(user);
    const events = this.listAudits(user, filters);
    const bySeverity = Object.values(AuditSeverities).map((severity) => ({
      severity,
      count: events.filter((event) => event.severity === severity).length
    }));
    const actionCounts = new Map();
    const resourceCounts = new Map();
    for (const event of events) {
      actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);
      resourceCounts.set(event.resourceType, (resourceCounts.get(event.resourceType) || 0) + 1);
    }
    return {
      total: events.length,
      bySeverity,
      topActions: [...actionCounts.entries()]
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topResources: [...resourceCounts.entries()]
        .map(([resourceType, count]) => ({ resourceType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recentCritical: events.filter((event) => event.severity === AuditSeverities.CRITICAL).slice(0, 5),
      recommendations: this.buildAuditRecommendations(events)
    };
  }

  buildAuditRecommendations(events = []) {
    const recommendations = [];
    const critical = events.filter((event) => event.severity === AuditSeverities.CRITICAL);
    const warnings = events.filter((event) => event.severity === AuditSeverities.WARNING);
    const importFailures = events.filter((event) => event.action.includes("import") && event.severity !== AuditSeverities.INFO);
    const batchFailures = events.filter((event) => event.action.includes("batch") && event.severity !== AuditSeverities.INFO);
    if (critical.length) {
      recommendations.push("Review critical audit events before the next report export.");
    }
    if (warnings.length >= 3) {
      recommendations.push("Group repeated warnings by resource and create a corrective batch job.");
    }
    if (importFailures.length) {
      recommendations.push("Inspect import validation rows and adjust duplicate or missing-field policy.");
    }
    if (batchFailures.length) {
      recommendations.push("Rerun failed batch jobs after confirming downstream service availability.");
    }
    if (!recommendations.length) {
      recommendations.push("Audit trail is stable; continue recording imports, batch jobs, and portfolio refreshes.");
    }
    return recommendations;
  }
}
