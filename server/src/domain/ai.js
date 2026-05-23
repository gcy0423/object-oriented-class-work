export class PromptTemplate {
  constructor({ id, title, system, user }) {
    this.id = id;
    this.title = title;
    this.system = system;
    this.user = user;
  }

  render(input) {
    let prompt = this.user;
    for (const [key, value] of Object.entries(input)) {
      prompt = prompt.replaceAll(`{{${key}}}`, String(value));
    }
    return {
      system: this.system,
      user: prompt
    };
  }
}

export class AIResponse {
  constructor({ answer, suggestions = [], provider = "mock", raw = null }) {
    this.answer = answer;
    this.suggestions = suggestions;
    this.provider = provider;
    this.raw = raw;
    this.generatedAt = new Date().toISOString();
  }
}

export class MockLLMProvider {
  constructor() {
    this.name = "mock-local-llm";
  }

  async complete(messages) {
    const userText = messages.findLast((message) => message.role === "user")?.content || "";
    const normalized = userText.replace(/\s+/g, " ").trim();
    const title = normalized.length > 90 ? `${normalized.slice(0, 90)}...` : normalized;
    return {
      provider: this.name,
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
    this.name = `openai-compatible:${config.model}`;
    this.config = config;
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
        text: message.content || message.reasoning_content || "AI 服务未返回内容。",
        raw: json
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeChatCompletionsEndpoint(endpoint) {
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
  }
}
