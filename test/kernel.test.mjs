import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadConfig } from "../server/src/config.js";
import { AppKernel } from "../server/src/application/kernel.js";
import { OpenAICompatibleProvider } from "../server/src/domain/ai.js";

async function withKernel(fn) {
  const dir = await mkdtemp(join(tmpdir(), "edumind-test-"));
  const config = {
    dataFile: join(dir, "data.json"),
    tokenSecret: "test-secret",
    llm: { provider: "mock", apiKey: "", model: "mock", endpoint: "", timeoutMs: 5000, maxTokens: 1024 }
  };
  try {
    const kernel = await AppKernel.boot(config);
    await fn(kernel);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("login issues a token and resolves the current user", async () => {
  await withKernel(async (kernel) => {
    const result = await kernel.auth.login({ email: "case@edumind.local", name: "Case", role: "student" });
    assert.equal(result.user.email, "case@edumind.local");
    const verified = kernel.auth.verifyToken(result.token);
    assert.equal(verified.id, result.user.id);
  });
});

test("learning workflow creates goal, task and recalculates progress", async () => {
  await withKernel(async (kernel) => {
    const { user } = await kernel.auth.login({ email: "student@edumind.local", name: "林知夏", role: "student" });
    const goal = await kernel.learning.createGoal(user, {
      courseId: "course_ood",
      title: "完成领域类图",
      targetDate: "2026-06-12",
      priority: "high"
    });
    const task = await kernel.learning.createTask(user, {
      goalId: goal.id,
      title: "梳理实体和值对象",
      estimateMinutes: 80
    });
    await kernel.learning.completeTask(user, task.id);
    const updatedGoal = kernel.repositories.goals.findById(goal.id);
    assert.equal(updatedGoal.progress, 100);
  });
});

test("mock AI tutor returns a provider-tagged answer", async () => {
  await withKernel(async (kernel) => {
    const { user } = await kernel.auth.login({ email: "student@edumind.local", name: "林知夏", role: "student" });
    const response = await kernel.ai.ask(user, { question: "如何解释顺序图的对象协作？" });
    assert.match(response.answer, /学习目标|建议/);
    assert.equal(response.provider, "mock-local-llm");
  });
});

test("LM Studio provider can be selected without calling the local model", async () => {
  await withKernel(async (kernel) => {
    const provider = kernel.ai.createProvider({
      provider: "lmstudio",
      endpoint: "http://172.25.160.1:1234",
      model: "qwen3.5-9b-glm5.1-distill-v1",
      apiKey: "",
      timeoutMs: 1000,
      maxTokens: 1024
    });
    assert.equal(provider.name, "lmstudio:qwen3.5-9b-glm5.1-distill-v1");
    assert.equal(provider.config.endpoint, "http://172.25.160.1:1234/v1/chat/completions");
  });
});

test("default config points to the team LM Studio model", () => {
  const config = loadConfig({});
  assert.equal(config.llm.provider, "lmstudio");
  assert.equal(config.llm.model, "qwen3.5-9b-glm5.1-distill-v1");
  assert.equal(config.llm.endpoint, "http://172.25.160.1:1234/v1/chat/completions");
  assert.equal(config.llm.maxTokens, 1024);
});

test("OpenAI-compatible provider accepts LM Studio reasoning_content fallback", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        choices: [
          {
            message: {
              content: "",
              reasoning_content: "EduMind Agent 已成功接入本地大模型。"
            }
          }
        ]
      };
    }
  });
  try {
    const provider = new OpenAICompatibleProvider({
      endpoint: "http://example.local/v1/chat/completions",
      model: "test-model",
      apiKey: "",
      timeoutMs: 1000,
      maxTokens: 1024
    });
    const result = await provider.complete([{ role: "user", content: "test" }]);
    assert.equal(result.text, "EduMind Agent 已成功接入本地大模型。");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
