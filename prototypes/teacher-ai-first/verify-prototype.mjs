import { existsSync, readdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const runtimeNodeModules =
  process.env.PLAYWRIGHT_NODE_MODULES ||
  "C:\\Users\\31244\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules";

function resolvePlaywrightPackageJson(nodeModules) {
  const pnpmRoot = join(nodeModules, ".pnpm");
  if (existsSync(pnpmRoot)) {
    const candidate = readdirSync(pnpmRoot).find((name) => name.startsWith("playwright@"));
    if (candidate) {
      return join(pnpmRoot, candidate, "node_modules", "playwright", "package.json");
    }
  }
  return join(nodeModules, "playwright", "package.json");
}

const require = createRequire(resolvePlaywrightPackageJson(runtimeNodeModules));
const { chromium } = require("playwright");
const browserExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe");

const root = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(root, "index.html");
const shotsDir = resolve(root, "screenshots");
await mkdir(shotsDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: browserExecutable });
const errors = [];

async function capture(name, width, height, view = "") {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${name}: ${msg.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  if (view) await page.evaluate((viewName) => window.setView(viewName), view);
  await page.waitForTimeout(350);
  const shotPath = resolve(shotsDir, `${name}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    activeView: document.querySelector(".view.active")?.id,
    mobileNav: getComputedStyle(document.querySelector(".mobile-nav")).display,
    sidebar: getComputedStyle(document.querySelector(".sidebar")).display
  }));
  await page.close();
  return { name, shotPath, metrics };
}

async function captureCollapsed() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`desktop-collapsed: ${msg.text()}`);
  });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.locator("#toggleRail").click();
  await page.waitForTimeout(350);
  const shotPath = resolve(shotsDir, "desktop-collapsed.png");
  await page.screenshot({ path: shotPath, fullPage: true });
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    collapsed: document.getElementById("appShell")?.classList.contains("rail-collapsed")
  }));
  await page.close();
  return { name: "desktop-collapsed", shotPath, metrics };
}

const captures = [
  await capture("desktop-ai", 1440, 1000),
  await capture("desktop-ai-plan-detail", 1440, 1000, "aiPlanDetail"),
  await captureCollapsed(),
  await capture("desktop-assignments", 1440, 1000, "assignments"),
  await capture("desktop-assignment-draft", 1440, 1000, "assignmentDraft"),
  await capture("desktop-assignment-publish", 1440, 1000, "assignmentPublish"),
  await capture("desktop-assignment-student-preview", 1440, 1000, "assignmentStudentPreview"),
  await capture("desktop-publish-success", 1440, 1000, "publishSuccess"),
  await capture("desktop-assignment-detail", 1440, 1000, "assignmentDetail"),
  await capture("desktop-grading", 1440, 1000, "grading"),
  await capture("desktop-batch-grading-result", 1440, 1000, "batchGradingResult"),
  await capture("desktop-grading-detail", 1440, 1000, "gradingDetail"),
  await capture("desktop-feedback-publish", 1440, 1000, "feedbackPublish"),
  await capture("desktop-question-bank", 1440, 1000, "questionBank"),
  await capture("desktop-question-detail", 1440, 1000, "questionDetail"),
  await capture("desktop-question-draft", 1440, 1000, "questionDraft"),
  await capture("desktop-analytics", 1440, 1000, "analytics"),
  await capture("desktop-student-profile", 1440, 1000, "studentProfile"),
  await capture("desktop-intervention-confirm", 1440, 1000, "interventionConfirm"),
  await capture("desktop-collaboration", 1440, 1000, "collaboration"),
  await capture("desktop-collaboration-detail", 1440, 1000, "collaborationDetail"),
  await capture("mobile-ai", 390, 844),
  await capture("mobile-ai-plan-detail", 390, 844, "aiPlanDetail"),
  await capture("mobile-assignments", 390, 844, "assignments"),
  await capture("mobile-assignment-draft", 390, 844, "assignmentDraft"),
  await capture("mobile-assignment-publish", 390, 844, "assignmentPublish"),
  await capture("mobile-assignment-student-preview", 390, 844, "assignmentStudentPreview"),
  await capture("mobile-publish-success", 390, 844, "publishSuccess"),
  await capture("mobile-assignment-detail", 390, 844, "assignmentDetail"),
  await capture("mobile-grading", 390, 844, "grading"),
  await capture("mobile-batch-grading-result", 390, 844, "batchGradingResult"),
  await capture("mobile-grading-detail", 390, 844, "gradingDetail"),
  await capture("mobile-feedback-publish", 390, 844, "feedbackPublish"),
  await capture("mobile-question-bank", 390, 844, "questionBank"),
  await capture("mobile-question-detail", 390, 844, "questionDetail"),
  await capture("mobile-question-draft", 390, 844, "questionDraft"),
  await capture("mobile-analytics", 390, 844, "analytics"),
  await capture("mobile-student-profile", 390, 844, "studentProfile"),
  await capture("mobile-intervention-confirm", 390, 844, "interventionConfirm"),
  await capture("mobile-collaboration", 390, 844, "collaboration"),
  await capture("mobile-collaboration-detail", 390, 844, "collaborationDetail")
];

await browser.close();
console.log(JSON.stringify({ captures, errors }, null, 2));
