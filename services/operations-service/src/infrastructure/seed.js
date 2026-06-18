export function createOperationsSeed(now = new Date()) {
  const today = now.toISOString();
  return {
    importBatches: [
      {
        id: "import_seed_students",
        title: "Seed student roster preview",
        target: "students",
        source: "seed",
        format: "json",
        ownerId: "user_teacher",
        courseId: "course_ood",
        status: "validated",
        summary: { totalRows: 2, validRows: 2, warningRows: 0, errorRows: 0 },
        options: { duplicatePolicy: "skip", dryRun: true },
        committedAt: null,
        createdAt: today,
        updatedAt: today
      }
    ],
    importRows: [
      {
        id: "irow_seed_student_1",
        batchId: "import_seed_students",
        rowNumber: 1,
        externalId: "20260001",
        status: "valid",
        payload: { name: "Student One", email: "student@edumind.local", studentNo: "20260001" },
        normalized: { name: "Student One", email: "student@edumind.local", studentNo: "20260001", role: "student" },
        errors: [],
        warnings: [],
        createdAt: today,
        updatedAt: today
      },
      {
        id: "irow_seed_student_2",
        batchId: "import_seed_students",
        rowNumber: 2,
        externalId: "20260002",
        status: "valid",
        payload: { name: "Student Two", email: "student2@edumind.local", studentNo: "20260002" },
        normalized: { name: "Student Two", email: "student2@edumind.local", studentNo: "20260002", role: "student" },
        errors: [],
        warnings: [],
        createdAt: today,
        updatedAt: today
      }
    ],
    batchJobs: [
      {
        id: "job_seed_portfolio_refresh",
        title: "Refresh portfolio evidence cache",
        type: "portfolio-refresh",
        courseId: "course_ood",
        ownerId: "user_teacher",
        status: "completed",
        priority: "normal",
        params: { studentIds: ["user_student"], includeEvidence: true },
        progress: 100,
        result: { processed: 1, warnings: [] },
        error: "",
        startedAt: today,
        finishedAt: today,
        createdAt: today,
        updatedAt: today
      }
    ],
    batchSteps: [
      {
        id: "step_seed_portfolio_collect",
        jobId: "job_seed_portfolio_refresh",
        key: "collect-evidence",
        title: "Collect assessment evidence",
        status: "completed",
        order: 1,
        input: { courseId: "course_ood" },
        output: { evidenceItems: 4 },
        error: "",
        startedAt: today,
        finishedAt: today,
        createdAt: today,
        updatedAt: today
      },
      {
        id: "step_seed_portfolio_score",
        jobId: "job_seed_portfolio_refresh",
        key: "score-portfolio",
        title: "Score portfolio quality",
        status: "completed",
        order: 2,
        input: { dimensions: ["completion", "mastery", "reflection"] },
        output: { portfolioScore: 78 },
        error: "",
        startedAt: today,
        finishedAt: today,
        createdAt: today,
        updatedAt: today
      }
    ],
    auditEvents: [
      {
        id: "audit_seed_import_validate",
        actorId: "user_teacher",
        actorRole: "teacher",
        action: "operations.import.validated",
        resourceType: "import-batch",
        resourceId: "import_seed_students",
        courseId: "course_ood",
        severity: "info",
        summary: "Validated seed student roster import.",
        before: null,
        after: { status: "validated", validRows: 2 },
        metadata: { target: "students", source: "seed" },
        ip: "",
        userAgent: "",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "audit_seed_batch_complete",
        actorId: "user_teacher",
        actorRole: "teacher",
        action: "operations.batch.completed",
        resourceType: "batch-job",
        resourceId: "job_seed_portfolio_refresh",
        courseId: "course_ood",
        severity: "info",
        summary: "Completed seed portfolio refresh job.",
        before: { status: "running" },
        after: { status: "completed", progress: 100 },
        metadata: { type: "portfolio-refresh" },
        ip: "",
        userAgent: "",
        createdAt: today,
        updatedAt: today
      }
    ]
  };
}
