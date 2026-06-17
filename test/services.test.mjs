import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  encodeUserContextHeader,
  requireInternal,
  readUserContext
} from "../shared/auth/userContext.js";
import { ServiceClient } from "../shared/client/serviceClient.js";
import { normalizeChatCompletionsEndpoint } from "../services/ai-service/src/domain/ai.js";
import { createApp as createAiApp } from "../services/ai-service/src/main.js";
import { createApp as createAnalyticsApp } from "../services/analytics-service/src/main.js";
import { createApp as createAssessmentApp } from "../services/assessment-service/src/main.js";
import { createApp as createCollaborationApp } from "../services/collaboration-service/src/main.js";
import { createApp as createGatewayApp } from "../services/gateway-service/src/main.js";
import { createApp as createIdentityApp } from "../services/identity-service/src/main.js";
import { createApp as createKnowledgeApp } from "../services/knowledge-service/src/main.js";
import { createApp as createLearningApp } from "../services/learning-service/src/main.js";
import { createApp as createNotificationApp } from "../services/notification-service/src/main.js";
import { createApp as createSchedulerApp } from "../services/scheduler-service/src/main.js";

const INTERNAL_KEY = "test-internal-key";

async function startApp(createApp, config) {
  const app = createApp(config);
  app.server.listen(config.port, config.host);
  await once(app.server, "listening");
  const address = app.server.address();
  return {
    ...app,
    url: `http://${config.host}:${address.port}`
  };
}

async function stopServers(servers) {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
}

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), "edumind-services-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function identityConfig(dir, overrides = {}) {
  return {
    serviceName: "identity-service",
    host: "127.0.0.1",
    port: 0,
    internalKey: INTERNAL_KEY,
    dataFile: join(dir, "identity.json"),
    tokenSecret: "test-secret",
    ...overrides
  };
}

function learningConfig(dir, overrides = {}) {
  return {
    serviceName: "learning-service",
    host: "127.0.0.1",
    port: 0,
    internalKey: INTERNAL_KEY,
    dataFile: join(dir, "learning.json"),
    collaborationServiceUrl: overrides.collaborationServiceUrl || "http://127.0.0.1:65532",
    ...overrides
  };
}

function aiConfig(dir, overrides = {}) {
  return {
    serviceName: "ai-service",
    host: "127.0.0.1",
    port: 0,
    internalKey: INTERNAL_KEY,
    dataFile: join(dir, "ai.json"),
    learningServiceUrl: overrides.learningServiceUrl || "http://127.0.0.1:4102",
    llm: {
      provider: "mock",
      endpoint: "http://127.0.0.1:1234",
      model: "mock",
      apiKey: "",
      timeoutMs: 1000,
      maxTokens: 512
    },
    ...overrides
  };
}

function collaborationConfig(dir, overrides = {}) {
  return {
    serviceName: "collaboration-service",
    host: "127.0.0.1",
    port: 0,
    internalKey: INTERNAL_KEY,
    dataFile: join(dir, "collaboration.json"),
    ...overrides
  };
}

function assessmentConfig(dir, overrides = {}) {
  return {
    serviceName: "assessment-service",
    host: "127.0.0.1",
    port: 0,
    internalKey: INTERNAL_KEY,
    dataFile: join(dir, "assessment.json"),
    identityServiceUrl: overrides.identityServiceUrl || "http://127.0.0.1:4101",
    learningServiceUrl: overrides.learningServiceUrl || "http://127.0.0.1:4102",
    aiServiceUrl: overrides.aiServiceUrl || "http://127.0.0.1:4104",
    collaborationServiceUrl: overrides.collaborationServiceUrl || "http://127.0.0.1:4105",
    ...overrides
  };
}

function analyticsConfig(dir, overrides = {}) {
  return {
    serviceName: "analytics-service",
    host: "127.0.0.1",
    port: 0,
    internalKey: INTERNAL_KEY,
    timeoutMs: 1000,
    identityServiceUrl: overrides.identityServiceUrl || "http://127.0.0.1:4101",
    learningServiceUrl: overrides.learningServiceUrl || "http://127.0.0.1:4102",
    assessmentServiceUrl: overrides.assessmentServiceUrl || "http://127.0.0.1:4103",
    aiServiceUrl: overrides.aiServiceUrl || "http://127.0.0.1:4104",
    collaborationServiceUrl: overrides.collaborationServiceUrl || "http://127.0.0.1:4105",
    ...overrides
  };
}

function knowledgeConfig(dir, overrides = {}) {
  return {
    serviceName: "knowledge-service",
    host: "127.0.0.1",
    port: 0,
    internalKey: INTERNAL_KEY,
    dataFile: join(dir, "knowledge.json"),
    defaultCourseId: "course_ood",
    maxSearchLimit: 20,
    graphDepth: 2,
    ...overrides
  };
}

function notificationConfig(dir, overrides = {}) {
  return {
    serviceName: "notification-service",
    host: "127.0.0.1",
    port: 0,
    internalKey: INTERNAL_KEY,
    dataFile: join(dir, "notifications.json"),
    defaultChannel: "in_app",
    maxPageSize: 50,
    ...overrides
  };
}

function schedulerConfig(dir, overrides = {}) {
  return {
    serviceName: "scheduler-service",
    host: "127.0.0.1",
    port: 0,
    internalKey: INTERNAL_KEY,
    dataFile: join(dir, "scheduler.json"),
    notificationServiceUrl: overrides.notificationServiceUrl || "http://127.0.0.1:4108",
    lookAheadHours: 72,
    maxRunBatchSize: 50,
    timeoutMs: 1000,
    ...overrides
  };
}

function gatewayConfig(services, overrides = {}) {
  return {
    serviceName: "gateway-service",
    host: "127.0.0.1",
    port: 0,
    clientRoot: join(process.cwd(), "client"),
    internalKey: INTERNAL_KEY,
    healthTimeoutMs: 1000,
    services,
    ...overrides
  };
}

async function readSseEvent(reader, signalText) {
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      return buffer;
    }
    buffer += Buffer.from(value).toString("utf8");
    if (!signalText || buffer.includes(signalText)) {
      return buffer;
    }
  }
}

async function loginThroughIdentity(baseUrl, payload) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  return {
    status: response.status,
    payload: await response.json()
  };
}

async function loginThroughGateway(baseUrl, payload) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  return {
    status: response.status,
    payload: await response.json()
  };
}

test("each service health endpoint returns ok", async () => {
  await withTempDir(async (dir) => {
      const definitions = [
      { createApp: createIdentityApp, config: identityConfig(dir) },
      { createApp: createLearningApp, config: learningConfig(dir) },
      { createApp: createAssessmentApp, config: assessmentConfig(dir) },
      { createApp: createAiApp, config: aiConfig(dir, { learningServiceUrl: "http://127.0.0.1:65531" }) },
      { createApp: createCollaborationApp, config: collaborationConfig(dir) },
      { createApp: createAnalyticsApp, config: { serviceName: "analytics-service", host: "127.0.0.1", port: 0, internalKey: INTERNAL_KEY } },
      { createApp: createKnowledgeApp, config: knowledgeConfig(dir) },
      { createApp: createNotificationApp, config: notificationConfig(dir) },
      { createApp: createSchedulerApp, config: schedulerConfig(dir) }
    ];

    const apps = [];
    try {
      for (const definition of definitions) {
        apps.push(await startApp(definition.createApp, definition.config));
      }

      for (const app of apps) {
        const response = await fetch(`${app.url}/health`);
        const payload = await response.json();
        assert.equal(response.status, 200);
        assert.equal(payload.ok, true);
        assert.equal(payload.data.service, app.config.serviceName);
        assert.equal(payload.data.status, "up");
      }
    } finally {
      await stopServers(apps.map((app) => app.server));
    }
  });
});

test("gateway health aggregates downstream service states", async () => {
  await withTempDir(async (dir) => {
    const apps = [];
    try {
      const identity = await startApp(createIdentityApp, identityConfig(dir));
      const learning = await startApp(createLearningApp, learningConfig(dir));
      apps.push(identity, learning);

      const gateway = await startApp(createGatewayApp, gatewayConfig([
        { name: "identity-service", url: identity.url },
        { name: "learning-service", url: learning.url }
      ]));
      apps.push(gateway);

      const response = await fetch(`${gateway.url}/api/health`);
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.ok, true);
      assert.equal(payload.data.service, "gateway-service");
      assert.equal(payload.data.status, "up");
      assert.deepEqual(payload.data.services.map((service) => service.name), [
        "identity-service",
        "learning-service"
      ]);
      assert.deepEqual(payload.data.services.map((service) => service.status), ["up", "up"]);
    } finally {
      await stopServers(apps.map((app) => app.server));
    }
  });
});

test("gateway health still returns json when a downstream service is unavailable", async () => {
  const gateway = await startApp(createGatewayApp, gatewayConfig([
    { name: "identity-service", url: "http://127.0.0.1:65530" }
  ], { healthTimeoutMs: 200 }));

  try {
    const response = await fetch(`${gateway.url}/api/health`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.data.status, "degraded");
    assert.equal(payload.data.services[0].status, "down");
    assert.equal(typeof payload.data.services[0].error.message, "string");
  } finally {
    await stopServers([gateway.server]);
  }
});

test("service client handles success, patch, and failure responses", async () => {
  const server = createServer((req, res) => {
    if (req.url === "/ok") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: { value: 42 } }));
      return;
    }

    if (req.url === "/patch" && req.method === "PATCH") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: { method: "PATCH" } }));
      return;
    }

    if (req.url === "/delete" && req.method === "DELETE") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: { method: "DELETE" } }));
      return;
    }

    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, code: "DOWNSTREAM_BROKEN", message: "broken" }));
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const client = new ServiceClient({
    serviceName: "demo-service",
    baseUrl: `http://127.0.0.1:${address.port}`,
    timeoutMs: 1000
  });

  try {
    const success = await client.get("/ok");
    assert.equal(success.data.value, 42);

    const patched = await client.patch("/patch");
    assert.equal(patched.data.method, "PATCH");

    const deleted = await client.delete("/delete");
    assert.equal(deleted.data.method, "DELETE");

    await assert.rejects(
      () => client.get("/fail"),
      (error) => error.code === "DOWNSTREAM_BROKEN" && error.message === "broken"
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("knowledge-service handles search, graph, AI context, and import validation", async () => {
  await withTempDir(async (dir) => {
    const app = await startApp(createKnowledgeApp, knowledgeConfig(dir));
    try {
      const healthResponse = await fetch(`${app.url}/health`);
      const healthPayload = await healthResponse.json();
      assert.equal(healthResponse.status, 200);
      assert.equal(healthPayload.data.service, "knowledge-service");
      assert.ok(healthPayload.data.summary.concepts >= 10);

      const conceptsResponse = await fetch(`${app.url}/api/knowledge/concepts?courseId=course_ood`);
      const conceptsPayload = await conceptsResponse.json();
      assert.equal(conceptsResponse.status, 200);
      assert.ok(conceptsPayload.data.some((concept) => concept.id === "kc_sequence"));

      const searchResponse = await fetch(`${app.url}/api/knowledge/search?q=${encodeURIComponent("顺序图 对象协作")}&limit=5`);
      const searchPayload = await searchResponse.json();
      assert.equal(searchResponse.status, 200);
      assert.equal(searchPayload.data[0].conceptId, "kc_sequence");
      assert.ok(searchPayload.data[0].matches.length > 0);

      const graphResponse = await fetch(`${app.url}/api/knowledge/graph?conceptId=kc_sequence&depth=1`);
      const graphPayload = await graphResponse.json();
      assert.equal(graphResponse.status, 200);
      assert.ok(graphPayload.data.nodes.some((node) => node.id === "kc_sequence"));
      assert.ok(graphPayload.data.edges.length > 0);

      const contextResponse = await fetch(`${app.url}/internal/knowledge/context`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-edumind-internal-key": INTERNAL_KEY
        },
        body: JSON.stringify({
          question: "知识库增强回答为什么需要来源和召回片段？",
          courseId: "course_ai",
          limit: 4
        })
      });
      const contextPayload = await contextResponse.json();
      assert.equal(contextResponse.status, 200);
      assert.ok(contextPayload.data.concepts.some((concept) => concept.id === "kc_knowledge_retrieval"));
      assert.ok(Array.isArray(contextPayload.data.promptHints));

      const validationResponse = await fetch(`${app.url}/internal/knowledge/validate-import`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-edumind-internal-key": INTERNAL_KEY
        },
        body: JSON.stringify({
          concepts: [{ id: "", courseId: "course_ood", title: "", tags: [] }],
          articles: [],
          relations: []
        })
      });
      const validationPayload = await validationResponse.json();
      assert.equal(validationResponse.status, 200);
      assert.equal(validationPayload.data.valid, false);
      assert.ok(validationPayload.data.errors.length >= 2);

      const pathResponse = await fetch(`${app.url}/api/knowledge/learning-path`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseId: "course_ood",
          goalText: "顺序图 对象协作 服务边界",
          days: 3
        })
      });
      const pathPayload = await pathResponse.json();
      assert.equal(pathResponse.status, 200);
      assert.ok(pathPayload.data.totalConcepts > 0);
      assert.ok(pathPayload.data.schedule.every((day) => day.items.length > 0));

      const practiceResponse = await fetch(`${app.url}/api/knowledge/practice-set`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseId: "course_ood",
          conceptIds: ["kc_sequence", "kc_service_boundary"],
          limit: 2
        })
      });
      const practicePayload = await practiceResponse.json();
      assert.equal(practiceResponse.status, 200);
      assert.equal(practicePayload.data.conceptCount, 2);
      assert.ok(practicePayload.data.questions.some((question) => question.type === "scenario-analysis"));
    } finally {
      await stopServers([app.server]);
    }
  });
});

test("gateway proxies knowledge-service search and AI context APIs", async () => {
  await withTempDir(async (dir) => {
    const apps = [];
    try {
      const identity = await startApp(createIdentityApp, identityConfig(dir));
      const knowledge = await startApp(createKnowledgeApp, knowledgeConfig(dir));
      const gateway = await startApp(createGatewayApp, gatewayConfig([
        { name: "identity-service", url: identity.url },
        { name: "knowledge-service", url: knowledge.url }
      ]));
      apps.push(identity, knowledge, gateway);

      const loginResult = await loginThroughGateway(gateway.url, {
        email: "student@edumind.local",
        name: "林知夏",
        role: "student"
      });
      const token = loginResult.payload.data.token;
      const headers = {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      };

      const searchResponse = await fetch(`${gateway.url}/api/knowledge/search?q=${encodeURIComponent("Rubric 评分")}`, {
        headers
      });
      const searchPayload = await searchResponse.json();
      assert.equal(searchResponse.status, 200);
      assert.ok(searchPayload.data.some((result) => result.conceptId === "kc_rubric"));

      const contextResponse = await fetch(`${gateway.url}/api/knowledge/ai-context`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          question: "知识库增强回答为什么需要来源？",
          courseId: "course_ai",
          limit: 3
        })
      });
      const contextPayload = await contextResponse.json();
      assert.equal(contextResponse.status, 200);
      assert.ok(contextPayload.data.searchResults.length > 0);
      assert.ok(contextPayload.data.concepts.length > 0);

      const pathResponse = await fetch(`${gateway.url}/api/knowledge/learning-path`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          courseId: "course_ood",
          conceptIds: ["kc_use_case", "kc_domain_object", "kc_sequence"],
          days: 2
        })
      });
      const pathPayload = await pathResponse.json();
      assert.equal(pathResponse.status, 200);
      assert.ok(pathPayload.data.totalMinutes > 0);

      const practiceResponse = await fetch(`${gateway.url}/api/knowledge/practice-set`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          courseId: "course_ood",
          conceptIds: ["kc_rubric"],
          limit: 1
        })
      });
      const practicePayload = await practiceResponse.json();
      assert.equal(practiceResponse.status, 200);
      assert.ok(practicePayload.data.questions.length >= 2);
    } finally {
      await stopServers(apps.map((app) => app.server));
    }
  });
});

test("assessment-service and gateway expose v6 assessment CRUD and practice history", async () => {
  await withTempDir(async (dir) => {
    const apps = [];
    try {
      const identity = await startApp(createIdentityApp, identityConfig(dir));
      const collaboration = await startApp(createCollaborationApp, collaborationConfig(dir));
      const learning = await startApp(createLearningApp, learningConfig(dir, {
        collaborationServiceUrl: collaboration.url
      }));
      const ai = await startApp(createAiApp, aiConfig(dir, {
        learningServiceUrl: learning.url
      }));
      const assessment = await startApp(createAssessmentApp, assessmentConfig(dir, {
        identityServiceUrl: identity.url,
        learningServiceUrl: learning.url,
        aiServiceUrl: ai.url,
        collaborationServiceUrl: collaboration.url
      }));
      const gateway = await startApp(createGatewayApp, gatewayConfig([
        { name: "identity-service", url: identity.url },
        { name: "learning-service", url: learning.url },
        { name: "assessment-service", url: assessment.url },
        { name: "ai-service", url: ai.url },
        { name: "collaboration-service", url: collaboration.url }
      ]));
      apps.push(identity, collaboration, learning, ai, assessment, gateway);

      const teacherLogin = await loginThroughGateway(gateway.url, {
        email: "teacher@edumind.local",
        name: "周老师",
        role: "teacher"
      });
      const studentLogin = await loginThroughGateway(gateway.url, {
        email: "student@edumind.local",
        name: "林知夏",
        role: "student"
      });
      const teacherHeaders = {
        authorization: `Bearer ${teacherLogin.payload.data.token}`,
        "content-type": "application/json"
      };
      const studentHeaders = {
        authorization: `Bearer ${studentLogin.payload.data.token}`,
        "content-type": "application/json"
      };

      const rubricResponse = await fetch(`${gateway.url}/api/rubrics`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          title: "v6 Rubric",
          criteria: [{ title: "完整性", maxScore: 100 }]
        })
      });
      const rubricPayload = await rubricResponse.json();
      assert.equal(rubricResponse.status, 200);

      const assignmentResponse = await fetch(`${gateway.url}/api/assignments`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          classroomId: "class_ood_01",
          title: "v6 作业",
          description: "作业说明",
          dueAt: "2026-06-30",
          rubricId: rubricPayload.data.id
        })
      });
      const assignmentPayload = await assignmentResponse.json();
      assert.equal(assignmentResponse.status, 200);

      const updateAssignmentResponse = await fetch(`${gateway.url}/api/assignments/${assignmentPayload.data.id}`, {
        method: "PATCH",
        headers: teacherHeaders,
        body: JSON.stringify({
          title: "v6 作业修订版",
          description: "更新说明",
          courseId: "course_ood",
          dueAt: "2026-07-01",
          status: "published",
          rubricId: rubricPayload.data.id
        })
      });
      const updateAssignmentPayload = await updateAssignmentResponse.json();
      assert.equal(updateAssignmentResponse.status, 200);
      assert.equal(updateAssignmentPayload.data.title, "v6 作业修订版");

      const bankResponse = await fetch(`${gateway.url}/api/question-banks`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          title: "v6 题库",
          description: "题库说明",
          courseId: "course_ood",
          tags: ["v6"]
        })
      });
      const bankPayload = await bankResponse.json();
      assert.equal(bankResponse.status, 200);

      const updateBankResponse = await fetch(`${gateway.url}/api/question-banks/${bankPayload.data.id}`, {
        method: "PATCH",
        headers: teacherHeaders,
        body: JSON.stringify({
          title: "v6 题库修订版",
          description: "更新后的题库说明",
          courseId: "course_ood",
          tags: ["v6", "updated"]
        })
      });
      const updateBankPayload = await updateBankResponse.json();
      assert.equal(updateBankResponse.status, 200);
      assert.equal(updateBankPayload.data.title, "v6 题库修订版");

      const questionResponse = await fetch(`${gateway.url}/api/questions`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          bankId: bankPayload.data.id,
          courseId: "course_ood",
          type: "code_reading",
          stem: "阅读代码并说明职责划分。",
          choices: [],
          answer: "关注类职责与协作边界。",
          analysis: "从对象职责、调用关系和边界拆分回答。",
          difficulty: "medium",
          concept: "职责划分",
          concepts: ["职责划分", "代码阅读"]
        })
      });
      const questionPayload = await questionResponse.json();
      assert.equal(questionResponse.status, 200);
      assert.equal(questionPayload.data.type, "code_reading");

      const updateQuestionResponse = await fetch(`${gateway.url}/api/questions/${questionPayload.data.id}`, {
        method: "PATCH",
        headers: teacherHeaders,
        body: JSON.stringify({
          bankId: bankPayload.data.id,
          courseId: "course_ood",
          type: "short_answer",
          stem: "简述职责划分的判断标准。",
          answer: "围绕内聚与协作边界。",
          analysis: "从稳定性、职责单一性和依赖方向回答。",
          difficulty: "hard",
          concept: "职责划分"
        })
      });
      const updateQuestionPayload = await updateQuestionResponse.json();
      assert.equal(updateQuestionResponse.status, 200);
      assert.equal(updateQuestionPayload.data.type, "short_answer");

      const practiceResponse = await fetch(`${gateway.url}/api/practice-sessions`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          bankId: "qbank_ood",
          questionCount: 2
        })
      });
      const practicePayload = await practiceResponse.json();
      assert.equal(practiceResponse.status, 200);

      const historyResponse = await fetch(`${gateway.url}/api/practice-sessions?courseId=course_ood`, {
        headers: {
          authorization: `Bearer ${studentLogin.payload.data.token}`
        }
      });
      const historyPayload = await historyResponse.json();
      assert.equal(historyResponse.status, 200);
      assert.ok(historyPayload.data.items.some((item) => item.id === practicePayload.data.id));

      const deleteQuestionResponse = await fetch(`${gateway.url}/api/questions/${questionPayload.data.id}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${teacherLogin.payload.data.token}`
        }
      });
      const deleteQuestionPayload = await deleteQuestionResponse.json();
      assert.equal(deleteQuestionResponse.status, 200);
      assert.equal(deleteQuestionPayload.data.deleted, true);

      const deleteBankResponse = await fetch(`${gateway.url}/api/question-banks/${bankPayload.data.id}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${teacherLogin.payload.data.token}`
        }
      });
      const deleteBankPayload = await deleteBankResponse.json();
      assert.equal(deleteBankResponse.status, 200);
      assert.equal(deleteBankPayload.data.deleted, true);

      const deleteAssignmentResponse = await fetch(`${gateway.url}/api/assignments/${assignmentPayload.data.id}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${teacherLogin.payload.data.token}`
        }
      });
      const deleteAssignmentPayload = await deleteAssignmentResponse.json();
      assert.equal(deleteAssignmentResponse.status, 200);
      assert.equal(deleteAssignmentPayload.data.deleted, true);
    } finally {
      await stopServers(apps.map((app) => app.server));
    }
  });
});

test("user context reads forwarded headers", () => {
  const user = readUserContext({
    headers: {
      "x-edumind-user-id": "user_student",
      "x-edumind-user-role": "student",
      "x-edumind-user-name": "林知夏"
    }
  });

  assert.deepEqual(user, {
    id: "user_student",
    role: "student",
    name: "林知夏"
  });
  assert.equal(readUserContext({ headers: {} }), null);
});

test("requireInternal validates x-edumind-internal-key", () => {
  assert.doesNotThrow(() => {
    requireInternal({
      headers: {
        "x-edumind-internal-key": "edumind-local-internal-key"
      }
    }, "edumind-local-internal-key");
  });

  assert.throws(() => {
    requireInternal({
      headers: {
        "x-edumind-internal-key": "wrong-key"
      }
    }, "edumind-local-internal-key");
  });
});

test("identity-service handles login, token verify, and internal user queries", async () => {
  await withTempDir(async (dir) => {
    const identity = await startApp(createIdentityApp, identityConfig(dir));

    try {
      const teacherLogin = await loginThroughIdentity(identity.url, {
        email: "teacher@edumind.local",
        name: "周老师",
        role: "teacher"
      });
      assert.equal(teacherLogin.status, 200);
      assert.equal(teacherLogin.payload.data.user.role, "teacher");

      const createdLogin = await loginThroughIdentity(identity.url, {
        email: "new-user@edumind.local",
        name: "New User",
        role: "guest"
      });
      assert.equal(createdLogin.status, 200);
      assert.equal(createdLogin.payload.data.user.email, "new-user@edumind.local");
      assert.equal(createdLogin.payload.data.user.role, "student");

      const verifyResponse = await fetch(`${identity.url}/internal/auth/verify`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-edumind-internal-key": INTERNAL_KEY
        },
        body: JSON.stringify({ token: createdLogin.payload.data.token })
      });
      const verifyPayload = await verifyResponse.json();
      assert.equal(verifyResponse.status, 200);
      assert.equal(verifyPayload.data.user.email, "new-user@edumind.local");
      assert.equal(verifyPayload.data.claims.role, "student");

      const meResponse = await fetch(`${identity.url}/api/me`, {
        headers: {
          authorization: `Bearer ${createdLogin.payload.data.token}`
        }
      });
      const mePayload = await meResponse.json();
      assert.equal(meResponse.status, 200);
      assert.equal(mePayload.data.user.id, createdLogin.payload.data.user.id);

      const userResponse = await fetch(`${identity.url}/internal/users/user_student`, {
        headers: {
          "x-edumind-internal-key": INTERNAL_KEY
        }
      });
      const userPayload = await userResponse.json();
      assert.equal(userResponse.status, 200);
      assert.equal(userPayload.data.user.email, "student@edumind.local");

      const batchResponse = await fetch(`${identity.url}/internal/users/batch`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-edumind-internal-key": INTERNAL_KEY
        },
        body: JSON.stringify({ ids: ["user_student", "user_teacher", "missing_user"] })
      });
      const batchPayload = await batchResponse.json();
      assert.equal(batchResponse.status, 200);
      assert.deepEqual(batchPayload.data.users.map((user) => user.id), ["user_student", "user_teacher"]);

      const listResponse = await fetch(`${identity.url}/internal/users`, {
        headers: {
          "x-edumind-internal-key": INTERNAL_KEY
        }
      });
      const listPayload = await listResponse.json();
      assert.equal(listResponse.status, 200);
      assert.ok(listPayload.data.users.length >= 2);

      const badVerifyResponse = await fetch(`${identity.url}/internal/auth/verify`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-edumind-internal-key": INTERNAL_KEY
        },
        body: JSON.stringify({ token: "bad.token.value" })
      });
      const badVerifyPayload = await badVerifyResponse.json();
      assert.equal(badVerifyResponse.status, 401);
      assert.equal(badVerifyPayload.code, "AUTH_REQUIRED");
    } finally {
      await stopServers([identity.server]);
    }
  });
});

test("learning-service handles courses, dashboard, goals, tasks, notes, and internal context", async () => {
  await withTempDir(async (dir) => {
    const learning = await startApp(createLearningApp, learningConfig(dir));
    const studentHeaders = {
      "x-edumind-user-id": "user_student",
      "x-edumind-user-role": "student",
      "x-edumind-user-name": encodeUserContextHeader("林知夏")
    };

    try {
      const coursesResponse = await fetch(`${learning.url}/api/courses`, {
        headers: studentHeaders
      });
      const coursesPayload = await coursesResponse.json();
      assert.equal(coursesResponse.status, 200);
      assert.equal(coursesPayload.data[0].id, "course_ood");

      const dashboardResponse = await fetch(`${learning.url}/api/dashboard/learning`, {
        headers: studentHeaders
      });
      const dashboardPayload = await dashboardResponse.json();
      assert.equal(dashboardResponse.status, 200);
      assert.equal(dashboardPayload.data.metrics.activeGoals, 1);
      assert.equal(dashboardPayload.data.metrics.noteCount, 1);

      const goalResponse = await fetch(`${learning.url}/api/goals`, {
        method: "POST",
        headers: {
          ...studentHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          courseId: "course_ood",
          title: "完成 UML 领域模型",
          targetDate: "2026-06-21",
          priority: "high"
        })
      });
      const goalPayload = await goalResponse.json();
      assert.equal(goalResponse.status, 200);
      assert.equal(goalPayload.data.ownerId, "user_student");

      const missingCourseResponse = await fetch(`${learning.url}/api/goals`, {
        method: "POST",
        headers: {
          ...studentHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          courseId: "missing_course",
          title: "Bad goal"
        })
      });
      const missingCoursePayload = await missingCourseResponse.json();
      assert.equal(missingCourseResponse.status, 404);
      assert.equal(missingCoursePayload.code, "NOT_FOUND");

      const taskResponse = await fetch(`${learning.url}/api/tasks`, {
        method: "POST",
        headers: {
          ...studentHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          goalId: goalPayload.data.id,
          title: "补充顺序图",
          estimateMinutes: 60,
          dueDate: "2026-06-21"
        })
      });
      const taskPayload = await taskResponse.json();
      assert.equal(taskResponse.status, 200);
      assert.equal(taskPayload.data.goalId, goalPayload.data.id);

      const refreshedDashboardResponse = await fetch(`${learning.url}/api/dashboard/learning`, {
        headers: studentHeaders
      });
      const refreshedDashboardPayload = await refreshedDashboardResponse.json();
      const createdGoal = refreshedDashboardPayload.data.goals.find((goal) => goal.id === goalPayload.data.id);
      assert.equal(createdGoal.progress, 0);

      const forbiddenTaskResponse = await fetch(`${learning.url}/api/tasks`, {
        method: "POST",
        headers: {
          "x-edumind-user-id": "user_teacher",
          "x-edumind-user-role": "teacher",
          "x-edumind-user-name": encodeUserContextHeader("周老师"),
          "content-type": "application/json"
        },
        body: JSON.stringify({
          goalId: "goal_demo",
          title: "教师不能替学生建任务"
        })
      });
      const forbiddenTaskPayload = await forbiddenTaskResponse.json();
      assert.equal(forbiddenTaskResponse.status, 404);
      assert.equal(forbiddenTaskPayload.code, "NOT_FOUND");

      const completeResponse = await fetch(`${learning.url}/api/tasks/${taskPayload.data.id}/complete`, {
        method: "PATCH",
        headers: studentHeaders
      });
      const completePayload = await completeResponse.json();
      assert.equal(completeResponse.status, 200);
      assert.equal(completePayload.data.status, "done");

      const finalDashboardResponse = await fetch(`${learning.url}/api/dashboard/learning`, {
        headers: studentHeaders
      });
      const finalDashboardPayload = await finalDashboardResponse.json();
      const completedGoal = finalDashboardPayload.data.goals.find((goal) => goal.id === goalPayload.data.id);
      assert.equal(completedGoal.progress, 100);
      assert.equal(completedGoal.status, "completed");

      const noteResponse = await fetch(`${learning.url}/api/notes`, {
        method: "POST",
        headers: {
          ...studentHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          courseId: "course_ood",
          title: "UML 复习摘要",
          content: "用例图强调参与者与系统边界。",
          tags: ["UML", "复习"]
        })
      });
      const notePayload = await noteResponse.json();
      assert.equal(noteResponse.status, 200);
      assert.equal(notePayload.data.ownerId, "user_student");

      const contextResponse = await fetch(`${learning.url}/internal/learning/context/user_student`, {
        headers: {
          "x-edumind-internal-key": INTERNAL_KEY
        }
      });
      const contextPayload = await contextResponse.json();
      assert.equal(contextResponse.status, 200);
      assert.equal(contextPayload.data.userId, "user_student");
      assert.ok(contextPayload.data.notes.length >= 2);
    } finally {
      await stopServers([learning.server]);
    }
  });
});

test("learning-service publishes collaboration events and does not roll back on event failure", async () => {
  await withTempDir(async (dir) => {
    const apps = [];
    const publishedEvents = [];
    const eventServer = createServer(async (req, res) => {
      if (req.url === "/internal/events" && req.method === "POST") {
        let body = "";
        for await (const chunk of req) {
          body += chunk.toString("utf8");
        }
        publishedEvents.push(JSON.parse(body));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, data: { accepted: true } }));
        return;
      }
      res.writeHead(404).end();
    });
    eventServer.listen(0, "127.0.0.1");
    await once(eventServer, "listening");
    const eventAddress = eventServer.address();
    const learning = await startApp(createLearningApp, learningConfig(dir, {
      collaborationServiceUrl: `http://127.0.0.1:${eventAddress.port}`
    }));
    apps.push(learning);

    try {
      const studentHeaders = {
        "x-edumind-user-id": "user_student",
        "x-edumind-user-role": "student",
        "x-edumind-user-name": encodeUserContextHeader("林知夏"),
        "content-type": "application/json"
      };

      const goalResponse = await fetch(`${learning.url}/api/goals`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          title: "测试事件发布"
        })
      });
      const goalPayload = await goalResponse.json();
      assert.equal(goalResponse.status, 200);

      const taskResponse = await fetch(`${learning.url}/api/tasks`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          goalId: goalPayload.data.id,
          title: "测试任务事件"
        })
      });
      const taskPayload = await taskResponse.json();
      assert.equal(taskResponse.status, 200);

      const completeResponse = await fetch(`${learning.url}/api/tasks/${taskPayload.data.id}/complete`, {
        method: "PATCH",
        headers: {
          "x-edumind-user-id": "user_student",
          "x-edumind-user-role": "student",
          "x-edumind-user-name": encodeUserContextHeader("林知夏")
        }
      });
      assert.equal(completeResponse.status, 200);

      const noteResponse = await fetch(`${learning.url}/api/notes`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          title: "事件测试笔记",
          content: "learning-service 应该发布 note.created。"
        })
      });
      assert.equal(noteResponse.status, 200);

      assert.deepEqual(publishedEvents.map((event) => event.type), [
        "goal.created",
        "task.created",
        "task.completed",
        "note.created"
      ]);

      await stopServers([learning.server]);
      apps.length = 0;

      const failingLearning = await startApp(createLearningApp, learningConfig(dir, {
        dataFile: join(dir, "learning-fail.json"),
        collaborationServiceUrl: "http://127.0.0.1:65530"
      }));
      apps.push(failingLearning);
      const fallbackResponse = await fetch(`${failingLearning.url}/api/goals`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          title: "事件失败也要成功"
        })
      });
      const fallbackPayload = await fallbackResponse.json();
      assert.equal(fallbackResponse.status, 200);
      assert.equal(fallbackPayload.data.title, "事件失败也要成功");
    } finally {
      await stopServers(apps.map((app) => app.server));
      await new Promise((resolve) => eventServer.close(resolve));
    }
  });
});

test("ai-service handles ask, plan, summarize, records responses, and exposes provider health", async () => {
  await withTempDir(async (dir) => {
    const apps = [];
    try {
      const learning = await startApp(createLearningApp, learningConfig(dir));
      apps.push(learning);
      const ai = await startApp(createAiApp, aiConfig(dir, {
        learningServiceUrl: learning.url
      }));
      apps.push(ai);

      const studentHeaders = {
        "x-edumind-user-id": "user_student",
        "x-edumind-user-role": "student",
        "x-edumind-user-name": encodeUserContextHeader("林知夏"),
        "content-type": "application/json"
      };

      const askResponse = await fetch(`${ai.url}/api/ai/ask`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({ question: "如何解释顺序图的对象协作？" })
      });
      const askPayload = await askResponse.json();
      assert.equal(askResponse.status, 200);
      assert.equal(askPayload.data.provider, "mock-local-llm");
      assert.match(askPayload.data.answer, /学习目标|任务拆成/);

      const planResponse = await fetch(`${ai.url}/api/ai/plan`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({ goalId: "goal_demo" })
      });
      const planPayload = await planResponse.json();
      assert.equal(planResponse.status, 200);
      assert.equal(planPayload.data.provider, "mock-local-llm");

      const summarizeResponse = await fetch(`${ai.url}/api/ai/summarize`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({ noteId: "note_uml" })
      });
      const summarizePayload = await summarizeResponse.json();
      assert.equal(summarizeResponse.status, 200);
      assert.equal(summarizePayload.data.provider, "mock-local-llm");

      const providerResponse = await fetch(`${ai.url}/internal/ai/provider-health`, {
        headers: {
          "x-edumind-internal-key": INTERNAL_KEY
        }
      });
      const providerPayload = await providerResponse.json();
      assert.equal(providerResponse.status, 200);
      assert.equal(providerPayload.data.provider, "mock-local-llm");
      assert.equal(providerPayload.data.status, "up");

      assert.equal(ai.services.repositories.requests.all().length, 3);
      assert.equal(ai.services.repositories.responses.all().length, 3);
      assert.equal(ai.services.repositories.providerHealth.latest().provider, "mock-local-llm");
    } finally {
      await stopServers(apps.map((app) => app.server));
    }
  });
});

test("ai-service supports internal submission review with mock provider", async () => {
  await withTempDir(async (dir) => {
    const ai = await startApp(createAiApp, aiConfig(dir, {
      learningServiceUrl: "http://127.0.0.1:65531"
    }));

    try {
      const response = await fetch(`${ai.url}/internal/ai/review-submission`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-edumind-internal-key": INTERNAL_KEY
        },
        body: JSON.stringify({
          submission: {
            id: "submission_demo",
            content: "我补充了用例图、类图，以及职责划分说明。"
          },
          assignment: {
            id: "assignment_demo",
            title: "领域模型设计作业"
          },
          rubric: {
            id: "rubric_demo",
            criteria: [
              { id: "criterion_1", title: "模型完整性", maxScore: 40 },
              { id: "criterion_2", title: "职责划分", maxScore: 30 }
            ]
          },
          student: {
            id: "user_student",
            name: "林知夏"
          }
        })
      });
      const payload = await response.json();
      assert.equal(response.status, 200);
      assert.equal(payload.data.provider, "mock-local-llm");
      assert.equal(payload.data.criteriaFeedback.length, 2);
      assert.equal(typeof payload.data.suggestedScore, "number");
    } finally {
      await stopServers([ai.server]);
    }
  });
});

test("assessment-service handles assignments, grading, AI review, practice, mistakes, and dashboard", async () => {
  await withTempDir(async (dir) => {
    const apps = [];
    const publishedEvents = [];
    const eventServer = createServer(async (req, res) => {
      if (req.url === "/internal/events" && req.method === "POST") {
        let body = "";
        for await (const chunk of req) {
          body += chunk.toString("utf8");
        }
        publishedEvents.push(JSON.parse(body));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, data: { accepted: true } }));
        return;
      }
      res.writeHead(404).end();
    });
    eventServer.listen(0, "127.0.0.1");
    await once(eventServer, "listening");
    const eventAddress = eventServer.address();

    try {
      const identity = await startApp(createIdentityApp, identityConfig(dir));
      const learning = await startApp(createLearningApp, learningConfig(dir, {
        collaborationServiceUrl: `http://127.0.0.1:${eventAddress.port}`
      }));
      const ai = await startApp(createAiApp, aiConfig(dir, {
        learningServiceUrl: learning.url
      }));
      const assessment = await startApp(createAssessmentApp, assessmentConfig(dir, {
        identityServiceUrl: identity.url,
        learningServiceUrl: learning.url,
        aiServiceUrl: ai.url,
        collaborationServiceUrl: `http://127.0.0.1:${eventAddress.port}`
      }));
      apps.push(identity, learning, ai, assessment);

      const teacherHeaders = {
        "x-edumind-user-id": "user_teacher",
        "x-edumind-user-role": "teacher",
        "x-edumind-user-name": encodeUserContextHeader("周老师"),
        "content-type": "application/json"
      };
      const studentHeaders = {
        "x-edumind-user-id": "user_student",
        "x-edumind-user-role": "student",
        "x-edumind-user-name": encodeUserContextHeader("林知夏"),
        "content-type": "application/json"
      };

      const forbiddenCreateResponse = await fetch(`${assessment.url}/api/assignments`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          classroomId: "class_ood_01",
          title: "学生不能发布",
          rubricId: "rubric_ood_modeling"
        })
      });
      const forbiddenCreatePayload = await forbiddenCreateResponse.json();
      assert.equal(forbiddenCreateResponse.status, 403);
      assert.equal(forbiddenCreatePayload.code, "FORBIDDEN");

      const rubricResponse = await fetch(`${assessment.url}/api/rubrics`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          title: "新增评分规则",
          criteria: [
            { title: "结构完整", maxScore: 50 },
            { title: "表达清晰", maxScore: 50 }
          ]
        })
      });
      const rubricPayload = await rubricResponse.json();
      assert.equal(rubricResponse.status, 200);
      assert.equal(rubricPayload.data.criteria.length, 2);

      const rubricInsightResponse = await fetch(`${assessment.url}/api/rubrics/${rubricPayload.data.id}/insight`, {
        headers: teacherHeaders
      });
      const rubricInsightPayload = await rubricInsightResponse.json();
      assert.equal(rubricInsightResponse.status, 200);
      assert.equal(rubricInsightPayload.data.totalScore, 100);
      assert.ok(Array.isArray(rubricInsightPayload.data.improvementPlan));

      const invalidRubricResponse = await fetch(`${assessment.url}/api/rubrics`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          title: "不应保存的评分规则",
          criteria: [
            { title: "无效维度", maxScore: 0 }
          ]
        })
      });
      const invalidRubricPayload = await invalidRubricResponse.json();
      assert.equal(invalidRubricResponse.status, 400);
      assert.equal(invalidRubricPayload.code, "VALIDATION_ERROR");

      const rubricsAfterInvalidResponse = await fetch(`${assessment.url}/api/rubrics?courseId=course_ood`, {
        headers: teacherHeaders
      });
      const rubricsAfterInvalidPayload = await rubricsAfterInvalidResponse.json();
      assert.equal(rubricsAfterInvalidResponse.status, 200);
      assert.equal(rubricsAfterInvalidPayload.data.some((item) => item.title === "不应保存的评分规则"), false);

      const assignmentResponse = await fetch(`${assessment.url}/api/assignments`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          classroomId: "class_ood_01",
          title: "领域模型二次作业",
          description: "补充聚合与边界对象说明。",
          dueAt: "2026-06-22T23:59:59.000Z",
          rubricId: rubricPayload.data.id
        })
      });
      const assignmentPayload = await assignmentResponse.json();
      assert.equal(assignmentResponse.status, 200);

      const assignmentsGetResponse = await fetch(`${assessment.url}/api/assignments`, {
        headers: studentHeaders
      });
      const assignmentsGetPayload = await assignmentsGetResponse.json();
      assert.equal(assignmentsGetResponse.status, 200);
      assert.ok(assignmentsGetPayload.data.some((item) => item.id === assignmentPayload.data.id));

      const submissionResponse = await fetch(`${assessment.url}/api/assignments/${assignmentPayload.data.id}/submissions`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          content: "我补充了类图、边界对象和聚合关系说明。",
          attachments: [{ name: "class-diagram.png", url: "/uploads/class-diagram.png" }]
        })
      });
      const submissionPayload = await submissionResponse.json();
      assert.equal(submissionResponse.status, 200);
      assert.equal(submissionPayload.data.studentId, "user_student");

      const detailResponse = await fetch(`${assessment.url}/api/assignments/${assignmentPayload.data.id}`, {
        headers: teacherHeaders
      });
      const detailPayload = await detailResponse.json();
      assert.equal(detailResponse.status, 200);
      assert.equal(detailPayload.data.submissions.length, 1);

      const forbiddenGradeResponse = await fetch(`${assessment.url}/api/submissions/${submissionPayload.data.id}/grade`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          score: 90,
          feedback: "学生不能评分。"
        })
      });
      const forbiddenGradePayload = await forbiddenGradeResponse.json();
      assert.equal(forbiddenGradeResponse.status, 403);
      assert.equal(forbiddenGradePayload.code, "FORBIDDEN");

      const gradeResponse = await fetch(`${assessment.url}/api/submissions/${submissionPayload.data.id}/grade`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          score: 92,
          feedback: "结构完整，可以再补充边界说明。",
          criteriaScores: [
            { criterionId: rubricPayload.data.criteria[0].id, score: 46, comment: "完成度较高。" }
          ]
        })
      });
      const gradePayload = await gradeResponse.json();
      assert.equal(gradeResponse.status, 200);
      assert.equal(gradePayload.data.source, "teacher");

      const aiReviewResponse = await fetch(`${assessment.url}/api/submissions/${submissionPayload.data.id}/ai-review`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({})
      });
      const aiReviewPayload = await aiReviewResponse.json();
      assert.equal(aiReviewResponse.status, 200);
      assert.equal(aiReviewPayload.data.provider, "mock-local-llm");

      const gradingOverviewResponse = await fetch(`${assessment.url}/api/assignments/${assignmentPayload.data.id}/grading-overview`, {
        headers: teacherHeaders
      });
      const gradingOverviewPayload = await gradingOverviewResponse.json();
      assert.equal(gradingOverviewResponse.status, 200);
      assert.equal(gradingOverviewPayload.data.submissionCount, 1);
      assert.equal(gradingOverviewPayload.data.consistency.sampleSize, 1);

      const forbiddenOverviewResponse = await fetch(`${assessment.url}/api/assignments/${assignmentPayload.data.id}/grading-overview`, {
        headers: studentHeaders
      });
      const forbiddenOverviewPayload = await forbiddenOverviewResponse.json();
      assert.equal(forbiddenOverviewResponse.status, 403);
      assert.equal(forbiddenOverviewPayload.code, "FORBIDDEN");

      const gradingInsightResponse = await fetch(`${assessment.url}/api/submissions/${submissionPayload.data.id}/grading-insight`, {
        headers: teacherHeaders
      });
      const gradingInsightPayload = await gradingInsightResponse.json();
      assert.equal(gradingInsightResponse.status, 200);
      assert.ok(gradingInsightPayload.data.comparison.some((item) => item.metric === "total-score-gap"));

      const questionBankResponse = await fetch(`${assessment.url}/api/question-banks`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          title: "设计模式题库",
          description: "覆盖工厂、策略和观察者。"
        })
      });
      const questionBankPayload = await questionBankResponse.json();
      assert.equal(questionBankResponse.status, 200);

      const mismatchedQuestionResponse = await fetch(`${assessment.url}/api/questions`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          bankId: questionBankPayload.data.id,
          courseId: "course_ai",
          type: "single_choice",
          stem: "这道题不应写入跨课程题库。",
          choices: [{ id: "A", text: "A" }],
          answer: "A"
        })
      });
      const mismatchedQuestionPayload = await mismatchedQuestionResponse.json();
      assert.equal(mismatchedQuestionResponse.status, 400);
      assert.equal(mismatchedQuestionPayload.code, "VALIDATION_ERROR");

      const questionResponse = await fetch(`${assessment.url}/api/questions`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          bankId: questionBankPayload.data.id,
          courseId: "course_ood",
          type: "single_choice",
          stem: "策略模式最适合解决什么问题？",
          choices: [{ id: "A", text: "算法可替换" }, { id: "B", text: "对象序列化" }],
          answer: "A",
          analysis: "策略模式强调封装可替换算法。",
          concept: "设计模式",
          difficulty: "medium"
        })
      });
      const questionPayload = await questionResponse.json();
      assert.equal(questionResponse.status, 200);
      assert.equal(questionPayload.data.type, "single_choice");

      const listQuestionsResponse = await fetch(`${assessment.url}/api/questions?courseId=course_ood`, {
        headers: studentHeaders
      });
      const listQuestionsPayload = await listQuestionsResponse.json();
      assert.equal(listQuestionsResponse.status, 200);
      assert.equal(listQuestionsPayload.data.some((item) => Object.hasOwn(item, "answer")), false);

      const practiceResponse = await fetch(`${assessment.url}/api/practice-sessions`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          bankId: "qbank_ood",
          questionCount: 3
        })
      });
      const practicePayload = await practiceResponse.json();
      assert.equal(practiceResponse.status, 200);
      assert.equal(practicePayload.data.questions.length, 3);

      const objectiveQuestion = practicePayload.data.questions.find((item) => item.type === "single_choice") || practicePayload.data.questions[0];
      const wrongAnswerResponse = await fetch(`${assessment.url}/api/practice-sessions/${practicePayload.data.id}/answers`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          questionId: objectiveQuestion.id,
          answer: "B"
        })
      });
      const wrongAnswerPayload = await wrongAnswerResponse.json();
      assert.equal(wrongAnswerResponse.status, 200);
      assert.equal(wrongAnswerPayload.data.correct, false);

      const finishResponse = await fetch(`${assessment.url}/api/practice-sessions/${practicePayload.data.id}/finish`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({})
      });
      const finishPayload = await finishResponse.json();
      assert.equal(finishResponse.status, 200);
      assert.equal(typeof finishPayload.data.correctRate, "number");

      const mistakesResponse = await fetch(`${assessment.url}/api/mistakes`, {
        headers: studentHeaders
      });
      const mistakesPayload = await mistakesResponse.json();
      assert.equal(mistakesResponse.status, 200);
      assert.ok(mistakesPayload.data.length >= 1);

      const mistakeAnalysisResponse = await fetch(`${assessment.url}/api/mistake-analysis?courseId=course_ood`, {
        headers: studentHeaders
      });
      const mistakeAnalysisPayload = await mistakeAnalysisResponse.json();
      assert.equal(mistakeAnalysisResponse.status, 200);
      assert.equal(mistakeAnalysisPayload.data.openMistakes >= 1, true);
      assert.ok(Array.isArray(mistakeAnalysisPayload.data.nextReviewQueue));

      const mistakeDetailResponse = await fetch(`${assessment.url}/api/mistakes/${mistakesPayload.data[0].id}/analysis`, {
        headers: studentHeaders
      });
      const mistakeDetailPayload = await mistakeDetailResponse.json();
      assert.equal(mistakeDetailResponse.status, 200);
      assert.equal(mistakeDetailPayload.data.mistake.id, mistakesPayload.data[0].id);

      const sessionReviewResponse = await fetch(`${assessment.url}/api/practice-sessions/${practicePayload.data.id}/review`, {
        headers: studentHeaders
      });
      const sessionReviewPayload = await sessionReviewResponse.json();
      assert.equal(sessionReviewResponse.status, 200);
      assert.equal(sessionReviewPayload.data.incorrectCount >= 1, true);

      const adaptivePlanResponse = await fetch(`${assessment.url}/api/adaptive-practice-plan`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          bankId: "qbank_ood",
          questionCount: 4
        })
      });
      const adaptivePlanPayload = await adaptivePlanResponse.json();
      assert.equal(adaptivePlanResponse.status, 200);
      assert.equal(adaptivePlanPayload.data.questions.length >= 3, true);
      assert.ok(Array.isArray(adaptivePlanPayload.data.weakConcepts));

      const studentPortfolioResponse = await fetch(`${assessment.url}/api/assessment/student-portfolio?courseId=course_ood`, {
        headers: studentHeaders
      });
      const studentPortfolioPayload = await studentPortfolioResponse.json();
      assert.equal(studentPortfolioResponse.status, 200);
      assert.equal(studentPortfolioPayload.data.ownerId, "user_student");
      assert.equal(typeof studentPortfolioPayload.data.risk.score, "number");

      const teacherPortfolioResponse = await fetch(`${assessment.url}/api/assessment/student-portfolio?courseId=course_ood&studentId=user_student`, {
        headers: teacherHeaders
      });
      const teacherPortfolioPayload = await teacherPortfolioResponse.json();
      assert.equal(teacherPortfolioResponse.status, 200);
      assert.equal(teacherPortfolioPayload.data.assignmentProgress.submittedCount >= 1, true);

      const courseReportResponse = await fetch(`${assessment.url}/api/assessment/course-report?courseId=course_ood`, {
        headers: teacherHeaders
      });
      const courseReportPayload = await courseReportResponse.json();
      assert.equal(courseReportResponse.status, 200);
      assert.equal(courseReportPayload.data.assignmentCount >= 1, true);
      assert.ok(Array.isArray(courseReportPayload.data.riskRegister));

      const riskRegisterResponse = await fetch(`${assessment.url}/api/assessment/risk-register?courseId=course_ood`, {
        headers: teacherHeaders
      });
      const riskRegisterPayload = await riskRegisterResponse.json();
      assert.equal(riskRegisterResponse.status, 200);
      assert.ok(riskRegisterPayload.data.items.some((item) => item.studentId === "user_student"));

      const forbiddenCourseReportResponse = await fetch(`${assessment.url}/api/assessment/course-report?courseId=course_ood`, {
        headers: studentHeaders
      });
      const forbiddenCourseReportPayload = await forbiddenCourseReportResponse.json();
      assert.equal(forbiddenCourseReportResponse.status, 403);
      assert.equal(forbiddenCourseReportPayload.code, "FORBIDDEN");

      const reviewMistakeResponse = await fetch(`${assessment.url}/api/mistakes/${mistakesPayload.data[0].id}/review`, {
        method: "PATCH",
        headers: studentHeaders,
        body: JSON.stringify({
          status: "reviewed",
          note: "已复习继承与泛化关系。"
        })
      });
      const reviewMistakePayload = await reviewMistakeResponse.json();
      assert.equal(reviewMistakeResponse.status, 200);
      assert.equal(reviewMistakePayload.data.status, "reviewed");

      const dashboardResponse = await fetch(`${assessment.url}/internal/assessment/dashboard/user_student`, {
        headers: {
          "x-edumind-internal-key": INTERNAL_KEY
        }
      });
      const dashboardPayload = await dashboardResponse.json();
      assert.equal(dashboardResponse.status, 200);
      assert.ok(Array.isArray(dashboardPayload.data.assignments));
      assert.equal(typeof dashboardPayload.data.metrics.assignmentCompletionRate, "number");

      assert.ok(publishedEvents.some((event) => event.type === "assignment.published"));
      assert.ok(publishedEvents.some((event) => event.type === "submission.created"));
      assert.ok(publishedEvents.some((event) => event.type === "submission.graded"));
      assert.ok(publishedEvents.some((event) => event.type === "submission.ai-reviewed"));
      assert.ok(publishedEvents.some((event) => event.type === "practice.completed"));
      assert.ok(publishedEvents.some((event) => event.type === "mistake.created"));
      assert.ok(publishedEvents.some((event) => event.type === "mistake.reviewed"));
      assert.ok(publishedEvents.some((event) => event.type === "mastery.changed"));

      await stopServers(apps.map((app) => app.server));
      apps.length = 0;

      const identity2 = await startApp(createIdentityApp, identityConfig(dir, { dataFile: join(dir, "identity2.json") }));
      const learning2 = await startApp(createLearningApp, learningConfig(dir, {
        dataFile: join(dir, "learning2.json"),
        collaborationServiceUrl: `http://127.0.0.1:${eventAddress.port}`
      }));
      const ai2 = await startApp(createAiApp, aiConfig(dir, {
        dataFile: join(dir, "ai2.json"),
        learningServiceUrl: "http://127.0.0.1:65531"
      }));
      const assessment2 = await startApp(createAssessmentApp, assessmentConfig(dir, {
        dataFile: join(dir, "assessment2.json"),
        identityServiceUrl: identity2.url,
        learningServiceUrl: learning2.url,
        aiServiceUrl: "http://127.0.0.1:65531",
        collaborationServiceUrl: `http://127.0.0.1:${eventAddress.port}`
      }));
      apps.push(identity2, learning2, ai2, assessment2);

      const fallbackSubmissionResponse = await fetch(`${assessment2.url}/api/assignments/assignment_ood_model/submissions`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          content: "AI 初评失败测试提交。"
        })
      });
      const fallbackSubmissionPayload = await fallbackSubmissionResponse.json();
      assert.equal(fallbackSubmissionResponse.status, 200);

      const failingAiReviewResponse = await fetch(`${assessment2.url}/api/submissions/${fallbackSubmissionPayload.data.id}/ai-review`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({})
      });
      const failingAiReviewPayload = await failingAiReviewResponse.json();
      assert.equal(failingAiReviewResponse.status, 503);
      assert.equal(failingAiReviewPayload.code, "DOWNSTREAM_UNAVAILABLE");

      const fallbackDetailResponse = await fetch(`${assessment2.url}/api/assignments/assignment_ood_model`, {
        headers: teacherHeaders
      });
      const fallbackDetailPayload = await fallbackDetailResponse.json();
      assert.equal(fallbackDetailResponse.status, 200);
      assert.equal(fallbackDetailPayload.data.submissions.length, 1);
    } finally {
      await stopServers(apps.map((app) => app.server));
      await new Promise((resolve) => eventServer.close(resolve));
    }
  });
});

test("collaboration-service handles messages, activity, internal events, and SSE", async () => {
  await withTempDir(async (dir) => {
    const collaboration = await startApp(createCollaborationApp, collaborationConfig(dir));
    const studentHeaders = {
      "x-edumind-user-id": "user_student",
      "x-edumind-user-role": "student",
      "x-edumind-user-name": encodeUserContextHeader("林知夏")
    };

    try {
      const messagesResponse = await fetch(`${collaboration.url}/api/collaboration/messages?roomId=room_ood`, {
        headers: studentHeaders
      });
      const messagesPayload = await messagesResponse.json();
      assert.equal(messagesResponse.status, 200);
      assert.equal(messagesPayload.data[0].id, "msg_welcome");

      const sseResponse = await fetch(`${collaboration.url}/api/events`, {
        headers: studentHeaders
      });
      assert.equal(sseResponse.status, 200);
      const sseReader = sseResponse.body.getReader();
      const readyChunk = await readSseEvent(sseReader, "event: ready");
      assert.match(readyChunk, /event: ready/);

      const postMessageResponse = await fetch(`${collaboration.url}/api/collaboration/messages`, {
        method: "POST",
        headers: {
          ...studentHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          roomId: "room_ood",
          content: "我已经完成类图初稿。"
        })
      });
      const postMessagePayload = await postMessageResponse.json();
      assert.equal(postMessageResponse.status, 200);
      assert.equal(postMessagePayload.data.authorId, "user_student");

      const activityResponse = await fetch(`${collaboration.url}/api/activity?limit=10`, {
        headers: studentHeaders
      });
      const activityPayload = await activityResponse.json();
      assert.equal(activityResponse.status, 200);
      assert.equal(activityPayload.data[0].type, "message.created");

      const badInternalResponse = await fetch(`${collaboration.url}/internal/events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-edumind-internal-key": "wrong-key"
        },
        body: JSON.stringify({
          type: "task.completed",
          source: "learning-service",
          actorId: "user_student",
          summary: "完成任务：补充顺序图"
        })
      });
      const badInternalPayload = await badInternalResponse.json();
      assert.equal(badInternalResponse.status, 403);
      assert.equal(badInternalPayload.code, "FORBIDDEN");

      const internalEventResponse = await fetch(`${collaboration.url}/internal/events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-edumind-internal-key": INTERNAL_KEY
        },
        body: JSON.stringify({
          type: "task.completed",
          source: "learning-service",
          actorId: "user_student",
          summary: "完成任务：补充顺序图",
          payload: { taskId: "task_test" }
        })
      });
      const internalEventPayload = await internalEventResponse.json();
      assert.equal(internalEventResponse.status, 200);
      assert.equal(internalEventPayload.data.event.type, "task.completed");

      const businessChunk = await readSseEvent(sseReader, "event: task.completed");
      assert.match(businessChunk, /event: task.completed/);
      await sseReader.cancel();
    } finally {
      await stopServers([collaboration.server]);
    }
  });
});

test("notification-service and scheduler-service handle reminders, delivery, and preferences", async () => {
  await withTempDir(async (dir) => {
    const apps = [];
    try {
      const notification = await startApp(createNotificationApp, notificationConfig(dir));
      const scheduler = await startApp(createSchedulerApp, schedulerConfig(dir, {
        notificationServiceUrl: notification.url
      }));
      apps.push(notification, scheduler);

      const studentHeaders = {
        "x-edumind-user-id": "user_student",
        "x-edumind-user-role": "student",
        "x-edumind-user-name": encodeUserContextHeader("student"),
        "content-type": "application/json"
      };
      const teacherHeaders = {
        "x-edumind-user-id": "user_teacher",
        "x-edumind-user-role": "teacher",
        "x-edumind-user-name": encodeUserContextHeader("teacher"),
        "content-type": "application/json"
      };
      const internalHeaders = {
        "x-edumind-internal-key": INTERNAL_KEY,
        "content-type": "application/json"
      };

      const emitResponse = await fetch(`${notification.url}/internal/notifications/emit`, {
        method: "POST",
        headers: internalHeaders,
        body: JSON.stringify({
          recipientId: "user_student",
          templateCode: "system.notice",
          title: "Manual notice",
          message: "Manual notice body",
          category: "system",
          severity: "info"
        })
      });
      const emitPayload = await emitResponse.json();
      assert.equal(emitResponse.status, 200);
      assert.equal(emitPayload.data.accepted, 1);

      const listResponse = await fetch(`${notification.url}/api/notifications`, {
        headers: studentHeaders
      });
      const listPayload = await listResponse.json();
      assert.equal(listResponse.status, 200);
      assert.equal(listPayload.data.items.length, 1);

      const summaryResponse = await fetch(`${notification.url}/api/notifications/summary`, {
        headers: studentHeaders
      });
      const summaryPayload = await summaryResponse.json();
      assert.equal(summaryResponse.status, 200);
      assert.equal(summaryPayload.data.unread, 1);

      const readResponse = await fetch(`${notification.url}/api/notifications/${listPayload.data.items[0].id}/read`, {
        method: "PATCH",
        headers: studentHeaders,
        body: JSON.stringify({})
      });
      const readPayload = await readResponse.json();
      assert.equal(readResponse.status, 200);
      assert.ok(readPayload.data.readAt);

      const preferenceResponse = await fetch(`${notification.url}/api/notification-preferences`, {
        method: "PATCH",
        headers: studentHeaders,
        body: JSON.stringify({
          channelSettings: { email: true },
          categorySettings: { scheduler: true },
          digestFrequency: "weekly"
        })
      });
      const preferencePayload = await preferenceResponse.json();
      assert.equal(preferenceResponse.status, 200);
      assert.equal(preferencePayload.data.channelSettings.email, true);
      assert.equal(preferencePayload.data.digestFrequency, "weekly");

      const dueAt = new Date(Date.now() - 60_000).toISOString();
      const reminderResponse = await fetch(`${scheduler.url}/api/scheduler/reminders`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          title: "Review scheduler test",
          message: "Run the scheduler notification flow.",
          targetType: "practice",
          targetId: "practice_demo",
          dueAt,
          frequency: "once",
          severity: "warning",
          channels: ["in_app"]
        })
      });
      const reminderPayload = await reminderResponse.json();
      assert.equal(reminderResponse.status, 200);
      assert.equal(reminderPayload.data.ownerId, "user_student");

      const previewResponse = await fetch(`${scheduler.url}/api/scheduler/due-preview`, {
        headers: studentHeaders
      });
      const previewPayload = await previewResponse.json();
      assert.equal(previewResponse.status, 200);
      assert.ok(previewPayload.data.items.some((item) => item.id === reminderPayload.data.id));

      const forbiddenRunResponse = await fetch(`${scheduler.url}/api/scheduler/run-due`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({})
      });
      const forbiddenRunPayload = await forbiddenRunResponse.json();
      assert.equal(forbiddenRunResponse.status, 403);
      assert.equal(forbiddenRunPayload.code, "FORBIDDEN");

      const tickResponse = await fetch(`${scheduler.url}/internal/scheduler/tick`, {
        method: "POST",
        headers: internalHeaders,
        body: JSON.stringify({
          now: new Date().toISOString()
        })
      });
      const tickPayload = await tickResponse.json();
      assert.equal(tickResponse.status, 200);
      assert.equal(tickPayload.data.attempted >= 1, true);
      assert.ok(tickPayload.data.results.some((item) => item.reminderId === reminderPayload.data.id && item.status === "success"));

      const schedulerNotificationsResponse = await fetch(`${notification.url}/api/notifications?category=scheduler`, {
        headers: studentHeaders
      });
      const schedulerNotificationsPayload = await schedulerNotificationsResponse.json();
      assert.equal(schedulerNotificationsResponse.status, 200);
      assert.ok(schedulerNotificationsPayload.data.items.some((item) => item.data.reminderId === reminderPayload.data.id));

      const dashboardResponse = await fetch(`${scheduler.url}/api/scheduler/dashboard`, {
        headers: teacherHeaders
      });
      const dashboardPayload = await dashboardResponse.json();
      assert.equal(dashboardResponse.status, 200);
      assert.equal(dashboardPayload.data.totalReminders >= 1, true);
      assert.equal(typeof dashboardPayload.data.runStatus.success, "number");

      const timelineResponse = await fetch(`${scheduler.url}/api/scheduler/timeline`, {
        headers: studentHeaders
      });
      const timelinePayload = await timelineResponse.json();
      assert.equal(timelineResponse.status, 200);
      assert.ok(timelinePayload.data.items.some((item) => item.reminderId === reminderPayload.data.id));

      const futureReminderResponse = await fetch(`${scheduler.url}/api/scheduler/reminders`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          ownerId: "user_student",
          courseId: "course_ood",
          title: "Teacher assigned review",
          message: "Prepare the class diagram review.",
          targetType: "assignment",
          targetId: "assignment_ood_model",
          dueAt: new Date(Date.now() + 3600_000).toISOString(),
          frequency: "daily"
        })
      });
      const futureReminderPayload = await futureReminderResponse.json();
      assert.equal(futureReminderResponse.status, 200);

      const updateReminderResponse = await fetch(`${scheduler.url}/api/scheduler/reminders/${futureReminderPayload.data.id}`, {
        method: "PATCH",
        headers: teacherHeaders,
        body: JSON.stringify({
          status: "paused",
          metadata: { reason: "test pause" }
        })
      });
      const updateReminderPayload = await updateReminderResponse.json();
      assert.equal(updateReminderResponse.status, 200);
      assert.equal(updateReminderPayload.data.status, "paused");
      assert.equal(updateReminderPayload.data.metadata.reason, "test pause");
    } finally {
      await stopServers(apps.map((app) => app.server));
    }
  });
});

test("gateway proxies notification and scheduler endpoints", async () => {
  await withTempDir(async (dir) => {
    const apps = [];
    try {
      const identity = await startApp(createIdentityApp, identityConfig(dir));
      const notification = await startApp(createNotificationApp, notificationConfig(dir));
      const scheduler = await startApp(createSchedulerApp, schedulerConfig(dir, {
        notificationServiceUrl: notification.url
      }));
      apps.push(identity, notification, scheduler);

      const gateway = await startApp(createGatewayApp, gatewayConfig([
        { name: "identity-service", url: identity.url },
        { name: "notification-service", url: notification.url },
        { name: "scheduler-service", url: scheduler.url }
      ]));
      apps.push(gateway);

      const studentLogin = await loginThroughGateway(gateway.url, {
        email: "student@edumind.local",
        name: "student",
        role: "student"
      });
      const teacherLogin = await loginThroughGateway(gateway.url, {
        email: "teacher@edumind.local",
        name: "teacher",
        role: "teacher"
      });
      const studentToken = studentLogin.payload.data.token;
      const teacherToken = teacherLogin.payload.data.token;
      const studentHeaders = {
        authorization: `Bearer ${studentToken}`,
        "content-type": "application/json"
      };
      const teacherHeaders = {
        authorization: `Bearer ${teacherToken}`,
        "content-type": "application/json"
      };

      const createNotificationResponse = await fetch(`${gateway.url}/api/notifications`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          title: "Gateway notice",
          body: "Created through gateway",
          category: "system",
          severity: "success"
        })
      });
      const createNotificationPayload = await createNotificationResponse.json();
      assert.equal(createNotificationResponse.status, 200);
      assert.equal(createNotificationPayload.data.recipientId, "user_student");

      const notificationSummaryResponse = await fetch(`${gateway.url}/api/notifications/summary`, {
        headers: {
          authorization: `Bearer ${studentToken}`
        }
      });
      const notificationSummaryPayload = await notificationSummaryResponse.json();
      assert.equal(notificationSummaryResponse.status, 200);
      assert.equal(notificationSummaryPayload.data.unread >= 1, true);

      const bulkNotificationResponse = await fetch(`${gateway.url}/api/notifications/bulk`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          recipientIds: ["user_student"],
          title: "Teacher bulk notice",
          body: "Bulk notification through gateway",
          category: "system"
        })
      });
      const bulkNotificationPayload = await bulkNotificationResponse.json();
      assert.equal(bulkNotificationResponse.status, 200);
      assert.equal(bulkNotificationPayload.data.accepted, 1);

      const preferenceResponse = await fetch(`${gateway.url}/api/notification-preferences`, {
        method: "PATCH",
        headers: studentHeaders,
        body: JSON.stringify({
          channelSettings: { email: true }
        })
      });
      const preferencePayload = await preferenceResponse.json();
      assert.equal(preferenceResponse.status, 200);
      assert.equal(preferencePayload.data.channelSettings.email, true);

      const dueAt = new Date(Date.now() - 30_000).toISOString();
      const reminderResponse = await fetch(`${gateway.url}/api/scheduler/reminders`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          title: "Gateway reminder",
          message: "Reminder created through gateway",
          dueAt,
          frequency: "once"
        })
      });
      const reminderPayload = await reminderResponse.json();
      assert.equal(reminderResponse.status, 200);

      const duePreviewResponse = await fetch(`${gateway.url}/api/scheduler/due-preview`, {
        headers: {
          authorization: `Bearer ${studentToken}`
        }
      });
      const duePreviewPayload = await duePreviewResponse.json();
      assert.equal(duePreviewResponse.status, 200);
      assert.ok(duePreviewPayload.data.items.some((item) => item.id === reminderPayload.data.id));

      const runDueResponse = await fetch(`${gateway.url}/api/scheduler/run-due`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          now: new Date().toISOString()
        })
      });
      const runDuePayload = await runDueResponse.json();
      assert.equal(runDueResponse.status, 200);
      assert.ok(runDuePayload.data.results.some((item) => item.reminderId === reminderPayload.data.id));

      const schedulerNotificationResponse = await fetch(`${gateway.url}/api/notifications?category=scheduler`, {
        headers: {
          authorization: `Bearer ${studentToken}`
        }
      });
      const schedulerNotificationPayload = await schedulerNotificationResponse.json();
      assert.equal(schedulerNotificationResponse.status, 200);
      assert.ok(schedulerNotificationPayload.data.items.some((item) => item.data.reminderId === reminderPayload.data.id));

      const schedulerDashboardResponse = await fetch(`${gateway.url}/api/scheduler/dashboard`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const schedulerDashboardPayload = await schedulerDashboardResponse.json();
      assert.equal(schedulerDashboardResponse.status, 200);
      assert.equal(schedulerDashboardPayload.data.totalReminders >= 1, true);
    } finally {
      await stopServers(apps.map((app) => app.server));
    }
  });
});

test("lmstudio endpoint normalization keeps chat completions path stable", () => {
  assert.equal(
    normalizeChatCompletionsEndpoint("http://127.0.0.1:1234"),
    "http://127.0.0.1:1234/v1/chat/completions"
  );
  assert.equal(
    normalizeChatCompletionsEndpoint("http://127.0.0.1:1234/v1"),
    "http://127.0.0.1:1234/v1/chat/completions"
  );
  assert.equal(
    normalizeChatCompletionsEndpoint("http://127.0.0.1:1234/v1/chat/completions"),
    "http://127.0.0.1:1234/v1/chat/completions"
  );
});

test("analytics-service aggregates student, course, and teacher statistics with role checks", async () => {
  await withTempDir(async (dir) => {
    const apps = [];
    try {
      const identity = await startApp(createIdentityApp, identityConfig(dir));
      const collaboration = await startApp(createCollaborationApp, collaborationConfig(dir));
      const learning = await startApp(createLearningApp, learningConfig(dir, {
        collaborationServiceUrl: collaboration.url
      }));
      const ai = await startApp(createAiApp, aiConfig(dir, {
        learningServiceUrl: learning.url
      }));
      const assessment = await startApp(createAssessmentApp, assessmentConfig(dir, {
        identityServiceUrl: identity.url,
        learningServiceUrl: learning.url,
        aiServiceUrl: ai.url,
        collaborationServiceUrl: collaboration.url
      }));
      const analytics = await startApp(createAnalyticsApp, analyticsConfig(dir, {
        identityServiceUrl: identity.url,
        learningServiceUrl: learning.url,
        assessmentServiceUrl: assessment.url,
        aiServiceUrl: ai.url,
        collaborationServiceUrl: collaboration.url
      }));
      apps.push(identity, collaboration, learning, ai, assessment, analytics);

      const studentHeaders = {
        "x-edumind-user-id": "user_student",
        "x-edumind-user-role": "student",
        "x-edumind-user-name": encodeUserContextHeader("林知夏"),
        "content-type": "application/json"
      };
      const teacherHeaders = {
        "x-edumind-user-id": "user_teacher",
        "x-edumind-user-role": "teacher",
        "x-edumind-user-name": encodeUserContextHeader("周老师"),
        "content-type": "application/json"
      };

      const submissionResponse = await fetch(`${assessment.url}/api/assignments/assignment_ood_model/submissions`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          content: "analytics submission"
        })
      });
      assert.equal(submissionResponse.status, 200);
      const submissionPayload = await submissionResponse.json();

      const gradeResponse = await fetch(`${assessment.url}/api/submissions/${submissionPayload.data.id}/grade`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          score: 91,
          feedback: "结构完整。",
          criteriaScores: []
        })
      });
      assert.equal(gradeResponse.status, 200);

      const practiceResponse = await fetch(`${assessment.url}/api/practice-sessions`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          bankId: "qbank_ood",
          questionCount: 2
        })
      });
      assert.equal(practiceResponse.status, 200);
      const practicePayload = await practiceResponse.json();

      const answerResponse = await fetch(`${assessment.url}/api/practice-sessions/${practicePayload.data.id}/answers`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          questionId: practicePayload.data.questions[0].id,
          answer: "B"
        })
      });
      assert.equal(answerResponse.status, 200);

      const finishResponse = await fetch(`${assessment.url}/api/practice-sessions/${practicePayload.data.id}/finish`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({})
      });
      assert.equal(finishResponse.status, 200);

      const messageResponse = await fetch(`${collaboration.url}/api/collaboration/messages`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          roomId: "room_ood",
          content: "analytics hello"
        })
      });
      assert.equal(messageResponse.status, 200);

      const overviewResponse = await fetch(`${analytics.url}/api/analytics/overview`, {
        headers: studentHeaders
      });
      const overviewPayload = await overviewResponse.json();
      assert.equal(overviewResponse.status, 200);
      assert.equal(overviewPayload.data.role, "student");
      assert.equal(overviewPayload.data.assessment.assignmentCount >= 1, true);
      assert.equal(overviewPayload.data.assessment.practiceCount >= 1, true);
      assert.equal(overviewPayload.data.collaboration.messageCount >= 1, true);

      const courseResponse = await fetch(`${analytics.url}/api/analytics/courses/course_ood`, {
        headers: teacherHeaders
      });
      const coursePayload = await courseResponse.json();
      assert.equal(courseResponse.status, 200);
      assert.equal(coursePayload.data.courseId, "course_ood");
      assert.equal(coursePayload.data.assignments.submitted >= 1, true);

      const studentAnalyticsResponse = await fetch(`${analytics.url}/api/analytics/students/user_student`, {
        headers: teacherHeaders
      });
      const studentAnalyticsPayload = await studentAnalyticsResponse.json();
      assert.equal(studentAnalyticsResponse.status, 200);
      assert.equal(studentAnalyticsPayload.data.profile.name, "林知夏");
      assert.equal(Array.isArray(studentAnalyticsPayload.data.recommendations), true);

      const teacherAnalyticsResponse = await fetch(`${analytics.url}/api/analytics/teacher`, {
        headers: teacherHeaders
      });
      const teacherAnalyticsPayload = await teacherAnalyticsResponse.json();
      assert.equal(teacherAnalyticsResponse.status, 200);
      assert.equal(Array.isArray(teacherAnalyticsPayload.data.courses), true);
      assert.equal(Array.isArray(teacherAnalyticsPayload.data.students), true);

      const funnelResponse = await fetch(`${analytics.url}/api/analytics/funnel?courseId=course_ood`, {
        headers: teacherHeaders
      });
      const funnelPayload = await funnelResponse.json();
      assert.equal(funnelResponse.status, 200);
      assert.equal(funnelPayload.data.scope, "teacher");
      assert.ok(funnelPayload.data.stages.some((stage) => stage.key === "practice-started"));

      const studentFunnelResponse = await fetch(`${analytics.url}/api/analytics/funnel?courseId=course_ood`, {
        headers: studentHeaders
      });
      const studentFunnelPayload = await studentFunnelResponse.json();
      assert.equal(studentFunnelResponse.status, 200);
      assert.equal(studentFunnelPayload.data.scope, "student");
      assert.equal(studentFunnelPayload.data.students[0].studentId, "user_student");

      const riskBoardResponse = await fetch(`${analytics.url}/api/analytics/risk-board?courseId=course_ood`, {
        headers: teacherHeaders
      });
      const riskBoardPayload = await riskBoardResponse.json();
      assert.equal(riskBoardResponse.status, 200);
      assert.equal(typeof riskBoardPayload.data.totalStudents, "number");
      assert.ok(Array.isArray(riskBoardPayload.data.recommendedActions));

      const deepReportResponse = await fetch(`${analytics.url}/api/analytics/courses/course_ood/deep-report`, {
        headers: teacherHeaders
      });
      const deepReportPayload = await deepReportResponse.json();
      assert.equal(deepReportResponse.status, 200);
      assert.equal(deepReportPayload.data.courseId, "course_ood");
      assert.equal(deepReportPayload.data.assignments.submitted >= 1, true);

      const progressReportResponse = await fetch(`${analytics.url}/api/analytics/students/user_student/progress-report`, {
        headers: studentHeaders
      });
      const progressReportPayload = await progressReportResponse.json();
      assert.equal(progressReportResponse.status, 200);
      assert.equal(progressReportPayload.data.studentId, "user_student");
      assert.ok(Array.isArray(progressReportPayload.data.nextFocus));

      const engagementResponse = await fetch(`${analytics.url}/api/analytics/engagement?courseId=course_ood`, {
        headers: teacherHeaders
      });
      const engagementPayload = await engagementResponse.json();
      assert.equal(engagementResponse.status, 200);
      assert.equal(typeof engagementPayload.data.activityCount, "number");

      const forbiddenTeacherResponse = await fetch(`${analytics.url}/api/analytics/teacher`, {
        headers: studentHeaders
      });
      const forbiddenTeacherPayload = await forbiddenTeacherResponse.json();
      assert.equal(forbiddenTeacherResponse.status, 403);
      assert.equal(forbiddenTeacherPayload.code, "FORBIDDEN");

      const forbiddenStudentResponse = await fetch(`${analytics.url}/api/analytics/students/user_teacher`, {
        headers: studentHeaders
      });
      const forbiddenStudentPayload = await forbiddenStudentResponse.json();
      assert.equal(forbiddenStudentResponse.status, 403);
      assert.equal(forbiddenStudentPayload.code, "FORBIDDEN");

      const forbiddenRiskResponse = await fetch(`${analytics.url}/api/analytics/risk-board?courseId=course_ood`, {
        headers: studentHeaders
      });
      const forbiddenRiskPayload = await forbiddenRiskResponse.json();
      assert.equal(forbiddenRiskResponse.status, 403);
      assert.equal(forbiddenRiskPayload.code, "FORBIDDEN");
    } finally {
      await stopServers(apps.map((app) => app.server));
    }
  });
});

test("gateway proxies login, AI, collaboration APIs, SSE, and dashboard aggregation", async () => {
  await withTempDir(async (dir) => {
    const apps = [];
    try {
      const identity = await startApp(createIdentityApp, identityConfig(dir));
      const collaboration = await startApp(createCollaborationApp, collaborationConfig(dir));
      const learning = await startApp(createLearningApp, learningConfig(dir, {
        collaborationServiceUrl: collaboration.url
      }));
      const ai = await startApp(createAiApp, aiConfig(dir, {
        learningServiceUrl: learning.url
      }));
      const assessment = await startApp(createAssessmentApp, assessmentConfig(dir, {
        identityServiceUrl: identity.url,
        learningServiceUrl: learning.url,
        aiServiceUrl: ai.url,
        collaborationServiceUrl: collaboration.url
      }));
      apps.push(identity, collaboration, learning, ai, assessment);

      const gateway = await startApp(createGatewayApp, gatewayConfig([
        { name: "identity-service", url: identity.url },
        { name: "learning-service", url: learning.url },
        { name: "assessment-service", url: assessment.url },
        { name: "ai-service", url: ai.url },
        { name: "collaboration-service", url: collaboration.url }
      ]));
      apps.push(gateway);

      const unauthorizedResponse = await fetch(`${gateway.url}/api/courses`);
      const unauthorizedPayload = await unauthorizedResponse.json();
      assert.equal(unauthorizedResponse.status, 401);
      assert.equal(unauthorizedPayload.code, "AUTH_REQUIRED");

      const loginResult = await loginThroughGateway(gateway.url, {
        email: "student@edumind.local",
        name: "林知夏",
        role: "student"
      });
      assert.equal(loginResult.status, 200);
      const token = loginResult.payload.data.token;
      const authHeaders = {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      };

      const meResponse = await fetch(`${gateway.url}/api/me`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const mePayload = await meResponse.json();
      assert.equal(meResponse.status, 200);
      assert.equal(mePayload.data.user.id, "user_student");

      const coursesResponse = await fetch(`${gateway.url}/api/courses`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const coursesPayload = await coursesResponse.json();
      assert.equal(coursesResponse.status, 200);
      assert.equal(coursesPayload.data.length, 2);

      const goalResponse = await fetch(`${gateway.url}/api/goals`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          title: "完成网关代理联调",
          targetDate: "2026-06-21",
          priority: "high"
        })
      });
      const goalPayload = await goalResponse.json();
      assert.equal(goalResponse.status, 200);

      const taskResponse = await fetch(`${gateway.url}/api/tasks`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          goalId: goalPayload.data.id,
          title: "完成任务接口代理",
          estimateMinutes: 45
        })
      });
      const taskPayload = await taskResponse.json();
      assert.equal(taskResponse.status, 200);

      const completeResponse = await fetch(`${gateway.url}/api/tasks/${taskPayload.data.id}/complete`, {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const completePayload = await completeResponse.json();
      assert.equal(completeResponse.status, 200);
      assert.equal(completePayload.data.status, "done");

      const noteResponse = await fetch(`${gateway.url}/api/notes`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          title: "网关代理笔记",
          content: "Gateway 已经接管 learning-service 路由。",
          tags: ["gateway"]
        })
      });
      const notePayload = await noteResponse.json();
      assert.equal(noteResponse.status, 200);
      assert.equal(notePayload.data.title, "网关代理笔记");

      const askResponse = await fetch(`${gateway.url}/api/ai/ask`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          question: "如何说明顺序图中的对象协作？"
        })
      });
      const askPayload = await askResponse.json();
      assert.equal(askResponse.status, 200);
      assert.equal(askPayload.data.provider, "mock-local-llm");

      const planResponse = await fetch(`${gateway.url}/api/ai/plan`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          goalId: goalPayload.data.id
        })
      });
      const planPayload = await planResponse.json();
      assert.equal(planResponse.status, 200);
      assert.equal(planPayload.data.provider, "mock-local-llm");

      const summarizeResponse = await fetch(`${gateway.url}/api/ai/summarize`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          noteId: notePayload.data.id
        })
      });
      const summarizePayload = await summarizeResponse.json();
      assert.equal(summarizeResponse.status, 200);
      assert.equal(summarizePayload.data.provider, "mock-local-llm");

      const collaborationGetResponse = await fetch(`${gateway.url}/api/collaboration/messages?roomId=room_ood`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const collaborationGetPayload = await collaborationGetResponse.json();
      assert.equal(collaborationGetResponse.status, 200);
      assert.equal(collaborationGetPayload.data[0].id, "msg_welcome");

      const sseResponse = await fetch(`${gateway.url}/api/events`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      assert.equal(sseResponse.status, 200);
      const sseReader = sseResponse.body.getReader();
      const readyChunk = await readSseEvent(sseReader, "event: ready");
      assert.match(readyChunk, /event: ready/);

      const collaborationPostResponse = await fetch(`${gateway.url}/api/collaboration/messages`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          roomId: "room_ood",
          content: "Gateway 已接管协作消息。"
        })
      });
      const collaborationPostPayload = await collaborationPostResponse.json();
      assert.equal(collaborationPostResponse.status, 200);
      assert.equal(collaborationPostPayload.data.authorId, "user_student");

      const activityResponse = await fetch(`${gateway.url}/api/activity?limit=20`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const activityPayload = await activityResponse.json();
      assert.equal(activityResponse.status, 200);
      assert.ok(activityPayload.data.some((item) => item.type === "task.completed"));

      const dashboardResponse = await fetch(`${gateway.url}/api/dashboard`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const dashboardPayload = await dashboardResponse.json();
      assert.equal(dashboardResponse.status, 200);
      assert.equal(dashboardPayload.data.users.length >= 2, true);
      assert.equal(dashboardPayload.data.notes.some((note) => note.title === "网关代理笔记"), true);
      assert.ok(Array.isArray(dashboardPayload.data.assignments));
      assert.equal(typeof dashboardPayload.data.practice.activeSessions, "number");
      assert.equal(typeof dashboardPayload.data.metrics.assignmentCompletionRate, "number");
      assert.ok(dashboardPayload.data.activity.length >= 1);
      assert.equal(dashboardPayload.meta.provider, "mock-local-llm");
      assert.equal(dashboardPayload.meta.analyticsStatus, "down");
      assert.equal(dashboardPayload.data.analytics, null);

      const rubricResponse = await fetch(`${gateway.url}/api/rubrics`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          courseId: "course_ood",
          title: "Gateway Rubric",
          criteria: [
            { title: "完整性", maxScore: 60 },
            { title: "表达", maxScore: 40 }
          ]
        })
      });
      const rubricPayload = await rubricResponse.json();
      assert.equal(rubricResponse.status, 403);
      assert.equal(rubricPayload.code, "FORBIDDEN");

      const teacherLogin = await loginThroughGateway(gateway.url, {
        email: "teacher@edumind.local",
        name: "周老师",
        role: "teacher"
      });
      const teacherToken = teacherLogin.payload.data.token;
      const teacherHeaders = {
        authorization: `Bearer ${teacherToken}`,
        "content-type": "application/json"
      };

      const createRubricResponse = await fetch(`${gateway.url}/api/rubrics`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          title: "Gateway Rubric",
          criteria: [
            { title: "完整性", maxScore: 60 },
            { title: "表达", maxScore: 40 }
          ]
        })
      });
      const createRubricPayload = await createRubricResponse.json();
      assert.equal(createRubricResponse.status, 200);

      const gatewayRubricInsightResponse = await fetch(`${gateway.url}/api/rubrics/${createRubricPayload.data.id}/insight`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const gatewayRubricInsightPayload = await gatewayRubricInsightResponse.json();
      assert.equal(gatewayRubricInsightResponse.status, 200);
      assert.equal(gatewayRubricInsightPayload.data.totalScore, 100);

      const createAssignmentResponse = await fetch(`${gateway.url}/api/assignments`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          classroomId: "class_ood_01",
          title: "Gateway Assessment 作业",
          description: "通过网关发布的新作业。",
          dueAt: "2026-06-23T23:59:59.000Z",
          rubricId: createRubricPayload.data.id
        })
      });
      const createAssignmentPayload = await createAssignmentResponse.json();
      assert.equal(createAssignmentResponse.status, 200);

      const gatewayAssignmentsResponse = await fetch(`${gateway.url}/api/assignments`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const gatewayAssignmentsPayload = await gatewayAssignmentsResponse.json();
      assert.equal(gatewayAssignmentsResponse.status, 200);
      assert.ok(gatewayAssignmentsPayload.data.some((item) => item.id === createAssignmentPayload.data.id));

      const gatewaySubmissionResponse = await fetch(`${gateway.url}/api/assignments/${createAssignmentPayload.data.id}/submissions`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          content: "通过网关提交 assessment 作业。"
        })
      });
      const gatewaySubmissionPayload = await gatewaySubmissionResponse.json();
      assert.equal(gatewaySubmissionResponse.status, 200);

      const gatewayAiReviewResponse = await fetch(`${gateway.url}/api/submissions/${gatewaySubmissionPayload.data.id}/ai-review`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({})
      });
      const gatewayAiReviewPayload = await gatewayAiReviewResponse.json();
      assert.equal(gatewayAiReviewResponse.status, 200);
      assert.equal(gatewayAiReviewPayload.data.provider, "mock-local-llm");

      const gatewayGradingOverviewResponse = await fetch(`${gateway.url}/api/assignments/${createAssignmentPayload.data.id}/grading-overview`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const gatewayGradingOverviewPayload = await gatewayGradingOverviewResponse.json();
      assert.equal(gatewayGradingOverviewResponse.status, 200);
      assert.equal(gatewayGradingOverviewPayload.data.submissionCount, 1);

      const gatewayGradingInsightResponse = await fetch(`${gateway.url}/api/submissions/${gatewaySubmissionPayload.data.id}/grading-insight`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const gatewayGradingInsightPayload = await gatewayGradingInsightResponse.json();
      assert.equal(gatewayGradingInsightResponse.status, 200);
      assert.ok(gatewayGradingInsightPayload.data.grades.some((grade) => grade.source === "ai"));

      const gatewayQuestionBanksResponse = await fetch(`${gateway.url}/api/question-banks?courseId=course_ood`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const gatewayQuestionBanksPayload = await gatewayQuestionBanksResponse.json();
      assert.equal(gatewayQuestionBanksResponse.status, 200);
      assert.ok(gatewayQuestionBanksPayload.data.length >= 1);

      const gatewayPracticeResponse = await fetch(`${gateway.url}/api/practice-sessions`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          bankId: "qbank_ood",
          questionCount: 2
        })
      });
      const gatewayPracticePayload = await gatewayPracticeResponse.json();
      assert.equal(gatewayPracticeResponse.status, 200);

      const gatewayAnswerResponse = await fetch(`${gateway.url}/api/practice-sessions/${gatewayPracticePayload.data.id}/answers`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          questionId: gatewayPracticePayload.data.questions[0].id,
          answer: "B"
        })
      });
      const gatewayAnswerPayload = await gatewayAnswerResponse.json();
      assert.equal(gatewayAnswerResponse.status, 200);
      assert.equal(typeof gatewayAnswerPayload.data.correct, "boolean");

      const gatewayMistakesResponse = await fetch(`${gateway.url}/api/mistakes`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const gatewayMistakesPayload = await gatewayMistakesResponse.json();
      assert.equal(gatewayMistakesResponse.status, 200);
      assert.ok(Array.isArray(gatewayMistakesPayload.data));

      const gatewaySessionReviewResponse = await fetch(`${gateway.url}/api/practice-sessions/${gatewayPracticePayload.data.id}/review`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const gatewaySessionReviewPayload = await gatewaySessionReviewResponse.json();
      assert.equal(gatewaySessionReviewResponse.status, 200);
      assert.equal(typeof gatewaySessionReviewPayload.data.answeredCount, "number");

      const gatewayAdaptivePlanResponse = await fetch(`${gateway.url}/api/adaptive-practice-plan`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          bankId: "qbank_ood",
          questionCount: 3
        })
      });
      const gatewayAdaptivePlanPayload = await gatewayAdaptivePlanResponse.json();
      assert.equal(gatewayAdaptivePlanResponse.status, 200);
      assert.equal(gatewayAdaptivePlanPayload.data.questions.length >= 3, true);

      const gatewayMistakeAnalysisResponse = await fetch(`${gateway.url}/api/mistake-analysis?courseId=course_ood`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const gatewayMistakeAnalysisPayload = await gatewayMistakeAnalysisResponse.json();
      assert.equal(gatewayMistakeAnalysisResponse.status, 200);
      assert.equal(typeof gatewayMistakeAnalysisPayload.data.totalMistakes, "number");

      const gatewayPortfolioResponse = await fetch(`${gateway.url}/api/assessment/student-portfolio?courseId=course_ood`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const gatewayPortfolioPayload = await gatewayPortfolioResponse.json();
      assert.equal(gatewayPortfolioResponse.status, 200);
      assert.equal(gatewayPortfolioPayload.data.ownerId, "user_student");

      const gatewayCourseReportResponse = await fetch(`${gateway.url}/api/assessment/course-report?courseId=course_ood`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const gatewayCourseReportPayload = await gatewayCourseReportResponse.json();
      assert.equal(gatewayCourseReportResponse.status, 200);
      assert.equal(gatewayCourseReportPayload.data.assignmentCount >= 1, true);

      const gatewayRiskRegisterResponse = await fetch(`${gateway.url}/api/assessment/risk-register?courseId=course_ood`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const gatewayRiskRegisterPayload = await gatewayRiskRegisterResponse.json();
      assert.equal(gatewayRiskRegisterResponse.status, 200);
      assert.equal(typeof gatewayRiskRegisterPayload.data.totalStudents, "number");

      const businessChunk = await readSseEvent(sseReader, "event: message.created");
      assert.match(businessChunk, /event: message.created/);
      await sseReader.cancel();
    } finally {
      await stopServers(apps.map((app) => app.server));
    }
  });
});

test("gateway proxies analytics endpoints and keeps dashboard analytics up when service is available", async () => {
  await withTempDir(async (dir) => {
    const apps = [];
    try {
      const identity = await startApp(createIdentityApp, identityConfig(dir));
      const collaboration = await startApp(createCollaborationApp, collaborationConfig(dir));
      const learning = await startApp(createLearningApp, learningConfig(dir, {
        collaborationServiceUrl: collaboration.url
      }));
      const ai = await startApp(createAiApp, aiConfig(dir, {
        learningServiceUrl: learning.url
      }));
      const assessment = await startApp(createAssessmentApp, assessmentConfig(dir, {
        identityServiceUrl: identity.url,
        learningServiceUrl: learning.url,
        aiServiceUrl: ai.url,
        collaborationServiceUrl: collaboration.url
      }));
      const analytics = await startApp(createAnalyticsApp, analyticsConfig(dir, {
        identityServiceUrl: identity.url,
        learningServiceUrl: learning.url,
        assessmentServiceUrl: assessment.url,
        aiServiceUrl: ai.url,
        collaborationServiceUrl: collaboration.url
      }));
      apps.push(identity, collaboration, learning, ai, assessment, analytics);

      const gateway = await startApp(createGatewayApp, gatewayConfig([
        { name: "identity-service", url: identity.url },
        { name: "learning-service", url: learning.url },
        { name: "assessment-service", url: assessment.url },
        { name: "ai-service", url: ai.url },
        { name: "collaboration-service", url: collaboration.url },
        { name: "analytics-service", url: analytics.url }
      ]));
      apps.push(gateway);

      const studentLogin = await loginThroughGateway(gateway.url, {
        email: "student@edumind.local",
        name: "林知夏",
        role: "student"
      });
      const teacherLogin = await loginThroughGateway(gateway.url, {
        email: "teacher@edumind.local",
        name: "周老师",
        role: "teacher"
      });
      const studentToken = studentLogin.payload.data.token;
      const teacherToken = teacherLogin.payload.data.token;

      const overviewResponse = await fetch(`${gateway.url}/api/analytics/overview`, {
        headers: {
          authorization: `Bearer ${studentToken}`
        }
      });
      const overviewPayload = await overviewResponse.json();
      assert.equal(overviewResponse.status, 200);
      assert.equal(overviewPayload.data.role, "student");

      const courseResponse = await fetch(`${gateway.url}/api/analytics/courses/course_ood`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const coursePayload = await courseResponse.json();
      assert.equal(courseResponse.status, 200);
      assert.equal(coursePayload.data.courseTitle, "面向对象技术与方法");

      const studentResponse = await fetch(`${gateway.url}/api/analytics/students/user_student`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const studentPayload = await studentResponse.json();
      assert.equal(studentResponse.status, 200);
      assert.equal(studentPayload.data.studentId, "user_student");

      const teacherResponse = await fetch(`${gateway.url}/api/analytics/teacher`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const teacherPayload = await teacherResponse.json();
      assert.equal(teacherResponse.status, 200);
      assert.equal(Array.isArray(teacherPayload.data.recentActivity), true);

      const funnelResponse = await fetch(`${gateway.url}/api/analytics/funnel?courseId=course_ood`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const funnelPayload = await funnelResponse.json();
      assert.equal(funnelResponse.status, 200);
      assert.ok(Array.isArray(funnelPayload.data.stages));

      const riskBoardResponse = await fetch(`${gateway.url}/api/analytics/risk-board?courseId=course_ood`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const riskBoardPayload = await riskBoardResponse.json();
      assert.equal(riskBoardResponse.status, 200);
      assert.equal(typeof riskBoardPayload.data.totalStudents, "number");

      const deepReportResponse = await fetch(`${gateway.url}/api/analytics/courses/course_ood/deep-report`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const deepReportPayload = await deepReportResponse.json();
      assert.equal(deepReportResponse.status, 200);
      assert.equal(deepReportPayload.data.courseId, "course_ood");

      const progressReportResponse = await fetch(`${gateway.url}/api/analytics/students/user_student/progress-report`, {
        headers: {
          authorization: `Bearer ${studentToken}`
        }
      });
      const progressReportPayload = await progressReportResponse.json();
      assert.equal(progressReportResponse.status, 200);
      assert.equal(progressReportPayload.data.studentId, "user_student");

      const engagementResponse = await fetch(`${gateway.url}/api/analytics/engagement?courseId=course_ood`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const engagementPayload = await engagementResponse.json();
      assert.equal(engagementResponse.status, 200);
      assert.ok(Array.isArray(engagementPayload.data.channelMix));

      const dashboardResponse = await fetch(`${gateway.url}/api/dashboard`, {
        headers: {
          authorization: `Bearer ${teacherToken}`
        }
      });
      const dashboardPayload = await dashboardResponse.json();
      assert.equal(dashboardResponse.status, 200);
      assert.equal(dashboardPayload.meta.analyticsStatus, "up");
      assert.equal(dashboardPayload.data.analytics.ai.provider, "mock-local-llm");
    } finally {
      await stopServers(apps.map((app) => app.server));
    }
  });
});
