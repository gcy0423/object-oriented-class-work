import { fileURLToPath } from "node:url";
import { JsonDatabase } from "../../../shared/data/jsonDatabase.js";
import { Router } from "../../../shared/http/router.js";
import { createServiceServer } from "../../../shared/http/server.js";
import { AuthService } from "./application/authService.js";
import { ClassManagementService } from "./application/classManagementService.js";
import { loadConfig } from "./config.js";
import {
  ClassroomRepository,
  EnrollmentRepository,
  GroupMemberRepository,
  RolePermissionRepository,
  StudyGroupRepository,
  UserRepository
} from "./domain/identity.js";
import { createIdentitySeed } from "./infrastructure/seed.js";
import { registerRoutes } from "./routes.js";

export function createApp(config = loadConfig()) {
  const database = new JsonDatabase(config.dataFile, () => createIdentitySeed());
  const ready = database.load();
  const repositories = {
    users: new UserRepository(database),
    classrooms: new ClassroomRepository(database),
    enrollments: new EnrollmentRepository(database),
    groups: new StudyGroupRepository(database),
    groupMembers: new GroupMemberRepository(database),
    permissions: new RolePermissionRepository(database)
  };
  const auth = new AuthService({ users: repositories.users, config });
  const classes = new ClassManagementService({
    database,
    users: repositories.users,
    classrooms: repositories.classrooms,
    enrollments: repositories.enrollments,
    groups: repositories.groups,
    groupMembers: repositories.groupMembers,
    permissions: repositories.permissions
  });
  const services = { ready, database, repositories, auth, classes };
  const router = new Router();
  registerRoutes(router, config, services);
  const server = createServiceServer({ router, config });
  return { config, router, server, services };
}

export async function startService(config = loadConfig()) {
  const app = createApp(config);
  await new Promise((resolve) => {
    app.server.listen(config.port, config.host, resolve);
  });
  return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const app = await startService();
  console.log(`${app.config.serviceName} running at http://${app.config.host}:${app.server.address().port}`);
}
