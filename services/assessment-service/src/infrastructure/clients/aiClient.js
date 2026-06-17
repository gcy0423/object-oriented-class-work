import { ServiceClient } from "../../../../../shared/client/serviceClient.js";

export class AIClient {
  constructor({ baseUrl, internalKey, timeoutMs = 5000 }) {
    this.client = new ServiceClient({
      serviceName: "ai-service",
      baseUrl,
      timeoutMs
    });
    this.internalKey = internalKey;
  }

  async reviewSubmission(payload) {
    const response = await this.client.post("/internal/ai/review-submission", payload, {
      headers: {
        "x-edumind-internal-key": this.internalKey
      }
    });
    return response.data;
  }
}
