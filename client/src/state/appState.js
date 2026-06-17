export function createInitialState() {
  return {
    route: "dashboard",
    user: null,
    provider: "",
    toast: "",
    aiAnswer: "",
    messages: [],
    activity: [],
    loading: {
      session: false,
      dashboard: false,
      assignments: false,
      questionBanks: false,
      practice: false,
      analytics: false,
      settings: false
    },
    saving: {
      assignment: false,
      grading: false,
      questionBank: false,
      question: false,
      practiceAnswer: false,
      profile: false,
      submission: false,
      reminder: false
    },
    errors: {},
    filters: {
      assignments: { courseId: "", status: "", keyword: "" },
      questionBanks: { courseId: "", type: "", difficulty: "", keyword: "" },
      practice: { courseId: "", bankId: "", status: "", mistakeStatus: "" },
      analytics: { courseId: "", studentId: "" },
      workbench: { courseId: "", category: "", reminderStatus: "" }
    },
    selected: {
      assignmentId: "",
      questionBankId: "",
      questionId: "",
      practiceSessionId: "",
      studentId: ""
    },
    draft: {
      assignment: null,
      questionBank: null,
      question: null,
      grade: null,
      profile: null,
      reminder: null
    },
    ui: {
      activePanel: "",
      dirtyForms: {},
      focusedQuestionId: ""
    },
    dashboard: null,
    assessment: {
      assignments: [],
      assignmentDetail: null,
      rubrics: [],
      questionBanks: [],
      questions: [],
      mistakes: [],
      practiceSession: null,
      practiceHistory: []
    },
    analytics: {
      overview: null,
      teacher: null,
      selectedCourse: null,
      selectedStudent: null
    },
    workbench: {
      notifications: [],
      notificationSummary: null,
      notificationPreferences: null,
      reminders: [],
      schedulerDashboard: null,
      schedulerTimeline: [],
      schedulerDuePreview: null,
      funnel: null,
      riskBoard: null,
      engagement: null,
      courseDeepReport: null,
      studentProgress: null
    },
    settings: {
      health: null,
      modelConfig: null
    }
  };
}
