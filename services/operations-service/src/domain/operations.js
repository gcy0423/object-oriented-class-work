import { Repository } from "../../../../shared/data/repository.js";
import { Entity } from "../../../../shared/domain/entity.js";

export const ImportStatuses = Object.freeze({
  DRAFT: "draft",
  VALIDATED: "validated",
  COMMITTED: "committed",
  FAILED: "failed"
});

export const BatchStatuses = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled"
});

export const AuditSeverities = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical"
});

export class ImportBatch extends Entity {
  constructor(record) {
    super(record);
    this.title = record.title || "";
    this.target = record.target || "generic";
    this.source = record.source || "manual";
    this.format = record.format || "json";
    this.ownerId = record.ownerId || "";
    this.courseId = record.courseId || "";
    this.status = record.status || ImportStatuses.DRAFT;
    this.summary = record.summary || {};
    this.options = record.options || {};
    this.committedAt = record.committedAt || null;
  }
}

export class ImportRow extends Entity {
  constructor(record) {
    super(record);
    this.batchId = record.batchId || "";
    this.rowNumber = Number(record.rowNumber || 0);
    this.externalId = record.externalId || "";
    this.status = record.status || "pending";
    this.payload = record.payload || {};
    this.normalized = record.normalized || {};
    this.errors = Array.isArray(record.errors) ? record.errors : [];
    this.warnings = Array.isArray(record.warnings) ? record.warnings : [];
  }
}

export class BatchJob extends Entity {
  constructor(record) {
    super(record);
    this.title = record.title || "";
    this.type = record.type || "generic";
    this.courseId = record.courseId || "";
    this.ownerId = record.ownerId || "";
    this.status = record.status || BatchStatuses.QUEUED;
    this.priority = record.priority || "normal";
    this.params = record.params || {};
    this.progress = Number(record.progress || 0);
    this.result = record.result || null;
    this.error = record.error || "";
    this.startedAt = record.startedAt || null;
    this.finishedAt = record.finishedAt || null;
  }
}

export class BatchStep extends Entity {
  constructor(record) {
    super(record);
    this.jobId = record.jobId || "";
    this.key = record.key || "";
    this.title = record.title || "";
    this.status = record.status || "pending";
    this.order = Number(record.order || 0);
    this.input = record.input || {};
    this.output = record.output || {};
    this.error = record.error || "";
    this.startedAt = record.startedAt || null;
    this.finishedAt = record.finishedAt || null;
  }
}

export class AuditEvent extends Entity {
  constructor(record) {
    super(record);
    this.actorId = record.actorId || "";
    this.actorRole = record.actorRole || "";
    this.action = record.action || "";
    this.resourceType = record.resourceType || "";
    this.resourceId = record.resourceId || "";
    this.courseId = record.courseId || "";
    this.severity = record.severity || AuditSeverities.INFO;
    this.summary = record.summary || "";
    this.before = record.before || null;
    this.after = record.after || null;
    this.metadata = record.metadata || {};
    this.ip = record.ip || "";
    this.userAgent = record.userAgent || "";
  }
}

export class ImportBatchRepository extends Repository {
  constructor(database) {
    super(database, "importBatches", (record) => new ImportBatch(record));
  }

  findByOwner(ownerId) {
    return this.where((batch) => batch.ownerId === ownerId);
  }

  findByCourse(courseId) {
    return this.where((batch) => batch.courseId === courseId);
  }
}

export class ImportRowRepository extends Repository {
  constructor(database) {
    super(database, "importRows", (record) => new ImportRow(record));
  }

  findByBatch(batchId) {
    return this.where((row) => row.batchId === batchId)
      .sort((a, b) => a.rowNumber - b.rowNumber);
  }
}

export class BatchJobRepository extends Repository {
  constructor(database) {
    super(database, "batchJobs", (record) => new BatchJob(record));
  }

  findByCourse(courseId) {
    return this.where((job) => job.courseId === courseId);
  }

  findByOwner(ownerId) {
    return this.where((job) => job.ownerId === ownerId);
  }
}

export class BatchStepRepository extends Repository {
  constructor(database) {
    super(database, "batchSteps", (record) => new BatchStep(record));
  }

  findByJob(jobId) {
    return this.where((step) => step.jobId === jobId)
      .sort((a, b) => a.order - b.order);
  }
}

export class AuditEventRepository extends Repository {
  constructor(database) {
    super(database, "auditEvents", (record) => new AuditEvent(record));
  }

  findByCourse(courseId) {
    return this.where((event) => event.courseId === courseId);
  }

  findByActor(actorId) {
    return this.where((event) => event.actorId === actorId);
  }

  findByResource(resourceType, resourceId) {
    return this.where((event) => event.resourceType === resourceType && event.resourceId === resourceId);
  }
}

export function createOperationRepositories(database) {
  return {
    importBatches: new ImportBatchRepository(database),
    importRows: new ImportRowRepository(database),
    batchJobs: new BatchJobRepository(database),
    batchSteps: new BatchStepRepository(database),
    auditEvents: new AuditEventRepository(database)
  };
}
