import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { Classroom, CourseEnrollment, GroupMember, Roles, StudyGroup, User } from "../domain/identity.js";

function requireText(value, label) {
  if (!String(value || "").trim()) {
    throw new ValidationError(`${label} is required.`);
  }
  return String(value).trim();
}

function optionalText(value) {
  return String(value || "").trim();
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => optionalText(item)).filter(Boolean);
  }
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isManager(user) {
  return user?.role === Roles.TEACHER || user?.role === Roles.ADMIN;
}

function requireManager(user) {
  if (!isManager(user)) {
    throw new ForbiddenError("Class management requires teacher or admin role.");
  }
}

function compactRole(role, fallback = Roles.STUDENT) {
  return Object.values(Roles).includes(role) ? role : fallback;
}

function compactStatus(status, fallback = "active") {
  return ["active", "inactive", "archived", "pending"].includes(status) ? status : fallback;
}

export class ClassManagementService {
  constructor({ database, users, classrooms, enrollments, groups, groupMembers, permissions }) {
    this.database = database;
    this.users = users;
    this.classrooms = classrooms;
    this.enrollments = enrollments;
    this.groups = groups;
    this.groupMembers = groupMembers;
    this.permissions = permissions;
  }

  userSummary(user) {
    const enrollments = this.enrollments.findByUser(user.id);
    const groupMemberships = this.groupMembers.findByUser(user.id);
    return {
      ...user.toJSON(),
      classroomCount: enrollments.length,
      groupCount: groupMemberships.length,
      permissions: this.permissions.findByRole(user.role).map((permission) => permission.toJSON())
    };
  }

  listUsers(requestUser, filters = {}) {
    requireManager(requestUser);
    const keyword = optionalText(filters.q).toLowerCase();
    return this.users
      .all()
      .filter((user) => !filters.role || user.role === filters.role)
      .filter((user) => !filters.status || user.status === filters.status)
      .filter((user) => !keyword || `${user.name} ${user.email} ${user.department} ${user.major}`.toLowerCase().includes(keyword))
      .map((user) => this.userSummary(user));
  }

  getUserProfile(requestUser, userId) {
    if (!isManager(requestUser) && requestUser.id !== userId) {
      throw new ForbiddenError("Cannot inspect another user profile.");
    }
    const user = this.users.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found.");
    }
    return {
      user: this.userSummary(user),
      enrollments: this.enrollments.findByUser(userId).map((item) => ({
        ...item.toJSON(),
        classroom: this.classrooms.findById(item.classroomId)?.toJSON() || null
      })),
      groups: this.groupMembers.findByUser(userId).map((item) => ({
        ...item.toJSON(),
        group: this.groups.findById(item.groupId)?.toJSON() || null
      }))
    };
  }

  async updateUserProfile(requestUser, userId, input = {}) {
    if (!isManager(requestUser) && requestUser.id !== userId) {
      throw new ForbiddenError("Cannot update another user profile.");
    }
    const user = this.users.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found.");
    }
    const now = new Date().toISOString();
    const updated = new User({
      ...user.toJSON(),
      name: input.name !== undefined ? requireText(input.name, "Name") : user.name,
      role: isManager(requestUser) && input.role ? compactRole(input.role, user.role) : user.role,
      status: isManager(requestUser) && input.status ? compactStatus(input.status, user.status) : user.status,
      department: input.department !== undefined ? optionalText(input.department) : user.department,
      major: input.major !== undefined ? optionalText(input.major) : user.major,
      studentNo: input.studentNo !== undefined ? optionalText(input.studentNo) : user.studentNo,
      teacherNo: input.teacherNo !== undefined ? optionalText(input.teacherNo) : user.teacherNo,
      phone: input.phone !== undefined ? optionalText(input.phone) : user.phone,
      profile: {
        ...user.profile,
        ...(input.profile && typeof input.profile === "object" ? input.profile : {})
      },
      updatedAt: now
    });
    return this.users.save(updated);
  }

  listClassrooms(requestUser, filters = {}) {
    const ownEnrollments = new Set(this.enrollments.findByUser(requestUser.id).map((item) => item.classroomId));
    return this.classrooms
      .all()
      .filter((classroom) => isManager(requestUser) || ownEnrollments.has(classroom.id) || classroom.teacherId === requestUser.id)
      .filter((classroom) => !filters.courseId || classroom.courseId === filters.courseId)
      .filter((classroom) => !filters.status || classroom.status === filters.status)
      .map((classroom) => this.decorateClassroom(classroom));
  }

  decorateClassroom(classroom) {
    const enrollments = this.enrollments.findByClassroom(classroom.id);
    const groups = this.groups.findByClassroom(classroom.id);
    return {
      ...classroom.toJSON(),
      stats: {
        studentCount: enrollments.filter((item) => item.role === Roles.STUDENT && item.status === "active").length,
        teacherCount: enrollments.filter((item) => item.role === Roles.TEACHER && item.status === "active").length,
        groupCount: groups.length,
        capacity: classroom.capacity,
        fillRate: classroom.capacity ? Math.round((enrollments.length / classroom.capacity) * 100) : 0
      }
    };
  }

  getClassroom(requestUser, classroomId) {
    const classroom = this.classrooms.findById(classroomId);
    if (!classroom) {
      throw new NotFoundError("Classroom not found.");
    }
    const membership = this.enrollments.findMembership(classroomId, requestUser.id);
    if (!isManager(requestUser) && !membership && classroom.teacherId !== requestUser.id) {
      throw new ForbiddenError("Cannot inspect this classroom.");
    }
    const enrollments = this.enrollments.findByClassroom(classroomId);
    const groups = this.groups.findByClassroom(classroomId);
    return {
      classroom: this.decorateClassroom(classroom),
      enrollments: enrollments.map((item) => ({
        ...item.toJSON(),
        user: this.users.findById(item.userId)?.toJSON() || null
      })),
      groups: groups.map((group) => this.decorateGroup(group))
    };
  }

  async createClassroom(requestUser, input = {}) {
    requireManager(requestUser);
    const now = new Date().toISOString();
    const classroom = new Classroom({
      id: this.database.nextId("class"),
      name: requireText(input.name, "Classroom name"),
      courseId: requireText(input.courseId, "Course"),
      courseTitle: optionalText(input.courseTitle || input.name),
      teacherId: optionalText(input.teacherId) || requestUser.id,
      description: optionalText(input.description),
      status: compactStatus(input.status),
      capacity: Number(input.capacity || 60),
      tags: normalizeList(input.tags),
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.classrooms.save(classroom);
    await this.assignUser(requestUser, saved.id, {
      userId: saved.teacherId,
      role: Roles.TEACHER,
      status: "active",
      source: "classroom-owner"
    });
    return this.decorateClassroom(saved);
  }

  async assignUser(requestUser, classroomId, input = {}) {
    requireManager(requestUser);
    const classroom = this.classrooms.findById(classroomId);
    if (!classroom) {
      throw new NotFoundError("Classroom not found.");
    }
    const userId = requireText(input.userId, "User");
    if (!this.users.findById(userId)) {
      throw new NotFoundError("User not found.");
    }
    const existing = this.enrollments.findMembership(classroomId, userId);
    const now = new Date().toISOString();
    const enrollment = new CourseEnrollment({
      ...(existing ? existing.toJSON() : {}),
      id: existing?.id || this.database.nextId("enroll"),
      classroomId,
      courseId: classroom.courseId,
      userId,
      role: compactRole(input.role, Roles.STUDENT),
      status: compactStatus(input.status),
      joinedAt: existing?.joinedAt || now,
      source: input.source || existing?.source || "manual",
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });
    return this.enrollments.save(enrollment);
  }

  listGroups(requestUser, filters = {}) {
    const visibleClassrooms = new Set(this.listClassrooms(requestUser, filters).map((classroom) => classroom.id));
    return this.groups
      .all()
      .filter((group) => visibleClassrooms.has(group.classroomId))
      .filter((group) => !filters.classroomId || group.classroomId === filters.classroomId)
      .filter((group) => !filters.status || group.status === filters.status)
      .map((group) => this.decorateGroup(group));
  }

  decorateGroup(group) {
    const members = this.groupMembers.findByGroup(group.id);
    return {
      ...group.toJSON(),
      stats: {
        memberCount: members.filter((item) => item.status === "active").length,
        leaderName: this.users.findById(group.leaderId)?.name || group.leaderId || ""
      }
    };
  }

  async createGroup(requestUser, input = {}) {
    requireManager(requestUser);
    const classroom = this.classrooms.findById(requireText(input.classroomId, "Classroom"));
    if (!classroom) {
      throw new NotFoundError("Classroom not found.");
    }
    const now = new Date().toISOString();
    const group = new StudyGroup({
      id: this.database.nextId("group"),
      classroomId: classroom.id,
      courseId: classroom.courseId,
      name: requireText(input.name, "Group name"),
      leaderId: optionalText(input.leaderId),
      description: optionalText(input.description),
      status: compactStatus(input.status),
      tags: normalizeList(input.tags),
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.groups.save(group);
    if (saved.leaderId) {
      await this.addGroupMember(requestUser, saved.id, { userId: saved.leaderId, role: "leader" });
    }
    return this.decorateGroup(saved);
  }

  async addGroupMember(requestUser, groupId, input = {}) {
    requireManager(requestUser);
    const group = this.groups.findById(groupId);
    if (!group) {
      throw new NotFoundError("Group not found.");
    }
    const userId = requireText(input.userId, "Group member");
    const enrollment = this.enrollments.findMembership(group.classroomId, userId);
    if (!enrollment) {
      await this.assignUser(requestUser, group.classroomId, { userId, role: Roles.STUDENT, source: "group-auto-enroll" });
    }
    const existing = this.groupMembers.findMembership(groupId, userId);
    const now = new Date().toISOString();
    const member = new GroupMember({
      ...(existing ? existing.toJSON() : {}),
      id: existing?.id || this.database.nextId("gmember"),
      groupId,
      userId,
      role: input.role || existing?.role || "member",
      status: compactStatus(input.status),
      joinedAt: existing?.joinedAt || now,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });
    return this.groupMembers.save(member);
  }

  roleMatrix() {
    return {
      roles: Object.values(Roles),
      permissions: this.permissions.all().map((item) => item.toJSON()),
      matrix: Object.values(Roles).map((role) => ({
        role,
        resources: this.permissions.findByRole(role).map((permission) => ({
          resource: permission.resource,
          actions: permission.actions,
          description: permission.description
        }))
      }))
    };
  }

  adminDashboard(requestUser) {
    requireManager(requestUser);
    const users = this.users.all();
    const classrooms = this.classrooms.all();
    const enrollments = this.enrollments.all();
    const groups = this.groups.all();
    const groupMembers = this.groupMembers.all();
    return {
      metrics: {
        userCount: users.length,
        studentCount: users.filter((user) => user.role === Roles.STUDENT).length,
        teacherCount: users.filter((user) => user.role === Roles.TEACHER).length,
        adminCount: users.filter((user) => user.role === Roles.ADMIN).length,
        classroomCount: classrooms.length,
        enrollmentCount: enrollments.length,
        groupCount: groups.length,
        groupMemberCount: groupMembers.length
      },
      usersByRole: Object.values(Roles).map((role) => ({ role, count: users.filter((user) => user.role === role).length })),
      classrooms: classrooms.map((classroom) => this.decorateClassroom(classroom)),
      groups: groups.map((group) => this.decorateGroup(group)),
      roleMatrix: this.roleMatrix()
    };
  }
}
