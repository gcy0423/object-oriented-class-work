import { AuthError } from "../../../../shared/http/errors.js";
import {
  buildAssignmentCommentaryPrompt,
  buildCoursePracticePlanPrompt,
  buildFeedbackDraftPrompt,
  buildReportSummaryPrompt,
  buildStudentInterventionPrompt,
  buildTeachingPlanPrompt
} from "./teacherAiPrompts.js";
import {
  fallbackAssignmentCommentary,
  fallbackCoursePracticePlan,
  fallbackFeedbackDraft,
  fallbackReportSummary,
  fallbackStudentIntervention,
  fallbackTeachingPlan
} from "./teacherAiFallbacks.js";
import {
  normalizeAssignmentCommentary,
  normalizeCoursePracticePlan,
  normalizeFeedbackDraft,
  normalizeReportSummary,
  normalizeStudentIntervention,
  normalizeTeachingPlan
} from "./teacherAiSchemas.js";

function parseJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
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

export class TeacherAiWorkflowService {
  constructor({ provider, logger = console }) {
    this.provider = provider;
    this.logger = logger;
  }

  async buildTeachingPlan(user, input = {}) {
    return this.completeStructured({
      user,
      prompt: buildTeachingPlanPrompt(user, input),
      fallback: fallbackTeachingPlan(user, input),
      normalize: normalizeTeachingPlan
    });
  }

  async buildStudentIntervention(user, input = {}) {
    return this.completeStructured({
      user,
      prompt: buildStudentInterventionPrompt(user, input),
      fallback: fallbackStudentIntervention(user, input),
      normalize: normalizeStudentIntervention
    });
  }

  async buildAssignmentCommentary(user, input = {}) {
    return this.completeStructured({
      user,
      prompt: buildAssignmentCommentaryPrompt(user, input),
      fallback: fallbackAssignmentCommentary(user, input),
      normalize: normalizeAssignmentCommentary
    });
  }

  async buildFeedbackDraft(user, input = {}) {
    return this.completeStructured({
      user,
      prompt: buildFeedbackDraftPrompt(user, input),
      fallback: fallbackFeedbackDraft(user, input),
      normalize: normalizeFeedbackDraft
    });
  }

  async buildCoursePracticePlan(user, input = {}) {
    return this.completeStructured({
      user,
      prompt: buildCoursePracticePlanPrompt(user, input),
      fallback: fallbackCoursePracticePlan(user, input),
      normalize: normalizeCoursePracticePlan
    });
  }

  async buildReportSummary(user, input = {}) {
    return this.completeStructured({
      user,
      prompt: buildReportSummaryPrompt(user, input),
      fallback: fallbackReportSummary(user, input),
      normalize: normalizeReportSummary
    });
  }

  async completeStructured({ user, prompt, fallback, normalize }) {
    if (!user?.id) {
      throw new AuthError("缺少教师 AI workflow 用户上下文。");
    }

    try {
      const response = await this.provider.complete([
        { role: "system", content: "Return one valid JSON object. Do not return markdown or HTML." },
        { role: "user", content: prompt }
      ]);
      const rawText = String(response?.text || response?.content || response?.answer || "");
      const parsed = parseJsonObject(rawText);
      if (!parsed) {
        return normalize(null, {
          ...fallback,
          provider: response?.provider || response?.name || "fallback",
          generatedAt: new Date().toISOString(),
          rawText
        });
      }
      return normalize(parsed, {
        ...fallback,
        provider: response?.provider || response?.name || "fallback",
        generatedAt: new Date().toISOString(),
        rawText
      });
    } catch (error) {
      this.logger.warn?.(`teacher ai workflow fallback: ${error.message}`);
      return normalize(null, {
        ...fallback,
        provider: "fallback",
        generatedAt: new Date().toISOString(),
        rawText: error?.message || ""
      });
    }
  }
}
