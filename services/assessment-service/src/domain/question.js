import { Repository } from "../../../../shared/data/repository.js";
import { Entity } from "../../../../shared/domain/entity.js";

export const QuestionTypes = Object.freeze({
  SINGLE_CHOICE: "single_choice",
  MULTIPLE_CHOICE: "multiple_choice",
  TRUE_FALSE: "true_false",
  SHORT_ANSWER: "short_answer",
  CODE_READING: "code_reading"
});

export class QuestionBank extends Entity {
  constructor(record) {
    super(record);
    this.courseId = record.courseId;
    this.title = record.title;
    this.description = record.description || "";
    this.createdBy = record.createdBy;
    this.tags = Array.isArray(record.tags) ? record.tags : [];
  }
}

export class Question extends Entity {
  constructor(record) {
    super(record);
    this.bankId = record.bankId;
    this.courseId = record.courseId;
    this.type = record.type;
    this.stem = record.stem;
    this.choices = Array.isArray(record.choices) ? record.choices : [];
    this.answer = record.answer ?? null;
    this.analysis = record.analysis || "";
    this.concept = record.concept || "";
    this.concepts = Array.isArray(record.concepts) ? record.concepts : [];
    this.difficulty = record.difficulty || "medium";
    this.status = record.status || "active";
  }
}

export class PracticeSession extends Entity {
  constructor(record) {
    super(record);
    this.ownerId = record.ownerId;
    this.courseId = record.courseId;
    this.bankId = record.bankId || null;
    this.questionIds = Array.isArray(record.questionIds) ? record.questionIds : [];
    this.status = record.status || "active";
    this.score = Number(record.score || 0);
    this.correctRate = Number(record.correctRate || 0);
    this.startedAt = record.startedAt || this.createdAt;
    this.finishedAt = record.finishedAt || null;
  }
}

export class AnswerRecord extends Entity {
  constructor(record) {
    super(record);
    this.sessionId = record.sessionId;
    this.questionId = record.questionId;
    this.ownerId = record.ownerId;
    this.answer = record.answer ?? null;
    this.correct = record.correct ?? null;
    this.status = record.status || (record.correct === null ? "pending_review" : "judged");
    this.explanation = record.explanation || "";
  }
}

export class MistakeItem extends Entity {
  constructor(record) {
    super(record);
    this.ownerId = record.ownerId;
    this.courseId = record.courseId;
    this.questionId = record.questionId;
    this.answerRecordId = record.answerRecordId;
    this.status = record.status || "open";
    this.reviewNote = record.reviewNote || "";
  }
}

export class MasteryRecord extends Entity {
  constructor(record) {
    super(record);
    this.ownerId = record.ownerId;
    this.courseId = record.courseId;
    this.concept = record.concept || "";
    this.correctCount = Number(record.correctCount || 0);
    this.incorrectCount = Number(record.incorrectCount || 0);
    this.masteryScore = Number(record.masteryScore || 0);
    this.lastPracticedAt = record.lastPracticedAt || this.updatedAt;
  }

  recordResult(correct) {
    if (correct) {
      this.correctCount += 1;
    } else {
      this.incorrectCount += 1;
    }
    const total = this.correctCount + this.incorrectCount;
    this.masteryScore = total ? Math.round((this.correctCount / total) * 100) : 0;
    this.lastPracticedAt = new Date().toISOString();
    this.touch();
  }
}

class QuestionRepositoryBase extends Repository {
  constructor(database, collectionName, factory) {
    super(database, collectionName, factory);
  }
}

export class QuestionBankRepository extends QuestionRepositoryBase {
  constructor(database) {
    super(database, "questionBanks", (record) => new QuestionBank(record));
  }

  findByCourse(courseId) {
    return this.where((bank) => bank.courseId === courseId);
  }
}

export class QuestionRepository extends QuestionRepositoryBase {
  constructor(database) {
    super(database, "questions", (record) => new Question(record));
  }

  findByFilters({ bankId, courseId, type, concept } = {}) {
    return this.where((question) => {
      if (bankId && question.bankId !== bankId) {
        return false;
      }
      if (courseId && question.courseId !== courseId) {
        return false;
      }
      if (type && question.type !== type) {
        return false;
      }
      if (concept && question.concept !== concept) {
        return false;
      }
      return true;
    });
  }
}

export class PracticeSessionRepository extends QuestionRepositoryBase {
  constructor(database) {
    super(database, "practiceSessions", (record) => new PracticeSession(record));
  }

  findByOwner(ownerId) {
    return this.where((session) => session.ownerId === ownerId);
  }

  findByFilters({ ownerId, courseId, bankId, status } = {}) {
    return this.where((session) => {
      if (ownerId && session.ownerId !== ownerId) {
        return false;
      }
      if (courseId && session.courseId !== courseId) {
        return false;
      }
      if (bankId && session.bankId !== bankId) {
        return false;
      }
      if (status && session.status !== status) {
        return false;
      }
      return true;
    });
  }
}

export class AnswerRecordRepository extends QuestionRepositoryBase {
  constructor(database) {
    super(database, "answerRecords", (record) => new AnswerRecord(record));
  }

  findBySession(sessionId) {
    return this.where((record) => record.sessionId === sessionId);
  }

  findBySessionAndQuestion(sessionId, questionId) {
    return this.findBySession(sessionId).find((record) => record.questionId === questionId) || null;
  }
}

export class MistakeItemRepository extends QuestionRepositoryBase {
  constructor(database) {
    super(database, "mistakeItems", (record) => new MistakeItem(record));
  }

  findByOwner(ownerId) {
    return this.where((item) => item.ownerId === ownerId);
  }

  findByAnswerRecord(answerRecordId) {
    return this.where((item) => item.answerRecordId === answerRecordId);
  }
}

export class MasteryRecordRepository extends QuestionRepositoryBase {
  constructor(database) {
    super(database, "masteryRecords", (record) => new MasteryRecord(record));
  }

  findByOwner(ownerId) {
    return this.where((item) => item.ownerId === ownerId);
  }

  findByOwnerAndConcept(ownerId, courseId, concept) {
    return this.findByOwner(ownerId)
      .find((item) => item.courseId === courseId && item.concept === concept) || null;
  }
}
