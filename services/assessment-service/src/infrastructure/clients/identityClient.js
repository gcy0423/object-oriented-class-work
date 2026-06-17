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

  async getUserById(userId) {
    const response = await this.client.get(`/internal/users/${encodeURIComponent(userId)}`, {
      headers: {
        "x-edumind-internal-key": this.internalKey
      }
    });
    return response.data.user;
  }
}
