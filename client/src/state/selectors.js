import { formatPercent, statusText } from "../utils/format.js";

function keywordMatch(keyword, value) {
  return String(value || "").toLowerCase().includes(String(keyword || "").trim().toLowerCase());
}

export function canManageAssessment(user) {
  return user?.role === "teacher" || user?.role === "admin";
}

export function canViewAnalytics(user) {
  return canManageAssessment(user);
}

export function routeVisible(route, user) {
  if (route === "analytics" || route === "question-banks" || route === "identity-admin") {
    return canManageAssessment(user);
  }
  return true;
}

export function selectAssignments(state) {
  const filters = state.filters.assignments;
  return (state.assessment.assignments || []).filter((assignment) => {
    if (filters.courseId && assignment.courseId !== filters.courseId) {
      return false;
    }
    if (filters.status && assignment.status !== filters.status) {
      return false;
    }
    if (filters.keyword && !keywordMatch(filters.keyword, `${assignment.title} ${assignment.description}`)) {
      return false;
    }
    return true;
  });
}

export function selectAssignmentViewModel(state) {
  const assignments = selectAssignments(state);
  const detail = state.assessment.assignmentDetail;
  return {
    assignments,
    detail,
    courses: state.dashboard?.courses || [],
    rubrics: state.assessment.rubrics || [],
    selectedAssignment: assignments.find((item) => item.id === state.selected.assignmentId) || detail?.assignment || null,
    canManage: canManageAssessment(state.user)
  };
}

export function selectQuestionBankViewModel(state) {
  const filters = state.filters.questionBanks;
  const banks = (state.assessment.questionBanks || []).filter((bank) => {
    if (filters.courseId && bank.courseId !== filters.courseId) {
      return false;
    }
    if (filters.keyword && !keywordMatch(filters.keyword, `${bank.title} ${bank.description}`)) {
      return false;
    }
    return true;
  });
  const questions = (state.assessment.questions || []).filter((question) => {
    if (state.selected.questionBankId && question.bankId !== state.selected.questionBankId) {
      return false;
    }
    if (filters.type && question.type !== filters.type) {
      return false;
    }
    if (filters.difficulty && question.difficulty !== filters.difficulty) {
      return false;
    }
    if (filters.keyword && !keywordMatch(filters.keyword, `${question.stem} ${question.analysis}`)) {
      return false;
    }
    return true;
  });
  return {
    banks,
    questions,
    courses: state.dashboard?.courses || [],
    selectedBank: banks.find((item) => item.id === state.selected.questionBankId) || null,
    canManage: canManageAssessment(state.user)
  };
}

export function selectPracticeProgress(session) {
  const questions = session?.questions || [];
  const answers = session?.answers || [];
  return {
    total: questions.length,
    answered: answers.length,
    percent: questions.length ? Math.round((answers.length / questions.length) * 100) : 0
  };
}

export function selectPracticeViewModel(state) {
  const filters = state.filters.practice;
  const history = (state.assessment.practiceHistory || []).filter((session) => {
    if (filters.courseId && session.courseId !== filters.courseId) {
      return false;
    }
    if (filters.bankId && session.bankId !== filters.bankId) {
      return false;
    }
    if (filters.status && session.status !== filters.status) {
      return false;
    }
    return true;
  });
  const mistakes = (state.assessment.mistakes || []).filter((item) => !filters.mistakeStatus || item.status === filters.mistakeStatus);
  return {
    banks: state.assessment.questionBanks || [],
    session: state.assessment.practiceSession,
    history,
    mistakes,
    progress: selectPracticeProgress(state.assessment.practiceSession)
  };
}

export function selectAnalyticsViewModel(state) {
  const teacher = state.analytics.teacher || {};
  const courses = (teacher.courses || []).map((course) => ({
    id: course.courseId || course.id,
    title: course.courseTitle || course.title,
    assignmentCompletionRate: course.assignments?.completionRate ?? 0,
    averageCorrectRate: course.practice?.averageCorrectRate ?? 0,
    openMistakes: course.practice?.openMistakes ?? 0,
    mastery: (course.mastery || []).map((item) => ({
      label: item.label || item.concept,
      value: item.value ?? item.masteryScore ?? 0
    }))
  }));
  const students = (teacher.students || []).map((student) => ({
    id: student.id,
    name: student.name,
    completionRate: student.learning?.completionRate ?? 0,
    studyMinutes: student.learning?.studyMinutes ?? 0,
    mistakeCount: student.assessment?.mistakeCount ?? 0,
    masteryScore: student.assessment?.masteryScore ?? 0,
    riskReasons: student.riskReasons || student.reasons || []
  }));
  return {
    courseCards: courses,
    studentProfiles: students,
    riskStudents: (teacher.riskStudents || []).map((student) => ({
      ...student,
      reasons: student.reasons || []
    })),
    recentActivity: teacher.recentActivity || [],
    canView: canViewAnalytics(state.user),
    selectedCourse: state.analytics.selectedCourse,
    selectedStudent: state.analytics.selectedStudent
  };
}

export function buildModelConfig(provider) {
  return {
    provider: provider || "mock-local-llm",
    mode: provider && provider.includes("lm") ? "llm-studio" : "mock",
    baseUrlHint: "LM_STUDIO_BASE_URL",
    modelHint: "LM_STUDIO_MODEL",
    testCommand: "npm run test:services",
    startCommand: "npm run start:services:mock"
  };
}

export function statusBadgeModel(value) {
  return {
    value: statusText(value),
    tone: String(value || "").toLowerCase().replaceAll("_", "-")
  };
}

export function withSavingPatch(state, key, value) {
  return {
    saving: { ...state.saving, [key]: value }
  };
}

export function withLoadingPatch(state, key, value) {
  return {
    loading: { ...state.loading, [key]: value }
  };
}

export function withErrorPatch(state, key, value) {
  return {
    errors: { ...state.errors, [key]: value }
  };
}

export function summaryMetric(label, value) {
  return { label, value: typeof value === "number" ? formatPercent(value) : value };
}
