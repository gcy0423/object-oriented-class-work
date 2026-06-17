import { spawn } from "node:child_process";
import process from "node:process";

const useMockProvider = process.argv.includes("--mock");
const services = [
  { name: "identity-service", script: "services/identity-service/src/main.js" },
  { name: "learning-service", script: "services/learning-service/src/main.js" },
  { name: "assessment-service", script: "services/assessment-service/src/main.js" },
  { name: "knowledge-service", script: "services/knowledge-service/src/main.js" },
  { name: "ai-service", script: "services/ai-service/src/main.js" },
  { name: "collaboration-service", script: "services/collaboration-service/src/main.js" },
  { name: "analytics-service", script: "services/analytics-service/src/main.js" },
  { name: "notification-service", script: "services/notification-service/src/main.js" },
  { name: "scheduler-service", script: "services/scheduler-service/src/main.js" },
  { name: "gateway-service", script: "services/gateway-service/src/main.js" }
];

const children = services.map((service) => {
  const child = spawn(process.execPath, [service.script], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...(useMockProvider && service.name === "ai-service" ? { LLM_PROVIDER: "mock" } : {})
    },
    stdio: ["inherit", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${service.name}] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${service.name}] ${chunk}`);
  });
  child.on("exit", (code) => {
    process.stdout.write(`[${service.name}] exited with code ${code}\n`);
  });

  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
