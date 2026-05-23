import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const include = new Set([".js", ".mjs", ".css", ".html", ".json"]);
const ignoreDirs = new Set(["node_modules", ".git", "data", "docs"]);

async function walk(dir, files = []) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (item.isDirectory()) {
      if (!ignoreDirs.has(item.name)) {
        await walk(join(dir, item.name), files);
      }
    } else if (include.has(extname(item.name))) {
      files.push(join(dir, item.name));
    }
  }
  return files;
}

const files = await walk(root);
let total = 0;
const rows = [];
for (const file of files) {
  const text = await readFile(file, "utf8");
  const count = text.split(/\r?\n/).filter((line) => line.trim()).length;
  total += count;
  rows.push({ file: file.replace(root, "."), lines: count });
}

for (const row of rows.sort((a, b) => b.lines - a.lines)) {
  console.log(`${String(row.lines).padStart(5)}  ${row.file}`);
}
console.log("-----");
console.log(`${String(total).padStart(5)}  total`);
