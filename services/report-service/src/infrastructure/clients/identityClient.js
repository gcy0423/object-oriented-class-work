import { ServiceClient } from "../../../../../shared/client/serviceClient.js";

export class IdentityClient {
  constructor({ baseUrl, internalKey, timeoutMs = 3000 }) {
    this.client = new ServiceClient({
      serviceName: "identity-service",
      baseUrl,
      timeoutMs
    });
    this.internalKey = internalKey;
  }

  internalHeaders() {
    return { "x-edumind-internal-key": this.internalKey };
  }

  async listUsers() {
    const response = await this.client.get("/internal/users", {
      headers: this.internalHeaders()
    });
    return response.data.users || [];
  }

  async getUserById(id) {
    const response = await this.client.get(`/internal/users/${encodeURIComponent(id)}`, {
      headers: this.internalHeaders()
    });
    return response.data.user || null;
  }
}
