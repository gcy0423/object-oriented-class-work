function take(items = [], size = 3) {
  return items.filter(Boolean).slice(0, size);
}

function listEvidence(input = {}, extra = []) {
  return [
    ...take(input.evidence || [], 4),
    ...extra
  ].filter(Boolean).slice(0, 6);
}

export function fallbackTeachingPlan(user, input = {}) {
  const priority = take(input.risks || [], 2);
  return {
    summary: priority.length
      ? `先处理 ${priority[0]}，再检查待批改和风险学生。`
      : "先批改高风险提交，再确认需要干预的学生。",
    actions: [
      { id: "review", label: "打开批改页", route: "teacher-review", type: "generate", kind: "navigate" },
      { id: "intervention", label: "打开干预队列", route: "teacher-intervention", type: "generate", kind: "navigate" },
      { id: "course", label: "查看课程学情", route: "teacher-course", type: "generate", kind: "navigate" }
    ],
    risks: priority.length ? priority : ["若只看汇总不看证据，容易误判学生风险。"],
    evidence: listEvidence(input),
    draft: {
      title: "今日教学方案",
      summary: "按当前证据排序今日处理顺序。",
      body: "1. 先处理待批改提交。\n2. 核对风险学生证据。\n3. 生成补练建议并安排跟进。"
    }
  };
}

export function fallbackStudentIntervention(user, input = {}) {
  const studentName = input.studentName || "该学生";
  return {
    summary: `建议先核对 ${studentName} 的 AI 行动、提交证据和错题，再发送提醒。`,
    actions: [
      { id: "student", label: "查看学生画像", route: "teacher-student", type: "generate", kind: "navigate" },
      { id: "send", label: "确认并发送提醒", route: "teacher-intervention", type: "confirm", kind: "send-intervention" }
    ],
    risks: ["提醒内容应保留教师语气确认，避免直接发送未审核文本。"],
    evidence: listEvidence(input),
    draft: {
      title: `${studentName}干预草稿`,
      summary: "基于 AI 行动、提交与风险证据生成的提醒草稿。",
      body: `老师建议你先补齐当前最关键的一项学习行动，并结合最近一次提交反馈完成复盘。`,
      message: `老师建议你先补齐当前最关键的一项学习行动，并在两天内回看反馈。`,
      courseId: input.courseId || null,
      studentId: input.studentId || null,
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      channels: ["in_app"]
    }
  };
}

export function fallbackAssignmentCommentary(user, input = {}) {
  return {
    summary: "讲评重点应围绕高频问题、评分差异和提交覆盖度展开。",
    actions: [
      { id: "assignment", label: "回到作业页", route: "teacher-assignment", type: "generate", kind: "navigate" },
      { id: "save", label: "保存讲评草稿", route: "teacher-assignment", type: "confirm", kind: "save-commentary" }
    ],
    risks: ["讲评前需确认是否存在仍未评分的提交。"],
    evidence: listEvidence(input),
    draft: {
      title: "作业讲评草稿",
      summary: "面向全班的讲评要点草稿。",
      body: "本次作业整体结构完整，但需要继续补强论证依据、概念边界和示例说明。"
    }
  };
}

export function fallbackFeedbackDraft(user, input = {}) {
  return {
    summary: "先对齐学生自检、AI 初评和教师判断，再生成个性化反馈。",
    actions: [
      { id: "review", label: "继续查看批改洞察", route: "teacher-review", type: "generate", kind: "navigate" },
      { id: "save", label: "保存反馈草稿", route: "teacher-review", type: "confirm", kind: "save-feedback" }
    ],
    risks: ["反馈草稿不能替代教师最终评分。"],
    evidence: listEvidence(input),
    draft: {
      title: "批改反馈草稿",
      summary: "供教师确认和修改的反馈文字。",
      body: "本次提交结构基本完整，建议补充关键判断依据，并把概念边界说明得更清楚。",
      payload: {
        scoreSuggestion: input.scoreSuggestion || null
      }
    }
  };
}

export function fallbackCoursePracticePlan(user, input = {}) {
  return {
    summary: "补练应优先覆盖薄弱知识点，再回到题库补齐证据。",
    actions: [
      { id: "course", label: "查看课程学情", route: "teacher-course", type: "generate", kind: "navigate" },
      { id: "save", label: "保存补练草稿", route: "teacher-course", type: "confirm", kind: "save-practice-plan" }
    ],
    risks: ["补练建议需要教师确认是否匹配当前课程进度。"],
    evidence: listEvidence(input),
    draft: {
      title: "课程补练草稿",
      summary: "围绕薄弱知识点的补练建议。",
      body: "建议先围绕当前薄弱知识点安排一组短练习，再用一题开放题检查解释能力。",
      payload: {
        questionCount: 6
      }
    }
  };
}

export function fallbackReportSummary(user, input = {}) {
  return {
    summary: "报告摘要应突出趋势、风险和下一步动作，而不是重复原表格。",
    actions: [
      { id: "report", label: "回到报告页", route: "teacher-report", type: "generate", kind: "navigate" },
      { id: "save", label: "保存摘要草稿", route: "teacher-report", type: "confirm", kind: "save-commentary" }
    ],
    risks: ["导出前仍需核对课程、学生和作业名称的可读性。"],
    evidence: listEvidence(input, [input.report?.title || "当前报告"]),
    draft: {
      title: "报告摘要草稿",
      summary: "供教师二次编辑的摘要。",
      body: `本期报告显示当前课程整体节奏基本稳定，但仍需继续关注高风险学生、低分作业和补练跟进。`
    }
  };
}
