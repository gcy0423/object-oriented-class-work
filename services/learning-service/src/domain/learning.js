import { Repository } from "../../../../shared/data/repository.js";
import { Entity } from "../../../../shared/domain/entity.js";

export const TaskStatus = Object.freeze({
  TODO: "todo",
  DOING: "doing",
  DONE: "done"
});

export class Course extends Entity {
  constructor(record) {
    super(record);
    this.title = record.title;
    this.teacherId = record.teacherId;
    this.description = record.description || "";
    this.tags = record.tags || [];
  }
}

export class LearningGoal extends Entity {
  constructor(record) {
    super(record);
    this.ownerId = record.ownerId;
    this.courseId = record.courseId;
    this.title = record.title;
    this.targetDate = record.targetDate;
    this.priority = record.priority || "medium";
    this.status = record.status || "active";
    this.progress = Number(record.progress || 0);
  }

  recalculateProgress(tasks) {
    const related = tasks.filter((task) => task.goalId === this.id);
    if (related.length === 0) {
      this.progress = 0;
      this.status = "active";
      this.touch();
      return;
    }

    const done = related.filter((task) => task.status === TaskStatus.DONE).length;
    this.progress = Math.round((done / related.length) * 100);
    this.status = this.progress >= 100 ? "completed" : "active";
    this.touch();
  }
}

export class StudyTask extends Entity {
  constructor(record) {
    super(record);
    this.goalId = record.goalId;
    this.ownerId = record.ownerId;
    this.title = record.title;
    this.status = record.status || TaskStatus.TODO;
    this.estimateMinutes = Number(record.estimateMinutes || 60);
    this.dueDate = record.dueDate;
  }

  complete() {
    this.status = TaskStatus.DONE;
    this.touch();
  }
}

export class LearningNote extends Entity {
  constructor(record) {
    super(record);
    this.ownerId = record.ownerId;
    this.courseId = record.courseId;
    this.title = record.title;
    this.content = record.content || "";
    this.tags = record.tags || [];
  }
}

class LearningRepository extends Repository {
  constructor(database, collectionName, factory) {
    super(database, collectionName, factory);
  }
}

export class CourseRepository extends LearningRepository {
  constructor(database) {
    super(database, "courses", (record) => new Course(record));
  }
}

export class GoalRepository extends LearningRepository {
  constructor(database) {
    super(database, "goals", (record) => new LearningGoal(record));
  }

  findByOwner(ownerId) {
    return this.where((goal) => goal.ownerId === ownerId);
  }
}

export class TaskRepository extends LearningRepository {
  constructor(database) {
    super(database, "tasks", (record) => new StudyTask(record));
  }

  findByGoal(goalId) {
    return this.where((task) => task.goalId === goalId);
  }

  findByOwner(ownerId) {
    return this.where((task) => task.ownerId === ownerId);
  }
}

export class NoteRepository extends LearningRepository {
  constructor(database) {
    super(database, "notes", (record) => new LearningNote(record));
  }

  findByOwner(ownerId) {
    return this.where((note) => note.ownerId === ownerId);
  }

  findByOwnerWithFilters(ownerId, filters = {}) {
    const keyword = String(filters.q || "").trim().toLowerCase();
    return this.where((note) => {
      if (note.ownerId !== ownerId) {
        return false;
      }
      if (filters.courseId && note.courseId !== filters.courseId) {
        return false;
      }
      if (keyword && !`${note.title} ${note.content} ${(note.tags || []).join(" ")}`.toLowerCase().includes(keyword)) {
        return false;
      }
      return true;
    }).sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  }
}
