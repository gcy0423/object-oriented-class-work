import { NotFoundError } from "../../../../shared/http/errors.js";
import { isTeacherRole } from "../domain/assessment.js";

function normalizeConcept(value) {
  const concept = String(value || "").trim();
  return concept || "unclassified";
}

function reasonFor(question, answerRecord) {
  if (!answerRecord) {
    return "missing-answer";
  }
  if (!question?.id) {
    return "question-removed";
  }
  if (question.type === "multiple_choice") {
    return "choice-set-mismatch";
  }
  if (question.type === "single_choice" || question.type === "true_false") {
    return "concept-confusion";
  }
  return "manual-review-needed";
}

function priorityFor({ mistakeCount, masteryScore, recentOpenCount }) {
  if (mistakeCount >= 3 || masteryScore < 40 || recentOpenCount >= 2) {
    return "high";
  }
  if (mistakeCount >= 2 || masteryScore < 70) {
    return "medium";
  }
  return "low";
}

function increment(map, key, by = 1) {
  map[key] = (map[key] || 0) + by;
}

export class MistakeAnalysisService {
  constructor({ mistakeItems, questions, answerRecords, masteryRecords }) {
    this.mistakeItems = mistakeItems;
    this.questions = questions;
    this.answerRecords = answerRecords;
    this.masteryRecords = masteryRecords;
  }

  buildStudentReport(user, filters = {}) {
    const ownerId = isTeacherRole(user.role) && filters.studentId ? String(filters.studentId) : user.id;
    const courseId = filters.courseId ? String(filters.courseId) : null;
    const mistakes = this.mistakeItems.findByOwner(ownerId)
      .filter((item) => !courseId || item.courseId === courseId);
    const mastery = this.masteryRecords.findByOwner(ownerId)
      .filter((item) => !courseId || item.courseId === courseId);
    const concepts = this.groupMistakesByConcept(mistakes);
    const masteryMap = new Map(mastery.map((item) => [normalizeConcept(item.concept), item]));
    const conceptReports = [...concepts.values()].map((item) => {
      const masteryRecord = masteryMap.get(item.concept);
      return {
        ...item,
        masteryScore: masteryRecord?.masteryScore ?? 0,
        priority: priorityFor({
          mistakeCount: item.openCount,
          masteryScore: masteryRecord?.masteryScore ?? 0,
          recentOpenCount: item.recentOpenCount
        }),
        remediation: this.buildRemediation(item.concept, item.reasons)
      };
    }).sort((a, b) => {
      const priorityRank = { high: 3, medium: 2, low: 1 };
      return priorityRank[b.priority] - priorityRank[a.priority] || b.mistakeCount - a.mistakeCount;
    });
    return {
      ownerId,
      courseId,
      totalMistakes: mistakes.length,
      openMistakes: mistakes.filter((item) => item.status !== "reviewed").length,
      reviewedMistakes: mistakes.filter((item) => item.status === "reviewed").length,
      statusSummary: this.buildStatusSummary(mistakes),
      reasonSummary: this.buildReasonSummary(conceptReports),
      concepts: conceptReports,
      nextReviewQueue: this.buildReviewQueue(conceptReports),
      generatedAt: new Date().toISOString()
    };
  }

  groupMistakesByConcept(mistakes) {
    const concepts = new Map();
    const now = Date.now();
    for (const mistake of mistakes) {
      const question = this.questions.findById(mistake.questionId);
      const answer = this.answerRecords.findById(mistake.answerRecordId);
      const concept = normalizeConcept(question?.concept);
      const row = concepts.get(concept) || {
        concept,
        mistakeCount: 0,
        openCount: 0,
        reviewedCount: 0,
        recentOpenCount: 0,
        reasons: {},
        difficulties: {},
        questions: []
      };
      row.mistakeCount += 1;
      if (mistake.status === "reviewed") {
        row.reviewedCount += 1;
      } else {
        row.openCount += 1;
        if (this.isRecent(mistake.updatedAt || mistake.createdAt, now)) {
          row.recentOpenCount += 1;
        }
      }
      const reason = reasonFor(question, answer);
      increment(row.reasons, reason);
      increment(row.difficulties, question?.difficulty || "unknown");
      row.questions.push(this.buildMistakeQuestionRow(mistake, question, answer, reason));
      concepts.set(concept, row);
    }
    return concepts;
  }

  buildMistakeQuestionRow(mistake, question, answer, reason) {
    return {
      mistakeId: mistake.id,
      questionId: mistake.questionId,
      stem: question?.stem || "question removed",
      submittedAnswer: answer?.answer ?? null,
      expectedAnswer: question?.answer ?? null,
      status: mistake.status,
      reason,
      difficulty: question?.difficulty || "unknown",
      updatedAt: mistake.updatedAt
    };
  }

  isRecent(value, now = Date.now()) {
    const timestamp = Date.parse(value || "");
    if (!Number.isFinite(timestamp)) {
      return false;
    }
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return now - timestamp <= sevenDays;
  }

  buildStatusSummary(mistakes) {
    return mistakes.reduce((acc, mistake) => {
      increment(acc, mistake.status || "unknown");
      return acc;
    }, {});
  }

  buildReasonSummary(conceptReports) {
    return conceptReports.reduce((acc, concept) => {
      for (const [reason, count] of Object.entries(concept.reasons)) {
        increment(acc, reason, count);
      }
      return acc;
    }, {});
  }

  buildReviewQueue(conceptReports) {
    return conceptReports.flatMap((item) => item.questions
      .filter((question) => question.status !== "reviewed")
      .slice(0, 3)
      .map((question) => ({
        concept: item.concept,
        priority: item.priority,
        ...question
      }))).slice(0, 12);
  }

  buildRemediation(concept, reasons) {
    const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
    const advice = {
      "choice-set-mismatch": "Recheck every option against the concept definition before selecting a set.",
      "concept-confusion": "Compare adjacent concepts and write one counterexample for each.",
      "manual-review-needed": "Collect the key evidence, class responsibility, and design trade-off before rewriting the answer.",
      "missing-answer": "Complete pending questions first, then review the official explanation.",
      "question-removed": "Ask the teacher to refresh the question bank reference."
    };
    return {
      concept,
      topReason,
      advice: advice[topReason] || "Review the explanation, then do a short drill on the same concept.",
      evidenceToCollect: ["question analysis", "wrong answer", "concept notes", "post-review correction"]
    };
  }

  getMistakeDetail(user, mistakeId) {
    const mistake = this.mistakeItems.findById(mistakeId);
    if (!mistake) {
      throw new NotFoundError("mistake not found");
    }
    if (!isTeacherRole(user.role) && mistake.ownerId !== user.id) {
      throw new NotFoundError("mistake not found");
    }
    const question = this.questions.findById(mistake.questionId);
    const answer = this.answerRecords.findById(mistake.answerRecordId);
    const reason = reasonFor(question, answer);
    return {
      mistake: mistake.toJSON(),
      question: question?.toJSON() || null,
      answer: answer?.toJSON() || null,
      reason,
      remediation: this.buildRemediation(normalizeConcept(question?.concept), {
        [reason]: 1
      })
    };
  }
}
