import { ServiceClient } from "../../../../../shared/client/serviceClient.js";

export class LearningClient {
  constructor({ baseUrl, internalKey, timeoutMs = 3000 }) {
    this.client = new ServiceClient({
      serviceName: "learning-service",
      baseUrl,
      timeoutMs
    });
    this.internalKey = internalKey;
  }

  async getLearningContext(userId) {
    const response = await this.client.get(`/internal/learning/context/${encodeURIComponent(userId)}`, {
      headers: {
        "x-edumind-internal-key": this.internalKey
      }
    });
    return response.data;
  }

  async createTaskForUser(userId, input) {
    const response = await this.client.post(`/internal/learning/users/${encodeURIComponent(userId)}/tasks`, input, {
      headers: {
        "x-edumind-internal-key": this.internalKey
      }
    });
    return response.data;
  }

  async createNoteForUser(userId, input) {
    const response = await this.client.post(`/internal/learning/users/${encodeURIComponent(userId)}/notes`, input, {
      headers: {
        "x-edumind-internal-key": this.internalKey
      }
    });
    return response.data;
  }
}
