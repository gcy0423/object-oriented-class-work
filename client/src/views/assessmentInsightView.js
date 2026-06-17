import { selectAssessmentInsightModel } from "../state/assessmentInsightModel.js";
import { attr, escapeHtml } from "../utils/dom.js";
import { formatDateTime, formatPercent } from "../utils/format.js";
import { emptyState, metric, sectionCard, statusBadge } from "../widgets/cards.js";
import { horizontalBars } from "../widgets/charts.js";
import { dataTable } from "../widgets/tables.js";

function isTeacherLike(state) {
  return state.user?.role === "teacher" || state.user?.role === "admin";
}

function firstCourseId(state) {
  return state.filters.assessmentInsight.courseId || state.dashboard?.courses?.[0]?.id || "";
}

function selectedValue(primary, fallback = "") {
  return primary || fallback || "";
}

function optionRows(items, selected, labelFor = (item) => item.title || item.id) {
  return items.map((item) => `<option value="${attr(item.id)}" ${item.id === selected ? "selected" : ""}>${escapeHtml(labelFor(item))}</option>`).join("");
}

function compactText(value, fallback = "-") {
  const text = String(value ?? "").trim();
  return escapeHtml(text || fallback);
}

function summaryValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join("; ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => `${key}:${item}`).join(", ");
  }
  return value ?? "-";
}

function tagList(values = []) {
  return values.filter(Boolean).map((value) => `<span class="tag">${escapeHtml(value)}</span>`).join("");
}

function objectSummaryTable(source = {}) {
  const entries = Object.entries(source || {});
  if (!entries.length) {
    return emptyState("No summary values.");
  }
  return `<dl class="key-value-list insight-key-values">${entries.map(([key, value]) => `
    <div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(summaryValue(value))}</dd></div>
  `).join("")}</dl>`;
}

function insightMetrics(state) {
  const insight = state.assessmentInsight || {};
  const overview = insight.gradingOverview || {};
  const portfolio = insight.studentPortfolio || {};
  const risk = insight.riskRegister || {};
  const mistakes = insight.mistakeAnalysis || {};
  return `
    <section class="grid metric-grid insight-metrics">
      ${metric("Assignments", portfolio.assignmentProgress?.totalAssignments ?? overview.submissionCount ?? 0)}
      ${metric("Average Score", portfolio.gradeTrend?.averageScore ?? overview.average ?? 0)}
      ${metric("Open Mistakes", mistakes.openMistakes ?? portfolio.mistakeSummary?.openMistakes ?? 0)}
      ${metric("High Risk", risk.highRiskCount ?? portfolio.risk?.level ?? 0)}
    </section>
  `;
}

function filterForm(state) {
  const filter = state.filters.assessmentInsight;
  const courseId = firstCourseId(state);
  const assignments = state.assessment.assignments || [];
  const rubrics = state.assessment.rubrics || [];
  const sessions = state.assessment.practiceHistory || [];
  const mistakes = state.assessment.mistakes || [];
  const detailSubmissions = state.assessment.assignmentDetail?.submissions || [];
  const assignmentId = selectedValue(filter.assignmentId, assignments[0]?.id);
  const rubricId = selectedValue(filter.rubricId, state.assessment.assignmentDetail?.assignment?.rubricId || rubrics[0]?.id);
  const submissionId = selectedValue(filter.submissionId, detailSubmissions[0]?.id);
  const practiceSessionId = selectedValue(filter.practiceSessionId, sessions[0]?.id);
  const mistakeId = selectedValue(filter.mistakeId, mistakes[0]?.id);
  return `
    <form class="filter-toolbar insight-filter" data-form="assessment-insight-filter">
      <label><span>Course</span><select name="courseId">
        <option value="">First course</option>
        ${(state.dashboard?.courses || []).map((course) => `<option value="${attr(course.id)}" ${course.id === courseId ? "selected" : ""}>${escapeHtml(course.title)}</option>`).join("")}
      </select></label>
      <label><span>Assignment</span><select name="assignmentId">
        <option value="">Auto</option>
        ${optionRows(assignments, assignmentId)}
      </select></label>
      <label><span>Rubric</span><select name="rubricId">
        <option value="">Auto</option>
        ${optionRows(rubrics, rubricId)}
      </select></label>
      <label><span>Submission</span><select name="submissionId">
        <option value="">Auto</option>
        ${detailSubmissions.map((item) => `<option value="${attr(item.id)}" ${item.id === submissionId ? "selected" : ""}>${escapeHtml(item.studentSnapshot?.name || item.studentId || item.id)}</option>`).join("")}
      </select></label>
      <label><span>Practice</span><select name="practiceSessionId">
        <option value="">Auto</option>
        ${sessions.map((item) => `<option value="${attr(item.id)}" ${item.id === practiceSessionId ? "selected" : ""}>${escapeHtml(`${item.id} / ${item.status || "active"}`)}</option>`).join("")}
      </select></label>
      <label><span>Mistake</span><select name="mistakeId">
        <option value="">Auto</option>
        ${mistakes.map((item) => `<option value="${attr(item.id)}" ${item.id === mistakeId ? "selected" : ""}>${escapeHtml(`${item.id} / ${item.status || "open"}`)}</option>`).join("")}
      </select></label>
      <label><span>Student ID</span><input name="studentId" value="${attr(filter.studentId || state.user?.id || "")}" /></label>
      <div class="filter-actions">
        <button class="btn primary" type="submit">Refresh Insight</button>
      </div>
    </form>
  `;
}

function gradingOverviewPanel(overview, canManage) {
  if (!canManage) {
    return emptyState("Teacher role is required for assignment grading overview.");
  }
  if (!overview) {
    return emptyState("Select an assignment to load grading overview.");
  }
  const bands = overview.bands || {};
  const rows = overview.rows || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("Submissions", overview.submissionCount ?? 0)}
      ${metric("Graded", overview.gradedCount ?? 0)}
      ${metric("Average", overview.average ?? 0)}
      ${metric("Consistency", overview.consistency?.status || "-")}
    </div>
    ${horizontalBars(Object.entries(bands).map(([band, count]) => ({ label: band, value: count * 20, text: count })), { label: "Grade bands" })}
    ${dataTable({
      columns: [
        { key: "studentName", label: "Student", render: (row) => compactText(row.studentName) },
        { key: "teacherScore", label: "Teacher", render: (row) => compactText(row.teacherScore) },
        { key: "aiScore", label: "AI", render: (row) => compactText(row.aiScore) },
        { key: "scoreGap", label: "Gap", render: (row) => compactText(row.scoreGap) },
        { key: "band", label: "Band", render: (row) => statusBadge(row.band || "ungraded") },
        { key: "action", label: "Action", render: (row) => `<button class="btn small" data-action="load-submission-insight" data-id="${attr(row.submissionId)}">Inspect</button>` }
      ],
      rows,
      emptyText: "No submissions in this assignment."
    })}
  `;
}

function rubricInsightPanel(profile) {
  if (!profile) {
    return emptyState("Select a rubric to inspect structure, score balance, and coverage.");
  }
  const criteria = profile.criteria || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("Total Score", profile.totalScore ?? 0)}
      ${metric("Quality", `${profile.qualityScore ?? 0}%`)}
      ${metric("Criteria", criteria.length)}
      ${metric("Warnings", (profile.warnings || []).length)}
    </div>
    <div class="tag-row">${(profile.warnings || []).map((warning) => `<span class="badge warning">${escapeHtml(warning)}</span>`).join("")}</div>
    <div class="insight-dimension-grid">
      ${(profile.dimensionCoverage || []).map((item) => `
        <article class="${item.covered ? "is-covered" : "is-missing"}">
          <strong>${escapeHtml(item.key)}</strong>
          <span>${item.covered ? "covered" : "missing"}</span>
        </article>
      `).join("")}
    </div>
    ${dataTable({
      columns: [
        { key: "title", label: "Criterion", render: (row) => compactText(row.title) },
        { key: "maxScore", label: "Max", render: (row) => compactText(row.maxScore) },
        { key: "weight", label: "Weight", render: (row) => compactText(`${row.weight ?? 0}%`) },
        { key: "description", label: "Description", render: (row) => compactText(row.description) }
      ],
      rows: criteria,
      emptyText: "No criteria."
    })}
    <ul class="plain-list insight-action-list">
      ${(profile.improvementPlan || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function submissionInsightPanel(insight) {
  if (!insight) {
    return emptyState("Load a submission insight to compare teacher and AI grading.");
  }
  const comparison = insight.comparison || [];
  return `
    <div class="detail-block">
      <h3>${escapeHtml(insight.assignment?.title || "Submission")}</h3>
      <p class="muted">${escapeHtml(insight.recommendation || "")}</p>
      <div class="tag-row">
        <span class="tag">${escapeHtml(insight.submission?.studentSnapshot?.name || insight.submission?.studentId || "-")}</span>
        <span class="tag">${escapeHtml(formatDateTime(insight.submission?.submittedAt))}</span>
      </div>
    </div>
    ${dataTable({
      columns: [
        { key: "metric", label: "Metric", render: (row) => compactText(row.metric) },
        { key: "teacher", label: "Teacher", render: (row) => compactText(row.teacher) },
        { key: "ai", label: "AI", render: (row) => compactText(row.ai) },
        { key: "gap", label: "Gap", render: (row) => compactText(row.gap) },
        { key: "risk", label: "Risk", render: (row) => statusBadge(row.risk || "normal") }
      ],
      rows: comparison,
      emptyText: "No comparable teacher/AI grades yet."
    })}
  `;
}

function portfolioPanel(portfolio) {
  if (!portfolio) {
    return emptyState("Portfolio requires a course and a student scope.");
  }
  const assignmentRows = portfolio.assignmentProgress?.rows || [];
  const timeline = portfolio.evidenceTimeline || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("Completion", formatPercent(portfolio.assignmentProgress?.completionRate))}
      ${metric("Average", portfolio.gradeTrend?.averageScore ?? 0)}
      ${metric("Practice", portfolio.practiceSummary?.sessionCount ?? 0)}
      ${metric("Risk", `${portfolio.risk?.level || "-"} / ${portfolio.risk?.score ?? 0}`)}
    </div>
    ${dataTable({
      columns: [
        { key: "title", label: "Assignment", render: (row) => compactText(row.title) },
        { key: "submitted", label: "Submitted", render: (row) => row.submitted ? statusBadge("submitted") : statusBadge("missing", "warning") },
        { key: "teacherScore", label: "Teacher", render: (row) => compactText(row.teacherScore) },
        { key: "aiScore", label: "AI", render: (row) => compactText(row.aiScore) }
      ],
      rows: assignmentRows.slice(0, 8),
      emptyText: "No assignment evidence."
    })}
    <ol class="insight-timeline">
      ${timeline.slice(0, 10).map((item) => `<li><time>${escapeHtml(formatDateTime(item.at))}</time><span>${escapeHtml(item.summary)}</span></li>`).join("")}
    </ol>
  `;
}

function courseReportPanel(report, canManage) {
  if (!canManage) {
    return emptyState("Teacher role is required for course-level assessment report.");
  }
  if (!report) {
    return emptyState("Select a course to load course report.");
  }
  const distribution = report.gradeDistribution || {};
  const engagement = report.practiceEngagement || {};
  const mistakeLoad = report.mistakeLoad || {};
  const mastery = report.masteryCoverage || {};
  return `
    <div class="stats-grid compact-stats">
      ${metric("Assignments", report.assignmentCount ?? 0)}
      ${metric("Submissions", report.submissionCount ?? 0)}
      ${metric("Rubrics", report.rubricCount ?? 0)}
      ${metric("Graded", report.gradedSubmissionCount ?? 0)}
    </div>
    ${horizontalBars([
      { label: "excellent", value: (distribution.excellent || 0) * 20, text: distribution.excellent || 0 },
      { label: "good", value: (distribution.good || 0) * 20, text: distribution.good || 0 },
      { label: "pass", value: (distribution.pass || 0) * 20, text: distribution.pass || 0 },
      { label: "risk", value: (distribution.risk || 0) * 20, text: distribution.risk || 0 }
    ], { label: "Grade distribution" })}
    <div class="insight-mini-grid">
      <article><strong>Practice</strong>${objectSummaryTable(engagement)}</article>
      <article><strong>Mistakes</strong>${objectSummaryTable(mistakeLoad)}</article>
      <article><strong>Mastery</strong>${objectSummaryTable(mastery)}</article>
    </div>
  `;
}

function mistakeAnalysisPanel(report) {
  if (!report) {
    return emptyState("Mistake analysis is loaded from current course and student scope.");
  }
  const concepts = report.concepts || [];
  const queue = report.nextReviewQueue || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("Total", report.totalMistakes ?? 0)}
      ${metric("Open", report.openMistakes ?? 0)}
      ${metric("Reviewed", report.reviewedMistakes ?? 0)}
      ${metric("Concepts", concepts.length)}
    </div>
    <div class="insight-concept-grid">
      ${concepts.slice(0, 8).map((item) => `
        <article>
          <div class="panel-header"><strong>${escapeHtml(item.concept)}</strong>${statusBadge(item.priority || "low")}</div>
          <p class="muted">${escapeHtml(item.remediation?.advice || "")}</p>
          <div class="tag-row">
            <span class="tag">open ${escapeHtml(item.openCount ?? 0)}</span>
            <span class="tag">mastery ${escapeHtml(item.masteryScore ?? 0)}</span>
          </div>
        </article>
      `).join("")}
    </div>
    ${dataTable({
      columns: [
        { key: "concept", label: "Concept", render: (row) => compactText(row.concept) },
        { key: "priority", label: "Priority", render: (row) => statusBadge(row.priority || "low") },
        { key: "stem", label: "Question", render: (row) => compactText(row.stem) },
        { key: "reason", label: "Reason", render: (row) => compactText(row.reason) },
        { key: "action", label: "Action", render: (row) => `<button class="btn small" data-action="load-mistake-detail" data-id="${attr(row.mistakeId)}">Detail</button>` }
      ],
      rows: queue,
      emptyText: "No review queue."
    })}
  `;
}

function mistakeDetailPanel(detail) {
  if (!detail) {
    return emptyState("Select a mistake from the review queue to inspect detail.");
  }
  const question = detail.question || {};
  const answer = detail.answer || {};
  return `
    <div class="detail-block">
      <h3>${escapeHtml(question.stem || "Mistake detail")}</h3>
      <p class="muted">${escapeHtml(question.analysis || "")}</p>
      <div class="tag-row">${tagList([detail.reason, question.difficulty, detail.mistake?.status])}</div>
    </div>
    <dl class="key-value-list">
      <div><dt>Submitted</dt><dd>${compactText(Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer)}</dd></div>
      <div><dt>Expected</dt><dd>${compactText(Array.isArray(question.answer) ? question.answer.join(", ") : question.answer)}</dd></div>
      <div><dt>Advice</dt><dd>${compactText(detail.remediation?.advice)}</dd></div>
    </dl>
    <div class="tag-row">${tagList(detail.remediation?.evidenceToCollect || [])}</div>
  `;
}

function sessionReviewPanel(review) {
  if (!review) {
    return emptyState("Select a practice session to load review.");
  }
  const conceptRows = review.conceptBreakdown || [];
  const difficulty = review.difficultyBreakdown || {};
  return `
    <div class="stats-grid compact-stats">
      ${metric("Answered", review.answeredCount ?? 0)}
      ${metric("Correct", review.correctCount ?? 0)}
      ${metric("Incorrect", review.incorrectCount ?? 0)}
      ${metric("Pending", review.pendingCount ?? 0)}
    </div>
    ${horizontalBars(conceptRows.map((item) => ({ label: item.concept, value: item.correctRate, text: `${item.correctRate}%` })), { label: "Concept correctness" })}
    <div class="insight-mini-grid">
      ${Object.entries(difficulty).map(([key, value]) => `<article><strong>${escapeHtml(key)}</strong>${objectSummaryTable(value)}</article>`).join("")}
    </div>
    <ul class="plain-list insight-action-list">${(review.nextActions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  `;
}

function adaptivePlanForm(state) {
  const draft = state.draft.adaptivePlan || {};
  const filter = state.filters.assessmentInsight;
  return `
    <form class="form-grid compact-form" data-form="adaptive-practice-plan">
      <div class="form-grid two-field-row">
        <label><span>Course</span><input name="courseId" value="${attr(firstCourseId(state))}" /></label>
        <label><span>Student</span><input name="studentId" value="${attr(filter.studentId || state.user?.id || "")}" /></label>
      </div>
      <div class="form-grid two-field-row">
        <label><span>Bank</span><input name="bankId" value="${attr(draft.bankId || "")}" placeholder="optional question bank id" /></label>
        <label><span>Question Count</span><input type="number" min="3" max="20" name="questionCount" value="${attr(draft.questionCount || 8)}" /></label>
      </div>
      <button class="btn primary" type="submit" ${state.saving.adaptivePlan ? "disabled" : ""}>${state.saving.adaptivePlan ? "Building..." : "Build Adaptive Plan"}</button>
    </form>
  `;
}

function adaptivePlanPanel(plan) {
  if (!plan) {
    return emptyState("Build an adaptive practice plan from current weakness evidence.");
  }
  const questions = plan.questions || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("Selected", plan.selectedCount ?? 0)}
      ${metric("Target", plan.targetCount ?? 0)}
      ${metric("Minutes", plan.estimatedMinutes ?? 0)}
      ${metric("Weak Concepts", (plan.weakConcepts || []).length)}
    </div>
    <p class="muted">${escapeHtml(plan.strategy || "")}</p>
    ${dataTable({
      columns: [
        { key: "stem", label: "Question", render: (row) => compactText(row.stem) },
        { key: "concept", label: "Concept", render: (row) => compactText(row.concept) },
        { key: "difficulty", label: "Difficulty", render: (row) => statusBadge(row.difficulty || "medium") },
        { key: "reason", label: "Reason", render: (row) => compactText(row.reason) }
      ],
      rows: questions.slice(0, 12),
      emptyText: "No questions selected."
    })}
  `;
}

function riskRegisterPanel(register, canManage) {
  if (!canManage) {
    return emptyState("Teacher role is required for risk register.");
  }
  if (!register) {
    return emptyState("Select a course to load risk register.");
  }
  const rows = register.items || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("Students", register.totalStudents ?? 0)}
      ${metric("High", register.highRiskCount ?? 0)}
      ${metric("Medium", register.mediumRiskCount ?? 0)}
      ${metric("Low", register.lowRiskCount ?? 0)}
    </div>
    ${dataTable({
      columns: [
        { key: "studentId", label: "Student", render: (row) => compactText(row.studentId) },
        { key: "risk", label: "Risk", render: (row) => `${statusBadge(row.risk?.level || "low")} ${compactText(row.risk?.score ?? 0)}` },
        { key: "completion", label: "Completion", render: (row) => compactText(`${row.assignmentCompletionRate ?? 0}%`) },
        { key: "score", label: "Average", render: (row) => compactText(row.averageScore) },
        { key: "mistakes", label: "Open", render: (row) => compactText(row.openMistakes) },
        { key: "weak", label: "Weak Concepts", render: (row) => tagList((row.weakConcepts || []).slice(0, 3).map((item) => item.concept)) }
      ],
      rows,
      emptyText: "No risk rows."
    })}
  `;
}

function scorecardPanel(scorecard) {
  return `
    <div class="stats-grid compact-stats">
      ${metric("Readiness", `${scorecard.overallReadiness ?? 0}%`)}
      ${metric("Rubric Quality", `${scorecard.rubricQuality ?? 0}%`)}
      ${metric("Practice Correct", `${scorecard.practiceCorrect ?? 0}%`)}
      ${metric("Portfolio Risk", scorecard.portfolioRisk ?? 0)}
    </div>
    ${horizontalBars([
      { label: "readiness", value: scorecard.overallReadiness, text: `${scorecard.overallReadiness ?? 0}%` },
      { label: "rubric", value: scorecard.rubricQuality, text: `${scorecard.rubricQuality ?? 0}%` },
      { label: "practice", value: scorecard.practiceCorrect, text: `${scorecard.practiceCorrect ?? 0}%` },
      { label: "risk pressure", value: Math.max(0, 100 - (scorecard.portfolioRisk ?? 0)), text: `${scorecard.portfolioRisk ?? 0}` }
    ], { label: "Assessment readiness scorecard" })}
  `;
}

function narrativePanel(items = []) {
  if (!items.length) {
    return emptyState("No narrative cards.");
  }
  return `<div class="insight-narrative-grid">${items.map((item) => `
    <article>
      <div class="panel-header"><strong>${escapeHtml(item.title)}</strong>${statusBadge(item.tone || "neutral")}</div>
      <ul class="plain-list">${(item.lines || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
      <div class="insight-next-actions">
        ${(item.actions || []).slice(0, 4).map((action) => `<p>${escapeHtml(action)}</p>`).join("")}
      </div>
    </article>
  `).join("")}</div>`;
}

function interventionQueuePanel(rows = []) {
  return dataTable({
    columns: [
      { key: "type", label: "Type", render: (row) => compactText(row.type) },
      { key: "priority", label: "Priority", render: (row) => statusBadge(row.priority || "low") },
      { key: "target", label: "Target", render: (row) => compactText(row.target) },
      { key: "reason", label: "Reason", render: (row) => compactText(row.reason) },
      { key: "action", label: "Action", render: (row) => compactText(row.action) }
    ],
    rows,
    emptyText: "No intervention queue items."
  });
}

function evidenceExportPanel(rows = []) {
  return dataTable({
    columns: [
      { key: "source", label: "Source", render: (row) => compactText(row.source) },
      { key: "id", label: "ID", render: (row) => compactText(row.id) },
      { key: "at", label: "Time", render: (row) => compactText(row.at) },
      { key: "title", label: "Title", render: (row) => compactText(row.title) },
      { key: "value", label: "Value", render: (row) => compactText(row.value) }
    ],
    rows,
    emptyText: "No export rows from current insight evidence."
  });
}

export function assessmentInsightView(state) {
  const insight = state.assessmentInsight || {};
  const model = selectAssessmentInsightModel(state);
  const canManage = isTeacherLike(state);
  return `
    ${insightMetrics(state)}
    ${filterForm(state)}
    <section class="insight-layout">
      <div class="insight-main">
        ${sectionCard("Assessment Readiness Scorecard", scorecardPanel(model.scorecard))}
        ${sectionCard("Insight Narrative", narrativePanel(model.narratives))}
        ${sectionCard("Teacher Grading Insight", gradingOverviewPanel(insight.gradingOverview, canManage))}
        ${sectionCard("Course Assessment Report", courseReportPanel(insight.courseReport, canManage))}
        ${sectionCard("Student Portfolio", portfolioPanel(insight.studentPortfolio))}
        ${sectionCard("Mistake Analysis Center", mistakeAnalysisPanel(insight.mistakeAnalysis))}
        ${sectionCard("Practice Session Review", sessionReviewPanel(insight.sessionReview))}
        ${sectionCard("Adaptive Practice Plan", adaptivePlanPanel(insight.adaptivePlan))}
      </div>
      <aside class="insight-side">
        ${sectionCard("Adaptive Plan Builder", adaptivePlanForm(state))}
        ${sectionCard("Intervention Queue", interventionQueuePanel(model.interventionQueue))}
        ${sectionCard("Rubric Insight", rubricInsightPanel(insight.rubricInsight))}
        ${sectionCard("Submission Grading Insight", submissionInsightPanel(insight.submissionInsight))}
        ${sectionCard("Mistake Detail", mistakeDetailPanel(insight.mistakeDetail))}
        ${sectionCard("Risk Register", riskRegisterPanel(insight.riskRegister, canManage))}
        ${sectionCard("Evidence Export Preview", evidenceExportPanel(model.exportRows))}
      </aside>
    </section>
  `;
}
