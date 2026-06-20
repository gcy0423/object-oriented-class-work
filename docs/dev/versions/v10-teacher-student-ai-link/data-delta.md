# v10 数据变化

## 复用数据

- `studentAiResults`
- `studentAiActions`
- `submissionDrafts`
- `uploads`
- `notifications`
- `reminderRules`

## 可选新增 collection

### `teacherInterventions`

```json
{
  "id": "teacher_intervention_001",
  "teacherId": "user_teacher",
  "studentId": "user_student",
  "courseId": "course_ood",
  "sourceEvidenceIds": ["student_ai_result_001"],
  "message": "建议先回看 UML 关系笔记。",
  "status": "sent",
  "createdAt": "2026-06-18T12:00:00.000Z"
}
```

