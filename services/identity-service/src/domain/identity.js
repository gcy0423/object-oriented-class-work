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
    this.status = record.status || "active";
    this.department = record.department || "";
    this.major = record.major || "";
    this.studentNo = record.studentNo || "";
    this.teacherNo = record.teacherNo || "";
    this.phone = record.phone || "";
    this.profile = record.profile || {};
  }
}

export class Classroom extends Entity {
  constructor(record) {
    super(record);
    this.name = record.name || "";
    this.courseId = record.courseId || "";
    this.courseTitle = record.courseTitle || "";
    this.teacherId = record.teacherId || "";
    this.description = record.description || "";
    this.status = record.status || "active";
    this.capacity = Number(record.capacity || 60);
    this.tags = Array.isArray(record.tags) ? record.tags : [];
  }
}

export class CourseEnrollment extends Entity {
  constructor(record) {
    super(record);
    this.classroomId = record.classroomId || "";
    this.courseId = record.courseId || "";
    this.userId = record.userId || "";
    this.role = record.role || Roles.STUDENT;
    this.status = record.status || "active";
    this.joinedAt = record.joinedAt || this.createdAt;
    this.source = record.source || "manual";
  }
}

export class StudyGroup extends Entity {
  constructor(record) {
    super(record);
    this.classroomId = record.classroomId || "";
    this.courseId = record.courseId || "";
    this.name = record.name || "";
    this.leaderId = record.leaderId || "";
    this.description = record.description || "";
    this.status = record.status || "active";
    this.tags = Array.isArray(record.tags) ? record.tags : [];
  }
}

export class GroupMember extends Entity {
  constructor(record) {
    super(record);
    this.groupId = record.groupId || "";
    this.userId = record.userId || "";
    this.role = record.role || "member";
    this.status = record.status || "active";
    this.joinedAt = record.joinedAt || this.createdAt;
  }
}

export class RolePermission extends Entity {
  constructor(record) {
    super(record);
    this.role = record.role || Roles.STUDENT;
    this.resource = record.resource || "";
    this.actions = Array.isArray(record.actions) ? record.actions : [];
    this.description = record.description || "";
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

export class ClassroomRepository extends Repository {
  constructor(database) {
    super(database, "classrooms", (record) => new Classroom(record));
  }

  findByCourse(courseId) {
    return this.where((classroom) => classroom.courseId === courseId);
  }
}

export class EnrollmentRepository extends Repository {
  constructor(database) {
    super(database, "enrollments", (record) => new CourseEnrollment(record));
  }

  findByClassroom(classroomId) {
    return this.where((enrollment) => enrollment.classroomId === classroomId);
  }

  findByUser(userId) {
    return this.where((enrollment) => enrollment.userId === userId);
  }

  findMembership(classroomId, userId) {
    return this.where((enrollment) => enrollment.classroomId === classroomId && enrollment.userId === userId)[0] || null;
  }
}

export class StudyGroupRepository extends Repository {
  constructor(database) {
    super(database, "studyGroups", (record) => new StudyGroup(record));
  }

  findByClassroom(classroomId) {
    return this.where((group) => group.classroomId === classroomId);
  }
}

export class GroupMemberRepository extends Repository {
  constructor(database) {
    super(database, "groupMembers", (record) => new GroupMember(record));
  }

  findByGroup(groupId) {
    return this.where((member) => member.groupId === groupId);
  }

  findByUser(userId) {
    return this.where((member) => member.userId === userId);
  }

  findMembership(groupId, userId) {
    return this.where((member) => member.groupId === groupId && member.userId === userId)[0] || null;
  }
}

export class RolePermissionRepository extends Repository {
  constructor(database) {
    super(database, "rolePermissions", (record) => new RolePermission(record));
  }

  findByRole(role) {
    return this.where((permission) => permission.role === role);
  }
}
