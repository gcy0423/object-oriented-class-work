import { AuthError } from "../../../../shared/http/errors.js";
import {
  buildAssignmentGuidePrompt,
  buildDailyPlanPrompt,
  buildNoteOrganizePrompt,
  buildSubmissionCheckPrompt,
  buildTaskDraftPrompt,
  buildWeaknessInsightPrompt
} from "./studentAiPrompts.js";
import {
  fallbackAssignmentGuide,
  fallbackDailyPlan,
  fallbackNoteOrganize,
  fallbackSubmissionCheck,
  fallbackTaskDraft,
  fallbackWeaknessInsight
} from "./studentAiFallbacks.js";
import {
  normalizeAssignmentGuide,
  normalizeDailyPlan,
  normalizeNoteOrganize,
  normalizeSubmissionCheck,
  normalizeTaskDraft,
  normalizeWeaknessInsight
} from "./studentAiSchemas.js";

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

export class StudentAiWorkflowService {
  constructor({ provider, logger = console }) {
    this.provider = provider;
    this.logger = logger;
  }

  async buildDailyPlan(user, input = {}) {
    return this.completeStructured({
      user,
      input,
      prompt: buildDailyPlanPrompt(user, input),
      fallback: fallbackDailyPlan(user, input),
      normalize: normalizeDailyPlan
    });
  }

  async buildWeaknessInsight(user, input = {}) {
    return this.completeStructured({
      user,
      input,
      prompt: buildWeaknessInsightPrompt(user, input),
      fallback: fallbackWeaknessInsight(user, input),
      normalize: normalizeWeaknessInsight
    });
  }

  async draftTask(user, input = {}) {
    return this.completeStructured({
      user,
      input,
      prompt: buildTaskDraftPrompt(user, input),
      fallback: fallbackTaskDraft(user, input),
      normalize: normalizeTaskDraft
    });
  }

  async guideAssignment(user, input = {}) {
    return this.completeStructured({
      user,
      input,
      prompt: buildAssignmentGuidePrompt(user, input),
      fallback: fallbackAssignmentGuide(user, input),
      normalize: normalizeAssignmentGuide
    });
  }

  async checkSubmission(user, input = {}) {
    return this.completeStructured({
      user,
      input,
      prompt: buildSubmissionCheckPrompt(user, input),
      fallback: fallbackSubmissionCheck(user, input),
      normalize: normalizeSubmissionCheck
    });
  }

  async organizeNote(user, input = {}) {
    return this.completeStructured({
      user,
      input,
      prompt: buildNoteOrganizePrompt(user, input),
      fallback: fallbackNoteOrganize(user, input),
      normalize: normalizeNoteOrganize
    });
  }

  async completeStructured({ user, prompt, fallback, normalize }) {
    if (!user?.id) {
      throw new AuthError("缺少学生 AI workflow 用户上下文。");
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
      this.logger.warn?.(`student ai workflow fallback: ${error.message}`);
      return normalize(null, {
        ...fallback,
        provider: "fallback",
        generatedAt: new Date().toISOString(),
        rawText: error?.message || ""
      });
    }
  }
}
