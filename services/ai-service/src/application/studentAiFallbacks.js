function dueSoonAssignments(input = {}) {
  return [...(input.assignments || [])]
    .filter((item) => item?.dueAt)
    .sort((left, right) => String(left.dueAt).localeCompare(String(right.dueAt)))
    .slice(0, 3);
}

export function fallbackDailyPlan(user, input = {}) {
  const tasks = (input.tasks || []).filter((item) => item?.status !== "done").slice(0, 3);
  const assignments = dueSoonAssignments(input);
  return {
    type: "daily_plan",
    summary: tasks.length
      ? `今天优先推进 ${tasks[0].title}${assignments[0] ? `，并留意 ${assignments[0].title}` : ""}。`
      : "先从一个最小任务开始，保持今天的学习节奏。",
    actions: [
      tasks[0] ? { type: "open_task", label: "执行学习任务", route: "student-learning", detail: tasks[0].title, priority: "high" } : null,
      assignments[0] ? { type: "open_assignment", label: "查看临近作业", route: "student-assignments", detail: assignments[0].title, priority: "high" } : null,
      { type: "start_practice", label: "做一组练习", route: "student-practice", detail: "用练习验证理解", priority: "medium" }
    ].filter(Boolean),
    risks: assignments[0] ? [{ level: "medium", title: "存在临近截止作业", evidence: assignments[0].title }] : [{ level: "low", title: "今天还没有明确行动", evidence: "建议先确认一个最小任务" }],
    evidence: [`未完成任务 ${tasks.length} 个`, `待处理作业 ${assignments.length} 个`],
    questions: [{ text: "我先做学习任务还是先处理作业？" }]
  };
}

export function fallbackWeaknessInsight(user, input = {}) {
  const weaknesses = (input.mistakes || []).slice(0, 4).map((item, index) => ({
    concept: item?.question?.concept || item?.concept || "未分类知识点",
    title: item?.question?.concept || item?.concept || "未分类知识点",
    score: Math.max(40, 70 - index * 6),
    rank: index + 1,
    evidence: [item?.question?.stem || item?.questionId || item?.id || "最近错题"],
    action: "回看解析并完成一组同类题。"
  }));
  return {
    type: "weakness_insight",
    summary: weaknesses.length ? `目前最需要补强的是 ${weaknesses[0].title}。` : "当前没有明显错题堆积，可以用练习验证理解。",
    weaknesses,
    actions: [
      { type: "start_practice", label: "进入练习与错题", route: "student-practice", detail: "查看薄弱点和错题回放" },
      { type: "open_learning", label: "回到学习页补任务", route: "student-learning", detail: "把薄弱点转成学习任务" }
    ],
    evidence: weaknesses.flatMap((item) => item.evidence).slice(0, 4)
  };
}

export function fallbackTaskDraft(user, input = {}) {
  const goal = (input.goals || [])[0] || {};
  const course = (input.courses || [])[0] || {};
  return {
    type: "task_draft",
    summary: "已按当前课程与目标生成一个可确认的任务草稿。",
    draft: {
      title: `${course.title || "当前课程"}复盘与输出`,
      type: "文档产出",
      estimateMinutes: 45,
      dueDate: goal.targetDate || "",
      goalId: goal.id || input.goalId || "",
      courseId: course.id || input.courseId || "",
      steps: ["回看课堂材料", "整理关键概念", "输出一段自己的说明"],
      doneDefinition: ["形成一份可复用笔记", "能解释给同学听"],
      linkedAssignmentId: (input.assignments || [])[0]?.id || ""
    },
    actions: [{ type: "apply_task_draft", label: "确认加入任务", route: "student-learning", detail: "创建真实任务前需确认" }]
  };
}

export function fallbackAssignmentGuide(user, input = {}) {
  const assignment = input.assignment || input.assignmentDetail?.assignment || (input.assignments || [])[0] || null;
  return {
    type: "assignment_guide",
    summary: assignment ? `先读懂 ${assignment.title} 的要求，再组织提交结构。` : "先明确作业要求，再拆成可执行提交步骤。",
    outline: ["确认交付物", "列出核心要点", "补齐例子或图示", "提交前自检"],
    checklist: ["要求已覆盖", "术语使用准确", "结论与证据一致"],
    actions: [
      { type: "open_assignment", label: "查看作业详情", route: "student-assignment-detail", detail: assignment?.title || "查看要求" },
      { type: "open_submit", label: "去提交页完善草稿", route: "student-submit", detail: "先写正文再自检" }
    ],
    risks: ["如果只写结论不写依据，教师反馈通常会集中在论证不足。"]
  };
}

export function fallbackSubmissionCheck(user, input = {}) {
  const draft = input.draft || input.submitDraft || {};
  const content = String(draft.content || "");
  const issues = [];
  if (content.trim().length < 80) {
    issues.push({ level: "warning", title: "正文偏短", suggestion: "补充任务过程、判断依据和结论。" });
  }
  if (!String(draft.attachmentsText || "").trim() && !(draft.attachments || []).length) {
    issues.push({ level: "warning", title: "附件说明缺失", suggestion: "如果有图示或文档，请写清名称和链接。" });
  }
  return {
    type: "submission_check",
    summary: issues.length ? "提交草稿还可以更完整，建议先修再提交。" : "草稿结构已经可提交，建议再做一次快速复查。",
    completionEstimate: Math.min(100, Math.max(30, Math.round(content.trim().length / 4))),
    issues,
    strengths: content.trim() ? ["已具备可提交正文。"] : [],
    rewriteSuggestions: issues.length ? ["把类关系说明按“结论-依据”两列展开。"] : []
  };
}

export function fallbackNoteOrganize(user, input = {}) {
  const note = input.note || input.noteDraft || {};
  const content = String(note.content || "");
  const title = String(note.title || "课程笔记");
  return {
    type: "note_organize",
    summary: `${title} 已整理成可复习摘要和可复用段落。`,
    cards: [
      { front: "这份笔记最重要的概念是什么？", back: content.slice(0, 72) || "先补充关键概念。" },
      { front: "我应该用什么例子解释它？", back: "补一个课堂例子或作业场景。" }
    ],
    assignmentParagraphs: [
      content ? `我对本次内容的理解是：${content.slice(0, 120)}` : "先补充课堂笔记，再生成作业段落。"
    ]
  };
}
