import { formatDate, formatDateTime, formatPercent, statusText } from "../utils/format.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isInternalId(value) {
  return /^(course|user|assignment|submission|class|qbank|question|rubric|practice|mistake|student_ai|ai|room|group|job|import|audit|goal|task|note)_/i.test(String(value || ""));
}

export function readable(value, fallback) {
  const text = String(value || "").trim();
  return text && !isInternalId(text) ? text : fallback;
}

function teacherCopy(value, fallback) {
  const text = readable(value, fallback);
  const mapping = {
    "Run AI review or teacher grading first.": "请先执行 AI 初评或教师评分，再查看评分差异。"
  };
  return mapping[text] || text;
}

export function selectTeacherDictionaries(state) {
  const courses = asArray(state.dashboard?.courses);
  const users = [
    ...asArray(state.identityAdmin?.users),
    ...asArray(state.analytics?.teacher?.students).map((student) => ({ ...student, role: "student" })),
    state.analytics?.selectedStudent?.student || state.analytics?.selectedStudent
  ].filter(Boolean);
  const assignments = [
    ...asArray(state.assessment?.assignments),
    ...asArray(state.dashboard?.assignments),
    state.assessment?.assignmentDetail?.assignment
  ].filter(Boolean);
  return {
    courses: new Map(courses.map((item) => [item.id || item.courseId, item])),
    users: new Map(users.map((item) => [item.id || item.studentId || item.userId, item])),
    assignments: new Map(assignments.map((item) => [item.id || item.assignmentId, item]))
  };
}

export function displayCourseName(state, courseId) {
  const dict = selectTeacherDictionaries(state);
  const course = dict.courses.get(courseId);
  return readable(course?.title || course?.courseTitle, "未命名课程");
}

export function displayStudentName(state, studentId) {
  const dict = selectTeacherDictionaries(state);
  const student = dict.users.get(studentId);
  return readable(student?.name || student?.studentName || student?.displayName, "未命名学生");
}

export function displayAssignmentTitle(state, assignmentId) {
  const dict = selectTeacherDictionaries(state);
  const assignment = dict.assignments.get(assignmentId);
  return readable(assignment?.title || assignment?.assignmentTitle, "未命名作业");
}

function firstCourseId(state) {
  return state.filters?.assessmentInsight?.courseId
    || state.filters?.analytics?.courseId
    || state.filters?.workbench?.courseId
    || state.dashboard?.courses?.[0]?.id
    || state.assessment?.assignments?.[0]?.courseId
    || "";
}

function selectedAssignment(state) {
  const id = state.selected?.assignmentId || state.assessment?.assignmentDetail?.assignment?.id || state.assessment?.assignments?.[0]?.id || "";
  return state.assessment?.assignmentDetail?.assignment?.id === id
    ? state.assessment.assignmentDetail.assignment
    : asArray(state.assessment?.assignments).find((item) => item.id === id) || null;
}

function selectedStudentId(state) {
  return state.selected?.studentId
    || state.filters?.assessmentInsight?.studentId
    || state.analytics?.selectedStudent?.student?.id
    || state.analytics?.selectedStudent?.id
    || state.analytics?.teacher?.students?.[0]?.id
    || state.analytics?.teacher?.riskStudents?.[0]?.id
    || state.identityAdmin?.users?.find((item) => item.role === "student")?.id
    || "";
}

export function selectTeacherHomeModel(state) {
  const assignments = asArray(state.assessment?.assignments);
  const submissions = asArray(state.assessment?.assignmentDetail?.submissions);
  const riskItems = asArray(state.assessmentInsight?.riskRegister?.items);
  const courses = asArray(state.dashboard?.courses);
  const pendingReview = submissions.filter((item) => item.status !== "graded").length;
  const openMistakes = Number(state.assessmentInsight?.courseReport?.mistakeLoad?.openMistakes || state.assessment?.mistakes?.length || 0);
  return {
    courses: courses.map((course) => ({
      id: course.id,
      title: displayCourseName(state, course.id),
      description: readable(course.description, "暂无课程说明")
    })),
    metrics: [
      { label: "进行中课程", value: courses.length || 0 },
      { label: "待批改提交", value: pendingReview || state.assessmentInsight?.gradingOverview?.submissionCount || 0 },
      { label: "风险学生", value: riskItems.filter((item) => item.risk?.level !== "low").length || asArray(state.analytics?.teacher?.riskStudents).length || 0 },
      { label: "待复盘错题", value: openMistakes }
    ],
    tasks: [
      { title: "先处理待批改提交", detail: `${displayAssignmentTitle(state, selectedAssignment(state)?.id)} 需要完成评分一致性检查。`, route: "teacher-review" },
      { title: "确认干预对象", detail: `${riskItems.length || asArray(state.analytics?.teacher?.riskStudents).length} 位学生需要查看证据后再发送提醒。`, route: "teacher-intervention" },
      { title: "补齐题库缺口", detail: "根据薄弱知识点生成题目草稿，教师确认后入库。", route: "teacher-course" }
    ],
    assignments: assignments.slice(0, 4).map((item) => ({
      id: item.id,
      title: displayAssignmentTitle(state, item.id),
      course: displayCourseName(state, item.courseId),
      due: formatDate(item.dueAt),
      status: statusText(item.status)
    }))
  };
}

export function selectTeacherCourseModel(state) {
  const courseId = firstCourseId(state);
  const course = state.dashboard?.courses?.find((item) => item.id === courseId) || {};
  const report = state.assessmentInsight?.courseReport || {};
  const mastery = asArray(state.workbench?.courseDeepReport?.mastery?.concepts)
    .concat(asArray(state.analytics?.selectedCourse?.mastery))
    .slice(0, 6);
  return {
    id: courseId,
    title: displayCourseName(state, courseId),
    description: readable(course.description, "围绕作业、练习和课堂证据查看课程学情。"),
    metrics: [
      { label: "作业数", value: report.assignmentCount || state.assessment?.assignments?.length || 0 },
      { label: "提交数", value: report.submissionCount || state.assessmentInsight?.gradingOverview?.submissionCount || 0 },
      { label: "平均掌握", value: formatPercent(report.masteryCoverage?.averageMastery || 0) },
      { label: "开放错题", value: report.mistakeLoad?.openMistakes || state.assessment?.mistakes?.length || 0 }
    ],
    mastery: mastery.map((item) => ({
      label: readable(item.label || item.concept || item.title, "未命名知识点"),
      value: Number(item.value ?? item.masteryScore ?? item.score ?? 0)
    })),
    questionBanks: asArray(state.assessment?.questionBanks)
      .filter((item) => !courseId || item.courseId === courseId)
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        title: readable(item.title, "未命名题库"),
        description: readable(item.description, "暂无题库说明")
      })),
    practice: asArray(state.assessment?.practiceHistory)
      .filter((item) => !courseId || item.courseId === courseId)
      .slice(0, 4)
      .map((item) => ({
        status: statusText(item.status),
        correctRate: formatPercent(item.correctRate || 0),
        startedAt: formatDate(item.startedAt || item.createdAt)
      })),
    mistakes: asArray(state.assessment?.mistakes)
      .filter((item) => !courseId || item.courseId === courseId)
      .slice(0, 4)
      .map((item) => ({
        concept: readable(item.question?.concept || item.concept, "未命名知识点"),
        status: statusText(item.status),
        stem: readable(item.question?.stem || item.stem, "暂无题干摘要")
      })),
    risks: asArray(state.assessmentInsight?.riskRegister?.items).slice(0, 5).map((item) => ({
      studentId: item.studentId,
      student: displayStudentName(state, item.studentId),
      level: statusText(item.risk?.level),
      detail: `${formatPercent(item.assignmentCompletionRate)} 完成率，${item.openMistakes || 0} 个开放错题`
    }))
  };
}

export function selectTeacherStudentModel(state) {
  const id = selectedStudentId(state);
  const selected = state.analytics?.selectedStudent || {};
  const student = selected.student || selected;
  const portfolio = state.assessmentInsight?.studentPortfolio || {};
  return {
    id,
    name: displayStudentName(state, id || student.id),
    summary: readable(selected.summary || portfolio.defenseNarrative?.headline, "聚合学生作业、练习、AI 行动和证据时间线。"),
    metrics: [
      { label: "作业完成", value: formatPercent(portfolio.assignmentProgress?.completionRate || student.learning?.completionRate || 0) },
      { label: "平均分", value: Math.round(portfolio.gradeTrend?.averageScore || student.assessment?.masteryScore || 0) },
      { label: "AI 行动", value: formatPercent(student.ai?.completionRate || 0) },
      { label: "风险", value: statusText(portfolio.risk?.level || student.risk?.level || "stable") }
    ],
    aiResults: asArray(state.analytics?.selectedStudentAiResults).slice(0, 4),
    timeline: [
      ...asArray(state.analytics?.selectedStudentAiTimeline),
      ...asArray(portfolio.evidenceTimeline)
    ].slice(0, 6),
    recommendations: asArray(selected.recommendations || student.recommendations).slice(0, 4)
  };
}

export function selectTeacherAssignmentModel(state) {
  const assignment = selectedAssignment(state) || {};
  const detail = state.assessment?.assignmentDetail || {};
  const overview = state.assessmentInsight?.gradingOverview || {};
  return {
    id: assignment.id,
    title: displayAssignmentTitle(state, assignment.id),
    course: displayCourseName(state, assignment.courseId),
    description: readable(assignment.description, "查看作业要求、提交情况和 AI 提交证据。"),
    due: formatDate(assignment.dueAt),
    status: statusText(assignment.status),
    metrics: [
      { label: "提交数", value: detail.submissionSummary?.submitted ?? overview.submissionCount ?? asArray(detail.submissions).length },
      { label: "已评分", value: detail.submissionSummary?.graded ?? overview.gradedCount ?? 0 },
      { label: "平均分", value: Math.round(overview.average || 0) },
      { label: "一致性", value: statusText(overview.consistency?.status || "stable") }
    ],
    submissions: asArray(detail.submissions).slice(0, 6).map((item) => ({
      id: item.id,
      student: readable(item.studentSnapshot?.name || item.studentName || displayStudentName(state, item.studentId), "未命名学生"),
      status: statusText(item.status),
      submittedAt: formatDateTime(item.submittedAt || item.createdAt),
      content: readable(item.content, "暂无提交正文")
    })),
    rows: asArray(overview.rows).slice(0, 6).map((item) => ({
      student: readable(item.studentName || displayStudentName(state, item.studentId), "未命名学生"),
      teacherScore: item.teacherScore ?? "-",
      aiScore: item.aiScore ?? "-",
      risk: statusText(item.band || item.risk || "stable")
    }))
  };
}

export function selectTeacherReviewModel(state) {
  const assignment = selectTeacherAssignmentModel(state);
  const insight = state.assessmentInsight?.submissionInsight || {};
  const evidence = insight.aiEvidence || state.assessmentInsight?.submissionEvidence || {};
  return {
    ...assignment,
    insightSummary: teacherCopy(insight.recommendation, "选择一份提交后查看 AI 初评、评分差异和学生自检证据。"),
    comparisons: asArray(insight.comparison).slice(0, 4),
    evidence: asArray(evidence.items || evidence.evidence || evidence.timeline).slice(0, 5)
  };
}

export function selectTeacherInterventionModel(state) {
  const risks = asArray(state.assessmentInsight?.riskRegister?.items);
  const actions = asArray(state.operations?.interventionPlan?.actions);
  return {
    risks: risks.slice(0, 8).map((item) => ({
      studentId: item.studentId,
      student: displayStudentName(state, item.studentId),
      level: statusText(item.risk?.level || "stable"),
      reason: item.weakConcepts?.map((concept) => readable(concept.concept, "薄弱知识点")).join("、") || "需要教师确认学习证据"
    })),
    actions: actions.slice(0, 6).map((item) => ({
      title: readable(item.title, "跟进学习提醒"),
      priority: statusText(item.priority),
      reason: readable(item.reason, "基于作业、错题和 AI 行动证据生成")
    }))
  };
}

export function selectTeacherReportModel(state) {
  const catalog = asArray(state.reports?.catalog?.reports);
  const reports = [
    state.reports?.courseWeekly?.report,
    state.reports?.assignmentGrading?.report,
    state.reports?.mistakeReview?.report,
    state.reports?.aiUsage?.report
  ].filter(Boolean);
  return {
    catalog: catalog.map((item) => ({
      title: readable(item.title, "未命名报告"),
      formats: asArray(item.formats).join(" / ") || "markdown"
    })),
    reports: reports.map((report) => ({
      title: readable(report.title, "未命名报告"),
      summary: readable(report.summary, "暂无摘要"),
      generatedAt: formatDateTime(report.generatedAt)
    })),
    preview: state.reports?.exportPreview?.export || null
  };
}

export function selectTeacherAiPanelModel(state, route) {
  if (route === "teacher-student") {
    const student = selectTeacherStudentModel(state);
    return {
      title: "学生干预助手",
      summary: `${student.name} 当前风险为 ${student.metrics[3].value}，请先核对 AI 行动和提交证据再发送提醒。`,
      actions: ["查看 AI 时间线", "整理干预话术", "发送提醒前确认对象"],
      risks: student.recommendations.length ? student.recommendations : ["缺少可读建议时，先查看作业和练习证据。"]
    };
  }
  if (route === "teacher-assignment" || route === "teacher-review") {
    const assignment = selectTeacherAssignmentModel(state);
    return {
      title: route === "teacher-review" ? "批改助手" : "作业助手",
      summary: `${assignment.title} 已提交 ${assignment.metrics[0].value} 份，优先检查评分差异和未评分提交。`,
      actions: ["打开批改队列", "生成讲评要点", "检查学生自检证据"],
      risks: assignment.rows.map((item) => `${item.student}：${item.risk}`).slice(0, 3)
    };
  }
  if (route === "teacher-course") {
    const course = selectTeacherCourseModel(state);
    return {
      title: "课程学情助手",
      summary: `${course.title} 平均掌握度 ${course.metrics[2].value}，关注薄弱知识点和风险学生。`,
      actions: ["按风险排序学生", "生成补练建议", "整理题库缺口"],
      risks: course.risks.map((item) => `${item.student}：${item.detail}`).slice(0, 3)
    };
  }
  if (route === "teacher-intervention") {
    const intervention = selectTeacherInterventionModel(state);
    return {
      title: "干预助手",
      summary: `当前有 ${intervention.risks.length} 条干预候选，提醒发送前需要教师确认语气、对象和证据。`,
      actions: ["确认提醒对象", "生成温和提醒", "安排两天后复查"],
      risks: intervention.risks.map((item) => `${item.student}：${item.reason}`).slice(0, 3)
    };
  }
  if (route === "teacher-report") {
    const report = selectTeacherReportModel(state);
    return {
      title: "报告助手",
      summary: `已聚合 ${report.reports.length || report.catalog.length} 类报告材料，可先生成课程周报再导出。`,
      actions: ["刷新报告", "生成课程周报", "导出当前预览"],
      risks: ["导出前检查课程、作业和学生名称是否可读。"]
    };
  }
  const home = selectTeacherHomeModel(state);
  return {
    title: "教学工作台助手",
    summary: `今天优先处理 ${home.metrics[1].value} 份待批改提交和 ${home.metrics[2].value} 位风险学生。`,
    actions: home.tasks.map((item) => item.title),
    risks: home.assignments.map((item) => `${item.title}：${item.status}`).slice(0, 3)
  };
}
