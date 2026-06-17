# v4 数据变化

v4 新增 assessment-service 数据文件：

```text
data/assessment.json
```

## assessment.json

拥有服务：assessment-service。

结构：

```json
{
  "assignments": [],
  "submissions": [],
  "rubrics": [],
  "rubricCriteria": [],
  "grades": [],
  "feedbackItems": [],
  "questionBanks": [],
  "questions": [],
  "practiceSessions": [],
  "answerRecords": [],
  "mistakeItems": [],
  "masteryRecords": []
}
```

## Assignment

```json
{
  "id": "assignment_ood_model",
  "courseId": "course_ood",
  "classroomId": "class_ood_01",
  "title": "领域模型设计作业",
  "description": "提交用例图、类图和简要说明。",
  "status": "published",
  "rubricId": "rubric_ood_modeling",
  "dueAt": "2026-06-21T23:59:59.000Z",
  "createdBy": "user_teacher",
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z"
}
```

## Submission

```json
{
  "id": "submission_1234",
  "assignmentId": "assignment_ood_model",
  "studentId": "user_student",
  "content": "我的领域模型说明...",
  "attachments": [],
  "status": "submitted",
  "submittedAt": "2026-06-16T00:00:00.000Z",
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z"
}
```

## Rubric 与 Criterion

```json
{
  "id": "rubric_ood_modeling",
  "courseId": "course_ood",
  "title": "领域模型评分规则",
  "createdBy": "user_teacher",
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z"
}
```

```json
{
  "id": "criterion_model_integrity",
  "rubricId": "rubric_ood_modeling",
  "title": "模型完整性",
  "maxScore": 40,
  "order": 1
}
```

## Grade

```json
{
  "id": "grade_1234",
  "submissionId": "submission_1234",
  "graderId": "user_teacher",
  "score": 92,
  "feedback": "类职责划分清晰。",
  "criteriaScores": [],
  "source": "teacher",
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z"
}
```

AI 初评也保存为 grade 或 feedback，但 `source` 必须为 `ai`，不能覆盖教师最终评分。

## Question

```json
{
  "id": "question_1234",
  "bankId": "qbank_ood",
  "courseId": "course_ood",
  "type": "single_choice",
  "stem": "类图中空心三角箭头通常表示什么关系？",
  "choices": [
    { "id": "A", "text": "继承" },
    { "id": "B", "text": "组合" }
  ],
  "answer": "A",
  "analysis": "空心三角箭头表示泛化/继承。",
  "concept": "UML 类图",
  "difficulty": "easy",
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z"
}
```

## PracticeSession 与 AnswerRecord

```json
{
  "id": "practice_1234",
  "ownerId": "user_student",
  "courseId": "course_ood",
  "questionIds": ["question_1234"],
  "status": "active",
  "score": 0,
  "correctRate": 0,
  "startedAt": "2026-06-16T00:00:00.000Z",
  "finishedAt": null
}
```

```json
{
  "id": "answer_1234",
  "sessionId": "practice_1234",
  "questionId": "question_1234",
  "ownerId": "user_student",
  "answer": "A",
  "correct": true,
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z"
}
```

## MistakeItem

```json
{
  "id": "mistake_1234",
  "ownerId": "user_student",
  "courseId": "course_ood",
  "questionId": "question_1234",
  "answerRecordId": "answer_1234",
  "status": "open",
  "reviewNote": "",
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z"
}
```

## Seed

v4 seed 至少包含：

- 一个默认 Rubric。
- 一个默认 Assignment。
- 一个默认 QuestionBank。
- 5-10 道真实题目。

Seed 不能大量模板生成；题目要有基本教学意义。

