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
  if (view) {
    await page.evaluate((viewName) => window.setView(viewName), view);
  }
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
  page.on("pageerror", (error) => errors.push(`desktop-collapsed: ${error.message}`));
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

async function captureAssignmentMode(name, mode, width = 1440, height = 1000) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${name}: ${msg.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.locator('[data-view="assignments"]:visible').first().click();
  await page.locator(`[data-mode="${mode}"]`).click();
  await page.waitForTimeout(350);
  const shotPath = resolve(shotsDir, `${name}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    activeMode: document.querySelector(".assignment-mode.active")?.id
  }));
  await page.close();
  return { name, shotPath, metrics };
}

const captures = [
  await capture("desktop-ai", 1440, 1000),
  await capture("desktop-ai-insight", 1440, 1000, "aiInsight"),
  await captureCollapsed(),
  await capture("desktop-learn", 1440, 1000, "learn"),
  await capture("desktop-learning-task-detail", 1440, 1000, "learningTaskDetail"),
  await capture("desktop-assignments", 1440, 1000, "assignments"),
  await captureAssignmentMode("desktop-assignments-calendar", "calendar"),
  await captureAssignmentMode("desktop-assignments-deadline", "deadline"),
  await capture("desktop-detail", 1440, 1000, "assignmentDetail"),
  await capture("desktop-assignment-history", 1440, 1000, "assignmentHistory"),
  await capture("desktop-assignment-feedback", 1440, 1000, "assignmentFeedback"),
  await capture("desktop-submit", 1440, 1000, "assignmentSubmit"),
  await capture("desktop-assignment-preview", 1440, 1000, "assignmentPreview"),
  await capture("desktop-submit-success", 1440, 1000, "submitSuccess"),
  await capture("desktop-practice", 1440, 1000, "practice"),
  await capture("desktop-practice-session", 1440, 1000, "practiceSession"),
  await capture("desktop-practice-result", 1440, 1000, "practiceResult"),
  await capture("desktop-wrong-question-detail", 1440, 1000, "wrongQuestionDetail"),
  await capture("desktop-notes", 1440, 1000, "notes"),
  await capture("desktop-note-editor", 1440, 1000, "noteEditor"),
  await capture("desktop-note-ai-result", 1440, 1000, "noteAiResult"),
  await capture("mobile-ai", 390, 844),
  await capture("mobile-ai-insight", 390, 844, "aiInsight"),
  await capture("mobile-learn", 390, 844, "learn"),
  await capture("mobile-learning-task-detail", 390, 844, "learningTaskDetail"),
  await capture("mobile-assignments", 390, 844, "assignments"),
  await capture("mobile-detail", 390, 844, "assignmentDetail"),
  await capture("mobile-assignment-history", 390, 844, "assignmentHistory"),
  await capture("mobile-assignment-feedback", 390, 844, "assignmentFeedback"),
  await capture("mobile-submit", 390, 844, "assignmentSubmit"),
  await capture("mobile-assignment-preview", 390, 844, "assignmentPreview"),
  await capture("mobile-submit-success", 390, 844, "submitSuccess"),
  await capture("mobile-practice", 390, 844, "practice"),
  await capture("mobile-practice-session", 390, 844, "practiceSession"),
  await capture("mobile-practice-result", 390, 844, "practiceResult"),
  await capture("mobile-wrong-question-detail", 390, 844, "wrongQuestionDetail"),
  await capture("mobile-notes", 390, 844, "notes"),
  await capture("mobile-note-editor", 390, 844, "noteEditor"),
  await capture("mobile-note-ai-result", 390, 844, "noteAiResult")
];

await browser.close();
console.log(JSON.stringify({ captures, errors }, null, 2));
