import { ServiceClient } from "../../../../../shared/client/serviceClient.js";

export class CollaborationClient {
  constructor({ baseUrl, internalKey, timeoutMs = 3000 }) {
    this.client = new ServiceClient({
      serviceName: "collaboration-service",
      baseUrl,
      timeoutMs
    });
    this.internalKey = internalKey;
  }

  publishEvent(event) {
    return this.client.post("/internal/events", event, {
      headers: {
        "x-edumind-internal-key": this.internalKey
      }
    });
  }
}
