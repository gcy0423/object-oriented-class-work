import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { computeObjectiveAnswer, isTeacherRole, sanitizePracticeQuestion } from "../domain/assessment.js";
import { AnswerRecord, MasteryRecord, MistakeItem, PracticeSession, QuestionTypes } from "../domain/question.js";

function requireText(value, label) {
  if (!String(value || "").trim()) {
    throw new ValidationError(`${label}不能为空。`);
  }
  return String(value).trim();
}

export class PracticeService {
  constructor({ database, questionBanks, questions, practiceSessions, answerRecords, mistakeItems, masteryRecords, learningClient, collaborationClient, logger = console }) {
    this.database = database;
    this.questionBanks = questionBanks;
    this.questions = questions;
    this.practiceSessions = practiceSessions;
    this.answerRecords = answerRecords;
    this.mistakeItems = mistakeItems;
    this.masteryRecords = masteryRecords;
    this.learningClient = learningClient;
    this.collaborationClient = collaborationClient;
    this.logger = logger;
  }

  async ensureCourse(user, courseId) {
    const context = await this.learningClient.getLearningContext(user.id);
    const course = (context.courses || []).find((item) => item.id === courseId);
    if (!course) {
      throw new NotFoundError("课程不存在。");
    }
    return course;
  }

  async startSession(user, input) {
    const courseId = requireText(input.courseId, "课程");
    await this.ensureCourse(user, courseId);
    const bankId = requireText(input.bankId, "题库");
    const bank = this.questionBanks.findById(bankId);
    if (!bank || bank.courseId !== courseId) {
      throw new NotFoundError("题库不存在。");
    }
    const count = Math.max(1, Number(input.questionCount || 5));
    const questionPool = this.questions.findByFilters({ bankId, courseId }).slice(0, count);
    if (questionPool.length === 0) {
      throw new ValidationError("题库中还没有题目。");
    }

    const now = new Date().toISOString();
    const session = new PracticeSession({
      id: this.database.nextId("practice"),
      ownerId: user.id,
      courseId,
      bankId,
      questionIds: questionPool.map((item) => item.id),
      status: "active",
      score: 0,
      correctRate: 0,
      startedAt: now,
      finishedAt: null,
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.practiceSessions.save(session);
    await this.publishEvent({
      type: "practice.started",
      actorId: user.id,
      source: "assessment-service",
      summary: `开始练习：${bank.title}`,
      payload: { sessionId: saved.id, bankId: bank.id }
    });
    return {
      ...saved.toJSON(),
      questions: questionPool.map((question) => sanitizePracticeQuestion(question))
    };
  }

  getSession(user, sessionId) {
    const session = this.practiceSessions.findById(sessionId);
    if (!session) {
      throw new NotFoundError("练习会话不存在。");
    }
    if (!isTeacherRole(user.role) && session.ownerId !== user.id) {
      throw new ForbiddenError("不能查看其他人的练习。");
    }
    const questions = session.questionIds
      .map((id) => this.questions.findById(id))
      .filter(Boolean)
      .map((question) => sanitizePracticeQuestion(question));
    const answers = this.answerRecords.findBySession(session.id);
    return {
      ...session.toJSON(),
      questions,
      answers: answers.map((item) => item.toJSON())
    };
  }

  listSessions(user, filters = {}) {
    const query = canSeeAllSessions(user)
      ? { courseId: filters.courseId, bankId: filters.bankId, status: filters.status, ownerId: filters.studentId }
      : { courseId: filters.courseId, bankId: filters.bankId, status: filters.status, ownerId: user.id };
    return this.practiceSessions.findByFilters(query)
      .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))
      .map((session) => {
        const answers = this.answerRecords.findBySession(session.id);
        return {
          ...session.toJSON(),
          totalCount: session.questionIds.length,
          answeredCount: answers.length
        };
      });
  }

  async submitAnswer(user, sessionId, input) {
    const session = this.practiceSessions.findById(sessionId);
    if (!session) {
      throw new NotFoundError("练习会话不存在。");
    }
    if (session.ownerId !== user.id) {
      throw new ForbiddenError("只能提交自己的练习答案。");
    }
    const questionId = requireText(input.questionId, "题目");
    const question = this.questions.findById(questionId);
    if (!question || !session.questionIds.includes(question.id)) {
      throw new NotFoundError("题目不存在。");
    }

    const answerValue = input.answer ?? null;
    const correct = computeObjectiveAnswer(question, answerValue);
    const now = new Date().toISOString();
    const existing = this.answerRecords.findBySessionAndQuestion(session.id, question.id);
    const record = existing || new AnswerRecord({
      id: this.database.nextId("answer"),
      sessionId: session.id,
      questionId: question.id,
      ownerId: user.id,
      answer: answerValue,
      correct,
      status: correct === null ? "pending_review" : "judged",
      explanation: correct === null ? "简答题已保存，等待教师评阅。" : question.analysis,
      createdAt: now,
      updatedAt: now
    });
    record.answer = answerValue;
    record.correct = correct;
    record.status = correct === null ? "pending_review" : "judged";
    record.explanation = correct === null ? "简答题已保存，等待教师评阅。" : question.analysis;
    record.touch();
    const saved = await this.answerRecords.save(record);

    if (correct !== null) {
      await this.updateMastery(user.id, question, correct);
      if (!correct) {
        const mistake = new MistakeItem({
          id: this.database.nextId("mistake"),
          ownerId: user.id,
          courseId: session.courseId,
          questionId: question.id,
          answerRecordId: saved.id,
          status: "open",
          reviewNote: "",
          createdAt: now,
          updatedAt: now
        });
        const savedMistake = await this.mistakeItems.save(mistake);
        await this.publishEvent({
          type: "mistake.created",
          actorId: user.id,
          source: "assessment-service",
          summary: `加入错题本：${question.stem.slice(0, 20)}`,
          payload: { mistakeId: savedMistake.id, questionId: question.id }
        });
      }
    }

    return {
      record: saved,
      correct,
      explanation: correct === null ? "简答题已保存，等待教师评阅。" : question.analysis
    };
  }

  async finishSession(user, sessionId) {
    const session = this.practiceSessions.findById(sessionId);
    if (!session) {
      throw new NotFoundError("练习会话不存在。");
    }
    if (session.ownerId !== user.id) {
      throw new ForbiddenError("只能完成自己的练习。");
    }
    const answers = this.answerRecords.findBySession(session.id);
    const judged = answers.filter((item) => item.correct !== null);
    const correctCount = judged.filter((item) => item.correct === true).length;
    session.status = "finished";
    session.finishedAt = new Date().toISOString();
    session.score = correctCount;
    session.correctRate = judged.length ? Math.round((correctCount / judged.length) * 100) : 0;
    session.touch();
    const saved = await this.practiceSessions.save(session);

    await this.publishEvent({
      type: "practice.completed",
      actorId: user.id,
      source: "assessment-service",
      summary: `完成练习，正确率 ${saved.correctRate}%`,
      payload: { sessionId: saved.id, score: saved.score, correctRate: saved.correctRate }
    });

    return {
      ...saved.toJSON(),
      answeredCount: answers.length,
      mistakeCount: answers.filter((item) => item.correct === false).length
    };
  }

  async updateMastery(ownerId, question, correct) {
    const concept = question.concept || "未分类知识点";
    const now = new Date().toISOString();
    const mastery = this.masteryRecords.findByOwnerAndConcept(ownerId, question.courseId, concept) || new MasteryRecord({
      id: this.database.nextId("mastery"),
      ownerId,
      courseId: question.courseId,
      concept,
      correctCount: 0,
      incorrectCount: 0,
      masteryScore: 0,
      lastPracticedAt: now,
      createdAt: now,
      updatedAt: now
    });
    mastery.recordResult(correct);
    const saved = await this.masteryRecords.save(mastery);
    await this.publishEvent({
      type: "mastery.changed",
      actorId: ownerId,
      source: "assessment-service",
      summary: `更新知识点掌握度：${saved.concept}`,
      payload: { masteryId: saved.id, masteryScore: saved.masteryScore, concept: saved.concept }
    });
  }

  async publishEvent(event) {
    if (!this.collaborationClient) {
      return;
    }
    try {
      await this.collaborationClient.publishEvent(event);
    } catch (error) {
      this.logger.warn?.(`assessment-service event publish failed: ${error.message}`);
    }
  }
}

function canSeeAllSessions(user) {
  return isTeacherRole(user.role);
}
