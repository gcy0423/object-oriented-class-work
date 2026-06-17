import { NotFoundError } from "../../../../shared/http/errors.js";

const EXPECTED_DIMENSIONS = [
  { key: "modeling", labels: ["model", "domain", "entity", "relationship", "uml", "class"] },
  { key: "responsibility", labels: ["responsibility", "boundary", "service", "collaboration", "cohesion"] },
  { key: "evidence", labels: ["document", "explain", "evidence", "test", "screenshot", "artifact"] },
  { key: "quality", labels: ["quality", "complete", "consistent", "runnable", "standard"] }
];

function textIncludesAny(text, labels) {
  const lower = String(text || "").toLowerCase();
  return labels.some((label) => lower.includes(String(label).toLowerCase()));
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function gradeBand(score, maxScore) {
  if (!maxScore) {
    return "unscored";
  }
  const ratio = score / maxScore;
  if (ratio >= 0.9) {
    return "excellent";
  }
  if (ratio >= 0.75) {
    return "good";
  }
  if (ratio >= 0.6) {
    return "pass";
  }
  return "risk";
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export class RubricInsightService {
  constructor({ assignments, submissions, rubrics, rubricCriteria, grades, feedbackItems }) {
    this.assignments = assignments;
    this.submissions = submissions;
    this.rubrics = rubrics;
    this.rubricCriteria = rubricCriteria;
    this.grades = grades;
    this.feedbackItems = feedbackItems;
  }

  getRubricProfile(rubricId) {
    const rubric = this.rubrics.findById(rubricId);
    if (!rubric) {
      throw new NotFoundError("rubric not found");
    }
    const criteria = this.rubricCriteria.findByRubric(rubric.id);
    const totalScore = criteria.reduce((sum, criterion) => sum + criterion.maxScore, 0);
    const dimensionCoverage = this.buildDimensionCoverage(criteria);
    const weightBalance = this.analyzeWeightBalance(criteria, totalScore);
    const warnings = [
      ...this.buildStructureWarnings(criteria, totalScore, dimensionCoverage),
      ...weightBalance.warnings
    ];
    const missing = dimensionCoverage.filter((item) => !item.covered).map((item) => item.key);
    return {
      rubric: rubric.toJSON(),
      criteria: criteria.map((criterion) => ({
        ...criterion.toJSON(),
        weight: totalScore ? clampPercent((criterion.maxScore / totalScore) * 100) : 0
      })),
      totalScore,
      dimensionCoverage,
      weightBalance,
      warnings,
      improvementPlan: this.buildImprovementPlan(warnings, missing),
      qualityScore: clampPercent(100 - warnings.length * 12 - missing.length * 5)
    };
  }

  buildDimensionCoverage(criteria) {
    return EXPECTED_DIMENSIONS.map((dimension) => ({
      key: dimension.key,
      covered: criteria.some((criterion) => textIncludesAny(`${criterion.title} ${criterion.description}`, dimension.labels)),
      labels: dimension.labels
    }));
  }

  buildStructureWarnings(criteria, totalScore, dimensionCoverage) {
    const warnings = [];
    if (criteria.length < 3) {
      warnings.push("criterion-count-too-low");
    }
    if (criteria.some((criterion) => criterion.maxScore <= 0)) {
      warnings.push("non-positive-score");
    }
    if (totalScore !== 100) {
      warnings.push("total-score-not-100");
    }
    const missing = dimensionCoverage.filter((item) => !item.covered).map((item) => item.key);
    for (const key of missing) {
      warnings.push(`missing-dimension:${key}`);
    }
    return warnings;
  }

  analyzeWeightBalance(criteria, totalScore) {
    if (!criteria.length || !totalScore) {
      return {
        largestCriterion: null,
        smallestCriterion: null,
        spread: 0,
        warnings: ["empty-or-zero-rubric"]
      };
    }
    const sorted = [...criteria].sort((a, b) => b.maxScore - a.maxScore);
    const largest = sorted[0];
    const smallest = sorted[sorted.length - 1];
    const largestWeight = largest.maxScore / totalScore;
    const smallestWeight = smallest.maxScore / totalScore;
    const warnings = [];
    if (largestWeight > 0.55) {
      warnings.push("single-criterion-overweighted");
    }
    if (smallestWeight < 0.1 && criteria.length > 3) {
      warnings.push("criterion-underweighted");
    }
    return {
      largestCriterion: {
        id: largest.id,
        title: largest.title,
        weight: clampPercent(largestWeight * 100)
      },
      smallestCriterion: {
        id: smallest.id,
        title: smallest.title,
        weight: clampPercent(smallestWeight * 100)
      },
      spread: clampPercent((largestWeight - smallestWeight) * 100),
      warnings
    };
  }

  buildImprovementPlan(warnings, missingDimensions) {
    const actions = [];
    if (warnings.includes("criterion-count-too-low")) {
      actions.push("Split broad criteria into modeling, responsibility, evidence, and quality dimensions.");
    }
    if (warnings.includes("total-score-not-100")) {
      actions.push("Normalize max scores to a 100-point rubric for easier comparison.");
    }
    if (warnings.includes("single-criterion-overweighted")) {
      actions.push("Reduce the largest criterion or introduce supporting criteria to make grading more stable.");
    }
    for (const dimension of missingDimensions) {
      actions.push(`Add observable evidence for ${dimension}.`);
    }
    if (!actions.length) {
      actions.push("Current rubric structure is usable; keep collecting grade samples to validate consistency.");
    }
    return actions;
  }

  buildAssignmentGradingOverview(assignmentId) {
    const assignment = this.assignments.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError("assignment not found");
    }
    const rubricProfile = assignment.rubricId ? this.getRubricProfile(assignment.rubricId) : null;
    const submissions = this.submissions.findByAssignment(assignment.id);
    const rows = submissions.map((submission) => this.buildSubmissionGradeRow(submission, rubricProfile));
    const scored = rows.filter((row) => row.finalScore !== null);
    const scores = scored.map((row) => row.finalScore);
    return {
      assignment: assignment.toJSON(),
      rubric: rubricProfile,
      submissionCount: submissions.length,
      gradedCount: scored.length,
      average: average(scores),
      minScore: scores.length ? Math.min(...scores) : 0,
      maxScore: scores.length ? Math.max(...scores) : 0,
      bands: this.computeBandSummary(rows),
      consistency: this.computeConsistency(rows),
      rows
    };
  }

  buildSubmissionGradeRow(submission, rubricProfile) {
    const allGrades = this.grades.findBySubmission(submission.id);
    const teacherGrade = allGrades.find((grade) => grade.source === "teacher") || null;
    const aiGrade = allGrades.find((grade) => grade.source === "ai") || null;
    const finalScore = teacherGrade?.score ?? aiGrade?.score ?? null;
    const maxScore = rubricProfile?.totalScore || 100;
    return {
      submissionId: submission.id,
      studentId: submission.studentId,
      studentName: submission.studentSnapshot?.name || submission.studentId,
      submittedAt: submission.submittedAt,
      teacherScore: teacherGrade?.score ?? null,
      aiScore: aiGrade?.score ?? null,
      scoreGap: teacherGrade && aiGrade ? Math.abs(teacherGrade.score - aiGrade.score) : null,
      finalScore,
      band: finalScore === null ? "ungraded" : gradeBand(finalScore, maxScore),
      feedbackCount: this.feedbackItems.findBySubmission(submission.id).length
    };
  }

  computeBandSummary(rows) {
    return rows.reduce((acc, row) => {
      acc[row.band] = (acc[row.band] || 0) + 1;
      return acc;
    }, {});
  }

  computeConsistency(rows) {
    const gaps = rows
      .map((row) => row.scoreGap)
      .filter((gap) => gap !== null && Number.isFinite(gap));
    if (!gaps.length) {
      return {
        sampleSize: 0,
        averageGap: 0,
        highRiskCount: 0,
        status: "insufficient-data"
      };
    }
    const averageGap = average(gaps);
    const highRiskCount = gaps.filter((gap) => gap >= 15).length;
    return {
      sampleSize: gaps.length,
      averageGap,
      highRiskCount,
      status: highRiskCount ? "needs-review" : "stable"
    };
  }

  compareSubmissionGrades(submissionId) {
    const submission = this.submissions.findById(submissionId);
    if (!submission) {
      throw new NotFoundError("submission not found");
    }
    const assignment = this.assignments.findById(submission.assignmentId);
    const grades = this.grades.findBySubmission(submission.id);
    const teacher = grades.find((grade) => grade.source === "teacher") || null;
    const ai = grades.find((grade) => grade.source === "ai") || null;
    const comparison = this.buildGradeComparison(teacher, ai);
    return {
      submission: submission.toJSON(),
      assignment: assignment?.toJSON() || null,
      grades: grades.map((grade) => grade.toJSON()),
      comparison,
      recommendation: this.buildGradingRecommendation({ teacher, ai, comparison })
    };
  }

  buildGradeComparison(teacher, ai) {
    const comparison = [];
    if (!teacher || !ai) {
      return comparison;
    }
    comparison.push({
      metric: "total-score-gap",
      teacher: teacher.score,
      ai: ai.score,
      gap: Math.abs(teacher.score - ai.score),
      risk: Math.abs(teacher.score - ai.score) >= 15 ? "high" : "normal"
    });
    const aiByCriterion = new Map((ai.criteriaScores || []).map((item) => [item.criterionId, item]));
    for (const teacherItem of teacher.criteriaScores || []) {
      const aiItem = aiByCriterion.get(teacherItem.criterionId);
      if (aiItem) {
        const gap = Math.abs(Number(teacherItem.score || 0) - Number(aiItem.score || 0));
        comparison.push({
          metric: "criterion-score-gap",
          criterionId: teacherItem.criterionId,
          teacher: teacherItem.score,
          ai: aiItem.score,
          gap,
          risk: gap >= 8 ? "high" : "normal"
        });
      }
    }
    return comparison;
  }

  buildGradingRecommendation({ teacher, ai, comparison }) {
    if (!teacher && !ai) {
      return "Run AI review or teacher grading first.";
    }
    if (ai && !teacher) {
      return "Use AI review as a draft and ask the teacher to verify low-score criteria.";
    }
    if (teacher && !ai) {
      return "Teacher grading exists; AI review can be used as a consistency reference.";
    }
    const highRisk = comparison.filter((item) => item.risk === "high");
    if (highRisk.length) {
      return "Teacher and AI scores differ clearly; recheck rubric evidence and criterion interpretation.";
    }
    return "Teacher and AI scores are broadly consistent; AI feedback can be used as supplementary advice.";
  }
}
