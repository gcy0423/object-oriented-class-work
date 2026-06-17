function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function percentText(value) {
  return `${Math.round(asNumber(value))}%`;
}

function pushIf(items, condition, row) {
  if (condition) {
    items.push(row);
  }
}

function riskRank(level) {
  return { high: 3, medium: 2, low: 1 }[String(level || "").toLowerCase()] || 0;
}

function scoreSeverity(score) {
  const value = asNumber(score);
  if (value >= 90) {
    return "excellent";
  }
  if (value >= 75) {
    return "good";
  }
  if (value >= 60) {
    return "pass";
  }
  return "risk";
}

function summarizeBand(bands = {}) {
  return Object.entries(bands)
    .filter(([, count]) => count)
    .map(([band, count]) => `${band}:${count}`)
    .join(", ") || "no band data";
}

function conceptName(row) {
  return row.concept || row.title || row.conceptId || "unclassified";
}

function buildNarrativeCard(title, tone, lines = [], actions = []) {
  return {
    title,
    tone,
    lines: lines.filter(Boolean),
    actions: actions.filter(Boolean)
  };
}

function buildGradingNarrative(overview) {
  if (!overview) {
    return buildNarrativeCard("Grading overview", "neutral", ["No assignment grading overview is loaded."], ["Select an assignment with submissions."]);
  }
  const consistency = overview.consistency || {};
  const gapLine = consistency.sampleSize
    ? `Teacher/AI comparison sample=${consistency.sampleSize}, average gap=${consistency.averageGap}, high-risk gaps=${consistency.highRiskCount}.`
    : "Teacher/AI comparison sample is not sufficient yet.";
  const actions = [];
  pushIf(actions, asNumber(consistency.highRiskCount) > 0, "Review submissions with high teacher/AI score gaps before publishing final feedback.");
  pushIf(actions, asNumber(overview.gradedCount) < asNumber(overview.submissionCount), "Finish grading remaining submissions to stabilize class-level statistics.");
  pushIf(actions, asNumber(overview.average) < 70, "Add a remediation task for students below pass band.");
  if (!actions.length) {
    actions.push("Keep using the current rubric and sample future submissions for consistency drift.");
  }
  return buildNarrativeCard("Grading overview", consistency.status || "stable", [
    `Assignment ${overview.assignment?.title || overview.assignment?.id || ""} has ${overview.submissionCount || 0} submissions and ${overview.gradedCount || 0} graded rows.`,
    `Average score is ${overview.average || 0}; score range is ${overview.minScore || 0}-${overview.maxScore || 0}.`,
    `Band distribution: ${summarizeBand(overview.bands)}.`,
    gapLine
  ], actions);
}

function buildRubricNarrative(profile) {
  if (!profile) {
    return buildNarrativeCard("Rubric quality", "neutral", ["No rubric profile is loaded."], ["Select a rubric to inspect criteria coverage."]);
  }
  const missing = (profile.dimensionCoverage || []).filter((item) => !item.covered).map((item) => item.key);
  const tone = missing.length || (profile.warnings || []).length ? "warning" : "stable";
  return buildNarrativeCard("Rubric quality", tone, [
    `Rubric total score is ${profile.totalScore || 0}, quality score is ${profile.qualityScore || 0}%.`,
    `${profile.criteria?.length || 0} criteria are available; missing dimensions: ${missing.join(", ") || "none"}.`,
    `Weight spread is ${profile.weightBalance?.spread ?? 0} points.`
  ], [
    ...(profile.improvementPlan || []),
    ...(missing.length ? ["Add explicit evidence requirements for each missing dimension."] : [])
  ]);
}

function buildPortfolioNarrative(portfolio) {
  if (!portfolio) {
    return buildNarrativeCard("Student portfolio", "neutral", ["No student portfolio is loaded."], ["Select a course and student scope."]);
  }
  const risk = portfolio.risk || {};
  const assignmentProgress = portfolio.assignmentProgress || {};
  const practice = portfolio.practiceSummary || {};
  const gradeTrend = portfolio.gradeTrend || {};
  const actions = [];
  pushIf(actions, asNumber(assignmentProgress.completionRate) < 80, "Follow up on missing assignments and confirm due-date understanding.");
  pushIf(actions, asNumber(gradeTrend.averageScore) < 70, "Use scored submissions to identify rubric dimensions needing reteaching.");
  pushIf(actions, asNumber(practice.averageCorrectRate) < 70, "Schedule short practice sessions on low-correctness concepts.");
  pushIf(actions, risk.level === "high", "Create a teacher intervention note and schedule a check-in.");
  if (!actions.length) {
    actions.push("Portfolio evidence is stable; keep weekly monitoring.");
  }
  return buildNarrativeCard("Student portfolio", risk.level || "low", [
    `Assignment completion is ${percentText(assignmentProgress.completionRate)} with ${assignmentProgress.submittedCount || 0}/${assignmentProgress.totalAssignments || 0} submitted.`,
    `Average score is ${gradeTrend.averageScore || 0}; teacher average is ${gradeTrend.teacherAverageScore || 0}.`,
    `Practice sessions=${practice.sessionCount || 0}, finished=${practice.finishedCount || 0}, average correct=${percentText(practice.averageCorrectRate)}.`,
    `Portfolio risk is ${risk.level || "low"} with score ${risk.score || 0}.`
  ], actions);
}

function buildCourseNarrative(report) {
  if (!report) {
    return buildNarrativeCard("Course report", "neutral", ["No course assessment report is loaded."], ["Teacher role can load course report."]);
  }
  const distribution = report.gradeDistribution || {};
  const engagement = report.practiceEngagement || {};
  const mistakeLoad = report.mistakeLoad || {};
  const mastery = report.masteryCoverage || {};
  const riskCount = (report.riskRegister || []).filter((item) => item.risk?.level === "high").length;
  const actions = [];
  pushIf(actions, asNumber(distribution.risk) > 0, "Review risk-band submissions and attach rubric-level feedback.");
  pushIf(actions, asNumber(engagement.finishRate) < 70, "Increase practice completion nudges through scheduler reminders.");
  pushIf(actions, asNumber(mistakeLoad.openMistakes) > 0, "Use mistake load to prepare the next review session.");
  pushIf(actions, asNumber(mastery.weakRecordCount) > 0, "Map weak mastery records back to knowledge concepts and practice sets.");
  pushIf(actions, riskCount > 0, "Open the risk register before the next class intervention.");
  if (!actions.length) {
    actions.push("Course evidence is balanced; continue collecting assessment data.");
  }
  return buildNarrativeCard("Course report", riskCount ? "warning" : "stable", [
    `Course has ${report.assignmentCount || 0} assignments, ${report.submissionCount || 0} submissions, and ${report.gradedSubmissionCount || 0} graded submissions.`,
    `Grade distribution: excellent=${distribution.excellent || 0}, good=${distribution.good || 0}, pass=${distribution.pass || 0}, risk=${distribution.risk || 0}.`,
    `Practice finish rate=${percentText(engagement.finishRate)}, average correct=${percentText(engagement.averageCorrectRate)}.`,
    `Open mistakes=${mistakeLoad.openMistakes || 0}, average mastery=${percentText(mastery.averageMastery)}.`
  ], actions);
}

function buildMistakeNarrative(report) {
  if (!report) {
    return buildNarrativeCard("Mistake analysis", "neutral", ["No mistake analysis is loaded."], ["Load mistake analysis from current course."]);
  }
  const high = (report.concepts || []).filter((item) => item.priority === "high");
  const reasons = Object.entries(report.reasonSummary || {}).map(([reason, count]) => `${reason}:${count}`).join(", ");
  return buildNarrativeCard("Mistake analysis", high.length ? "high" : "stable", [
    `Total mistakes=${report.totalMistakes || 0}, open=${report.openMistakes || 0}, reviewed=${report.reviewedMistakes || 0}.`,
    `High-priority concepts=${high.map((item) => item.concept).join(", ") || "none"}.`,
    `Reason summary: ${reasons || "none"}.`
  ], [
    ...high.slice(0, 3).map((item) => `Review ${item.concept}: ${item.remediation?.advice || "practice again"}`),
    ...(high.length ? ["Use the review queue to inspect concrete wrong-answer evidence."] : ["Keep reviewing newly opened mistakes weekly."])
  ]);
}

function buildSessionNarrative(review) {
  if (!review) {
    return buildNarrativeCard("Practice review", "neutral", ["No practice session review is loaded."], ["Select a practice session to inspect answer breakdown."]);
  }
  const total = asNumber(review.correctCount) + asNumber(review.incorrectCount);
  const rate = total ? Math.round((asNumber(review.correctCount) / total) * 100) : 0;
  const weakConcepts = (review.conceptBreakdown || []).filter((item) => asNumber(item.correctRate) < 70);
  return buildNarrativeCard("Practice review", weakConcepts.length ? "warning" : "stable", [
    `Answered=${review.answeredCount || 0}, correct=${review.correctCount || 0}, incorrect=${review.incorrectCount || 0}, pending=${review.pendingCount || 0}.`,
    `Judged correct rate is ${rate}%.`,
    `Weak concepts: ${weakConcepts.map((item) => item.concept).join(", ") || "none"}.`
  ], [
    ...(review.nextActions || []),
    ...(weakConcepts.length ? ["Generate an adaptive plan from the weak concepts."] : ["Move to mixed review after one day."])
  ]);
}

function buildAdaptivePlanNarrative(plan) {
  if (!plan) {
    return buildNarrativeCard("Adaptive plan", "neutral", ["No adaptive practice plan is loaded."], ["Build a plan from current weakness evidence."]);
  }
  return buildNarrativeCard("Adaptive plan", plan.selectedCount < plan.targetCount ? "warning" : "stable", [
    `Selected ${plan.selectedCount || 0}/${plan.targetCount || 0} questions, estimated ${plan.estimatedMinutes || 0} minutes.`,
    `Weak concept count=${plan.weakConcepts?.length || 0}; coverage concept count=${plan.coverage?.conceptCount || 0}.`,
    plan.strategy || ""
  ], [
    "Start with the first weak concept, then interleave two non-weak questions.",
    "After completion, refresh the session review to validate improvement."
  ]);
}

function buildRiskNarrative(register) {
  if (!register) {
    return buildNarrativeCard("Risk register", "neutral", ["No risk register is loaded."], ["Teacher role can load risk register."]);
  }
  return buildNarrativeCard("Risk register", register.highRiskCount ? "high" : "stable", [
    `Students=${register.totalStudents || 0}, high=${register.highRiskCount || 0}, medium=${register.mediumRiskCount || 0}, low=${register.lowRiskCount || 0}.`,
    `Top risk student=${register.items?.[0]?.studentId || "none"} with score ${register.items?.[0]?.risk?.score ?? 0}.`
  ], [
    ...(register.items || []).filter((item) => item.risk?.level === "high").slice(0, 3).map((item) => `Schedule intervention for ${item.studentId}.`),
    "Use portfolio evidence before sending any intervention message."
  ]);
}

export function buildInsightNarratives(insight) {
  return [
    buildGradingNarrative(insight.gradingOverview),
    buildRubricNarrative(insight.rubricInsight),
    buildPortfolioNarrative(insight.studentPortfolio),
    buildCourseNarrative(insight.courseReport),
    buildMistakeNarrative(insight.mistakeAnalysis),
    buildSessionNarrative(insight.sessionReview),
    buildAdaptivePlanNarrative(insight.adaptivePlan),
    buildRiskNarrative(insight.riskRegister)
  ];
}

export function buildInterventionQueue(insight) {
  const queue = [];
  for (const row of insight.riskRegister?.items || []) {
    pushIf(queue, row.risk?.level === "high" || row.risk?.level === "medium", {
      type: "risk-register",
      priority: row.risk?.level || "low",
      target: row.studentId,
      reason: `risk score ${row.risk?.score ?? 0}`,
      evidence: `completion=${row.assignmentCompletionRate ?? 0}, score=${row.averageScore ?? 0}, openMistakes=${row.openMistakes ?? 0}`,
      action: "Open student portfolio and create an intervention reminder."
    });
  }
  for (const row of insight.mistakeAnalysis?.nextReviewQueue || []) {
    queue.push({
      type: "mistake-review",
      priority: row.priority || "medium",
      target: row.concept,
      reason: row.reason || "mistake",
      evidence: row.stem || row.questionId,
      action: "Inspect mistake detail and assign a remediation question."
    });
  }
  for (const row of insight.gradingOverview?.rows || []) {
    pushIf(queue, asNumber(row.scoreGap) >= 15, {
      type: "grading-gap",
      priority: "high",
      target: row.studentName || row.studentId,
      reason: `teacher/AI gap ${row.scoreGap}`,
      evidence: row.submissionId,
      action: "Compare submission grading insight before final feedback."
    });
  }
  return queue.sort((a, b) => riskRank(b.priority) - riskRank(a.priority)).slice(0, 18);
}

export function buildEvidenceExportRows(insight) {
  const rows = [];
  for (const row of insight.studentPortfolio?.evidenceTimeline || []) {
    rows.push({
      source: "portfolio-timeline",
      id: row.id || "-",
      at: row.at || "",
      title: row.type || "event",
      value: row.summary || ""
    });
  }
  for (const row of insight.gradingOverview?.rows || []) {
    rows.push({
      source: "grading-overview",
      id: row.submissionId,
      at: row.submittedAt || "",
      title: row.studentName || row.studentId,
      value: `teacher=${row.teacherScore ?? "-"}; ai=${row.aiScore ?? "-"}; final=${row.finalScore ?? "-"}; band=${row.band}`
    });
  }
  for (const row of insight.mistakeAnalysis?.nextReviewQueue || []) {
    rows.push({
      source: "mistake-queue",
      id: row.mistakeId,
      at: row.updatedAt || "",
      title: row.concept,
      value: `${row.priority}; ${row.reason}; ${row.stem}`
    });
  }
  for (const row of insight.adaptivePlan?.questions || []) {
    rows.push({
      source: "adaptive-plan",
      id: row.id || row.questionId || "-",
      at: "",
      title: conceptName(row),
      value: `${row.difficulty || "-"}; ${row.reason || row.stem || ""}`
    });
  }
  return rows.slice(0, 40);
}

export function buildAssessmentInsightScorecard(insight) {
  const portfolioRisk = insight.studentPortfolio?.risk?.score ?? 0;
  const registerHigh = insight.riskRegister?.highRiskCount ?? 0;
  const gradingGap = insight.gradingOverview?.consistency?.averageGap ?? 0;
  const openMistakes = insight.mistakeAnalysis?.openMistakes ?? 0;
  const rubricQuality = insight.rubricInsight?.qualityScore ?? 0;
  const practiceCorrect = insight.sessionReview
    ? Math.round((asNumber(insight.sessionReview.correctCount) / Math.max(1, asNumber(insight.sessionReview.correctCount) + asNumber(insight.sessionReview.incorrectCount))) * 100)
    : 0;
  return {
    portfolioRisk,
    registerHigh,
    gradingGap,
    openMistakes,
    rubricQuality,
    practiceCorrect,
    overallReadiness: Math.max(0, Math.min(100, Math.round(
      rubricQuality * 0.25
      + practiceCorrect * 0.2
      + (100 - portfolioRisk) * 0.2
      + (100 - Math.min(100, gradingGap * 5)) * 0.15
      + (100 - Math.min(100, openMistakes * 10)) * 0.1
      + (100 - Math.min(100, registerHigh * 20)) * 0.1
    )))
  };
}

export function selectAssessmentInsightModel(state) {
  const insight = state.assessmentInsight || {};
  const scorecard = buildAssessmentInsightScorecard(insight);
  return {
    canManage: state.user?.role === "teacher" || state.user?.role === "admin",
    scorecard,
    narratives: buildInsightNarratives(insight),
    interventionQueue: buildInterventionQueue(insight),
    exportRows: buildEvidenceExportRows(insight)
  };
}
