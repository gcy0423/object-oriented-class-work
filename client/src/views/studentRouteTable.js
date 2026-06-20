export const STUDENT_PRIMARY_ROUTES = [
  { route: "student-ai", label: "AI 学习台", icon: "AI" },
  { route: "student-learning", label: "学习", icon: "学" },
  { route: "student-assignments", label: "作业", icon: "作" },
  { route: "student-practice", label: "练习与错题", icon: "练" },
  { route: "student-notes", label: "课程笔记", icon: "记" }
];

export const studentRouteTable = {
  "student-ai": { title: "AI 学习台", parent: "" },
  "student-ai-insight": { title: "AI 分析结果", parent: "student-ai" },
  "student-learning": { title: "学习", parent: "" },
  "student-task-detail": { title: "学习任务详情", parent: "student-learning" },
  "student-assignments": { title: "作业", parent: "" },
  "student-assignment-detail": { title: "作业详情", parent: "student-assignments" },
  "student-submit": { title: "提交作业", parent: "student-assignment-detail" },
  "student-assignment-history": { title: "作业历史", parent: "student-assignment-detail" },
  "student-feedback": { title: "教师反馈", parent: "student-assignment-detail" },
  "student-submit-preview": { title: "提交预览", parent: "student-submit" },
  "student-submit-success": { title: "提交成功", parent: "student-assignments" },
  "student-practice": { title: "练习与错题", parent: "" },
  "student-practice-session": { title: "练习答题", parent: "student-practice" },
  "student-practice-result": { title: "练习结果", parent: "student-practice" },
  "student-mistake-detail": { title: "错题详情", parent: "student-practice" },
  "student-notes": { title: "课程笔记", parent: "" },
  "student-note-editor": { title: "笔记编辑", parent: "student-notes" },
  "student-note-ai-result": { title: "AI 笔记整理结果", parent: "student-note-editor" }
};

export function isStudentRoute(route) {
  return Boolean(studentRouteTable[route]);
}

export function studentTitleFor(route) {
  return studentRouteTable[route]?.title || "AI 学习台";
}

export function studentParentRoute(route) {
  return studentRouteTable[route]?.parent || "student-ai";
}
