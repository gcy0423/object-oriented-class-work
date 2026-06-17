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

  internalHeaders() {
    return { "x-edumind-internal-key": this.internalKey };
  }

  async getContext(userId) {
    const response = await this.client.get(`/internal/assessment/context/${encodeURIComponent(userId)}`, {
      headers: this.internalHeaders()
    });
    return response.data;
  }

  async getDashboard(userId) {
    const response = await this.client.get(`/internal/assessment/dashboard/${encodeURIComponent(userId)}`, {
      headers: this.internalHeaders()
    });
    return response.data;
  }

  async getAnalyticsSummary() {
    const response = await this.client.get("/internal/assessment/analytics", {
      headers: this.internalHeaders()
    });
    return response.data;
  }
}
