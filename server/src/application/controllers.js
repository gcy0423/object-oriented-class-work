import { Router } from "../framework/router.js";
import { ok, readJson } from "../framework/response.js";

function currentUser(req, kernel) {
  if (req.query?.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return kernel.auth.requireUser(req);
}

export function buildRouter(kernel) {
  const router = new Router();

  router.get("/api/health", async () => ok({ status: "up", service: "EduMind Agent", time: new Date().toISOString() }));

  router.post("/api/auth/login", async (req) => {
    const body = await readJson(req);
    const result = await kernel.auth.login(body);
    return ok(result);
  });

  router.get("/api/me", async (req) => {
    const user = currentUser(req, kernel);
    return ok({ user });
  });

  router.get("/api/dashboard", async (req) => {
    const user = currentUser(req, kernel);
    return ok({ ...kernel.learning.dashboardFor(user), users: kernel.repositories.users.all() }, { provider: kernel.ai.provider.name });
  });

  router.get("/api/courses", async () => ok(kernel.repositories.courses.all()));

  router.post("/api/goals", async (req) => {
    const user = currentUser(req, kernel);
    const goal = await kernel.learning.createGoal(user, await readJson(req));
    return ok(goal);
  });

  router.post("/api/tasks", async (req) => {
    const user = currentUser(req, kernel);
    const task = await kernel.learning.createTask(user, await readJson(req));
    return ok(task);
  });

  router.patch("/api/tasks/:id/complete", async (req) => {
    const user = currentUser(req, kernel);
    const task = await kernel.learning.completeTask(user, req.params.id);
    return ok(task);
  });

  router.post("/api/notes", async (req) => {
    const user = currentUser(req, kernel);
    const note = await kernel.learning.createNote(user, await readJson(req));
    return ok(note);
  });

  router.post("/api/ai/ask", async (req) => {
    const user = currentUser(req, kernel);
    kernel.security.assertCanUseAI(user);
    const answer = await kernel.ai.ask(user, await readJson(req));
    return ok(answer);
  });

  router.post("/api/ai/plan", async (req) => {
    const user = currentUser(req, kernel);
    kernel.security.assertCanUseAI(user);
    const plan = await kernel.ai.generatePlan(user, await readJson(req));
    return ok(plan);
  });

  router.post("/api/ai/summarize", async (req) => {
    const user = currentUser(req, kernel);
    kernel.security.assertCanUseAI(user);
    const summary = await kernel.ai.summarizeNote(user, await readJson(req));
    return ok(summary);
  });

  router.get("/api/collaboration/messages", async (req) => {
    currentUser(req, kernel);
    return ok(kernel.collaboration.roomMessages(req.query.roomId || "room_ood"));
  });

  router.post("/api/collaboration/messages", async (req) => {
    const user = currentUser(req, kernel);
    const message = await kernel.collaboration.sendMessage(user, await readJson(req));
    return ok(message);
  });

  router.get("/api/activity", async (req) => {
    currentUser(req, kernel);
    return ok(kernel.repositories.logs.latest(30));
  });

  router.get("/api/events", async (req, res) => {
    currentUser(req, kernel);
    kernel.syncHub.handleSse(req, res);
  });

  return router;
}
