import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AppKernel } from "../server/src/application/kernel.js";
import { buildRouter } from "../server/src/application/controllers.js";
import { loadConfig } from "../server/src/config.js";
import { createHttpServer } from "../server/src/framework/http.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const runtimeNodeModules =
  process.env.PLAYWRIGHT_NODE_MODULES ||
  "C:\\Users\\light\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules";

function resolvePlaywrightPackageJson(nodeModules) {
  const direct = join(nodeModules, "playwright", "package.json");
  if (existsSync(join(nodeModules, "playwright-core"))) {
    return direct;
  }
  const pnpmRoot = join(nodeModules, ".pnpm");
  if (existsSync(pnpmRoot)) {
    const candidate = readdirSync(pnpmRoot).find((name) => name.startsWith("playwright@"));
    if (candidate) {
      return join(pnpmRoot, candidate, "node_modules", "playwright", "package.json");
    }
  }
  return direct;
}

const require = createRequire(resolvePlaywrightPackageJson(runtimeNodeModules));
const { chromium } = require("playwright");
const browserExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe");

const config = {
  ...loadConfig(),
  host: "127.0.0.1",
  port: Number(process.env.SCREENSHOT_PORT || 4081),
  dataFile: join(root, "data", "app-data-screenshots.json")
};

const docsDir = join(root, "docs");
await mkdir(docsDir, { recursive: true });

const kernel = await AppKernel.boot(config);
const server = createHttpServer({
  router: buildRouter(kernel),
  kernel,
  config
});

await new Promise((resolve) => server.listen(config.port, config.host, resolve));

const browser = await chromium.launch({ headless: true, executablePath: browserExecutable });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });

try {
  await page.goto(`http://${config.host}:${config.port}/`, { waitUntil: "networkidle" });
  await page.locator('form[data-form="login"]').waitFor({ timeout: 10000 });
  await page.locator('form[data-form="login"] button[type="submit"]').click();
  await page.locator(".layout").waitFor({ timeout: 10000 });
  await page.waitForTimeout(2800);
  await page.screenshot({ path: join(docsDir, "screenshot-dashboard.png"), fullPage: true });

  await page.locator('[data-route="learning"]').click();
  await page.locator('form[data-form="goal"]').waitFor({ timeout: 10000 });
  await page.screenshot({ path: join(docsDir, "screenshot-learning.png"), fullPage: true });

  await page.locator('[data-route="ai"]').click();
  await page.locator('form[data-form="ai-question"] textarea[name="question"]').fill("如何在结课设计文档中说明领域类图和包图的关系？");
  await page.locator('form[data-form="ai-question"] button[type="submit"]').click();
  await page.locator(".ai-answer").waitFor({ timeout: 10000 });
  await page.screenshot({ path: join(docsDir, "screenshot-ai.png"), fullPage: true });

  await page.locator('[data-route="team"]').click();
  await page.locator('form[data-form="message"]').waitFor({ timeout: 10000 });
  await page.screenshot({ path: join(docsDir, "screenshot-team.png"), fullPage: true });

  console.log("Captured screenshots: dashboard, learning, ai, team");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
