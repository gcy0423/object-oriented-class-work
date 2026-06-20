# Data Delta

## 数据结构变化

v11 默认不修改服务端持久化结构。

前端新增教师端视图状态：

```js
teacher: {
  routeStack: [],
  selectedCourseId: "",
  selectedStudentId: "",
  selectedAssignmentId: "",
  selectedSubmissionId: "",
  ai: {
    contextSummary: null,
    suggestedActions: [],
    risks: [],
    lastRoute: ""
  },
  ui: {
    sidebarCollapsed: false,
    activeTab: "",
    density: "comfortable"
  }
}
```

## 名称映射

前端 selector 必须维护可读名称映射：

- `courseId -> courseTitle`
- `studentId -> studentName`
- `assignmentId -> assignmentTitle`
- `classroomId -> classroomName`
- `submissionId -> assignmentTitle + studentName`

## 禁止展示字段

以下字段不得直接作为 UI 文本：

- `course_ood`
- `user_student`
- `user_teacher`
- `assignment_*`
- `submission_*`
- `goal_*`
- `task_*`
- 任何数据库/接口内部 ID

## 迁移规则

- 如果历史数据缺少名称，在 seed 或 selector 中补 fallback 名称。
- 不为隐藏 ID 单独做数据迁移。
- UI 层使用 `displayName`、`title`、`label` 一类字段。

