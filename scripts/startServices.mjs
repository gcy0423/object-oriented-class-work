import { spawn } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";

const useMockProvider = process.argv.includes("--mock");
const gatewayPort = Number(process.env.GATEWAY_SERVICE_PORT || process.env.PORT || 4077);
const host = "127.0.0.1";
const services = [
  { name: "identity-service", script: "services/identity-service/src/main.js" },
  { name: "learning-service", script: "services/learning-service/src/main.js" },
  { name: "assessment-service", script: "services/assessment-service/src/main.js" },
  { name: "knowledge-service", script: "services/knowledge-service/src/main.js" },
  { name: "ai-service", script: "services/ai-service/src/main.js" },
  { name: "collaboration-service", script: "services/collaboration-service/src/main.js" },
  { name: "analytics-service", script: "services/analytics-service/src/main.js" },
  { name: "report-service", script: "services/report-service/src/main.js" },
  { name: "operations-service", script: "services/operations-service/src/main.js" },
  { name: "notification-service", script: "services/notification-service/src/main.js" },
  { name: "scheduler-service", script: "services/scheduler-service/src/main.js" },
  { name: "gateway-service", script: "services/gateway-service/src/main.js" }
];

function canListen(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", (error) => {
      resolve(error?.code !== "EADDRINUSE");
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

if (!(await canListen(gatewayPort))) {
  process.stderr.write([
    `gateway-service cannot start because ${host}:${gatewayPort} is already in use.`,
    "Stop the existing dev server, or open the running app directly at:",
    `http://${host}:${gatewayPort}`,
    "On Windows you can find the process with:",
    `netstat -ano | findstr :${gatewayPort}`
  ].join("\n") + "\n");
  process.exit(1);
}

let shuttingDown = false;
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
    if (!shuttingDown && code && service.name === "gateway-service") {
      shutdown();
      process.exitCode = code;
    }
  });

  return child;
});

function shutdown() {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
