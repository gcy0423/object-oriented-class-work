import { ServiceClient } from "../../../../../shared/client/serviceClient.js";

export class AIClient {
  constructor({ baseUrl, internalKey, timeoutMs = 3000 }) {
    this.client = new ServiceClient({
      serviceName: "ai-service",
      baseUrl,
      timeoutMs
    });
    this.internalKey = internalKey;
  }

  async getProviderHealth() {
    const response = await this.client.get("/internal/ai/provider-health", {
      headers: {
        "x-edumind-internal-key": this.internalKey
      }
    });
    return response.data;
  }
}
