import { AppError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { AIRequestRecord, AIResponse, AIResponseRecord, LMStudioProvider, MockLLMProvider, OpenAICompatibleProvider, ProviderHealthRecord } from "../domain/ai.js";
import { searchLearningResources } from "../infrastructure/knowledge/resourceSearch.js";

function requireText(value, label) {
  if (!String(value || "").trim()) {
    throw new ValidationError(`${label}不能为空。`);
  }
  return String(value).trim();
}

export class AITutorService {
  constructor({ config, database, templates, requests, responses, providerHealth, learningClient, knowledgeClient = null }) {
    this.config = config;
    this.database = database;
    this.templates = templates;
    this.requests = requests;
    this.responses = responses;
    this.providerHealth = providerHealth;
    this.learningClient = learningClient;
    this.knowledgeClient = knowledgeClient;
    this.provider = this.createProvider(config.llm);
  }

  createProvider(llmConfig) {
    if (llmConfig.provider === "lmstudio") {
      return new LMStudioProvider(llmConfig);
    }
    if (llmConfig.provider === "openai" || (llmConfig.apiKey && llmConfig.provider !== "mock")) {
      return new OpenAICompatibleProvider(llmConfig);
    }
    return new MockLLMProvider();
  }

  async getProviderHealth() {
    const record = new ProviderHealthRecord({
      id: `provider_${this.provider.name.replace(/[^a-z0-9_-]/gi, "_")}`,
      provider: this.provider.name,
      model: this.provider.model || this.config.llm.model || "mock",
      status: "up",
      endpoint: this.config.llm.endpoint || null,
      checkedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await this.providerHealth.save(record);
    return {
      provider: record.provider,
      model: record.model,
      status: record.status
    };
  }

  async ask(user, input) {
    const question = requireText(input.question, "问题");
    const context = await this.learningClient.getLearningContext(user.id);
    const promptTemplate = this.templates.findById("ask");
    const prompt = promptTemplate.render({
      question,
      courses: context.courses.map((course) => course.title).join("、"),
      goals: context.goals.map((goal) => goal.title).join("；")
    });
    const resourceHints = await this.buildKnowledgeHints({
      question,
      courseId: context.goals[0]?.courseId || context.courses[0]?.id
    });

    return this.completeAndRecord({
      user,
      type: "ask",
      input: { question },
      messages: [
        { role: "system", content: prompt.system },
        {
          role: "user",
          content: `${prompt.user}\n可参考的本地课程知识库：\n${resourceHints || "未命中具体资源，请按通用学习策略回答。"}`
        }
      ],
      suggestions: ["加入今日任务", "生成复习卡片", "保存到笔记"]
    });
  }

  async buildKnowledgeHints({ question, courseId }) {
    if (this.knowledgeClient) {
      try {
        const context = await this.knowledgeClient.buildContext({ question, courseId, limit: 5 });
        const conceptHints = (context.concepts || [])
          .map((concept) => [
            `知识点：${concept.title}`,
            `摘要：${concept.summary}`,
            ...(concept.objectives || []).slice(0, 2).map((objective) => `目标：${objective}`),
            ...(concept.misconceptions || []).slice(0, 1).map((mistake) => `常见误区：${mistake}`)
          ].join("\n"));
        const promptHints = (context.promptHints || []).map((hint) => `提示：${hint}`);
        const combined = [...conceptHints, ...promptHints].filter(Boolean).join("\n");
        if (combined) {
          return combined;
        }
      } catch {
        // knowledge-service 是增强能力，失败时回退到本地轻量知识库。
      }
    }
    return searchLearningResources(question, 3)
      .map((item) => `${item.concept}：${item.promptHint}`)
      .join("\n");
  }

  async generatePlan(user, input) {
    const goalId = requireText(input.goalId, "学习目标");
    const context = await this.learningClient.getLearningContext(user.id);
    const goal = context.goals.find((item) => item.id === goalId);
    if (!goal) {
      throw new NotFoundError("学习目标不存在。");
    }
    const promptTemplate = this.templates.findById("plan");
    const prompt = promptTemplate.render({
      goal: goal.title,
      targetDate: goal.targetDate
    });

    return this.completeAndRecord({
      user,
      type: "plan",
      input: { goalId },
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user }
      ],
      suggestions: ["拆成任务", "同步到协作区", "导出计划"]
    });
  }

  async summarizeNote(user, input) {
    const noteId = requireText(input.noteId, "笔记");
    const context = await this.learningClient.getLearningContext(user.id);
    const note = context.notes.find((item) => item.id === noteId);
    if (!note) {
      throw new NotFoundError("笔记不存在。");
    }
    const promptTemplate = this.templates.findById("summarize");
    const prompt = promptTemplate.render({
      title: note.title,
      content: note.content
    });

    return this.completeAndRecord({
      user,
      type: "summarize",
      input: { noteId },
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user }
      ],
      suggestions: ["提取待办", "生成测验", "标记重点"]
    });
  }

  async reviewSubmission(input) {
    const submission = input?.submission || {};
    const assignment = input?.assignment || {};
    const rubric = input?.rubric || {};
    const student = input?.student || {};
    const criteria = Array.isArray(rubric.criteria) ? rubric.criteria : [];
    const content = String(submission.content || "").trim();
    if (!content) {
      throw new ValidationError("提交内容不能为空。");
    }

    const criterionScore = criteria.length
      ? criteria.map((criterion) => ({
        criterionId: criterion.id,
        score: Math.max(1, Math.round(Number(criterion.maxScore || 0) * 0.8)),
        comment: `${criterion.title}表现稳定，建议继续补充与“${assignment.title || "当前作业"}”更贴合的说明。`
      }))
      : [];
    const suggestedScore = criterionScore.length
      ? criterionScore.reduce((sum, item) => sum + item.score, 0)
      : Math.max(60, Math.min(95, 70 + Math.min(20, Math.round(content.length / 20))));

    return {
      summary: `${student.name || "该同学"}的提交整体结构较完整，重点内容已覆盖，建议补充更具体的建模依据和关键设计取舍。`,
      suggestedScore,
      criteriaFeedback: criterionScore,
      provider: this.provider.name
    };
  }

  async completeAndRecord({ user, type, input, messages, suggestions }) {
    const request = new AIRequestRecord({
      id: this.database.nextId("aireq"),
      actorId: user.id,
      type,
      input,
      provider: this.provider.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await this.requests.save(request);

    let result;
    try {
      result = await this.provider.complete(messages);
    } catch (error) {
      throw new AppError(`AI 服务调用失败。${error.message ? ` ${error.message}` : ""}`.trim(), 502, "DOWNSTREAM_ERROR");
    }

    const response = new AIResponse({
      answer: result.text,
      suggestions,
      provider: result.provider,
      raw: result.raw || null
    });

    await this.responses.save(new AIResponseRecord({
      id: this.database.nextId("aires"),
      requestId: request.id,
      answer: response.answer,
      suggestions: response.suggestions,
      provider: response.provider,
      raw: response.raw,
      generatedAt: response.generatedAt,
      createdAt: response.generatedAt,
      updatedAt: response.generatedAt
    }));

    await this.getProviderHealth();
    return response;
  }
}
