import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative as pathRelative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const include = new Set([".js", ".mjs", ".css", ".html", ".json", ".sql", ".cmd", ".md"]);
const ignoreDirs = new Set(["node_modules", ".git", ".runtime", "data", "docs"]);
const ignoreFilePatterns = [/\.generated\.js$/i, /\.zip$/i, /\.log$/i];

function relative(file) {
  return `./${pathRelative(root, file).replaceAll("\\", "/")}`;
}

function categoryOf(file) {
  const path = relative(file);
  if (path.startsWith("./server/src/")) {
    return "server-business-code";
  }
  if (path.startsWith("./client/")) {
    return "client-business-code";
  }
  if (path.startsWith("./services/")) {
    return "microservices-code";
  }
  if (path.startsWith("./shared/")) {
    return "shared-infrastructure";
  }
  if (path.startsWith("./prototypes/")) {
    return "frontend-prototypes";
  }
  if (path.startsWith("./test/")) {
    return "tests";
  }
  if (path.startsWith("./database/migrations/")) {
    return "database-migrations";
  }
  if (path.startsWith("./scripts/")) {
    return "engineering-scripts";
  }
  if (path.endsWith(".cmd")) {
    return "local-runner";
  }
  return "metadata";
}

async function walk(dir, files = []) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (item.isDirectory()) {
      if (!ignoreDirs.has(item.name)) {
        await walk(join(dir, item.name), files);
      }
    } else if (include.has(extname(item.name)) && !ignoreFilePatterns.some((pattern) => pattern.test(item.name))) {
      files.push(join(dir, item.name));
    }
  }
  return files;
}

const files = await walk(root);
let total = 0;
const rows = [];
const categories = new Map();
for (const file of files) {
  const text = await readFile(file, "utf8");
  const count = text.split(/\r?\n/).filter((line) => line.trim()).length;
  const category = categoryOf(file);
  total += count;
  rows.push({ file: relative(file), category, lines: count });
  categories.set(category, (categories.get(category) || 0) + count);
}

console.log("By category:");
for (const [category, lines] of [...categories.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`${String(lines).padStart(5)}  ${category}`);
}
console.log("");
console.log("By file:");
for (const row of rows.sort((a, b) => b.lines - a.lines)) {
  console.log(`${String(row.lines).padStart(5)}  ${row.category.padEnd(22)}  ${row.file}`);
}
console.log("-----");
console.log(`${String(total).padStart(5)}  total`);
