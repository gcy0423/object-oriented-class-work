import { GradeRepository } from "./assignment.js";
import { QuestionTypes } from "./question.js";

export function isTeacherRole(role) {
  return role === "teacher" || role === "admin";
}

export function toRoleSet(user) {
  return {
    isTeacher: isTeacherRole(user.role),
    isStudent: user.role === "student"
  };
}

export function sortByCreatedDesc(items) {
  return [...items].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function sanitizeQuestion(question) {
  return {
    ...question.toJSON(),
    answer: undefined
  };
}

export function sanitizePracticeQuestion(question) {
  const json = sanitizeQuestion(question);
  delete json.answer;
  return json;
}

export function computeObjectiveAnswer(question, answer) {
  if (question.type === QuestionTypes.SINGLE_CHOICE || question.type === QuestionTypes.TRUE_FALSE) {
    return String(answer ?? "").trim() === String(question.answer ?? "").trim();
  }
  if (question.type === QuestionTypes.MULTIPLE_CHOICE) {
    const submitted = Array.isArray(answer) ? answer.map(String).sort() : String(answer || "").split(",").map((item) => item.trim()).filter(Boolean).sort();
    const expected = Array.isArray(question.answer) ? question.answer.map(String).sort() : [];
    return submitted.length === expected.length && submitted.every((item, index) => item === expected[index]);
  }
  return null;
}

export function createAssessmentRepositories(database, assignmentModule, questionModule) {
  return {
    assignments: new assignmentModule.AssignmentRepository(database),
    submissions: new assignmentModule.SubmissionRepository(database),
    rubrics: new assignmentModule.RubricRepository(database),
    rubricCriteria: new assignmentModule.RubricCriterionRepository(database),
    grades: new GradeRepository(database),
    feedbackItems: new assignmentModule.FeedbackItemRepository(database),
    questionBanks: new questionModule.QuestionBankRepository(database),
    questions: new questionModule.QuestionRepository(database),
    practiceSessions: new questionModule.PracticeSessionRepository(database),
    answerRecords: new questionModule.AnswerRecordRepository(database),
    mistakeItems: new questionModule.MistakeItemRepository(database),
    masteryRecords: new questionModule.MasteryRecordRepository(database)
  };
}
