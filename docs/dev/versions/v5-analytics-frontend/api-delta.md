# v5 API 变化

v5 新增 analytics-service API，并由 Gateway 对外代理。

## Analytics Overview

### `GET /api/analytics/overview`

权限：登录用户。

学生返回个人学习和评测摘要；教师/管理员返回课程和班级层面的摘要。

响应：

```json
{
  "ok": true,
  "data": {
    "role": "teacher",
    "learning": {
      "activeGoals": 3,
      "completionRate": 62,
      "studyMinutes": 520,
      "noteCount": 12
    },
    "assessment": {
      "assignmentCount": 4,
      "submissionCount": 18,
      "gradedCount": 12,
      "practiceCount": 9,
      "mistakeCount": 7,
      "masteryScore": 76
    },
    "collaboration": {
      "activityCount": 24,
      "messageCount": 8
    },
    "ai": {
      "provider": "mock-local-llm",
      "status": "up"
    }
  }
}
```

## Course Analytics

### `GET /api/analytics/courses/:id`

权限：教师、管理员，或参与该课程的学生读取自己的课程摘要。

响应：

```json
{
  "ok": true,
  "data": {
    "courseId": "course_ood",
    "courseTitle": "面向对象技术与方法",
    "assignments": {
      "published": 2,
      "submitted": 8,
      "graded": 5,
      "completionRate": 80
    },
    "practice": {
      "sessions": 6,
      "averageCorrectRate": 72,
      "openMistakes": 4
    },
    "mastery": [
      { "concept": "UML 类图", "score": 85 },
      { "concept": "设计模式", "score": 70 }
    ],
    "activity": []
  }
}
```

## Student Analytics

### `GET /api/analytics/students/:id`

权限：本人、教师、管理员。

响应：

```json
{
  "ok": true,
  "data": {
    "studentId": "user_student",
    "profile": {
      "name": "林知夏",
      "role": "student"
    },
    "learning": {},
    "assessment": {},
    "recommendations": [
      "复习错题最多的知识点。",
      "优先完成即将截止的作业。"
    ]
  }
}
```

## Teacher Analytics

### `GET /api/analytics/teacher`

权限：教师、管理员。

用途：前端教师工作台。

响应：

```json
{
  "ok": true,
  "data": {
    "courses": [],
    "students": [],
    "assignments": [],
    "riskStudents": [],
    "recentActivity": []
  }
}
```

## Gateway Dashboard

### `GET /api/dashboard`

v5 保留 v4 字段，并新增：

```json
{
  "data": {
    "analytics": {
      "learning": {},
      "assessment": {},
      "collaboration": {},
      "ai": {}
    }
  },
  "meta": {
    "provider": "mock-local-llm",
    "analyticsStatus": "up"
  }
}
```

## 前端依赖 API

前端 v5 必须通过 Gateway 调用：

- `GET /api/assignments`
- `POST /api/assignments`
- `GET /api/assignments/:id`
- `POST /api/assignments/:id/submissions`
- `POST /api/submissions/:id/grade`
- `POST /api/submissions/:id/ai-review`
- `GET /api/question-banks`
- `GET /api/questions`
- `POST /api/practice-sessions`
- `POST /api/practice-sessions/:id/answers`
- `POST /api/practice-sessions/:id/finish`
- `GET /api/mistakes`
- `PATCH /api/mistakes/:id/review`
- `GET /api/analytics/overview`
- `GET /api/analytics/courses/:id`
- `GET /api/analytics/students/:id`
- `GET /api/analytics/teacher`

