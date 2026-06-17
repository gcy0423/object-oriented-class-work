import { mkdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
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
    if (msg.type() === "error") {
      errors.push(`${name}: ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  if (view) {
    await page.locator(`[data-view="${view}"]:visible`).first().click();
  }
  await page.waitForTimeout(350);
  const shotPath = resolve(shotsDir, `${name}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    activeView: document.querySelector(".view.active")?.id,
    bottomNav: getComputedStyle(document.querySelector(".bottom-nav")).display,
    rail: getComputedStyle(document.querySelector(".rail")).display
  }));
  await page.close();
  return { name, shotPath, metrics };
}

const captures = [
  await capture("desktop-desk", 1440, 1000),
  await capture("desktop-tasks", 1440, 1000, "tasks"),
  await capture("mobile-desk", 390, 844),
  await capture("mobile-assignment", 390, 844, "assignment")
];

await browser.close();

console.log(JSON.stringify({ captures, errors }, null, 2));
