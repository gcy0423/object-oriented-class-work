import { ServiceClient } from "../../../../../shared/client/serviceClient.js";

export class NotificationClient {
  constructor({ baseUrl, internalKey, timeoutMs = 3000 }) {
    this.client = new ServiceClient({
      serviceName: "notification-service",
      baseUrl,
      timeoutMs
    });
    this.internalKey = internalKey;
  }

  async emit(input) {
    const response = await this.client.post("/internal/notifications/emit", input, {
      headers: {
        "x-edumind-internal-key": this.internalKey
      }
    });
    return response.data;
  }
}
