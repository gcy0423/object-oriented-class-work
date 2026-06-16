import { DomainEventBus, SyncHub } from "../framework/eventBus.js";
import { AccessPolicyService } from "../common/accessPolicy.js";
import { JsonDatabase } from "../infrastructure/jsonDatabase.js";
import { MigrationService } from "../infrastructure/migrationService.js";
import { createSeedData } from "../infrastructure/seed.js";
import { ActivityLogRepository, MessageRepository } from "../domain/collaboration.js";
import { UserRepository } from "../domain/identity.js";
import { CourseRepository, GoalRepository, NoteRepository, TaskRepository } from "../domain/learning.js";
import { ActivityService, AITutorService, AuthService, CollaborationService, LearningService, SecurityFacade } from "./services.js";

export class AppKernel {
  constructor({ config, database, eventBus }) {
    this.config = config;
    this.database = database;
    this.eventBus = eventBus;
    this.syncHub = new SyncHub(eventBus);
    this.accessPolicy = new AccessPolicyService();
    this.repositories = {
      users: new UserRepository(database),
      courses: new CourseRepository(database),
      goals: new GoalRepository(database),
      tasks: new TaskRepository(database),
      notes: new NoteRepository(database),
      messages: new MessageRepository(database),
      logs: new ActivityLogRepository(database)
    };
    this.activity = new ActivityService({ logs: this.repositories.logs, eventBus });
    this.auth = new AuthService({ users: this.repositories.users, config });
    this.learning = new LearningService({
      database,
      courses: this.repositories.courses,
      goals: this.repositories.goals,
      tasks: this.repositories.tasks,
      notes: this.repositories.notes,
      activity: this.activity,
      eventBus,
      accessPolicy: this.accessPolicy
    });
    this.ai = new AITutorService({ config, learning: this.learning, activity: this.activity, accessPolicy: this.accessPolicy });
    this.collaboration = new CollaborationService({
      database,
      messages: this.repositories.messages,
      activity: this.activity,
      eventBus,
      accessPolicy: this.accessPolicy
    });
    this.security = new SecurityFacade(this.accessPolicy);
  }

  static async boot(config) {
    const database = new JsonDatabase(config.dataFile, createSeedData);
    await database.load();
    const migration = new MigrationService({ database, migrationsDir: config.migrationsDir });
    await migration.migrate();
    const eventBus = new DomainEventBus();
    return new AppKernel({ config, database, eventBus });
  }
}
