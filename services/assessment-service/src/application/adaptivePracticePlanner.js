import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { isTeacherRole, sanitizePracticeQuestion } from "../domain/assessment.js";

const DEFAULT_TARGET_COUNT = 8;
const MAX_TARGET_COUNT = 20;
const MIN_TARGET_COUNT = 3;

function normalizeConcept(value) {
  const concept = String(value || "").trim();
  return concept || "unclassified";
}

function normalizeDifficulty(value) {
  if (value === "easy" || value === "medium" || value === "hard") {
    return value;
  }
  return "medium";
}

function difficultyWeight(question) {
  const difficulty = normalizeDifficulty(question.difficulty);
  if (difficulty === "easy") {
    return 1;
  }
  if (difficulty === "hard") {
    return 3;
  }
  return 2;
}

function clampQuestionCount(value) {
  const parsed = Number(value || DEFAULT_TARGET_COUNT);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_TARGET_COUNT;
  }
  return Math.max(MIN_TARGET_COUNT, Math.min(MAX_TARGET_COUNT, Math.round(parsed)));
}

function buildConceptKey(question) {
  return normalizeConcept(question.concept);
}

export class AdaptivePracticePlanner {
  constructor({ questions, questionBanks, mistakeItems, masteryRecords, practiceSessions, answerRecords }) {
    this.questions = questions;
    this.questionBanks = questionBanks;
    this.mistakeItems = mistakeItems;
    this.masteryRecords = masteryRecords;
    this.practiceSessions = practiceSessions;
    this.answerRecords = answerRecords;
  }

  buildPlan(user, input = {}) {
    const ownerId = isTeacherRole(user.role) && input.studentId ? String(input.studentId) : user.id;
    const courseId = String(input.courseId || "").trim();
    if (!courseId) {
      throw new ValidationError("courseId is required");
    }
    const bankId = input.bankId ? String(input.bankId) : null;
    const targetCount = clampQuestionCount(input.questionCount);
    const weakConcepts = this.rankWeakConcepts(ownerId, courseId);
    const pool = this.buildQuestionPool({ courseId, bankId });
    const selected = this.selectQuestions(pool, weakConcepts, targetCount);
    const estimatedMinutes = selected.reduce((sum, question) => sum + 4 + difficultyWeight(question) * 2, 0);
    return {
      ownerId,
      courseId,
      bankId,
      targetCount,
      selectedCount: selected.length,
      estimatedMinutes,
      weakConcepts,
      coverage: this.buildCoverage(selected),
      strategy: this.describeStrategy(weakConcepts, selected),
      questions: selected.map((question) => ({
        ...sanitizePracticeQuestion(question),
        reason: this.reasonForQuestion(question, weakConcepts)
      }))
    };
  }

  buildQuestionPool({ courseId, bankId }) {
    if (bankId) {
      const bank = this.questionBanks.findById(bankId);
      if (!bank || bank.courseId !== courseId) {
        throw new NotFoundError("question bank not found");
      }
    }
    return this.questions.findByFilters({ courseId, bankId })
      .filter((question) => question.status === "active");
  }

  rankWeakConcepts(ownerId, courseId) {
    const mistakes = this.mistakeItems.findByOwner(ownerId)
      .filter((item) => item.courseId === courseId && item.status !== "reviewed");
    const mastery = this.masteryRecords.findByOwner(ownerId)
      .filter((item) => item.courseId === courseId);
    const scores = new Map();
    for (const record of mastery) {
      const concept = normalizeConcept(record.concept);
      scores.set(concept, {
        concept,
        masteryScore: record.masteryScore,
        openMistakes: 0,
        priorityScore: Math.max(0, 100 - record.masteryScore),
        source: "mastery"
      });
    }
    for (const mistake of mistakes) {
      const question = this.questions.findById(mistake.questionId);
      const concept = normalizeConcept(question?.concept);
      const row = scores.get(concept) || {
        concept,
        masteryScore: 0,
        openMistakes: 0,
        priorityScore: 70,
        source: "mistake"
      };
      row.openMistakes += 1;
      row.priorityScore += 25 + difficultyWeight(question || {});
      scores.set(concept, row);
    }
    return [...scores.values()]
      .sort((a, b) => b.priorityScore - a.priorityScore || a.concept.localeCompare(b.concept))
      .slice(0, 8);
  }

  selectQuestions(pool, weakConcepts, targetCount) {
    if (!pool.length) {
      return [];
    }
    const weakSet = new Set(weakConcepts.map((item) => item.concept));
    const prioritized = pool
      .map((question) => ({
        question,
        score: this.scoreQuestion(question, weakSet)
      }))
      .sort((a, b) => b.score - a.score || a.question.id.localeCompare(b.question.id));
    const selected = [];
    const conceptCounts = new Map();
    for (const item of prioritized) {
      const concept = buildConceptKey(item.question);
      const count = conceptCounts.get(concept) || 0;
      const keepDiverse = count >= 3 && selected.length < targetCount - 2;
      if (keepDiverse) {
        continue;
      }
      selected.push(item.question);
      conceptCounts.set(concept, count + 1);
      if (selected.length >= targetCount) {
        break;
      }
    }
    if (selected.length < targetCount) {
      const selectedIds = new Set(selected.map((question) => question.id));
      for (const item of prioritized) {
        if (!selectedIds.has(item.question.id)) {
          selected.push(item.question);
          selectedIds.add(item.question.id);
        }
        if (selected.length >= targetCount) {
          break;
        }
      }
    }
    return selected;
  }

  scoreQuestion(question, weakSet) {
    const concept = buildConceptKey(question);
    const weakBonus = weakSet.has(concept) ? 100 : 20;
    const difficultyBonus = difficultyWeight(question) * 6;
    const objectiveBonus = question.type === "short_answer" || question.type === "code_reading" ? 4 : 8;
    return weakBonus + difficultyBonus + objectiveBonus;
  }

  buildCoverage(questions) {
    const concepts = new Map();
    const difficulties = { easy: 0, medium: 0, hard: 0 };
    for (const question of questions) {
      const concept = buildConceptKey(question);
      concepts.set(concept, (concepts.get(concept) || 0) + 1);
      const difficulty = normalizeDifficulty(question.difficulty);
      difficulties[difficulty] += 1;
    }
    return {
      conceptCount: concepts.size,
      concepts: [...concepts.entries()].map(([concept, count]) => ({ concept, count })),
      difficulties
    };
  }

  reasonForQuestion(question, weakConcepts) {
    const concept = buildConceptKey(question);
    const weak = weakConcepts.find((item) => item.concept === concept);
    if (weak) {
      return `Targets weak concept ${concept}; mastery=${weak.masteryScore}, openMistakes=${weak.openMistakes}.`;
    }
    return `Maintains coverage for concept ${concept}.`;
  }

  describeStrategy(weakConcepts, selected) {
    if (!weakConcepts.length) {
      return "No clear weak concept was detected, so the plan keeps balanced concept coverage.";
    }
    const top = weakConcepts.slice(0, 3).map((item) => item.concept).join(", ");
    const selectedConcepts = new Set(selected.map((question) => buildConceptKey(question)));
    return `Prioritize ${top}; selected ${selectedConcepts.size} concept groups to avoid overfitting one topic.`;
  }

  buildSessionReview(user, sessionId) {
    const session = this.practiceSessions.findById(sessionId);
    if (!session) {
      throw new NotFoundError("practice session not found");
    }
    if (!isTeacherRole(user.role) && session.ownerId !== user.id) {
      throw new ForbiddenError("cannot review another user's practice session");
    }
    const answers = this.answerRecords.findBySession(session.id);
    const questions = session.questionIds.map((id) => this.questions.findById(id)).filter(Boolean);
    const rows = questions.map((question) => {
      const answer = answers.find((item) => item.questionId === question.id);
      return {
        questionId: question.id,
        concept: buildConceptKey(question),
        difficulty: normalizeDifficulty(question.difficulty),
        answered: Boolean(answer),
        correct: answer?.correct ?? null,
        explanation: answer?.explanation || question.analysis || ""
      };
    });
    return {
      session: session.toJSON(),
      answeredCount: answers.length,
      correctCount: rows.filter((row) => row.correct === true).length,
      incorrectCount: rows.filter((row) => row.correct === false).length,
      pendingCount: rows.filter((row) => row.correct === null).length,
      conceptBreakdown: this.breakdownByConcept(rows),
      difficultyBreakdown: this.breakdownByDifficulty(rows),
      nextActions: this.buildNextActions(rows),
      rows
    };
  }

  breakdownByConcept(rows) {
    const map = new Map();
    for (const row of rows) {
      const item = map.get(row.concept) || {
        concept: row.concept,
        total: 0,
        correct: 0,
        incorrect: 0,
        pending: 0
      };
      item.total += 1;
      if (row.correct === true) {
        item.correct += 1;
      } else if (row.correct === false) {
        item.incorrect += 1;
      } else {
        item.pending += 1;
      }
      map.set(row.concept, item);
    }
    return [...map.values()].map((item) => ({
      ...item,
      correctRate: item.total ? Math.round((item.correct / item.total) * 100) : 0
    }));
  }

  breakdownByDifficulty(rows) {
    const result = {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 }
    };
    for (const row of rows) {
      const difficulty = normalizeDifficulty(row.difficulty);
      result[difficulty].total += 1;
      if (row.correct === true) {
        result[difficulty].correct += 1;
      }
    }
    return Object.fromEntries(Object.entries(result).map(([key, value]) => [
      key,
      {
        ...value,
        correctRate: value.total ? Math.round((value.correct / value.total) * 100) : 0
      }
    ]));
  }

  buildNextActions(rows) {
    const weakRows = this.breakdownByConcept(rows)
      .filter((item) => item.incorrect > 0 || item.pending > 0)
      .sort((a, b) => b.incorrect - a.incorrect || b.pending - a.pending)
      .slice(0, 5);
    if (!weakRows.length) {
      return ["Keep current pace and schedule a mixed review within 48 hours."];
    }
    return weakRows.map((item) => (
      `Review ${item.concept}: incorrect=${item.incorrect}, pending=${item.pending}, correctRate=${item.correctRate}%.`
    ));
  }
}
