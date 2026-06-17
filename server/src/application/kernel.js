import { DomainEventBus, SyncHub } from "../framework/eventBus.js";
import { JsonDatabase } from "../infrastructure/jsonDatabase.js";
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
      eventBus
    });
    this.ai = new AITutorService({ config, learning: this.learning, activity: this.activity });
    this.collaboration = new CollaborationService({
      database,
      messages: this.repositories.messages,
      activity: this.activity,
      eventBus
    });
    this.security = new SecurityFacade();
  }

  static async boot(config) {
    const database = new JsonDatabase(config.dataFile, createSeedData);
    await database.load();
    const eventBus = new DomainEventBus();
    return new AppKernel({ config, database, eventBus });
  }
}
