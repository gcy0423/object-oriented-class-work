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
      collaborationHandoff: false,
      classroom: false,
      classAssignment: false,
      group: false,
      groupMember: false,
      identityProfile: false,
      operationImport: false,
      operationCommit: false,
      operationJob: false,
      operationAudit: false,
      studentAi: false,
      teacherAi: false,
      studentTask: false,
      studentSubmission: false,
      studentNote: false
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
      collaboration: { courseId: "", roomId: "", type: "", taskStatus: "", mentionStatus: "" },
      reports: { courseId: "", studentId: "", assignmentId: "", format: "markdown" },
      identityAdmin: { role: "", status: "", courseId: "", classroomId: "", q: "" },
      operations: { courseId: "", target: "", importStatus: "", jobType: "", jobStatus: "", severity: "", studentId: "" }
    },
    selected: {
      assignmentId: "",
      questionBankId: "",
      questionId: "",
      practiceSessionId: "",
      studentId: "",
      collaborationRoomId: "",
      classroomId: "",
      identityUserId: "",
      operationImportId: "",
      operationJobId: ""
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
      knowledgeContext: { question: "AI 回答如何引用检索到的知识？", limit: 4 },
      adaptivePlan: { questionCount: 8, bankId: "" },
      collaborationRoom: { title: "", type: "course", description: "" },
      collaborationTask: { title: "", priority: "medium", assigneeId: "" },
      collaborationSummary: { summary: "", decisions: "", risks: "" },
      collaborationMember: { userId: "", displayName: "", role: "member" },
      collaborationDecision: { title: "", status: "proposed" },
      collaborationResource: { title: "", url: "", type: "link" },
      collaborationChecklist: { title: "", ownerId: "", status: "open" },
      collaborationHandoff: { title: "", toUserId: "", status: "open" },
      classroom: { name: "", courseId: "", courseTitle: "", teacherId: "", capacity: 60, status: "active" },
      classAssignment: { userId: "", role: "student", status: "active" },
      group: { classroomId: "", name: "", leaderId: "", status: "active" },
      groupMember: { groupId: "", userId: "", role: "member", status: "active" },
      identityProfile: { name: "", status: "active", role: "student", department: "", major: "", studentNo: "", teacherNo: "", phone: "" },
      operationImport: {
        title: "学生学习证据导入",
        target: "portfolioEvidence",
        format: "json",
        payload: ""
      },
      operationJob: { title: "学习档案刷新", type: "portfolio-refresh", priority: "normal" },
      operationAudit: { action: "手动记录", resourceType: "学习档案", severity: "info", summary: "" }
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
      selectedStudent: null,
      selectedStudentAiResults: [],
      selectedStudentAiTimeline: []
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
    reports: {
      catalog: null,
      studentWeekly: null,
      courseWeekly: null,
      assignmentGrading: null,
      mistakeReview: null,
      aiUsage: null,
      exportPreview: null
    },
    identityAdmin: {
      users: [],
      selectedProfile: null,
      classrooms: [],
      classroomDetail: null,
      groups: [],
      roleMatrix: null,
      dashboard: null
    },
    operations: {
      catalog: null,
      dashboard: null,
      imports: [],
      selectedImport: null,
      jobs: [],
      selectedJob: null,
      audits: [],
      auditDigest: null,
      deepPortfolio: null,
      evidenceMap: null,
      interventionPlan: null,
      portfolioBoard: null
    },
    settings: {
      health: null,
      modelConfig: null
    },
    student: {
      routeStack: [],
      ai: {
        dailyPlan: null,
        weaknessInsight: null,
        assignmentGuide: null,
        submissionCheck: null,
        noteOrganizeResult: null,
        timeline: [],
        organizeHistory: [],
        lastCommand: null
      },
      learning: {
        selectedCourseId: "",
        selectedTaskId: "",
        taskDrafts: []
      },
      assignments: {
        mode: "course",
        selectedAssignmentId: "",
        selectedSubmissionId: "",
        submitDraft: {
          id: "",
          assignmentId: "",
          content: "",
          attachments: [],
          attachmentsText: "",
          aiCheckResultId: "",
          updatedAt: ""
        },
        lastSubmission: null
      },
      practice: {
        selectedBankId: "",
        selectedSessionId: "",
        focusedQuestionIndex: 0,
        result: null
      },
      notes: {
        selectedCourseId: "",
        selectedNoteId: "",
        query: "",
        editorDraft: {
          title: "",
          content: "",
          tags: ""
        }
      }
    },
    teacher: {
      ai: {
        currentResult: null,
        resultsByRoute: {},
        drafts: [],
        lastCommand: null,
        loading: false
      }
    }
  };
}
