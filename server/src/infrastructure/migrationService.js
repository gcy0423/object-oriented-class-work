import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { basename, join } from "node:path";
import { MigrationError } from "../common/errors.js";

const requiredCollections = Object.freeze([
  "users",
  "courses",
  "goals",
  "tasks",
  "notes",
  "messages",
  "activityLogs",
  "knowledgeDocuments",
  "knowledgeChunks",
  "aiConversations",
  "aiMessages",
  "notifications",
  "auditEvents",
  "reports",
  "roleBindings",
  "promptTemplates"
]);

function checksum(text) {
  return createHash("sha256").update(text).digest("hex");
}

function parseMigrationHeader(fileName, text) {
  const id = /^--\s*@id:\s*(.+)$/m.exec(text)?.[1]?.trim() || fileName.replace(/\.sql$/i, "");
  const description = /^--\s*@description:\s*(.+)$/m.exec(text)?.[1]?.trim() || id;
  const scope = /^--\s*@scope:\s*(.+)$/m.exec(text)?.[1]?.trim() || "schema";
  return { id, description, scope };
}

export class MigrationService {
  constructor({ database, migrationsDir }) {
    this.database = database;
    this.migrationsDir = migrationsDir;
  }

  ensureMetadata() {
    if (!this.database.state._meta) {
      this.database.state._meta = {};
    }
    if (!Array.isArray(this.database.state._meta.migrations)) {
      this.database.state._meta.migrations = [];
    }
    if (!this.database.state._meta.schemaVersion) {
      this.database.state._meta.schemaVersion = 0;
    }
    for (const collection of requiredCollections) {
      if (!Array.isArray(this.database.state[collection])) {
        this.database.state[collection] = [];
      }
    }
  }

  async loadMigrationFiles() {
    try {
      const entries = await fs.readdir(this.migrationsDir, { withFileTypes: true });
      const files = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));
      const migrations = [];
      for (const file of files) {
        const fullPath = join(this.migrationsDir, file);
        const text = await fs.readFile(fullPath, "utf8");
        migrations.push({
          file,
          path: fullPath,
          sql: text,
          checksum: checksum(text),
          ...parseMigrationHeader(file, text)
        });
      }
      return migrations;
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw new MigrationError("读取数据库迁移文件失败。", { migrationsDir: this.migrationsDir, cause: error.message });
    }
  }

  appliedMigrationMap() {
    return new Map(this.database.state._meta.migrations.map((item) => [item.id, item]));
  }

  validateAppliedMigration(migration, applied) {
    if (!applied) {
      return;
    }
    if (applied.checksum !== migration.checksum) {
      throw new MigrationError("数据库迁移校验和不一致，请勿修改已应用迁移。", {
        id: migration.id,
        file: basename(migration.file),
        expected: applied.checksum,
        actual: migration.checksum
      });
    }
  }

  applyMetadataMigration(migration, order) {
    const now = new Date().toISOString();
    this.database.state._meta.migrations.push({
      id: migration.id,
      file: migration.file,
      description: migration.description,
      scope: migration.scope,
      checksum: migration.checksum,
      appliedAt: now,
      order
    });
    this.database.state._meta.schemaVersion = Math.max(this.database.state._meta.schemaVersion, order);
  }

  async migrate() {
    this.ensureMetadata();
    const migrations = await this.loadMigrationFiles();
    const applied = this.appliedMigrationMap();
    let changed = false;
    migrations.forEach((migration, index) => {
      const current = applied.get(migration.id);
      this.validateAppliedMigration(migration, current);
      if (!current) {
        this.applyMetadataMigration(migration, index + 1);
        changed = true;
      }
    });
    if (changed) {
      await this.database.save();
    }
    return {
      schemaVersion: this.database.state._meta.schemaVersion,
      applied: this.database.state._meta.migrations.length,
      pending: 0,
      collections: requiredCollections
    };
  }
}
