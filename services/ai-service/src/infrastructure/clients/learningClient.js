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
}
