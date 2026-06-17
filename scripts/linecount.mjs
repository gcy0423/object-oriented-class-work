import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const include = new Set([".js", ".mjs", ".css", ".html", ".json", ".sql", ".cmd"]);
const ignoredDirs = new Set([
  ".git",
  ".runtime",
  "node_modules",
  "coverage",
  "dist",
  "build",
  "docs",
  "data",
  "screenshots"
]);
const ignoredFilePatterns = [/\.generated\.js$/i, /\.zip$/i, /\.log$/i, /\.docx$/i, /\.png$/i];

const categories = [
  ["client-business-code", (path) => path.startsWith(`client${sep}`)],
  ["server-business-code", (path) => path.startsWith(`server${sep}`)],
  ["microservices-code", (path) => path.startsWith(`services${sep}`)],
  ["shared-infrastructure", (path) => path.startsWith(`shared${sep}`)],
  ["frontend-prototypes", (path) => path.startsWith(`prototypes${sep}`)],
  ["tests", (path) => path.startsWith(`test${sep}`)],
  ["engineering-scripts", (path) => path.startsWith(`scripts${sep}`)],
  ["database-migrations", (path) => path.startsWith(`database${sep}`)],
  ["local-runner", (path) => path.endsWith(".cmd")],
  ["metadata", (path) => path === "package.json" || path === "README.md" || path === ".gitignore"]
];

function shouldIgnoreFile(name) {
  return ignoredFilePatterns.some((pattern) => pattern.test(name));
}

function categoryFor(path) {
  const found = categories.find(([, predicate]) => predicate(path));
  return found ? found[0] : "other";
}

async function walk(dir, files = []) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (item.isDirectory()) {
      if (!ignoredDirs.has(item.name)) {
        await walk(join(dir, item.name), files);
      }
    } else if (include.has(extname(item.name)) && !shouldIgnoreFile(item.name)) {
      files.push(join(dir, item.name));
    }
  }
  return files;
}

const files = await walk(root);
let total = 0;
const rows = [];
const byCategory = new Map();

for (const file of files) {
  const text = await readFile(file, "utf8");
  const count = text.split(/\r?\n/).filter((line) => line.trim()).length;
  const localPath = relative(root, file);
  const category = categoryFor(localPath);
  total += count;
  rows.push({ file: `.${sep}${localPath}`, lines: count, category });
  byCategory.set(category, (byCategory.get(category) || 0) + count);
}

console.log("By category:");
for (const [category, lines] of [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`${String(lines).padStart(5)}  ${category}`);
}

console.log("");
console.log("By file:");
for (const row of rows.sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file))) {
  console.log(`${String(row.lines).padStart(5)}  ${row.category.padEnd(22)} ${row.file}`);
}

console.log("-----");
console.log(`${String(total).padStart(5)}  total`);
