import {
  normalizeAssignmentGuide,
  normalizeDailyPlan,
  normalizeNoteOrganize,
  normalizeSubmissionCheck,
  normalizeTaskDraft,
  normalizeWeaknessInsight
} from "./studentAiSchemas.js";
import {
  assignmentGuidePrompt,
  dailyPlanPrompt,
  noteOrganizePrompt,
  submissionCheckPrompt,
  taskDraftPrompt,
  weaknessInsightPrompt
} from "./studentPrompts.js";

function safeJsonObject(text) {
  const value = String(text || "").trim();
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function dueSoonAssignments(context) {
  return [...(context.assignments || [])]
    .filter((item) => item?.dueAt)
    .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))
    .slice(0, 3);
}

function fallbackDailyPlan(context) {
  const tasks = (context.tasks || []).filter((item) => item.status !== "done").slice(0, 3);
  const assignments = dueSoonAssignments(context);
  return {
    summary: tasks.length
      ? `今天优先推进 ${tasks[0].title}${assignments[0] ? `，并留意 ${assignments[0].title}` : ""}。`
      : "先从一个最小任务开始，保持今天的学习节奏。",
    actions: [
      tasks[0] ? { id: "task", label: "执行学习任务", route: "student-learning", detail: tasks[0].title } : null,
      assignments[0] ? { id: "assignment", label: "查看临近作业", route: "student-assignments", detail: assignments[0].title } : null,
      { id: "practice", label: "做一组练习", route: "student-practice", detail: "用练习验证理解" }
    ].filter(Boolean),
    risks: assignments[0] ? [`${assignments[0].title} 截止时间较近。`] : ["如果只看 AI 建议而不确认执行，今天的推进会落空。"],
    evidence: [
      `未完成任务 ${tasks.length} 个`,
      `待处理作业 ${assignments.length} 个`
    ],
    questions: [
      { text: "我先做学习任务还是先处理作业？" },
      { text: "需要我帮你拆成 30 分钟行动吗？" }
    ]
  };
}

function fallbackWeaknessInsight(context) {
  const mistakes = context.mistakes || [];
  const weaknessMap = new Map();
  for (const item of mistakes) {
    const key = item.question?.concept || item.concept || "未分类知识点";
    const row = weaknessMap.get(key) || { id: key, title: key, score: 50, reason: "open", evidence: [], action: "回看解析并完成一组同类题。" };
    row.evidence.push(item.question?.stem || item.questionId || item.id);
    weaknessMap.set(key, row);
  }
  const weaknesses = [...weaknessMap.values()].slice(0, 4);
  return {
    summary: weaknesses.length ? `目前最需要补强的是 ${weaknesses[0].title}。` : "当前没有明显错题堆积，可以用练习验证理解。",
    weaknesses,
    actions: [
      { label: "进入练习与错题", route: "student-practice", detail: "查看薄弱点和错题回放" },
      { label: "回到学习页补任务", route: "student-learning", detail: "把薄弱点转成学习任务" }
    ],
    evidence: weaknesses.flatMap((item) => item.evidence).slice(0, 4),
    risks: weaknesses.length ? ["错题未复盘会重复消耗练习时间。"] : [],
    questions: [{ text: "要不要基于薄弱点生成一组练习？" }]
  };
}

function fallbackTaskDraft(context) {
  const goal = (context.goals || [])[0];
  const course = (context.courses || [])[0];
  return {
    summary: "已按当前课程与目标生成一个可确认的任务草稿。",
    draft: {
      title: `${course?.title || "当前课程"}复盘与输出`,
      type: "文档产出",
      estimateMinutes: 45,
      dueDate: goal?.targetDate || "",
      goalId: goal?.id || "",
      courseId: course?.id || "",
      steps: ["回看课堂材料", "整理关键概念", "输出一段自己的说明"],
      doneDefinition: ["形成一份可复用笔记", "能解释给同学听"]
    },
    actions: [{ label: "确认加入任务", route: "student-learning", kind: "draft-apply", detail: "创建真实任务前需确认" }],
    risks: ["草稿不会自动入库，必须确认后才会创建任务。"],
    evidence: goal ? [goal.title] : [],
    questions: [{ text: "需要换成练习巩固或笔记整理类型吗？" }]
  };
}

function fallbackAssignmentGuide(context) {
  const assignment = context.assignmentDetail?.assignment || (context.assignments || [])[0] || null;
  return {
    summary: assignment ? `先读懂 ${assignment.title} 的要求，再组织提交结构。` : "先明确作业要求，再拆成可执行提交步骤。",
    outline: ["确认交付物", "列出核心要点", "补齐例子或图示", "提交前自检"],
    checklist: ["要求已覆盖", "术语使用准确", "结论与证据一致"],
    actions: [
      assignment ? { label: "查看作业详情", route: "student-assignment-detail", detail: assignment.title } : { label: "进入作业页", route: "student-assignments", detail: "查看要求" },
      { label: "去提交页完善草稿", route: "student-submit", detail: "先写正文再自检" }
    ],
    risks: ["如果只写结论不写依据，教师反馈通常会集中在论证不足。"],
    evidence: [assignment?.description || "暂无详细说明"].filter(Boolean),
    questions: [{ text: "需要我按提交结构帮你列提纲吗？" }]
  };
}

function fallbackSubmissionCheck(context) {
  const content = String(context.submitDraft?.content || "");
  const lengthScore = Math.min(100, Math.round(content.trim().length / 4));
  const issues = [];
  if (content.trim().length < 80) {
    issues.push("正文偏短，建议补充任务过程、判断依据和结论。");
  }
  if (!String(context.submitDraft?.attachmentsText || "").trim()) {
    issues.push("如果有图示或文档，请在附件说明里写清名称和链接。");
  }
  return {
    summary: issues.length ? "提交草稿还可以更完整，建议先修再提交。" : "草稿结构已经可提交，建议再做一次快速复查。",
    completionEstimate: lengthScore,
    issues,
    strengths: content.trim() ? ["已具备可提交正文。"] : [],
    actions: [
      { label: "继续修改正文", route: "student-submit", detail: "保留当前草稿" },
      { label: "打开预览页", route: "student-submit-preview", detail: "确认最终展示内容" }
    ],
    risks: issues.length ? ["现在提交可能导致教师反馈集中在内容完整性。"] : [],
    evidence: [content.slice(0, 120)].filter(Boolean),
    questions: [{ text: "要不要我把缺失项整理成提交前 checklist？" }]
  };
}

function fallbackNoteOrganize(context) {
  const content = String(context.noteDraft?.content || "");
  const title = String(context.noteDraft?.title || "课程笔记");
  return {
    summary: `${title} 已整理成可复习摘要和可复用段落。`,
    cards: [
      { front: "这份笔记最重要的概念是什么？", back: content.slice(0, 72) || "先补充关键概念。" },
      { front: "我应该用什么例子解释它？", back: "补一个课堂例子或作业场景。" }
    ],
    assignmentParagraphs: [
      content ? `我对本次内容的理解是：${content.slice(0, 120)}` : "先补充课堂笔记，再生成作业段落。"
    ],
    actions: [
      { label: "保存为新笔记", route: "student-note-ai-result", detail: "整理结果可另存一份" },
      { label: "返回继续编辑", route: "student-note-editor", detail: "修改原始笔记内容" }
    ],
    risks: ["AI 整理结果是结构化 fallback，提交前仍需人工确认术语与事实。"],
    evidence: [content.slice(0, 120)].filter(Boolean),
    questions: [{ text: "需要我把它再压缩成复习卡片吗？" }]
  };
}

export class StudentAiAdapter {
  constructor({ api }) {
    this.api = api;
  }

  async buildDailyPlan(context) {
    return this.callOfficialThenFallback({
      official: () => this.api?.studentAiDailyPlan?.(context),
      fallback: () => this.askStructured({
        prompt: dailyPlanPrompt(context),
        normalize: normalizeDailyPlan,
        fallback: fallbackDailyPlan(context)
      }),
      normalize: normalizeDailyPlan
    });
  }

  async buildWeaknessInsight(context) {
    return this.callOfficialThenFallback({
      official: () => this.api?.studentAiWeaknessInsight?.(context),
      fallback: () => this.askStructured({
        prompt: weaknessInsightPrompt(context),
        normalize: normalizeWeaknessInsight,
        fallback: fallbackWeaknessInsight(context)
      }),
      normalize: normalizeWeaknessInsight
    });
  }

  async draftLearningTask(context) {
    return this.callOfficialThenFallback({
      official: () => this.api?.studentAiTaskDraft?.(context),
      fallback: () => this.askStructured({
        prompt: taskDraftPrompt(context),
        normalize: normalizeTaskDraft,
        fallback: fallbackTaskDraft(context)
      }),
      normalize: normalizeTaskDraft
    });
  }

  async guideAssignment(context) {
    return this.callOfficialThenFallback({
      official: () => this.api?.studentAiAssignmentGuide?.(context),
      fallback: () => this.askStructured({
        prompt: assignmentGuidePrompt(context),
        normalize: normalizeAssignmentGuide,
        fallback: fallbackAssignmentGuide(context)
      }),
      normalize: normalizeAssignmentGuide
    });
  }

  async checkSubmissionDraft(context) {
    return this.callOfficialThenFallback({
      official: () => this.api?.studentAiSubmissionCheck?.(context),
      fallback: () => this.askStructured({
        prompt: submissionCheckPrompt(context),
        normalize: normalizeSubmissionCheck,
        fallback: fallbackSubmissionCheck(context)
      }),
      normalize: normalizeSubmissionCheck
    });
  }

  async organizeNote(context) {
    return this.callOfficialThenFallback({
      official: () => this.api?.studentAiNoteOrganize?.(context),
      fallback: () => this.askStructured({
        prompt: noteOrganizePrompt(context),
        normalize: normalizeNoteOrganize,
        fallback: fallbackNoteOrganize(context),
        summarizeNoteId: context.noteId || ""
      }),
      normalize: normalizeNoteOrganize
    });
  }

  async callOfficialThenFallback({ official, fallback, normalize }) {
    try {
      if (typeof official !== "function") {
        throw new Error("official api unavailable");
      }
      const payload = await official();
      if (!payload?.data) {
        throw new Error("official api returned empty payload");
      }
      const data = payload.data?.result ? {
        ...payload.data.result,
        id: payload.data.id,
        actions: payload.data.actions || payload.data.result.actions || [],
        provider: payload.data.provider || payload.data.result.provider,
        generatedAt: payload.data.generatedAt || payload.data.result.generatedAt
      } : payload.data;
      return normalize(data, data || {});
    } catch {
      return fallback();
    }
  }

  async askStructured({ prompt, normalize, fallback, summarizeNoteId = "" }) {
    try {
      let payload = null;
      if (summarizeNoteId && this.api?.summarizeNote) {
        payload = await this.api.summarizeNote({ noteId: summarizeNoteId });
      } else {
        payload = await this.api.askAI(prompt);
      }
      const text = String(payload?.data?.answer || payload?.data?.summary || payload?.data?.content || "");
      const parsed = safeJsonObject(text);
      return normalize(
        parsed ? { ...parsed, provider: payload?.data?.provider || "ai-fallback", rawText: text } : null,
        { ...fallback, provider: payload?.data?.provider || "fallback", rawText: text }
      );
    } catch (error) {
      return normalize(null, {
        ...fallback,
        provider: "fallback",
        rawText: error?.message || ""
      });
    }
  }
}
