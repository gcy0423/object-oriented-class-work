import { studentTitleFor } from "../views/studentRouteTable.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function mapById(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

function normalizeDateKey(value) {
  return String(value || "").slice(0, 10) || "未安排";
}

function urgencyFor(dueAt) {
  if (!dueAt) {
    return "low";
  }
  const daysLeft = Math.ceil((Date.parse(dueAt) - Date.now()) / 86400000);
  if (daysLeft <= 2) {
    return "high";
  }
  if (daysLeft <= 5) {
    return "medium";
  }
  return "low";
}

function parseTags(value) {
  return String(value || "").split(/[，,]/).map((item) => item.trim()).filter(Boolean);
}

function parseAttachmentText(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(": ");
      const fallbackSeparator = separator >= 0 ? separator : line.indexOf("|");
      const name = fallbackSeparator >= 0 ? line.slice(0, fallbackSeparator) : line;
      const url = fallbackSeparator >= 0 ? line.slice(fallbackSeparator + (separator >= 0 ? 2 : 1)) : "";
      return { name: String(name || "").trim(), url: String(url || "").trim() };
    })
    .filter((item) => item.name || item.url);
}

function attachmentsToText(attachments = []) {
  return normalizeAttachments(attachments)
    .map((item) => [item.name, item.url].filter(Boolean).join(": "))
    .filter(Boolean)
    .join("\n");
}

function normalizeAttachments(value) {
  return asArray(value).map((item) => ({
    id: item.id || "",
    name: String(item.name || ""),
    url: String(item.url || ""),
    contentType: String(item.contentType || ""),
    size: Number(item.size || 0)
  }));
}

function dashboardCourses(state) {
  return asArray(state.dashboard?.courses);
}

function dashboardGoals(state) {
  return asArray(state.dashboard?.goals);
}

function dashboardTasks(state) {
  return asArray(state.dashboard?.tasks);
}

function dashboardNotes(state) {
  return asArray(state.dashboard?.notes);
}

function assignmentRows(state) {
  return asArray(state.assessment?.assignments || state.dashboard?.assignments);
}

function questionBanks(state) {
  return asArray(state.assessment?.questionBanks);
}

function practiceHistory(state) {
  return asArray(state.assessment?.practiceHistory);
}

function mistakeRows(state) {
  return asArray(state.assessment?.mistakes);
}

function selectedCourseId(state) {
  return state.student?.learning?.selectedCourseId
    || state.student?.notes?.selectedCourseId
    || dashboardCourses(state)[0]?.id
    || "";
}

function withCourseTitle(item, courseMap) {
  const course = courseMap.get(item?.courseId);
  return {
    ...item,
    courseTitle: course?.title || ""
  };
}

export function buildStudentAiPanelModel(state) {
  const route = state.route;
  const ai = state.student?.ai || {};
  const tasks = dashboardTasks(state).filter((item) => item.status !== "done");
  const assignments = assignmentRows(state);
  const mistakes = mistakeRows(state);
  const notes = dashboardNotes(state);
  const sourceByRoute = (() => {
    if (route.startsWith("student-assignment") || route.startsWith("student-submit") || route === "student-feedback") {
      return ai.submissionCheck || ai.assignmentGuide || null;
    }
    if (route.startsWith("student-practice") || route === "student-mistake-detail" || route === "student-ai-insight") {
      return ai.weaknessInsight || null;
    }
    if (route.startsWith("student-note")) {
      return ai.noteOrganizeResult || null;
    }
    if (route === "student-ai") {
      return ai.dailyPlan || null;
    }
    return null;
  })();
  const fallbackByRoute = (() => {
    if (route.startsWith("student-learning") || route === "student-task-detail") {
      return {
        summary: tasks.length ? `当前有 ${tasks.length} 个待推进任务，优先完成最近的学习行动。` : "当前没有待推进任务。",
        actions: tasks.slice(0, 2).map((task) => ({
          id: `task-${task.id}`,
          label: task.title || "继续学习任务",
          detail: "进入学习页查看任务详情",
          route: "student-learning",
          status: task.status || "active"
        })),
        risks: tasks.length > 3 ? ["待办任务较多，建议先收敛到 1-2 个重点。"] : []
      };
    }
    if (route.startsWith("student-assignment") || route.startsWith("student-submit") || route === "student-feedback") {
      return {
        summary: assignments.length ? `当前有 ${assignments.length} 个作业可处理，提交前建议先做一次自检。` : "当前没有待处理作业。",
        actions: assignments.slice(0, 2).map((assignment) => ({
          id: `assignment-${assignment.id}`,
          label: assignment.title || "查看作业",
          detail: assignment.dueAt ? `截止 ${normalizeDateKey(assignment.dueAt)}` : "查看作业要求",
          route: "student-assignments",
          status: assignment.status || "published"
        })),
        risks: assignments.some((item) => urgencyFor(item.dueAt) === "high") ? ["有临近截止的作业，请优先处理。"] : []
      };
    }
    if (route.startsWith("student-practice") || route === "student-mistake-detail" || route === "student-ai-insight") {
      return {
        summary: mistakes.length ? `当前有 ${mistakes.length} 个错题或薄弱点可复盘。` : "当前没有错题风险，可以用推荐练习巩固。",
        actions: mistakes.slice(0, 2).map((mistake) => ({
          id: `mistake-${mistake.id}`,
          label: mistake.question?.concept || "复盘错题",
          detail: mistake.question?.stem || "查看错题详情",
          route: "student-practice",
          status: mistake.status || "open"
        })),
        risks: mistakes.length ? ["错题未复盘前，相关概念可能继续影响作业质量。"] : []
      };
    }
    if (route.startsWith("student-note")) {
      return {
        summary: notes.length ? `当前有 ${notes.length} 条课程笔记，可整理成复习卡片。` : "当前没有课程笔记，先记录本节课关键概念。",
        actions: notes.slice(0, 2).map((note) => ({
          id: `note-${note.id}`,
          label: note.title || "整理笔记",
          detail: "进入笔记页继续编辑",
          route: "student-notes",
          status: "active"
        })),
        risks: notes.length ? [] : ["笔记为空时，后续复习和作业引用会缺少材料。"]
      };
    }
    return {
      summary: ai.dailyPlan?.summary || "暂无新的学习建议。",
      actions: ai.dailyPlan?.actions || [],
      risks: ai.dailyPlan?.risks || []
    };
  })();
  const source = sourceByRoute || fallbackByRoute;
  return {
    title: studentTitleFor(route),
    summary: source?.summary || fallbackByRoute.summary || "暂无新的学习建议。",
    actions: source?.actions || [],
    risks: source?.risks || []
  };
}

export function selectStudentHomeModel(state) {
  const goals = dashboardGoals(state);
  const tasks = dashboardTasks(state);
  const assignments = assignmentRows(state);
  const courseMap = mapById(dashboardCourses(state));
  const mistakes = mistakeRows(state);
  return {
    user: state.user,
    goals,
    tasks,
    assignments,
    mistakes,
    metrics: state.dashboard?.metrics || {},
    dailyPlan: state.student?.ai?.dailyPlan || null,
    timeline: asArray(state.student?.ai?.timeline),
    pressure: assignments
      .filter((item) => item?.dueAt)
      .map((item) => ({ ...withCourseTitle(item, courseMap), urgency: urgencyFor(item.dueAt) }))
      .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))
      .slice(0, 5),
    nextActions: (state.student?.ai?.dailyPlan?.actions || []).slice(0, 4)
  };
}

export function selectStudentLearningModel(state) {
  const courses = dashboardCourses(state);
  const goals = dashboardGoals(state);
  const tasks = dashboardTasks(state);
  const currentCourseId = state.student?.learning?.selectedCourseId || courses[0]?.id || "";
  const courseMap = mapById(courses);
  const selectedCourse = courseMap.get(currentCourseId) || courses[0] || null;
  const courseGoals = goals.filter((item) => !currentCourseId || item.courseId === currentCourseId);
  const goalIds = new Set(courseGoals.map((item) => item.id));
  const courseTasks = tasks.filter((item) => goalIds.size === 0 || goalIds.has(item.goalId));
  return {
    courses,
    selectedCourse,
    selectedCourseId: currentCourseId,
    goals: courseGoals,
    tasks: courseTasks,
    taskDrafts: asArray(state.student?.learning?.taskDrafts),
    selectedTaskId: state.student?.learning?.selectedTaskId || courseTasks[0]?.id || "",
    assignments: assignmentRows(state).filter((item) => !currentCourseId || item.courseId === currentCourseId)
  };
}

export function selectStudentTaskDetailModel(state) {
  const learning = selectStudentLearningModel(state);
  const task = learning.tasks.find((item) => item.id === learning.selectedTaskId) || null;
  if (!task) {
    return { task: null, course: learning.selectedCourse, goal: learning.goals[0] || null, relatedAssignments: [] };
  }
  const goal = learning.goals.find((item) => item.id === task.goalId) || learning.goals[0] || null;
  return {
    task,
    goal,
    course: learning.selectedCourse,
    relatedAssignments: learning.assignments.slice(0, 3),
    steps: [
      "确认本任务的输出物",
      "按步骤完成核心内容",
      "提交前对照完成标准自检"
    ],
    doneDefinition: [
      "能清楚说明本任务完成了什么",
      "与当前课程或作业有明确关联"
    ]
  };
}

export function selectStudentAssignmentsModel(state) {
  const assignments = assignmentRows(state);
  const courses = dashboardCourses(state);
  const courseMap = mapById(courses);
  const enrichedAssignments = assignments.map((item) => withCourseTitle(item, courseMap));
  const mode = state.student?.assignments?.mode || "course";
  const byCourseMap = new Map();
  for (const assignment of enrichedAssignments) {
    const key = assignment.courseId || "unknown";
    const row = byCourseMap.get(key) || {
      courseId: key,
      courseTitle: courseMap.get(key)?.title || key,
      assignments: []
    };
    row.assignments.push({ ...assignment, urgency: urgencyFor(assignment.dueAt) });
    byCourseMap.set(key, row);
  }
  const calendarMap = new Map();
  for (const assignment of enrichedAssignments) {
    const key = normalizeDateKey(assignment.dueAt);
    const row = calendarMap.get(key) || { date: key, assignments: [] };
    row.assignments.push({ ...assignment, urgency: urgencyFor(assignment.dueAt) });
    calendarMap.set(key, row);
  }
  return {
    mode,
    courses,
    assignments: enrichedAssignments,
    byCourse: [...byCourseMap.values()],
    calendarDays: [...calendarMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    deadlineList: enrichedAssignments
      .map((item) => ({ ...item, urgency: urgencyFor(item.dueAt) }))
      .sort((a, b) => String(a.dueAt || "").localeCompare(String(b.dueAt || "")))
  };
}

export function selectStudentAssignmentDetailModel(state) {
  const detail = state.assessment?.assignmentDetail || null;
  const assignment = detail?.assignment || assignmentRows(state).find((item) => item.id === state.student?.assignments?.selectedAssignmentId || item.id === state.selected?.assignmentId) || null;
  return {
    assignment,
    submissions: asArray(detail?.submissions),
    rubric: detail?.rubric || null,
    submissionSummary: detail?.submissionSummary || null,
    guide: state.student?.ai?.assignmentGuide || null
  };
}

export function selectStudentSubmitModel(state) {
  const detailModel = selectStudentAssignmentDetailModel(state);
  const draft = state.student?.assignments?.submitDraft || {};
  const attachmentsText = draft.attachmentsText || attachmentsToText(draft.attachments || []);
  const assignmentId = draft.assignmentId || detailModel.assignment?.id || state.student?.assignments?.selectedAssignmentId || state.selected?.assignmentId || "";
  return {
    assignment: detailModel.assignment,
    assignmentId,
    draft: {
      id: draft.id || "",
      assignmentId,
      content: draft.content || "",
      attachments: normalizeAttachments(draft.attachments || []),
      attachmentsText,
      aiCheckResultId: draft.aiCheckResultId || "",
      updatedAt: draft.updatedAt || "",
      attachmentHints: parseAttachmentText(attachmentsText),
      tags: parseTags(draft.tags)
    },
    check: state.student?.ai?.submissionCheck || null,
    canRecover: Boolean(detailModel.assignment)
  };
}

export function selectStudentPracticeModel(state) {
  const courseMap = mapById(dashboardCourses(state));
  return {
    banks: questionBanks(state).map((item) => withCourseTitle(item, courseMap)),
    mistakes: mistakeRows(state),
    history: practiceHistory(state),
    adaptivePlan: state.assessmentInsight?.adaptivePlan || null,
    analysis: state.assessmentInsight?.mistakeAnalysis || null
  };
}

export function selectStudentPracticeSessionModel(state) {
  const session = state.assessment?.practiceSession || null;
  const questions = asArray(session?.questions);
  const answers = asArray(session?.answers);
  const focusedIndex = Math.min(state.student?.practice?.focusedQuestionIndex || 0, Math.max(questions.length - 1, 0));
  return {
    session,
    questions,
    answers,
    currentQuestion: questions[focusedIndex] || null,
    focusedQuestionIndex: focusedIndex,
    answeredCount: answers.length,
    totalCount: questions.length
  };
}

export function selectStudentPracticeResultModel(state) {
  const result = state.student?.practice?.result || state.assessment?.practiceSession || null;
  const review = state.assessmentInsight?.sessionReview || null;
  return {
    result,
    review,
    correctRate: result?.correctRate ?? review?.correctRate ?? 0,
    mistakeSummary: review?.nextActions || []
  };
}

export function selectStudentMistakeDetailModel(state) {
  const detail = state.assessmentInsight?.mistakeDetail || null;
  return {
    detail,
    question: detail?.question || null,
    answer: detail?.answer || null,
    remediation: detail?.remediation || null
  };
}

export function selectStudentNotesModel(state) {
  const courses = dashboardCourses(state);
  const notes = dashboardNotes(state);
  const courseId = state.student?.notes?.selectedCourseId || courses[0]?.id || "";
  const keyword = String(state.student?.notes?.query || "").trim().toLowerCase();
  const filteredNotes = notes.filter((item) => {
    if (courseId && item.courseId !== courseId) {
      return false;
    }
    if (keyword && !`${item.title} ${item.content} ${(item.tags || []).join(" ")}`.toLowerCase().includes(keyword)) {
      return false;
    }
    return true;
  });
  return {
    courses,
    selectedCourseId: courseId,
    notes: filteredNotes,
    selectedNoteId: state.student?.notes?.selectedNoteId || filteredNotes[0]?.id || "",
    selectedNote: filteredNotes.find((item) => item.id === state.student?.notes?.selectedNoteId) || filteredNotes[0] || null,
    query: state.student?.notes?.query || "",
    editorDraft: state.student?.notes?.editorDraft || { title: "", content: "", tags: "" },
    organized: state.student?.ai?.noteOrganizeResult || null,
    organizeHistory: asArray(state.student?.ai?.organizeHistory)
  };
}

export function selectStudentAiContext(state, route) {
  const assignments = assignmentRows(state);
  const notes = dashboardNotes(state);
  const submit = selectStudentSubmitModel(state);
  const notesModel = selectStudentNotesModel(state);
  return {
    route,
    user: state.user,
    dashboard: state.dashboard,
    courses: dashboardCourses(state),
    goals: dashboardGoals(state),
    tasks: dashboardTasks(state),
    assignments,
    assignmentDetail: state.assessment?.assignmentDetail || null,
    mistakes: mistakeRows(state),
    practiceHistory: practiceHistory(state),
    submitDraft: submit.draft,
    noteDraft: notesModel.editorDraft,
    notes,
    noteId: notesModel.selectedNote?.id || "",
    student: state.student
  };
}
