import { INTERNAL_KEY_HEADER } from "../../../../../shared/auth/userContext.js";
import { ServiceClient } from "../../../../../shared/client/serviceClient.js";

export class KnowledgeClient {
  constructor({ baseUrl, internalKey, timeoutMs = 2000 }) {
    this.client = new ServiceClient({
      serviceName: "knowledge-service",
      baseUrl,
      timeoutMs
    });
    this.internalKey = internalKey;
  }

  async buildContext({ question, courseId, limit = 5 }) {
    const response = await this.client.post("/internal/knowledge/context", {
      question,
      courseId,
      limit
    }, {
      headers: {
        [INTERNAL_KEY_HEADER]: this.internalKey
      }
    });
    return response.data;
  }
}
