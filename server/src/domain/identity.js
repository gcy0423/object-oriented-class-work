import { Entity, Repository } from "./shared.js";

export const Roles = Object.freeze({
  STUDENT: "student",
  TEACHER: "teacher",
  ADMIN: "admin"
});

export class User extends Entity {
  constructor(record) {
    super(record);
    this.name = record.name;
    this.role = record.role || Roles.STUDENT;
    this.email = record.email;
    this.avatar = record.avatar || record.name?.slice(0, 1) || "U";
  }

  canManageCourse(course) {
    return this.role === Roles.ADMIN || course.teacherId === this.id;
  }

  canReadLearningProfile(ownerId) {
    return this.role === Roles.ADMIN || this.role === Roles.TEACHER || this.id === ownerId;
  }
}

export class UserRepository extends Repository {
  constructor(database) {
    super(database, "users", (record) => new User(record));
  }

  findByEmail(email) {
    return this.all().find((user) => user.email === email) || null;
  }

  findByRole(role) {
    return this.where((user) => user.role === role);
  }
}

export class AccessPolicy {
  assertAuthenticated(user) {
    if (!user) {
      throw new Error("AUTH_REQUIRED");
    }
  }

  canCreateCourse(user) {
    return [Roles.TEACHER, Roles.ADMIN].includes(user.role);
  }

  canUseAI(user) {
    return [Roles.STUDENT, Roles.TEACHER, Roles.ADMIN].includes(user.role);
  }
}
