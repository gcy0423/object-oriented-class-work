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

function normalizeAction(item, index) {
  return {
    id: item?.id || `action_${index + 1}`,
    label: String(item?.label || `Action ${index + 1}`),
    route: String(item?.route || "teacher-home"),
    type: String(item?.type || "generate"),
    kind: String(item?.kind || "navigate"),
    status: String(item?.status || "open"),
    note: String(item?.note || "")
  };
}

function normalize(type, value, fallback) {
  const source = value && typeof value === "object" ? value : {};
  return {
    type,
    summary: String(source.summary || fallback.summary || ""),
    actions: (Array.isArray(source.actions) ? source.actions : fallback.actions || []).map(normalizeAction),
    risks: Array.isArray(source.risks) ? source.risks.map((item) => String(item)) : (fallback.risks || []),
    evidence: Array.isArray(source.evidence) ? source.evidence.map((item) => String(item)) : (fallback.evidence || []),
    draft: source.draft && typeof source.draft === "object" ? { ...fallback.draft, ...source.draft } : (fallback.draft || {}),
    provider: String(source.provider || fallback.provider || "fallback"),
    generatedAt: source.generatedAt || fallback.generatedAt || new Date().toISOString(),
    rawText: String(source.rawText || fallback.rawText || "")
  };
}

function fallbackByType(type, context = {}) {
  const map = {
    teaching_plan: {
      summary: "先处理待批改，再核对风险学生和补练缺口。",
      actions: [{ label: "打开批改页", route: "teacher-review" }, { label: "打开干预队列", route: "teacher-intervention" }],
      risks: ["AI 建议需要结合真实证据判断。"],
      evidence: context.evidence || [],
      draft: { title: "今日教学方案", body: "1. 先批改。\n2. 再看风险学生。\n3. 最后补练。" }
    },
    student_intervention: {
      summary: "请先核对学生画像、提交和 AI 行动后再发送提醒。",
      actions: [{ label: "查看学生画像", route: "teacher-student" }],
      risks: ["提醒必须由教师确认后发送。"],
      evidence: context.evidence || [],
      draft: { title: "学生干预草稿", body: "建议先补齐关键学习行动，并回看最近反馈。", message: "建议先补齐关键学习行动，并回看最近反馈。", studentId: context.studentId || null, courseId: context.courseId || null, channels: ["in_app"] }
    },
    assignment_commentary: {
      summary: "讲评应优先覆盖高频问题和评分差异。",
      actions: [{ label: "回到作业页", route: "teacher-assignment" }],
      risks: ["讲评前请确认未评分提交。"],
      evidence: context.evidence || [],
      draft: { title: "作业讲评草稿", body: "整体完成度较好，但需要继续补强论证依据与概念边界。" }
    },
    feedback_draft: {
      summary: "先核对 AI 初评、自检和教师判断，再形成反馈。",
      actions: [{ label: "继续查看批改洞察", route: "teacher-review" }],
      risks: ["反馈草稿不能替代教师评分。"],
      evidence: context.evidence || [],
      draft: { title: "批改反馈草稿", body: "结构基本完整，建议补充关键判断依据。", submissionId: context.submissionId || null }
    },
    course_practice_plan: {
      summary: "补练先覆盖薄弱知识点，再安排解释型题目。",
      actions: [{ label: "查看课程学情", route: "teacher-course" }],
      risks: ["补练方案需要结合教学进度确认。"],
      evidence: context.evidence || [],
      draft: { title: "课程补练草稿", body: "建议先做一组短练习，再补一题开放题。", courseId: context.courseId || null }
    },
    report_summary: {
      summary: "摘要应突出趋势、风险和下一步动作。",
      actions: [{ label: "回到报告页", route: "teacher-report" }],
      risks: ["导出前请确认名称与范围。"],
      evidence: context.evidence || [],
      draft: { title: "报告摘要草稿", body: "当前课程整体节奏稳定，但仍需关注风险学生与补练跟进。" }
    }
  };
  return map[type] || map.teaching_plan;
}

function promptFor(type, context) {
  return JSON.stringify({ type, context });
}

export class TeacherAiAdapter {
  constructor({ api }) {
    this.api = api;
  }

  buildTeachingPlan(context) {
    return this.callOfficialThenFallback("teaching_plan", context, () => this.api?.teacherAiTeachingPlan?.(context));
  }

  buildStudentIntervention(context) {
    return this.callOfficialThenFallback("student_intervention", context, () => this.api?.teacherAiStudentIntervention?.(context));
  }

  buildAssignmentCommentary(context) {
    return this.callOfficialThenFallback("assignment_commentary", context, () => this.api?.teacherAiAssignmentCommentary?.(context));
  }

  buildFeedbackDraft(context) {
    return this.callOfficialThenFallback("feedback_draft", context, () => this.api?.teacherAiFeedbackDraft?.(context));
  }

  buildCoursePracticePlan(context) {
    return this.callOfficialThenFallback("course_practice_plan", context, () => this.api?.teacherAiCoursePracticePlan?.(context));
  }

  buildReportSummary(context) {
    return this.callOfficialThenFallback("report_summary", context, () => this.api?.teacherAiReportSummary?.(context));
  }

  async callOfficialThenFallback(type, context, official) {
    const fallback = fallbackByType(type, context);
    try {
      if (typeof official !== "function") {
        throw new Error("official api unavailable");
      }
      const payload = await official();
      if (!payload?.data) {
        throw new Error("official api returned empty payload");
      }
      const result = payload.data?.result ? {
        ...payload.data.result,
        id: payload.data.id,
        actions: payload.data.actions || payload.data.result.actions || [],
        provider: payload.data.provider || payload.data.result.provider,
        generatedAt: payload.data.generatedAt || payload.data.result.generatedAt,
        draft: payload.data.draft || payload.data.result.draft
      } : payload.data;
      return normalize(type, result, fallback);
    } catch {
      return this.askStructured(type, context, fallback);
    }
  }

  async askStructured(type, context, fallback) {
    try {
      const payload = await this.api.askAI(promptFor(type, context));
      const text = String(payload?.data?.answer || "");
      const parsed = safeJsonObject(text);
      return normalize(type, parsed ? { ...parsed, provider: payload?.data?.provider || "ai-fallback", rawText: text } : null, {
        ...fallback,
        provider: payload?.data?.provider || "fallback",
        rawText: text
      });
    } catch (error) {
      return normalize(type, null, {
        ...fallback,
        provider: "fallback",
        rawText: error?.message || ""
      });
    }
  }
}
