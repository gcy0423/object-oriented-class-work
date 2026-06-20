# v8 代码蓝图

本文件给实现者提供落地骨架。代码片段不是最终实现，但命名和模块边界应尽量沿用。

## 1. ai-service workflow

### `services/ai-service/src/application/studentAiWorkflowService.js`

```js
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

export class StudentAiWorkflowService {
  constructor({ provider, logger = console }) {
    this.provider = provider;
    this.logger = logger;
  }

  buildDailyPlan(user, input = {}) {
    return this.completeStructured({
      user,
      input,
      type: "daily_plan",
      prompt: buildDailyPlanPrompt(user, input),
      fallback: fallbackDailyPlan(user, input),
      normalize: normalizeDailyPlan
    });
  }

  buildWeaknessInsight(user, input = {}) {
    return this.completeStructured({
      user,
      input,
      type: "weakness_insight",
      prompt: buildWeaknessInsightPrompt(user, input),
      fallback: fallbackWeaknessInsight(user, input),
      normalize: normalizeWeaknessInsight
    });
  }

  draftTask(user, input = {}) {
    return this.completeStructured({
      user,
      input,
      type: "task_draft",
      prompt: buildTaskDraftPrompt(user, input),
      fallback: fallbackTaskDraft(user, input),
      normalize: normalizeTaskDraft
    });
  }

  guideAssignment(user, input = {}) {
    return this.completeStructured({
      user,
      input,
      type: "assignment_guide",
      prompt: buildAssignmentGuidePrompt(user, input),
      fallback: fallbackAssignmentGuide(user, input),
      normalize: normalizeAssignmentGuide
    });
  }

  checkSubmission(user, input = {}) {
    return this.completeStructured({
      user,
      input,
      type: "submission_check",
      prompt: buildSubmissionCheckPrompt(user, input),
      fallback: fallbackSubmissionCheck(user, input),
      normalize: normalizeSubmissionCheck
    });
  }

  organizeNote(user, input = {}) {
    return this.completeStructured({
      user,
      input,
      type: "note_organize",
      prompt: buildNoteOrganizePrompt(user, input),
      fallback: fallbackNoteOrganize(user, input),
      normalize: normalizeNoteOrganize
    });
  }

  async completeStructured({ prompt, fallback, normalize }) {
    try {
      const response = await this.provider.complete({
        messages: [
          { role: "system", content: "Return one valid JSON object. Do not return markdown." },
          { role: "user", content: prompt }
        ]
      });
      const rawText = response.content || response.answer || "";
      const parsed = parseJsonObject(rawText);
      return normalize(parsed, { ...fallback, provider: response.provider, rawText });
    } catch (error) {
      this.logger.warn?.(`student ai workflow fallback: ${error.message}`);
      return normalize(null, { ...fallback, provider: "fallback", rawText: error.message });
    }
  }
}

function parseJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
```

## 2. ai-service routes

### `services/ai-service/src/routes.js`

```js
router.post("/api/student-ai/daily-plan", async (req) => {
  await services.ready;
  const user = requireUserContext(req);
  return ok(await services.studentAiWorkflow.buildDailyPlan(user, await readJson(req)));
});

router.post("/api/student-ai/weakness-insight", async (req) => {
  await services.ready;
  const user = requireUserContext(req);
  return ok(await services.studentAiWorkflow.buildWeaknessInsight(user, await readJson(req)));
});

router.post("/api/student-ai/task-drafts", async (req) => {
  await services.ready;
  const user = requireUserContext(req);
  return ok(await services.studentAiWorkflow.draftTask(user, await readJson(req)));
});

router.post("/api/student-ai/assignment-guide", async (req) => {
  await services.ready;
  const user = requireUserContext(req);
  return ok(await services.studentAiWorkflow.guideAssignment(user, await readJson(req)));
});

router.post("/api/student-ai/submission-check", async (req) => {
  await services.ready;
  const user = requireUserContext(req);
  return ok(await services.studentAiWorkflow.checkSubmission(user, await readJson(req)));
});

router.post("/api/student-ai/note-organize", async (req) => {
  await services.ready;
  const user = requireUserContext(req);
  return ok(await services.studentAiWorkflow.organizeNote(user, await readJson(req)));
});
```

## 3. Gateway proxy

### `services/gateway-service/src/routes.js`

```js
router.post("/api/student-ai/daily-plan", async (req) => {
  const user = await services.verifyUser(req);
  return services.ai.post("/api/student-ai/daily-plan", await readJson(req), {
    headers: buildUserHeaders(config, user)
  });
});
```

同样模式补齐另外五个接口。

## 4. Frontend ApiClient

### `client/src/api.js`

```js
studentAiDailyPlan(input) {
  return this.request("/api/student-ai/daily-plan", { method: "POST", body: JSON.stringify(input) });
}

studentAiWeaknessInsight(input) {
  return this.request("/api/student-ai/weakness-insight", { method: "POST", body: JSON.stringify(input) });
}

studentAiTaskDraft(input) {
  return this.request("/api/student-ai/task-drafts", { method: "POST", body: JSON.stringify(input) });
}

studentAiAssignmentGuide(input) {
  return this.request("/api/student-ai/assignment-guide", { method: "POST", body: JSON.stringify(input) });
}

studentAiSubmissionCheck(input) {
  return this.request("/api/student-ai/submission-check", { method: "POST", body: JSON.stringify(input) });
}

studentAiNoteOrganize(input) {
  return this.request("/api/student-ai/note-organize", { method: "POST", body: JSON.stringify(input) });
}
```

## 5. StudentAiAdapter

### `client/src/ai/studentAiAdapter.js`

```js
async buildDailyPlan(context) {
  return this.callOfficialThenFallback({
    official: () => this.api.studentAiDailyPlan(context),
    fallback: () => this.askStructured({
      prompt: dailyPlanPrompt(context),
      normalize: normalizeDailyPlan,
      fallback: fallbackDailyPlan(context)
    }),
    normalize: normalizeDailyPlan
  });
}

async callOfficialThenFallback({ official, fallback, normalize }) {
  try {
    const result = await official();
    return normalize(result.data, result.data);
  } catch {
    return fallback();
  }
}
```

## 6. v7 default route fix

```js
export function defaultRouteForUser(user, route = "") {
  if (user?.role === "student" && (!route || route === "dashboard")) {
    return "student-ai";
  }
  if (route && (isStudentRoute(route) || LEGACY_ROUTES.has(route))) {
    return route;
  }
  return user?.role === "student" ? "student-ai" : "dashboard";
}
```

## 7. v7 text escaping fix

Before:

```js
`<li>${item.summary}</li>`
```

After:

```js
`<li>${escapeHtml(item.summary || "")}</li>`
```

Attributes:

```js
`data-id="${attr(item.id)}"`
```

