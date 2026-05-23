export class ApiClient {
  constructor({ baseUrl = "" } = {}) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem("edumind.token") || "";
  }

  setToken(token) {
    this.token = token || "";
    if (this.token) {
      localStorage.setItem("edumind.token", this.token);
    } else {
      localStorage.removeItem("edumind.token");
    }
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({ ok: false, message: "响应无法解析。" }));
    if (!response.ok || payload.ok === false) {
      const message = payload.message || `请求失败：${response.status}`;
      throw new Error(message);
    }
    return payload;
  }

  login(input) {
    return this.request("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
  }

  me() {
    return this.request("/api/me");
  }

  dashboard() {
    return this.request("/api/dashboard");
  }

  createGoal(input) {
    return this.request("/api/goals", { method: "POST", body: JSON.stringify(input) });
  }

  createTask(input) {
    return this.request("/api/tasks", { method: "POST", body: JSON.stringify(input) });
  }

  completeTask(id) {
    return this.request(`/api/tasks/${encodeURIComponent(id)}/complete`, { method: "PATCH" });
  }

  createNote(input) {
    return this.request("/api/notes", { method: "POST", body: JSON.stringify(input) });
  }

  askAI(question) {
    return this.request("/api/ai/ask", { method: "POST", body: JSON.stringify({ question }) });
  }

  generatePlan(goalId) {
    return this.request("/api/ai/plan", { method: "POST", body: JSON.stringify({ goalId }) });
  }

  messages() {
    return this.request("/api/collaboration/messages");
  }

  sendMessage(content) {
    return this.request("/api/collaboration/messages", { method: "POST", body: JSON.stringify({ content }) });
  }
}
