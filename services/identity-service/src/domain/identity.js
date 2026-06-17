import { Entity } from "../../../../shared/domain/entity.js";
import { Repository } from "../../../../shared/data/repository.js";

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
}

export class UserRepository extends Repository {
  constructor(database) {
    super(database, "users", (record) => new User(record));
  }

  findByEmail(email) {
    return this.all().find((user) => user.email === email) || null;
  }
}
