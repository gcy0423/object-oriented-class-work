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
  const value = String(endpoint || "http://172.25.160.1:1234").replace(/\/+$/, "");
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
      model: config.model || "qwen3.5-9b-glm5.1-distill-v1"
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
