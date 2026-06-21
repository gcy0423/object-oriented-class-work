import { Repository } from "../../../../shared/data/repository.js";
import { Entity } from "../../../../shared/domain/entity.js";

export class PromptTemplate extends Entity {
  constructor(record) {
    super(record);
    this.title = record.title;
    this.system = record.system || "";
    this.user = record.user || "";
  }

  render(input) {
    let prompt = this.user;
    for (const [key, value] of Object.entries(input || {})) {
      prompt = prompt.replaceAll(`{{${key}}}`, String(value ?? ""));
    }
    return {
      system: this.system,
      user: prompt
    };
  }
}

export class AIRequestRecord extends Entity {
  constructor(record) {
    super(record);
    this.actorId = record.actorId;
    this.type = record.type;
    this.input = record.input || {};
    this.provider = record.provider || "mock-local-llm";
  }
}

export class AIResponseRecord extends Entity {
  constructor(record) {
    super(record);
    this.requestId = record.requestId;
    this.answer = record.answer || "";
    this.suggestions = Array.isArray(record.suggestions) ? record.suggestions : [];
    this.provider = record.provider || "mock-local-llm";
    this.raw = record.raw ?? null;
    this.generatedAt = record.generatedAt || this.createdAt;
  }
}

export class ProviderHealthRecord extends Entity {
  constructor(record) {
    super(record);
    this.provider = record.provider || "mock-local-llm";
    this.model = record.model || "mock";
    this.status = record.status || "up";
    this.endpoint = record.endpoint || null;
    this.checkedAt = record.checkedAt || this.createdAt;
  }
}

export class StudentAiResultRecord extends Entity {
  constructor(record) {
    super(record);
    this.ownerId = record.ownerId;
    this.type = record.type || "daily_plan";
    this.courseId = record.courseId || null;
    this.assignmentId = record.assignmentId || null;
    this.noteId = record.noteId || null;
    this.relatedSubmissionId = record.relatedSubmissionId || null;
    this.provider = record.provider || "fallback";
    this.result = record.result && typeof record.result === "object" ? record.result : {};
    this.actions = Array.isArray(record.actions) ? record.actions : [];
    this.meta = record.meta && typeof record.meta === "object" ? record.meta : {};
    this.generatedAt = record.generatedAt || this.createdAt;
  }
}

export class StudentTaskDraftRecord extends Entity {
  constructor(record) {
    super(record);
    this.ownerId = record.ownerId;
    this.courseId = record.courseId || null;
    this.goalId = record.goalId || null;
    this.title = record.title || "";
    this.type = record.type || "";
    this.estimateMinutes = Number(record.estimateMinutes || 45);
    this.dueDate = record.dueDate || "";
    this.steps = Array.isArray(record.steps) ? record.steps : [];
    this.doneDefinition = Array.isArray(record.doneDefinition) ? record.doneDefinition : [];
    this.summary = record.summary || "";
    this.status = record.status || "draft";
    this.sourceResultId = record.sourceResultId || null;
    this.confirmedTaskId = record.confirmedTaskId || null;
  }
}

export class TeacherAiResultRecord extends Entity {
  constructor(record) {
    super(record);
    this.ownerId = record.ownerId;
    this.type = record.type || "teaching_plan";
    this.route = record.route || "teacher-home";
    this.courseId = record.courseId || null;
    this.studentId = record.studentId || null;
    this.assignmentId = record.assignmentId || null;
    this.submissionId = record.submissionId || null;
    this.provider = record.provider || "fallback";
    this.result = record.result && typeof record.result === "object" ? record.result : {};
    this.actions = Array.isArray(record.actions) ? record.actions : [];
    this.sourceEvidenceIds = Array.isArray(record.sourceEvidenceIds) ? record.sourceEvidenceIds : [];
    this.generatedAt = record.generatedAt || this.createdAt;
  }
}

export class TeacherAiDraftRecord extends Entity {
  constructor(record) {
    super(record);
    this.ownerId = record.ownerId;
    this.type = record.type || "student_intervention";
    this.status = record.status || "draft";
    this.title = record.title || "";
    this.summary = record.summary || "";
    this.body = record.body || "";
    this.structuredPayload = record.structuredPayload && typeof record.structuredPayload === "object" ? record.structuredPayload : {};
    this.courseId = record.courseId || null;
    this.studentId = record.studentId || null;
    this.assignmentId = record.assignmentId || null;
    this.submissionId = record.submissionId || null;
    this.resultId = record.resultId || null;
    this.sourceEvidenceIds = Array.isArray(record.sourceEvidenceIds) ? record.sourceEvidenceIds : [];
  }
}

export class AIResponse {
  constructor({ answer, suggestions = [], provider = "mock-local-llm", raw = null, generatedAt = undefined }) {
    this.answer = answer;
    this.suggestions = suggestions;
    this.provider = provider;
    this.raw = raw;
    this.generatedAt = generatedAt || new Date().toISOString();
  }
}

export class MockLLMProvider {
  constructor() {
    this.name = "mock-local-llm";
    this.model = "mock";
  }

  async complete(messages) {
    const userText = messages.findLast((message) => message.role === "user")?.content || "";
    const normalized = userText.replace(/\s+/g, " ").trim();
    const title = normalized.length > 90 ? `${normalized.slice(0, 90)}...` : normalized;
    return {
      provider: this.name,
      model: this.model,
      text: [
        `我已根据当前学习目标生成建议：${title}`,
        "1. 先把任务拆成 30-60 分钟可以完成的小块。",
        "2. 每个学习块结束后记录一个关键结论和一个疑问。",
        "3. 如果涉及项目开发，优先完成可运行闭环，再补充边界场景和文档证据。"
      ].join("\n")
    };
  }
}

export class OpenAICompatibleProvider {
  constructor(config) {
    this.config = config;
    this.model = config.model;
    this.name = `openai-compatible:${config.model}`;
  }

  async complete(messages) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const headers = {
        "content-type": "application/json"
      };
      if (this.config.apiKey) {
        headers.authorization = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: 0.4,
          max_tokens: this.config.maxTokens || 1024
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`LLM request failed with ${response.status}`);
      }

      const json = await response.json();
      const message = json.choices?.[0]?.message || {};
      return {
        provider: this.name,
        model: this.model,
        text: message.content || message.reasoning_content || "AI 服务未返回内容。",
        raw: json
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function normalizeChatCompletionsEndpoint(endpoint) {
  const value = String(endpoint || "http://10.108.10.110:1234").replace(/\/+$/, "");
  if (value.endsWith("/v1/chat/completions")) {
    return value;
  }
  if (value.endsWith("/v1")) {
    return `${value}/chat/completions`;
  }
  return `${value}/v1/chat/completions`;
}

export class LMStudioProvider extends OpenAICompatibleProvider {
  constructor(config) {
    super({
      ...config,
      endpoint: normalizeChatCompletionsEndpoint(config.endpoint),
      model: config.model || "qwopus3.6-27b-v2-mtp@iq4_xs"
    });
    this.name = `lmstudio:${this.config.model}`;
    this.model = this.config.model;
  }
}

export class PromptTemplateRepository extends Repository {
  constructor(database) {
    super(database, "promptTemplates", (record) => new PromptTemplate(record));
  }
}

export class AIRequestRepository extends Repository {
  constructor(database) {
    super(database, "aiRequests", (record) => new AIRequestRecord(record));
  }
}

export class AIResponseRepository extends Repository {
  constructor(database) {
    super(database, "aiResponses", (record) => new AIResponseRecord(record));
  }
}

export class ProviderHealthRepository extends Repository {
  constructor(database) {
    super(database, "providerHealth", (record) => new ProviderHealthRecord(record));
  }

  latest() {
    return this.all()
      .sort((a, b) => String(b.checkedAt || b.updatedAt).localeCompare(String(a.checkedAt || a.updatedAt)))[0] || null;
  }
}

export class StudentAiResultRepository extends Repository {
  constructor(database) {
    super(database, "studentAiResults", (record) => new StudentAiResultRecord(record));
  }

  findByOwner(ownerId, filters = {}) {
    const limit = Math.max(1, Math.min(50, Number(filters.limit || 20)));
    return this.where((item) => {
      if (item.ownerId !== ownerId) {
        return false;
      }
      if (filters.type && item.type !== filters.type) {
        return false;
      }
      if (filters.courseId && item.courseId !== filters.courseId) {
        return false;
      }
      if (filters.assignmentId && item.assignmentId !== filters.assignmentId) {
        return false;
      }
      return true;
    })
      .sort((a, b) => String(b.generatedAt || b.createdAt).localeCompare(String(a.generatedAt || a.createdAt)))
      .slice(0, limit);
  }
}

export class StudentTaskDraftRepository extends Repository {
  constructor(database) {
    super(database, "studentTaskDrafts", (record) => new StudentTaskDraftRecord(record));
  }

  findByOwner(ownerId) {
    return this.where((item) => item.ownerId === ownerId)
      .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  }
}

export class TeacherAiResultRepository extends Repository {
  constructor(database) {
    super(database, "teacherAiResults", (record) => new TeacherAiResultRecord(record));
  }

  findByOwner(ownerId, filters = {}) {
    const limit = Math.max(1, Math.min(50, Number(filters.limit || 20)));
    return this.where((item) => {
      if (item.ownerId !== ownerId) {
        return false;
      }
      if (filters.type && item.type !== filters.type) {
        return false;
      }
      if (filters.route && item.route !== filters.route) {
        return false;
      }
      if (filters.courseId && item.courseId !== filters.courseId) {
        return false;
      }
      if (filters.studentId && item.studentId !== filters.studentId) {
        return false;
      }
      if (filters.assignmentId && item.assignmentId !== filters.assignmentId) {
        return false;
      }
      return true;
    })
      .sort((a, b) => String(b.generatedAt || b.createdAt).localeCompare(String(a.generatedAt || a.createdAt)))
      .slice(0, limit);
  }
}

export class TeacherAiDraftRepository extends Repository {
  constructor(database) {
    super(database, "teacherAiDrafts", (record) => new TeacherAiDraftRecord(record));
  }

  findByOwner(ownerId, filters = {}) {
    const limit = Math.max(1, Math.min(50, Number(filters.limit || 20)));
    return this.where((item) => {
      if (item.ownerId !== ownerId) {
        return false;
      }
      if (filters.type && item.type !== filters.type) {
        return false;
      }
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      return true;
    })
      .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
      .slice(0, limit);
  }
}
