export const TEACHER_PRIMARY_ROUTES = [
  { route: "teacher-home", label: "AI 教学台", icon: "AI" },
  { route: "teacher-course", label: "课程学情", icon: "课" },
  { route: "teacher-assignment", label: "作业", icon: "作" },
  { route: "teacher-review", label: "批改", icon: "批" },
  { route: "teacher-intervention", label: "干预", icon: "干" },
  { route: "teacher-report", label: "报告", icon: "报" },
  { route: "teacher-student", label: "学生画像", icon: "生" }
];

export const teacherRouteTable = {
  "teacher-home": { title: "AI 教学台", parent: "" },
  "teacher-course": { title: "课程学情", parent: "teacher-home" },
  "teacher-student": { title: "学生画像", parent: "teacher-course" },
  "teacher-assignment": { title: "作业", parent: "teacher-home" },
  "teacher-review": { title: "批改", parent: "teacher-assignment" },
  "teacher-intervention": { title: "干预队列", parent: "teacher-home" },
  "teacher-report": { title: "报告", parent: "teacher-home" }
};

export function isTeacherRoute(route) {
  return Boolean(teacherRouteTable[route]);
}

export function teacherTitleFor(route) {
  return teacherRouteTable[route]?.title || "AI 教学台";
}
