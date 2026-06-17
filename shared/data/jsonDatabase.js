import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname } from "node:path";

export class JsonDatabase {
  constructor(filePath, seedFactory) {
    this.filePath = filePath;
    this.seedFactory = seedFactory;
    this.state = null;
    this.writeQueue = Promise.resolve();
  }

  async load() {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.state = JSON.parse(raw);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      this.state = this.seedFactory();
      await this.save();
    }
    return this.state;
  }

  get collectionNames() {
    return Object.keys(this.state || {});
  }

  collection(name) {
    if (!this.state) {
      throw new Error("Database must be loaded before use.");
    }
    if (!Array.isArray(this.state[name])) {
      this.state[name] = [];
    }
    return this.state[name];
  }

  nextId(prefix) {
    return `${prefix}_${randomUUID().slice(0, 8)}`;
  }

  async save() {
    const write = async () => {
      const body = `${JSON.stringify(this.state, null, 2)}\n`;
      await fs.writeFile(this.filePath, body, "utf8");
    };
    this.writeQueue = this.writeQueue.then(write, write);
    return this.writeQueue;
  }
}
