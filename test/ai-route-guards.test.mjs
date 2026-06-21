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
  const dir = await mkdtemp(join(tmpdir(), "edumind-ai-guards-"));
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

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function learningServer() {
  const server = createServer(async (req, res) => {
    if (req.headers[INTERNAL_KEY_HEADER] !== INTERNAL_KEY) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, code: "FORBIDDEN", message: "bad internal key" }));
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
          notes: [{ id: "note_1", courseId: "course_ood", title: "课堂笔记", content: "对象协作" }]
        }
      }));
      return;
    }

    if (req.method === "POST" && /\/internal\/learning\/users\/.+\/tasks$/.test(req.url)) {
      const body = await readJson(req);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: { id: "task_live_1", ...body } }));
      return;
    }

    if (req.method === "POST" && /\/internal\/learning\/users\/.+\/notes$/.test(req.url)) {
      const body = await readJson(req);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: { id: "note_live_1", ...body } }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, message: "not found" }));
  });
  return server;
}

function config(dir, learningUrl) {
  return {
    serviceName: "ai-service",
    host: "127.0.0.1",
    port: 0,
    internalKey: INTERNAL_KEY,
    dataFile: join(dir, "ai-route-guards.json"),
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

test("public AI routes reject missing user context", async () => {
  await withTempDir(async (dir) => {
    const learning = learningServer();
    learning.listen(0, "127.0.0.1");
    await once(learning, "listening");
    const app = await startApp(createAiApp, config(dir, `http://127.0.0.1:${learning.address().port}`));

    try {
      const targets = [
        ["POST", "/api/ai/ask", { question: "Explain lifeline" }],
        ["POST", "/api/ai/plan", { goalId: "goal_1" }],
        ["POST", "/api/ai/summarize", { noteId: "note_1" }],
        ["POST", "/api/student-ai/daily-plan", {}],
        ["POST", "/api/student-ai/weakness-insight", {}],
        ["POST", "/api/student-ai/task-drafts", {}],
        ["POST", "/api/student-ai/assignment-guide", {}],
        ["POST", "/api/student-ai/submission-check", {}],
        ["POST", "/api/student-ai/note-organize", {}],
        ["GET", "/api/student-ai/results", null],
        ["GET", "/api/student-ai/timeline", null],
        ["GET", "/api/student-ai/task-drafts", null],
        ["GET", "/api/note-organize-results", null],
        ["POST", "/api/teacher-ai/teaching-plan", {}],
        ["GET", "/api/teacher-ai/results", null],
        ["GET", "/api/teacher-ai/drafts", null]
      ];

      for (const [method, path, body] of targets) {
        const response = await fetch(`${app.url}${path}`, {
          method,
          headers: body ? { "content-type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined
        });
        const payload = await response.json();
        assert.equal(response.status, 401, path);
        assert.equal(payload.ok, false, path);
      }
    } finally {
      await stopServer(app.server);
      await stopServer(learning);
    }
  });
});

test("internal AI routes reject missing or wrong internal key", async () => {
  await withTempDir(async (dir) => {
    const learning = learningServer();
    learning.listen(0, "127.0.0.1");
    await once(learning, "listening");
    const app = await startApp(createAiApp, config(dir, `http://127.0.0.1:${learning.address().port}`));

    try {
      const internalTargets = [
        ["GET", "/internal/student-ai/students/user_student/results"],
        ["GET", "/internal/student-ai/students/user_student/timeline"],
        ["GET", "/internal/student-ai/students/user_student/summary"],
        ["GET", "/internal/ai/provider-health"],
        ["POST", "/internal/ai/review-submission"]
      ];

      for (const [method, path] of internalTargets) {
        const bad = await fetch(`${app.url}${path}`, {
          method,
          headers: method === "POST" ? { "content-type": "application/json" } : undefined,
          body: method === "POST" ? JSON.stringify({}) : undefined
        });
        assert.equal(bad.status, 403, path);

        const wrong = await fetch(`${app.url}${path}`, {
          method,
          headers: {
            [INTERNAL_KEY_HEADER]: "wrong-key",
            ...(method === "POST" ? { "content-type": "application/json" } : {})
          },
          body: method === "POST" ? JSON.stringify({}) : undefined
        });
        assert.equal(wrong.status, 403, path);
      }
    } finally {
      await stopServer(app.server);
      await stopServer(learning);
    }
  });
});

test("teacher-only routes reject student access with forbidden", async () => {
  await withTempDir(async (dir) => {
    const learning = learningServer();
    learning.listen(0, "127.0.0.1");
    await once(learning, "listening");
    const app = await startApp(createAiApp, config(dir, `http://127.0.0.1:${learning.address().port}`));

    try {
      const studentHeaders = userHeaders("user_student", "student", "林知夏");
      const teacherTargets = [
        ["/api/teacher-ai/teaching-plan", { route: "teacher-home" }],
        ["/api/teacher-ai/student-intervention", { route: "teacher-student", studentId: "user_student" }],
        ["/api/teacher-ai/assignment-commentary", { route: "teacher-assignment" }],
        ["/api/teacher-ai/feedback-draft", { route: "teacher-review" }],
        ["/api/teacher-ai/course-practice-plan", { route: "teacher-course" }],
        ["/api/teacher-ai/report-summary", { route: "teacher-report" }]
      ];

      for (const [path, body] of teacherTargets) {
        const response = await fetch(`${app.url}${path}`, {
          method: "POST",
          headers: studentHeaders,
          body: JSON.stringify(body)
        });
        const payload = await response.json();
        assert.equal(response.status, 403, path);
        assert.equal(payload.ok, false, path);
      }
    } finally {
      await stopServer(app.server);
      await stopServer(learning);
    }
  });
});

test("student-only ownership rules reject cross-user reads and edits", async () => {
  await withTempDir(async (dir) => {
    const learning = learningServer();
    learning.listen(0, "127.0.0.1");
    await once(learning, "listening");
    const app = await startApp(createAiApp, config(dir, `http://127.0.0.1:${learning.address().port}`));

    try {
      const headersA = userHeaders("user_student", "student", "林知夏");
      const headersB = userHeaders("user_other", "student", "许星");

      const created = await fetch(`${app.url}/api/student-ai/daily-plan`, {
        method: "POST",
        headers: headersA,
        body: JSON.stringify({
          route: "student-ai",
          tasks: [{ id: "task_1", title: "复盘课堂示例", status: "todo" }]
        })
      });
      const createdPayload = await created.json();
      const resultId = createdPayload.data.id;
      const actionId = createdPayload.data.actions[0].id;

      const detail = await fetch(`${app.url}/api/student-ai/results/${resultId}`, { headers: headersB });
      assert.equal(detail.status, 404);

      const patch = await fetch(`${app.url}/api/student-ai/results/${resultId}/actions/${actionId}`, {
        method: "PATCH",
        headers: headersB,
        body: JSON.stringify({ status: "completed", note: "hack" })
      });
      assert.equal(patch.status, 404);

      const teacherRead = await fetch(`${app.url}/api/teacher/students/user_student/ai-results`, { headers: headersB });
      assert.equal(teacherRead.status, 403);
    } finally {
      await stopServer(app.server);
      await stopServer(learning);
    }
  });
});

test("route validation surfaces real domain errors for invalid student draft and note save flows", async () => {
  await withTempDir(async (dir) => {
    const learning = learningServer();
    learning.listen(0, "127.0.0.1");
    await once(learning, "listening");
    const app = await startApp(createAiApp, config(dir, `http://127.0.0.1:${learning.address().port}`));

    try {
      const studentHeaders = userHeaders("user_student", "student", "林知夏");

      const createDraft = await fetch(`${app.url}/api/student-ai/task-drafts`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({ title: "Loose draft", courseId: "course_ood" })
      });
      const createDraftPayload = await createDraft.json();
      assert.equal(createDraft.status, 200);
      assert.equal(createDraftPayload.data.title, "Loose draft");

      const confirmDraft = await fetch(`${app.url}/api/student-ai/task-drafts/${createDraftPayload.data.id}/confirm`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({})
      });
      assert.equal(confirmDraft.status, 400);

      const fakeNoteSave = await fetch(`${app.url}/api/note-organize-results/not_real/save-note`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({ title: "x" })
      });
      assert.equal(fakeNoteSave.status, 404);

      const fakeResultAction = await fetch(`${app.url}/api/student-ai/results/not_real/actions/action_1`, {
        method: "PATCH",
        headers: studentHeaders,
        body: JSON.stringify({ status: "completed" })
      });
      assert.equal(fakeResultAction.status, 404);
    } finally {
      await stopServer(app.server);
      await stopServer(learning);
    }
  });
});

test("teacher draft routes return 404 for unknown ids and 403 for student caller", async () => {
  await withTempDir(async (dir) => {
    const learning = learningServer();
    learning.listen(0, "127.0.0.1");
    await once(learning, "listening");
    const app = await startApp(createAiApp, config(dir, `http://127.0.0.1:${learning.address().port}`));

    try {
      const teacherHeaders = userHeaders("user_teacher", "teacher", "周老师");
      const studentHeaders = userHeaders("user_student", "student", "林知夏");

      const fakeGet = await fetch(`${app.url}/api/teacher-ai/drafts/not_real`, { headers: teacherHeaders });
      assert.equal(fakeGet.status, 404);

      const fakePatch = await fetch(`${app.url}/api/teacher-ai/drafts/not_real`, {
        method: "PATCH",
        headers: teacherHeaders,
        body: JSON.stringify({ title: "x" })
      });
      assert.equal(fakePatch.status, 404);

      const fakeDelete = await fetch(`${app.url}/api/teacher-ai/drafts/not_real`, {
        method: "DELETE",
        headers: teacherHeaders
      });
      assert.equal(fakeDelete.status, 404);

      const studentGet = await fetch(`${app.url}/api/teacher-ai/drafts/not_real`, { headers: studentHeaders });
      assert.equal(studentGet.status, 403);
    } finally {
      await stopServer(app.server);
      await stopServer(learning);
    }
  });
});
