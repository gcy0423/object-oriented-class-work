# v7 第一阶段 API 变化

v7 第一阶段原则上不新增必须后端接口，优先复用 v6 已有 Gateway API。前端新增 `StudentAiAdapter`，把学生端 AI-first 功能抽象为稳定方法；本阶段这些方法可以通过已有 AI API fallback 实现。

## 继续使用的已有 API

### Session

- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/dashboard`

### Learning

- `GET /api/courses`
- `POST /api/goals`
- `POST /api/tasks`
- `PATCH /api/tasks/:id/complete`
- `POST /api/notes`

### AI

- `POST /api/ai/ask`
- `POST /api/ai/plan`
- `POST /api/ai/summarize`

### Assignment

- `GET /api/assignments`
- `GET /api/assignments/:id`
- `POST /api/assignments/:id/submissions`

### Practice and Mistakes

- `GET /api/question-banks`
- `GET /api/questions`
- `POST /api/practice-sessions`
- `GET /api/practice-sessions`
- `GET /api/practice-sessions/:id`
- `POST /api/practice-sessions/:id/answers`
- `POST /api/practice-sessions/:id/finish`
- `GET /api/practice-sessions/:id/review`
- `POST /api/adaptive-practice-plan`
- `GET /api/mistakes`
- `GET /api/mistake-analysis`
- `GET /api/mistakes/:id/analysis`
- `PATCH /api/mistakes/:id/review`

## 前端新增 ApiClient 方法

如果 `client/src/api.js` 尚未包含以下便捷方法，本阶段补齐：

```js
studentDashboard() {}
studentCourses() {}
studentAssignments(params = {}) {}
studentAssignmentDetail(id) {}
submitAssignment(id, input) {}
questionBanks(params = {}) {}
questions(params = {}) {}
practiceSessions(params = {}) {}
startPractice(input) {}
practiceSession(id) {}
submitPracticeAnswer(id, input) {}
finishPractice(id) {}
practiceSessionReview(id) {}
mistakes(params = {}) {}
mistakeAnalysis(params = {}) {}
mistakeDetailAnalysis(id) {}
adaptivePracticePlan(input) {}
createTask(input) {}
completeTask(id) {}
createNote(input) {}
askAI(question) {}
generatePlan(goalId) {}
summarizeNote(input) {}
```

已有同名方法时不得重复实现，只补缺口或增加别名。

## 前端 StudentAiAdapter 目标方法

这些不是后端接口，而是学生端前端的稳定 AI 能力边界。

```js
export class StudentAiAdapter {
  buildDailyPlan(context) {}
  buildWeaknessInsight(context) {}
  draftLearningTask(context) {}
  guideAssignment(context) {}
  checkSubmissionDraft(context) {}
  organizeNote(context) {}
}
```

## 后续阶段建议新增的真实后端 API

本阶段只预留，不要求实现：

- `POST /api/student-ai/daily-plan`
- `POST /api/student-ai/weakness-insight`
- `POST /api/student-ai/task-drafts`
- `POST /api/student-ai/assignment-guide`
- `POST /api/student-ai/submission-check`
- `POST /api/student-ai/note-organize`
- `GET /api/notes`
- `PATCH /api/notes/:id`
- `DELETE /api/notes/:id`
- `POST /api/assignment-submission-drafts`
- `PATCH /api/assignment-submission-drafts/:id`

