export function loadConfig(env = process.env) {
  return {
    serviceName: "analytics-service",
    host: env.ANALYTICS_SERVICE_HOST || env.HOST || "127.0.0.1",
    port: Number(env.ANALYTICS_SERVICE_PORT || env.PORT || 4106),
    internalKey: env.EDUMIND_INTERNAL_KEY || "edumind-local-internal-key",
    timeoutMs: Number(env.ANALYTICS_SERVICE_TIMEOUT_MS || 3000),
    identityServiceUrl: env.IDENTITY_SERVICE_URL || "http://127.0.0.1:4101",
    learningServiceUrl: env.LEARNING_SERVICE_URL || "http://127.0.0.1:4102",
    assessmentServiceUrl: env.ASSESSMENT_SERVICE_URL || "http://127.0.0.1:4103",
    aiServiceUrl: env.AI_SERVICE_URL || "http://127.0.0.1:4104",
    collaborationServiceUrl: env.COLLABORATION_SERVICE_URL || "http://127.0.0.1:4105"
  };
}
