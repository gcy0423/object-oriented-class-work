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
      collaboration: false,
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
      reminder: false,
      knowledgePath: false,
      knowledgePractice: false,
      knowledgeContext: false,
      adaptivePlan: false,
      collaborationRoom: false,
      collaborationMessage: false,
      collaborationReply: false,
      collaborationTask: false,
      collaborationSummary: false,
      collaborationMember: false,
      collaborationDecision: false,
      collaborationResource: false,
      collaborationChecklist: false,
      collaborationHandoff: false
    },
    errors: {},
    filters: {
      assignments: { courseId: "", status: "", keyword: "" },
      questionBanks: { courseId: "", type: "", difficulty: "", keyword: "" },
      practice: { courseId: "", bankId: "", status: "", mistakeStatus: "" },
      analytics: { courseId: "", studentId: "" },
      workbench: { courseId: "", category: "", reminderStatus: "" },
      knowledge: { courseId: "", query: "object collaboration", category: "", difficulty: "", tag: "", conceptId: "" },
      assessmentInsight: { courseId: "", assignmentId: "", rubricId: "", submissionId: "", practiceSessionId: "", mistakeId: "", studentId: "" },
      collaboration: { courseId: "", roomId: "", type: "", taskStatus: "", mentionStatus: "" }
    },
    selected: {
      assignmentId: "",
      questionBankId: "",
      questionId: "",
      practiceSessionId: "",
      studentId: "",
      collaborationRoomId: ""
    },
    draft: {
      assignment: null,
      questionBank: null,
      question: null,
      grade: null,
      profile: null,
      reminder: null,
      knowledgePath: { goalText: "object collaboration service boundary", days: 5 },
      knowledgePractice: { conceptIds: "", limit: 4 },
      knowledgeContext: { question: "How should the AI answer cite retrieved knowledge?", limit: 4 },
      adaptivePlan: { questionCount: 8, bankId: "" },
      collaborationRoom: { title: "", type: "course", description: "" },
      collaborationTask: { title: "", priority: "medium", assigneeId: "" },
      collaborationSummary: { summary: "", decisions: "", risks: "" },
      collaborationMember: { userId: "", displayName: "", role: "member" },
      collaborationDecision: { title: "", status: "proposed" },
      collaborationResource: { title: "", url: "", type: "link" },
      collaborationChecklist: { title: "", ownerId: "", status: "open" },
      collaborationHandoff: { title: "", toUserId: "", status: "open" }
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
    knowledge: {
      summary: null,
      concepts: [],
      selectedConcept: null,
      searchResults: [],
      graph: null,
      recommendations: [],
      learningPath: null,
      practiceSet: null,
      aiContext: null
    },
    assessmentInsight: {
      gradingOverview: null,
      rubricInsight: null,
      submissionInsight: null,
      sessionReview: null,
      adaptivePlan: null,
      mistakeAnalysis: null,
      mistakeDetail: null,
      courseReport: null,
      studentPortfolio: null,
      riskRegister: null
    },
    collaboration: {
      rooms: [],
      workspace: null,
      mentions: [],
      tasks: [],
      decisions: [],
      resources: [],
      checklist: [],
      handoffs: [],
      insight: null,
      audit: []
    },
    settings: {
      health: null,
      modelConfig: null
    }
  };
}
