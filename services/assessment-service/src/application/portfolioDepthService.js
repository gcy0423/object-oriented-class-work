import { ForbiddenError, ValidationError } from "../../../../shared/http/errors.js";
import { isTeacherRole } from "../domain/assessment.js";

function requireCourseId(filters = {}) {
  const courseId = String(filters.courseId || "").trim();
  if (!courseId) {
    throw new ValidationError("courseId is required");
  }
  return courseId;
}

function ownerIdFor(user, filters = {}) {
  if (isTeacherRole(user.role) && filters.studentId) {
    return String(filters.studentId);
  }
  return user.id;
}

function percent(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

function average(values = []) {
  const clean = values.filter((value) => value !== null && value !== undefined && !Number.isNaN(Number(value)));
  return clean.length ? Math.round(clean.reduce((sum, value) => sum + Number(value), 0) / clean.length) : 0;
}

function sortRecent(items = []) {
  return [...items].sort((a, b) => String(b.at || b.createdAt).localeCompare(String(a.at || a.createdAt)));
}

function riskTone(score) {
  if (score >= 75) {
    return "excellent";
  }
  if (score >= 60) {
    return "stable";
  }
  if (score >= 40) {
    return "watch";
  }
  return "risk";
}

function compactConcept(question) {
  return question?.concept || question?.concepts?.[0] || "general";
}

function dimensionScore({ completion, grade, practice, mastery, reflection }) {
  return Math.round(
    completion * 0.24
    + grade * 0.24
    + practice * 0.18
    + mastery * 0.22
    + reflection * 0.12
  );
}

function pushAction(actions, priority, title, reason, evidence = []) {
  actions.push({ priority, title, reason, evidence });
}

export class PortfolioDepthService {
  constructor({
    assignments,
    submissions,
    grades,
    feedbackItems,
    questions,
    practiceSessions,
    answerRecords,
    mistakeItems,
    masteryRecords,
    assessmentPortfolioService,
    mistakeAnalysisService
  }) {
    this.assignments = assignments;
    this.submissions = submissions;
    this.grades = grades;
    this.feedbackItems = feedbackItems;
    this.questions = questions;
    this.practiceSessions = practiceSessions;
    this.answerRecords = answerRecords;
    this.mistakeItems = mistakeItems;
    this.masteryRecords = masteryRecords;
    this.assessmentPortfolioService = assessmentPortfolioService;
    this.mistakeAnalysisService = mistakeAnalysisService;
  }

  buildDeepPortfolio(user, filters = {}) {
    const courseId = requireCourseId(filters);
    const ownerId = ownerIdFor(user, filters);
    this.assertScope(user, ownerId);
    const base = this.assessmentPortfolioService.buildStudentPortfolio(user, { courseId, studentId: ownerId });
    const evidence = this.collectEvidence(ownerId, courseId);
    const competencyMap = this.buildCompetencyMapFromEvidence(evidence);
    const quality = this.buildQualityModel(base, evidence, competencyMap);
    const dossier = this.buildDossier(base, evidence, quality);
    const interventionPlan = this.buildInterventionPlan(user, { courseId, studentId: ownerId });
    const reflection = this.buildReflectionPrompts(base, evidence, competencyMap);
    return {
      ownerId,
      courseId,
      generatedAt: new Date().toISOString(),
      base,
      quality,
      competencyMap,
      evidenceMap: this.buildEvidenceMap(user, { courseId, studentId: ownerId }),
      dossier,
      interventionPlan,
      reflection,
      defenseNarrative: this.buildDefenseNarrative({ base, quality, competencyMap, dossier, interventionPlan })
    };
  }

  buildEvidenceMap(user, filters = {}) {
    const courseId = requireCourseId(filters);
    const ownerId = ownerIdFor(user, filters);
    this.assertScope(user, ownerId);
    const evidence = this.collectEvidence(ownerId, courseId);
    const byType = this.groupEvidence(evidence, "type");
    const byConcept = this.groupEvidence(evidence, "concept");
    const timeline = sortRecent(evidence).slice(0, 40);
    return {
      ownerId,
      courseId,
      totalEvidence: evidence.length,
      byType: [...byType.entries()].map(([type, items]) => ({
        type,
        count: items.length,
        averageScore: average(items.map((item) => item.score)),
        latestAt: sortRecent(items)[0]?.at || null
      })),
      byConcept: [...byConcept.entries()].map(([concept, items]) => ({
        concept,
        count: items.length,
        coverage: this.coverageLabel(items),
        averageScore: average(items.map((item) => item.score)),
        signals: this.evidenceSignals(items)
      })).sort((a, b) => b.count - a.count || a.concept.localeCompare(b.concept)),
      timeline,
      gaps: this.findEvidenceGaps(evidence),
      generatedAt: new Date().toISOString()
    };
  }

  buildInterventionPlan(user, filters = {}) {
    const courseId = requireCourseId(filters);
    const ownerId = ownerIdFor(user, filters);
    this.assertScope(user, ownerId);
    const base = this.assessmentPortfolioService.buildStudentPortfolio(user, { courseId, studentId: ownerId });
    const evidence = this.collectEvidence(ownerId, courseId);
    const competencyMap = this.buildCompetencyMapFromEvidence(evidence);
    const actions = [];
    if (base.assignmentProgress.missingCount > 0) {
      pushAction(
        actions,
        "high",
        "Recover missing assignment evidence",
        `${base.assignmentProgress.missingCount} assignment(s) have no submission evidence.`,
        base.assignmentProgress.rows.filter((row) => !row.submitted).map((row) => row.assignmentId)
      );
    }
    if (base.gradeTrend.averageScore && base.gradeTrend.averageScore < 75) {
      pushAction(
        actions,
        "high",
        "Review low-score rubric dimensions",
        `Average score is ${base.gradeTrend.averageScore}; inspect teacher feedback before resubmission.`,
        base.gradeTrend.rows.filter((row) => Number(row.score) < 75).map((row) => row.submissionId)
      );
    }
    if (base.mistakeSummary.openMistakes > 0) {
      pushAction(
        actions,
        base.mistakeSummary.openMistakes >= 3 ? "high" : "medium",
        "Close open mistake review loop",
        `${base.mistakeSummary.openMistakes} open mistake(s) still need correction evidence.`,
        (base.mistakeSummary.nextReviewQueue || []).map((row) => row.mistakeId)
      );
    }
    for (const concept of competencyMap.concepts.filter((item) => item.masteryScore < 70 || item.evidenceCount < 2).slice(0, 5)) {
      pushAction(
        actions,
        concept.masteryScore < 60 ? "high" : "medium",
        `Strengthen ${concept.concept}`,
        `Concept has mastery=${concept.masteryScore} and evidence=${concept.evidenceCount}.`,
        concept.evidenceIds
      );
    }
    if (actions.length === 0) {
      pushAction(actions, "low", "Keep weekly portfolio evidence stable", "No urgent gap detected; maintain reflection and evidence freshness.", []);
    }
    return {
      ownerId,
      courseId,
      risk: base.risk,
      actionCount: actions.length,
      actions,
      schedule: this.buildInterventionSchedule(actions),
      teacherReviewChecklist: this.buildTeacherReviewChecklist(base, competencyMap),
      studentReflectionChecklist: this.buildStudentReflectionChecklist(base, competencyMap),
      generatedAt: new Date().toISOString()
    };
  }

  buildCoursePortfolioBoard(user, filters = {}) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("teacher role required");
    }
    const courseId = requireCourseId(filters);
    const register = this.assessmentPortfolioService.buildRiskRegister(user, { courseId });
    const rows = register.items.map((item) => {
      const deep = this.buildDeepPortfolio(user, { courseId, studentId: item.studentId });
      return {
        studentId: item.studentId,
        risk: item.risk,
        qualityScore: deep.quality.overallScore,
        competencyCount: deep.competencyMap.concepts.length,
        evidenceCount: deep.evidenceMap.totalEvidence,
        topGap: deep.evidenceMap.gaps[0] || null,
        topAction: deep.interventionPlan.actions[0] || null
      };
    }).sort((a, b) => b.risk.score - a.risk.score || a.qualityScore - b.qualityScore);
    return {
      courseId,
      totalStudents: rows.length,
      highRiskCount: rows.filter((row) => row.risk.level === "high").length,
      weakPortfolioCount: rows.filter((row) => row.qualityScore < 60).length,
      averageQualityScore: average(rows.map((row) => row.qualityScore)),
      rows,
      generatedAt: new Date().toISOString()
    };
  }

  assertScope(user, ownerId) {
    if (!isTeacherRole(user.role) && user.id !== ownerId) {
      throw new ForbiddenError("cannot inspect another student's portfolio");
    }
  }

  collectEvidence(ownerId, courseId) {
    const assignments = this.assignments.findByFilters({ courseId });
    const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
    const submissions = this.submissions.findByStudent(ownerId)
      .filter((submission) => assignmentById.has(submission.assignmentId));
    const sessions = this.practiceSessions.findByOwner(ownerId).filter((session) => session.courseId === courseId);
    const answers = sessions.flatMap((session) => this.answerRecords.findBySession(session.id)
      .map((answer) => ({ answer, session })));
    const mistakes = this.mistakeItems.findByOwner(ownerId).filter((mistake) => mistake.courseId === courseId);
    const mastery = this.masteryRecords.findByOwner(ownerId).filter((record) => record.courseId === courseId);
    const questionById = new Map(this.questions.findByFilters({ courseId }).map((question) => [question.id, question]));
    const evidence = [];
    for (const submission of submissions) {
      const assignment = assignmentById.get(submission.assignmentId);
      const grades = this.grades.findBySubmission(submission.id);
      const finalGrade = grades.find((grade) => grade.source === "teacher") || grades[0] || null;
      evidence.push({
        id: submission.id,
        type: "submission",
        concept: assignment?.title || "assignment",
        at: submission.submittedAt || submission.createdAt,
        score: finalGrade?.score ?? null,
        summary: `Submitted ${assignment?.title || submission.assignmentId}`,
        status: submission.status,
        sourceId: submission.assignmentId,
        evidenceWeight: finalGrade ? 3 : 2
      });
      for (const feedback of this.feedbackItems.findBySubmission(submission.id)) {
        evidence.push({
          id: feedback.id,
          type: `feedback:${feedback.source}`,
          concept: assignment?.title || "assignment",
          at: feedback.createdAt,
          score: finalGrade?.score ?? null,
          summary: feedback.summary || `Feedback for ${submission.id}`,
          status: "available",
          sourceId: submission.id,
          evidenceWeight: 2
        });
      }
    }
    for (const session of sessions) {
      evidence.push({
        id: session.id,
        type: "practice-session",
        concept: session.bankId || "practice",
        at: session.finishedAt || session.startedAt,
        score: session.correctRate,
        summary: `Practice session ${session.status}, correctRate=${session.correctRate}`,
        status: session.status,
        sourceId: session.bankId,
        evidenceWeight: session.status === "finished" ? 2 : 1
      });
    }
    for (const { answer, session } of answers) {
      const question = questionById.get(answer.questionId);
      evidence.push({
        id: answer.id,
        type: answer.correct === false ? "wrong-answer" : answer.correct === true ? "correct-answer" : "pending-answer",
        concept: compactConcept(question),
        at: answer.createdAt,
        score: answer.correct === true ? 100 : answer.correct === false ? 0 : null,
        summary: question?.stem || `Answer ${answer.questionId}`,
        status: answer.status,
        sourceId: session.id,
        evidenceWeight: answer.correct === null ? 1 : 2
      });
    }
    for (const mistake of mistakes) {
      const question = questionById.get(mistake.questionId);
      evidence.push({
        id: mistake.id,
        type: mistake.status === "reviewed" ? "reviewed-mistake" : "open-mistake",
        concept: compactConcept(question),
        at: mistake.updatedAt || mistake.createdAt,
        score: mistake.status === "reviewed" ? 60 : 20,
        summary: mistake.reviewNote || question?.analysis || `Mistake ${mistake.questionId}`,
        status: mistake.status,
        sourceId: mistake.questionId,
        evidenceWeight: mistake.status === "reviewed" ? 2 : 3
      });
    }
    for (const record of mastery) {
      evidence.push({
        id: record.id,
        type: "mastery-record",
        concept: record.concept,
        at: record.lastPracticedAt || record.updatedAt,
        score: record.masteryScore,
        summary: `Mastery ${record.concept}: ${record.masteryScore}`,
        status: record.masteryScore >= 70 ? "stable" : "weak",
        sourceId: record.ownerId,
        evidenceWeight: 2
      });
    }
    return sortRecent(evidence);
  }

  groupEvidence(evidence, key) {
    const map = new Map();
    for (const item of evidence) {
      const value = item[key] || "unknown";
      if (!map.has(value)) {
        map.set(value, []);
      }
      map.get(value).push(item);
    }
    return map;
  }

  buildCompetencyMapFromEvidence(evidence = []) {
    const byConcept = this.groupEvidence(evidence, "concept");
    const concepts = [...byConcept.entries()].map(([concept, items]) => {
      const scored = items.filter((item) => item.score !== null && item.score !== undefined);
      const masteryScore = average(scored.map((item) => item.score));
      const negativeSignals = items.filter((item) => ["wrong-answer", "open-mistake"].includes(item.type)).length;
      const positiveSignals = items.filter((item) => ["correct-answer", "reviewed-mistake", "submission", "mastery-record"].includes(item.type)).length;
      return {
        concept,
        masteryScore,
        level: riskTone(masteryScore),
        evidenceCount: items.length,
        positiveSignals,
        negativeSignals,
        latestEvidenceAt: sortRecent(items)[0]?.at || null,
        evidenceIds: items.map((item) => item.id).slice(0, 8),
        recommendation: this.conceptRecommendation({ concept, masteryScore, evidenceCount: items.length, negativeSignals })
      };
    }).sort((a, b) => a.masteryScore - b.masteryScore || b.evidenceCount - a.evidenceCount);
    return {
      conceptCount: concepts.length,
      weakConceptCount: concepts.filter((item) => item.masteryScore < 70).length,
      strongConceptCount: concepts.filter((item) => item.masteryScore >= 85).length,
      averageMastery: average(concepts.map((item) => item.masteryScore)),
      concepts
    };
  }

  buildQualityModel(base, evidence, competencyMap) {
    const completion = base.assignmentProgress.completionRate;
    const grade = base.gradeTrend.averageScore || 0;
    const practice = base.practiceSummary.averageCorrectRate || base.answerSummary.correctRate || 0;
    const mastery = competencyMap.averageMastery || base.masterySummary.averageMastery || 0;
    const reflection = this.computeReflectionScore(evidence);
    const overallScore = dimensionScore({ completion, grade, practice, mastery, reflection });
    return {
      overallScore,
      tone: riskTone(overallScore),
      dimensions: [
        { key: "completion", label: "Assignment completion", score: completion, evidence: base.assignmentProgress.rows.map((row) => row.assignmentId) },
        { key: "grade", label: "Grade quality", score: grade, evidence: base.gradeTrend.rows.map((row) => row.submissionId) },
        { key: "practice", label: "Practice performance", score: practice, evidence: evidence.filter((item) => item.type.includes("answer") || item.type === "practice-session").map((item) => item.id) },
        { key: "mastery", label: "Concept mastery", score: mastery, evidence: evidence.filter((item) => item.type === "mastery-record").map((item) => item.id) },
        { key: "reflection", label: "Reflection evidence", score: reflection, evidence: evidence.filter((item) => item.summary.length >= 30).map((item) => item.id) }
      ],
      qualityWarnings: this.buildQualityWarnings({ completion, grade, practice, mastery, reflection, evidence })
    };
  }

  computeReflectionScore(evidence = []) {
    const richItems = evidence.filter((item) => String(item.summary || "").length >= 30).length;
    const reviewedMistakes = evidence.filter((item) => item.type === "reviewed-mistake").length;
    const feedbackItems = evidence.filter((item) => item.type.startsWith("feedback")).length;
    return Math.min(100, richItems * 8 + reviewedMistakes * 12 + feedbackItems * 10);
  }

  buildQualityWarnings({ completion, grade, practice, mastery, reflection, evidence }) {
    const warnings = [];
    if (completion < 80) {
      warnings.push("Assignment completion evidence is incomplete.");
    }
    if (grade && grade < 75) {
      warnings.push("Grade evidence shows weak rubric performance.");
    }
    if (practice < 70) {
      warnings.push("Practice evidence needs targeted recovery.");
    }
    if (mastery < 70) {
      warnings.push("Concept mastery evidence is below stable threshold.");
    }
    if (reflection < 50) {
      warnings.push("Reflection and correction evidence is thin.");
    }
    if (evidence.length < 5) {
      warnings.push("Portfolio has too few evidence items for confident judgment.");
    }
    return warnings;
  }

  buildDossier(base, evidence, quality) {
    const strongest = [...evidence]
      .filter((item) => Number(item.score) >= 80)
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, 6);
    const weakest = [...evidence]
      .filter((item) => item.score !== null && item.score !== undefined && Number(item.score) < 70)
      .sort((a, b) => Number(a.score) - Number(b.score))
      .slice(0, 6);
    return {
      summary: `Portfolio quality ${quality.overallScore}; risk ${base.risk.level}; evidence ${evidence.length}.`,
      strongestEvidence: strongest,
      weakestEvidence: weakest,
      missingEvidence: this.findEvidenceGaps(evidence),
      defenseClaims: this.buildDefenseClaims(base, quality, strongest),
      dataQuality: {
        evidenceCount: evidence.length,
        scoredEvidenceCount: evidence.filter((item) => item.score !== null && item.score !== undefined).length,
        timelineCount: base.evidenceTimeline.length,
        hasTeacherGrade: base.gradeTrend.teacherAverageScore > 0
      }
    };
  }

  buildDefenseClaims(base, quality, strongest) {
    const claims = [];
    claims.push({
      claim: "Portfolio evaluation combines assignment, grade, practice, mistake, and mastery evidence.",
      evidence: quality.dimensions.map((dimension) => `${dimension.key}:${dimension.score}`).join(", ")
    });
    if (base.assignmentProgress.completionRate >= 80) {
      claims.push({
        claim: "Assignment completion is sufficient for course-process evaluation.",
        evidence: `${base.assignmentProgress.submittedCount}/${base.assignmentProgress.totalAssignments} submitted`
      });
    }
    if (strongest.length) {
      claims.push({
        claim: "There is concrete high-score evidence that can be cited in defense.",
        evidence: strongest.map((item) => item.summary).slice(0, 3).join(" | ")
      });
    }
    if (base.risk.reasons.length) {
      claims.push({
        claim: "Risk judgment is explainable and tied to explicit reasons.",
        evidence: base.risk.reasons.map((reason) => reason.code).join(", ")
      });
    }
    return claims;
  }

  buildReflectionPrompts(base, evidence, competencyMap) {
    const prompts = [];
    const weak = competencyMap.concepts.filter((item) => item.masteryScore < 70).slice(0, 3);
    for (const concept of weak) {
      prompts.push({
        concept: concept.concept,
        prompt: `Explain one mistake or weak answer related to ${concept.concept}, then cite the corrected evidence.`,
        evidenceIds: concept.evidenceIds
      });
    }
    if (base.assignmentProgress.missingCount) {
      prompts.push({
        concept: "assignment completion",
        prompt: "For each missing assignment, explain the current blocker and upload or cite recovery evidence.",
        evidenceIds: base.assignmentProgress.rows.filter((row) => !row.submitted).map((row) => row.assignmentId)
      });
    }
    if (!prompts.length) {
      prompts.push({
        concept: "weekly review",
        prompt: "Summarize the strongest evidence this week and identify one next improvement target.",
        evidenceIds: evidence.slice(0, 3).map((item) => item.id)
      });
    }
    return prompts;
  }

  buildDefenseNarrative({ base, quality, competencyMap, dossier, interventionPlan }) {
    return {
      headline: `Portfolio score ${quality.overallScore}, risk ${base.risk.level}, concepts ${competencyMap.conceptCount}.`,
      paragraphs: [
        `The portfolio is evaluated from ${quality.dimensions.length} dimensions rather than one isolated score.`,
        `The strongest evidence contains ${dossier.strongestEvidence.length} citeable item(s), while ${dossier.missingEvidence.length} gap(s) still require follow-up.`,
        `The intervention plan contains ${interventionPlan.actionCount} action(s), ordered by risk and evidence weakness.`
      ],
      citations: [
        ...dossier.strongestEvidence.slice(0, 3).map((item) => ({ id: item.id, type: item.type, summary: item.summary })),
        ...dossier.weakestEvidence.slice(0, 2).map((item) => ({ id: item.id, type: item.type, summary: item.summary }))
      ]
    };
  }

  buildInterventionSchedule(actions = []) {
    return actions.map((action, index) => ({
      dayOffset: index,
      priority: action.priority,
      title: action.title,
      expectedEvidence: action.evidence.length ? action.evidence : ["reflection-note", "corrected-answer", "teacher-feedback"],
      reviewMode: action.priority === "high" ? "teacher-check" : "self-check"
    }));
  }

  buildTeacherReviewChecklist(base, competencyMap) {
    return [
      { item: "Check whether missing assignments have recovery evidence.", status: base.assignmentProgress.missingCount ? "needed" : "stable" },
      { item: "Inspect low-score submissions against rubric dimensions.", status: base.gradeTrend.averageScore < 75 ? "needed" : "stable" },
      { item: "Confirm weak concepts have enough objective practice evidence.", status: competencyMap.weakConceptCount ? "needed" : "stable" },
      { item: "Verify open mistakes have correction notes before closing risk.", status: base.mistakeSummary.openMistakes ? "needed" : "stable" }
    ];
  }

  buildStudentReflectionChecklist(base, competencyMap) {
    return [
      { item: "Pick one strong artifact and explain why it proves the target concept.", required: true },
      { item: "Pick one weak concept and cite the corrected answer or note.", required: competencyMap.weakConceptCount > 0 },
      { item: "Explain whether assignment completion evidence is up to date.", required: base.assignmentProgress.missingCount > 0 },
      { item: "Write next-week practice target from portfolio evidence.", required: true }
    ];
  }

  coverageLabel(items = []) {
    const types = new Set(items.map((item) => item.type));
    if (items.length >= 4 && types.size >= 3) {
      return "strong";
    }
    if (items.length >= 2) {
      return "partial";
    }
    return "thin";
  }

  evidenceSignals(items = []) {
    const signals = [];
    if (items.some((item) => item.type === "open-mistake")) {
      signals.push("open-mistake");
    }
    if (items.some((item) => item.type === "reviewed-mistake")) {
      signals.push("reviewed-correction");
    }
    if (items.some((item) => item.type === "submission")) {
      signals.push("assignment-artifact");
    }
    if (items.some((item) => item.type === "mastery-record")) {
      signals.push("objective-mastery");
    }
    if (!signals.length) {
      signals.push("needs-more-evidence");
    }
    return signals;
  }

  findEvidenceGaps(evidence = []) {
    const byType = this.groupEvidence(evidence, "type");
    const gaps = [];
    for (const type of ["submission", "practice-session", "mastery-record", "reviewed-mistake"]) {
      if (!byType.has(type)) {
        gaps.push({
          type,
          severity: type === "submission" ? "high" : "medium",
          message: `${type} evidence is missing from the portfolio.`
        });
      }
    }
    const byConcept = this.groupEvidence(evidence, "concept");
    for (const [concept, items] of byConcept.entries()) {
      if (items.length < 2) {
        gaps.push({
          type: "thin-concept-evidence",
          concept,
          severity: "low",
          message: `${concept} has fewer than two evidence items.`
        });
      }
    }
    return gaps.slice(0, 12);
  }

  conceptRecommendation({ concept, masteryScore, evidenceCount, negativeSignals }) {
    if (masteryScore < 60) {
      return `Rebuild ${concept} with a short practice set and one corrected explanation.`;
    }
    if (negativeSignals > 0) {
      return `Resolve negative evidence for ${concept} before treating the concept as stable.`;
    }
    if (evidenceCount < 2) {
      return `Add at least one more artifact or practice record for ${concept}.`;
    }
    return `${concept} is supported; keep evidence fresh.`;
  }
}
