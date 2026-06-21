import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { encodeUserContextHeader, INTERNAL_KEY_HEADER, USER_CONTEXT_HEADERS } from "../shared/auth/userContext.js";
import { createApp as createAiApp } from "../services/ai-service/src/main.js";

const INTERNAL_KEY = "test-internal-key";

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), "edumind-ai-routes-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function startApp(createApp, config) {
  const app = createApp(config);
  app.server.listen(config.port, config.host);
  await once(app.server, "listening");
  return {
    ...app,
    url: `http://${config.host}:${app.server.address().port}`
  };
}

async function stopServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

function aiConfig(dir, learningUrl) {
  return {
    serviceName: "ai-service",
    host: "127.0.0.1",
    port: 0,
    internalKey: INTERNAL_KEY,
    dataFile: join(dir, "ai-routes.json"),
    learningServiceUrl: learningUrl,
    knowledgeServiceUrl: "http://127.0.0.1:65533",
    llm: {
      provider: "mock",
      endpoint: "http://127.0.0.1:1234",
      model: "mock",
      apiKey: "",
      timeoutMs: 1000,
      maxTokens: 512
    }
  };
}

function userHeaders(id, role, name) {
  return {
    [USER_CONTEXT_HEADERS.id]: id,
    [USER_CONTEXT_HEADERS.role]: role,
    [USER_CONTEXT_HEADERS.name]: encodeUserContextHeader(name),
    "content-type": "application/json"
  };
}

function createLearningServer() {
  const createdTasks = [];
  const createdNotes = [];
  const server = createServer(async (req, res) => {
    if (req.headers[INTERNAL_KEY_HEADER] !== INTERNAL_KEY) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: "bad internal key" }));
      return;
    }

    if (req.method === "GET" && req.url.startsWith("/internal/learning/context/")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        data: {
          courses: [{ id: "course_ood", title: "面向对象技术与方法" }],
          goals: [{ id: "goal_1", courseId: "course_ood", title: "掌握顺序图", targetDate: "2026-06-30" }],
          tasks: [{ id: "task_1", goalId: "goal_1", title: "复盘课堂示例", status: "todo" }],
          notes: [{ id: "note_1", courseId: "course_ood", title: "课堂笔记", content: "对象协作。" }]
        }
      }));
      return;
    }

    if (req.method === "POST" && /\/internal\/learning\/users\/.+\/tasks$/.test(req.url)) {
      const body = await readJson(req);
      createdTasks.push(body);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: { id: `task_${createdTasks.length}`, ...body } }));
      return;
    }

    if (req.method === "POST" && /\/internal\/learning\/users\/.+\/notes$/.test(req.url)) {
      const body = await readJson(req);
      createdNotes.push(body);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: { id: `note_${createdNotes.length}`, ...body } }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, message: "not found" }));
  });

  return { server, createdTasks, createdNotes };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

test("ai-service student-ai routes support result lifecycle and task draft confirm", async () => {
  await withTempDir(async (dir) => {
    const learning = createLearningServer();
    learning.server.listen(0, "127.0.0.1");
    await once(learning.server, "listening");
    const learningUrl = `http://127.0.0.1:${learning.server.address().port}`;
    const app = await startApp(createAiApp, aiConfig(dir, learningUrl));

    try {
      const headers = userHeaders("user_student", "student", "林知夏");

      const dailyResponse = await fetch(`${app.url}/api/student-ai/daily-plan`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          route: "student-ai",
          tasks: [{ id: "task_1", title: "复盘课堂示例", status: "todo" }],
          assignments: [{ id: "assignment_1", title: "领域模型作业", dueAt: "2026-06-22T00:00:00.000Z" }]
        })
      });
      const dailyPayload = await dailyResponse.json();
      assert.equal(dailyResponse.status, 200);
      assert.equal(dailyPayload.data.type, "daily_plan");

      const weaknessResponse = await fetch(`${app.url}/api/student-ai/weakness-insight`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          mistakes: [{ id: "mistake_1", question: { concept: "顺序图", stem: "解释 lifeline" } }]
        })
      });
      const weaknessPayload = await weaknessResponse.json();
      assert.equal(weaknessResponse.status, 200);
      assert.equal(weaknessPayload.data.type, "weakness_insight");

      const taskResultResponse = await fetch(`${app.url}/api/student-ai/task-drafts`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          goals: [{ id: "goal_1", targetDate: "2026-06-30" }],
          courses: [{ id: "course_ood", title: "面向对象技术与方法" }]
        })
      });
      const taskResultPayload = await taskResultResponse.json();
      assert.equal(taskResultResponse.status, 200);
      assert.equal(taskResultPayload.data.type, "task_draft");

      const createDraftResponse = await fetch(`${app.url}/api/student-ai/task-drafts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ resultId: taskResultPayload.data.id })
      });
      const createDraftPayload = await createDraftResponse.json();
      assert.equal(createDraftResponse.status, 200);
      assert.equal(createDraftPayload.data.title.length > 0, true);

      const updateDraftResponse = await fetch(`${app.url}/api/student-ai/task-drafts/${createDraftPayload.data.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ title: "复盘顺序图 v2", summary: "updated", steps: ["read", "draw", "write"] })
      });
      const updateDraftPayload = await updateDraftResponse.json();
      assert.equal(updateDraftResponse.status, 200);
      assert.equal(updateDraftPayload.data.title, "复盘顺序图 v2");

      const confirmDraftResponse = await fetch(`${app.url}/api/student-ai/task-drafts/${createDraftPayload.data.id}/confirm`, {
        method: "POST",
        headers,
        body: JSON.stringify({})
      });
      const confirmDraftPayload = await confirmDraftResponse.json();
      assert.equal(confirmDraftResponse.status, 200);
      assert.equal(confirmDraftPayload.data.draft.status, "confirmed");
      assert.equal(learning.createdTasks.length, 1);

      const resultsResponse = await fetch(`${app.url}/api/student-ai/results`, { headers });
      const resultsPayload = await resultsResponse.json();
      assert.equal(resultsResponse.status, 200);
      assert.ok(resultsPayload.data.items.length >= 3);

      const detailResponse = await fetch(`${app.url}/api/student-ai/results/${dailyPayload.data.id}`, { headers });
      const detailPayload = await detailResponse.json();
      assert.equal(detailResponse.status, 200);

      const actionId = detailPayload.data.actions[0].id;
      const actionPatchResponse = await fetch(`${app.url}/api/student-ai/results/${dailyPayload.data.id}/actions/${actionId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "completed", note: "done" })
      });
      const actionPatchPayload = await actionPatchResponse.json();
      assert.equal(actionPatchResponse.status, 200);
      assert.equal(actionPatchPayload.data.actions[0].status, "completed");

      const timelineResponse = await fetch(`${app.url}/api/student-ai/timeline?limit=10`, { headers });
      const timelinePayload = await timelineResponse.json();
      assert.equal(timelineResponse.status, 200);
      assert.ok(timelinePayload.data.items.length >= 3);

      const deleteDraftResponse = await fetch(`${app.url}/api/student-ai/task-drafts/${createDraftPayload.data.id}`, {
        method: "DELETE",
        headers
      });
      const deleteDraftPayload = await deleteDraftResponse.json();
      assert.equal(deleteDraftResponse.status, 200);
      assert.equal(deleteDraftPayload.data.removed, true);
    } finally {
      await stopServer(app.server);
      await stopServer(learning.server);
    }
  });
});

test("ai-service note organize routes and teacher student evidence routes work", async () => {
  await withTempDir(async (dir) => {
    const learning = createLearningServer();
    learning.server.listen(0, "127.0.0.1");
    await once(learning.server, "listening");
    const learningUrl = `http://127.0.0.1:${learning.server.address().port}`;
    const app = await startApp(createAiApp, aiConfig(dir, learningUrl));

    try {
      const studentHeaders = userHeaders("user_student", "student", "林知夏");
      const teacherHeaders = userHeaders("user_teacher", "teacher", "周老师");

      const noteResponse = await fetch(`${app.url}/api/student-ai/note-organize`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          courseId: "course_ood",
          noteId: "note_1",
          note: { title: "课堂笔记", content: "对象协作和顺序图。" }
        })
      });
      const notePayload = await noteResponse.json();
      assert.equal(noteResponse.status, 200);
      assert.equal(notePayload.data.type, "note_organize");

      const listResponse = await fetch(`${app.url}/api/note-organize-results`, { headers: studentHeaders });
      const listPayload = await listResponse.json();
      assert.equal(listResponse.status, 200);
      assert.equal(listPayload.data.items.length, 1);

      const saveResponse = await fetch(`${app.url}/api/note-organize-results/${notePayload.data.id}/save-note`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({ title: "AI整理笔记", tags: ["AI整理"] })
      });
      const savePayload = await saveResponse.json();
      assert.equal(saveResponse.status, 200);
      assert.equal(savePayload.data.id, "note_1");
      assert.equal(learning.createdNotes.length, 1);

      const teacherResultResponse = await fetch(`${app.url}/api/teacher/students/user_student/ai-results`, { headers: teacherHeaders });
      const teacherResultPayload = await teacherResultResponse.json();
      assert.equal(teacherResultResponse.status, 200);
      assert.equal(teacherResultPayload.data.items.length, 1);

      const teacherTimelineResponse = await fetch(`${app.url}/api/teacher/students/user_student/ai-timeline`, { headers: teacherHeaders });
      const teacherTimelinePayload = await teacherTimelineResponse.json();
      assert.equal(teacherTimelineResponse.status, 200);
      assert.ok(teacherTimelinePayload.data.items.length >= 1);
    } finally {
      await stopServer(app.server);
      await stopServer(learning.server);
    }
  });
});

test("ai-service teacher-ai routes support result, draft, and confirm lifecycle", async () => {
  await withTempDir(async (dir) => {
    const learning = createLearningServer();
    learning.server.listen(0, "127.0.0.1");
    await once(learning.server, "listening");
    const app = await startApp(createAiApp, aiConfig(dir, `http://127.0.0.1:${learning.server.address().port}`));

    try {
      app.services.teacherAiWorkflow.provider.complete = async () => ({
        provider: "teacher-json-provider",
        text: JSON.stringify({
          summary: "teacher intervention summary",
          actions: [{ id: "send", label: "Send reminder", route: "teacher-intervention", type: "confirm", kind: "send-intervention", status: "open" }],
          draft: { title: "Teacher intervention draft", summary: "draft summary", body: "draft body", message: "Please review and catch up." }
        })
      });
      const headers = userHeaders("user_teacher", "teacher", "周老师");
      const buildResponse = await fetch(`${app.url}/api/teacher-ai/student-intervention`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          route: "teacher-student",
          courseId: "course_ood",
          studentId: "user_student",
          studentName: "林知夏",
          evidence: ["提交延迟", "错题积压"]
        })
      });
      const buildPayload = await buildResponse.json();
      assert.equal(buildResponse.status, 200);
      assert.equal(buildPayload.data.type, "student_intervention");
      assert.ok(buildPayload.data.draft.id);

      const resultsResponse = await fetch(`${app.url}/api/teacher-ai/results`, { headers });
      const resultsPayload = await resultsResponse.json();
      assert.equal(resultsResponse.status, 200);
      assert.equal(resultsPayload.data.items.length, 1);

      const draftsResponse = await fetch(`${app.url}/api/teacher-ai/drafts`, { headers });
      const draftsPayload = await draftsResponse.json();
      assert.equal(draftsResponse.status, 200);
      assert.equal(draftsPayload.data.items.length, 1);
      const draftId = draftsPayload.data.items[0].id;

      const patchDraftResponse = await fetch(`${app.url}/api/teacher-ai/drafts/${draftId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          title: "Intervention v2",
          summary: "updated",
          body: "teacher edited",
          status: "reviewing",
          structuredPayload: { edited: true }
        })
      });
      const patchDraftPayload = await patchDraftResponse.json();
      assert.equal(patchDraftResponse.status, 200);
      assert.equal(patchDraftPayload.data.status, "reviewing");

      const resultId = resultsPayload.data.items[0].id;
      const actionId = resultsPayload.data.items[0].actions[0].id;
      const patchActionResponse = await fetch(`${app.url}/api/teacher-ai/results/${resultId}/actions/${actionId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "completed", note: "reviewed" })
      });
      const patchActionPayload = await patchActionResponse.json();
      assert.equal(patchActionResponse.status, 200);
      assert.equal(patchActionPayload.data.actions[0].status, "completed");

      const confirmResponse = await fetch(`${app.url}/api/teacher-ai/drafts/${draftId}/send-intervention`, {
        method: "POST",
        headers,
        body: JSON.stringify({ channel: "in_app" })
      });
      const confirmPayload = await confirmResponse.json();
      assert.equal(confirmResponse.status, 200);
      assert.equal(confirmPayload.data.status, "sent");

      const deleteResponse = await fetch(`${app.url}/api/teacher-ai/drafts/${draftId}`, {
        method: "DELETE",
        headers
      });
      const deletePayload = await deleteResponse.json();
      assert.equal(deleteResponse.status, 200);
      assert.equal(deletePayload.data.removed, true);
    } finally {
      await stopServer(app.server);
      await stopServer(learning.server);
    }
  });
});

test("ai-service internal routes expose summary, provider health, and review submission", async () => {
  await withTempDir(async (dir) => {
    const learning = createLearningServer();
    learning.server.listen(0, "127.0.0.1");
    await once(learning.server, "listening");
    const app = await startApp(createAiApp, aiConfig(dir, `http://127.0.0.1:${learning.server.address().port}`));

    try {
      const studentHeaders = userHeaders("user_student", "student", "林知夏");
      await fetch(`${app.url}/api/student-ai/daily-plan`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
          tasks: [{ id: "task_1", title: "复盘课堂示例", status: "todo" }]
        })
      });

      const internalHeaders = {
        [INTERNAL_KEY_HEADER]: INTERNAL_KEY
      };

      const resultsResponse = await fetch(`${app.url}/internal/student-ai/students/user_student/results`, { headers: internalHeaders });
      const resultsPayload = await resultsResponse.json();
      assert.equal(resultsResponse.status, 200);
      assert.equal(resultsPayload.data.items.length, 1);

      const resultId = resultsPayload.data.items[0].id;
      const detailResponse = await fetch(`${app.url}/internal/student-ai/results/${resultId}`, { headers: internalHeaders });
      const detailPayload = await detailResponse.json();
      assert.equal(detailResponse.status, 200);
      assert.equal(detailPayload.data.id, resultId);

      const summaryResponse = await fetch(`${app.url}/internal/student-ai/students/user_student/summary`, { headers: internalHeaders });
      const summaryPayload = await summaryResponse.json();
      assert.equal(summaryResponse.status, 200);
      assert.equal(summaryPayload.data.totalResults, 1);

      const providerResponse = await fetch(`${app.url}/internal/ai/provider-health`, { headers: internalHeaders });
      const providerPayload = await providerResponse.json();
      assert.equal(providerResponse.status, 200);
      assert.equal(providerPayload.data.status, "up");

      const reviewResponse = await fetch(`${app.url}/internal/ai/review-submission`, {
        method: "POST",
        headers: {
          ...internalHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          student: { id: "user_student", name: "林知夏" },
          assignment: { id: "assignment_1", title: "领域模型作业" },
          rubric: { criteria: [{ id: "c1", title: "完整性", maxScore: 50 }] },
          submission: { id: "submission_1", content: "这里是提交正文，包含类图说明与设计取舍。" }
        })
      });
      const reviewPayload = await reviewResponse.json();
      assert.equal(reviewResponse.status, 200);
      assert.equal(reviewPayload.data.provider, "mock-local-llm");
      assert.equal(reviewPayload.data.criteriaFeedback.length, 1);
    } finally {
      await stopServer(app.server);
      await stopServer(learning.server);
    }
  });
});
