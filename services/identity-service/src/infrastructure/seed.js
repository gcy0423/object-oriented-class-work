export function createIdentitySeed(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return {
    users: [
      {
        id: "user_student",
        name: "林知夏",
        role: "student",
        email: "student@edumind.local",
        avatar: "林",
        status: "active",
        department: "Computer Science",
        major: "Software Engineering",
        studentNo: "20260001",
        phone: "",
        profile: {
          learningStyle: "practice-first",
          strengths: ["UML basics"],
          risks: ["needs more review evidence"]
        },
        createdAt: today,
        updatedAt: today
      },
      {
        id: "user_teacher",
        name: "周老师",
        role: "teacher",
        email: "teacher@edumind.local",
        avatar: "周",
        status: "active",
        department: "School of Computer Science",
        teacherNo: "T2026001",
        phone: "",
        profile: {
          teachingFocus: ["object modeling", "assessment design"],
          officeHour: "Wednesday 15:00"
        },
        createdAt: today,
        updatedAt: today
      },
      {
        id: "user_admin",
        name: "System Admin",
        role: "admin",
        email: "admin@edumind.local",
        avatar: "A",
        status: "active",
        department: "Teaching Platform",
        teacherNo: "ADM001",
        phone: "",
        profile: {
          responsibility: "class and permission management"
        },
        createdAt: today,
        updatedAt: today
      }
    ],
    classrooms: [
      {
        id: "class_ood_01",
        name: "Object-Oriented Technology Class 01",
        courseId: "course_ood",
        courseTitle: "Object-Oriented Technology and Methods",
        teacherId: "user_teacher",
        description: "Course project classroom for object-oriented analysis, design, implementation, and defense evidence.",
        status: "active",
        capacity: 60,
        tags: ["course-project", "teamwork"],
        createdAt: today,
        updatedAt: today
      }
    ],
    enrollments: [
      {
        id: "enroll_teacher_ood",
        classroomId: "class_ood_01",
        courseId: "course_ood",
        userId: "user_teacher",
        role: "teacher",
        status: "active",
        joinedAt: today,
        source: "seed",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "enroll_student_ood",
        classroomId: "class_ood_01",
        courseId: "course_ood",
        userId: "user_student",
        role: "student",
        status: "active",
        joinedAt: today,
        source: "seed",
        createdAt: today,
        updatedAt: today
      }
    ],
    studyGroups: [
      {
        id: "group_ood_alpha",
        classroomId: "class_ood_01",
        courseId: "course_ood",
        name: "OO Design Alpha Group",
        leaderId: "user_student",
        description: "Group for report, frontend, backend, and collaboration evidence tasks.",
        status: "active",
        tags: ["design", "implementation"],
        createdAt: today,
        updatedAt: today
      }
    ],
    groupMembers: [
      {
        id: "gmember_alpha_student",
        groupId: "group_ood_alpha",
        userId: "user_student",
        role: "leader",
        status: "active",
        joinedAt: today,
        createdAt: today,
        updatedAt: today
      }
    ],
    rolePermissions: [
      {
        id: "perm_student_learning",
        role: "student",
        resource: "learning",
        actions: ["read:self", "create:self", "update:self"],
        description: "Students manage their own learning goals, tasks, notes, practice, and report exports.",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "perm_student_collaboration",
        role: "student",
        resource: "collaboration",
        actions: ["read:room", "create:message", "create:task", "read:report"],
        description: "Students can participate in assigned course and group collaboration spaces.",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "perm_teacher_assessment",
        role: "teacher",
        resource: "assessment",
        actions: ["create:assignment", "grade:submission", "read:course-report", "manage:rubric"],
        description: "Teachers manage assessment workflows and inspect course reports.",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "perm_teacher_class",
        role: "teacher",
        resource: "classroom",
        actions: ["create:class", "assign:student", "create:group", "read:dashboard"],
        description: "Teachers manage classes, course enrollment, and study groups.",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "perm_admin_platform",
        role: "admin",
        resource: "platform",
        actions: ["manage:users", "manage:classes", "manage:permissions", "read:all"],
        description: "Administrators manage platform identity, classes, and role permission matrix.",
        createdAt: today,
        updatedAt: today
      }
    ],
    sessions: []
  };
}
