import { AppError, ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { Question, QuestionBank, QuestionTypes } from "../domain/question.js";
import { isTeacherRole, sanitizeQuestion } from "../domain/assessment.js";

function requireText(value, label) {
  if (!String(value || "").trim()) {
    throw new ValidationError(`${label}不能为空。`);
  }
  return String(value).trim();
}

function requireQuestionType(type) {
  if (!Object.values(QuestionTypes).includes(type)) {
    throw new ValidationError("题目类型不合法。");
  }
  return type;
}

export class QuestionBankService {
  constructor({ database, questionBanks, questions, learningClient }) {
    this.database = database;
    this.questionBanks = questionBanks;
    this.questions = questions;
    this.learningClient = learningClient;
  }

  async ensureCourse(user, courseId) {
    const context = await this.learningClient.getLearningContext(user.id);
    const course = (context.courses || []).find((item) => item.id === courseId);
    if (!course) {
      throw new NotFoundError("课程不存在。");
    }
    return course;
  }

  async createQuestionBank(user, input) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("只有教师或管理员可以创建题库。");
    }
    const courseId = requireText(input.courseId, "课程");
    await this.ensureCourse(user, courseId);
    const now = new Date().toISOString();
    const bank = new QuestionBank({
      id: this.database.nextId("qbank"),
      courseId,
      title: requireText(input.title, "题库标题"),
      description: String(input.description || "").trim(),
      tags: Array.isArray(input.tags) ? input.tags : [],
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    });
    return this.questionBanks.save(bank);
  }

  listQuestionBanks({ courseId } = {}) {
    return courseId ? this.questionBanks.findByCourse(courseId) : this.questionBanks.all();
  }

  async updateQuestionBank(user, bankId, input) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("只有教师或管理员可以编辑题库。");
    }
    const bank = this.questionBanks.findById(bankId);
    if (!bank) {
      throw new NotFoundError("题库不存在。");
    }
    const courseId = requireText(input.courseId || bank.courseId, "课程");
    await this.ensureCourse(user, courseId);
    bank.courseId = courseId;
    bank.title = requireText(input.title || bank.title, "题库标题");
    bank.description = String(input.description ?? bank.description ?? "").trim();
    bank.tags = Array.isArray(input.tags) ? input.tags : bank.tags || [];
    bank.touch();
    return this.questionBanks.save(bank);
  }

  async deleteQuestionBank(user, bankId) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("只有教师或管理员可以删除题库。");
    }
    const bank = this.questionBanks.findById(bankId);
    if (!bank) {
      throw new NotFoundError("题库不存在。");
    }
    const relatedPractice = this.database.collection("practiceSessions").filter((item) => item.bankId === bankId);
    if (relatedPractice.length) {
      throw new AppError("该题库已有练习历史，暂不允许删除。", 409, "QUESTION_BANK_IN_USE");
    }
    const questions = this.questions.findByFilters({ bankId });
    for (const question of questions) {
      await this.questions.remove(question.id);
    }
    await this.questionBanks.remove(bankId);
    return { id: bankId, deleted: true };
  }

  async createQuestion(user, input) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("只有教师或管理员可以创建题目。");
    }
    const bankId = requireText(input.bankId, "题库");
    const bank = this.questionBanks.findById(bankId);
    if (!bank) {
      throw new NotFoundError("题库不存在。");
    }
    const courseId = requireText(input.courseId, "课程");
    if (bank.courseId !== courseId) {
      throw new ValidationError("题目课程必须与题库课程一致。");
    }
    await this.ensureCourse(user, courseId);
    const type = requireQuestionType(input.type);
    const now = new Date().toISOString();
    const question = new Question({
      id: this.database.nextId("question"),
      bankId,
      courseId,
      type,
      stem: requireText(input.stem, "题干"),
      choices: Array.isArray(input.choices) ? input.choices : [],
      answer: input.answer ?? null,
      analysis: String(input.analysis || "").trim(),
      concept: String(input.concept || "").trim(),
      concepts: Array.isArray(input.concepts) ? input.concepts : [],
      difficulty: String(input.difficulty || "medium").trim(),
      status: String(input.status || "active").trim(),
      createdAt: now,
      updatedAt: now
    });
    return this.questions.save(question);
  }

  async updateQuestion(user, questionId, input) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("只有教师或管理员可以编辑题目。");
    }
    const question = this.questions.findById(questionId);
    if (!question) {
      throw new NotFoundError("题目不存在。");
    }
    const bankId = requireText(input.bankId || question.bankId, "题库");
    const bank = this.questionBanks.findById(bankId);
    if (!bank) {
      throw new NotFoundError("题库不存在。");
    }
    const courseId = requireText(input.courseId || question.courseId, "课程");
    if (bank.courseId !== courseId) {
      throw new ValidationError("题目课程必须与题库课程一致。");
    }
    await this.ensureCourse(user, courseId);
    question.bankId = bankId;
    question.courseId = courseId;
    question.type = requireQuestionType(input.type || question.type);
    question.stem = requireText(input.stem || question.stem, "题干");
    question.choices = Array.isArray(input.choices) ? input.choices : question.choices;
    question.answer = input.answer ?? question.answer;
    question.analysis = String(input.analysis ?? question.analysis ?? "").trim();
    question.concept = String(input.concept ?? question.concept ?? "").trim();
    question.concepts = Array.isArray(input.concepts) ? input.concepts : question.concepts || [];
    question.difficulty = String(input.difficulty || question.difficulty || "medium").trim();
    question.status = String(input.status || question.status || "active").trim();
    question.touch();
    return this.questions.save(question);
  }

  async deleteQuestion(user, questionId) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("只有教师或管理员可以删除题目。");
    }
    const question = this.questions.findById(questionId);
    if (!question) {
      throw new NotFoundError("题目不存在。");
    }
    await this.questions.remove(questionId);
    return { id: questionId, deleted: true };
  }

  listQuestions(filters = {}) {
    return this.questions.findByFilters(filters).map((question) => sanitizeQuestion(question));
  }
}
