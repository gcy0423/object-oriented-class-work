# v10 API 变化

## Teacher Student AI Evidence

```text
GET /api/teacher/students/:id/ai-results
GET /api/teacher/students/:id/ai-timeline
GET /api/teacher/students/:id/submission-evidence
POST /api/teacher/students/:id/interventions
```

## Assignment Grading Evidence

```text
GET /api/assignments/:id/student-ai-evidence
GET /api/submissions/:id/student-ai-evidence
```

## Intervention

```json
{
  "studentId": "user_student",
  "courseId": "course_ood",
  "reason": "作业提交前自检多次提示关系说明不足。",
  "message": "建议你先回看 UML 关系笔记，再修订作业说明。",
  "channels": ["in_app"],
  "dueAt": "2026-06-21T12:00:00.000Z"
}
```

