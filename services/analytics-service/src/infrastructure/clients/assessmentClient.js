import { ServiceClient } from "../../../../../shared/client/serviceClient.js";

export class AssessmentClient {
  constructor({ baseUrl, internalKey, timeoutMs = 3000 }) {
    this.client = new ServiceClient({
      serviceName: "assessment-service",
      baseUrl,
      timeoutMs
    });
    this.internalKey = internalKey;
  }

  async getDashboard(userId) {
    const response = await this.client.get(`/internal/assessment/dashboard/${encodeURIComponent(userId)}`, {
      headers: {
        "x-edumind-internal-key": this.internalKey
      }
    });
    return response.data;
  }

  async getContext(userId) {
    const response = await this.client.get(`/internal/assessment/context/${encodeURIComponent(userId)}`, {
      headers: {
        "x-edumind-internal-key": this.internalKey
      }
    });
    return response.data;
  }

  async getAnalyticsSummary() {
    const response = await this.client.get("/internal/assessment/analytics", {
      headers: {
        "x-edumind-internal-key": this.internalKey
      }
    });
    return response.data;
  }
}
