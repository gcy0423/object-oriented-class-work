# v4 任务清单

## 1. assessment-service 领域层

- [ ] 新增 `domain/assignment.js`。
- [ ] 新增 `domain/question.js`。
- [ ] 新增 `domain/assessment.js`。
- [ ] 实现 Assignment、Submission、Rubric、Grade。
- [ ] 实现 QuestionBank、Question、PracticeSession、AnswerRecord、MistakeItem。
- [ ] 实现对应 Repository。

## 2. assessment-service 应用层

- [ ] 新增 `AssignmentService`。
- [ ] 新增 `SubmissionService`。
- [ ] 新增 `GradingService`。
- [ ] 新增 `QuestionBankService`。
- [ ] 新增 `PracticeService`。
- [ ] 新增 `MistakeService`。
- [ ] 新增 `MasteryService`。

## 3. assessment-service 基础设施

- [ ] 新增 `infrastructure/seed.js`。
- [ ] 新增 identity client。
- [ ] 新增 learning client。
- [ ] 新增 ai client。
- [ ] 新增 collaboration client。
- [ ] config 加入 `dataFile` 和依赖服务 URL。

## 4. HTTP API

- [ ] 实现 `GET /api/assignments`。
- [ ] 实现 `POST /api/assignments`。
- [ ] 实现 `GET /api/assignments/:id`。
- [ ] 实现 `POST /api/assignments/:id/submissions`。
- [ ] 实现 `POST /api/submissions/:id/grade`。
- [ ] 实现 `POST /api/submissions/:id/ai-review`。
- [ ] 实现 `POST /api/rubrics`。
- [ ] 实现 `GET /api/rubrics`。
- [ ] 实现 `POST /api/question-banks`。
- [ ] 实现 `GET /api/question-banks`。
- [ ] 实现 `POST /api/questions`。
- [ ] 实现 `GET /api/questions`。
- [ ] 实现 `POST /api/practice-sessions`。
- [ ] 实现 `GET /api/practice-sessions/:id`。
- [ ] 实现 `POST /api/practice-sessions/:id/answers`。
- [ ] 实现 `POST /api/practice-sessions/:id/finish`。
- [ ] 实现 `GET /api/mistakes`。
- [ ] 实现 `PATCH /api/mistakes/:id/review`。
- [ ] 实现 `GET /internal/assessment/context/:userId`。
- [ ] 实现 `GET /internal/assessment/dashboard/:userId`。

## 5. Gateway

- [ ] 新增 assessment-service client。
- [ ] 代理所有 assessment API。
- [ ] `/api/dashboard` 聚合 assessment dashboard。
- [ ] 保持 v1-v3 API 不退化。

## 6. ai-service

- [ ] 实现 `POST /internal/ai/review-submission`。
- [ ] AI 初评使用 Mock Provider 测试。
- [ ] AI 初评失败返回明确错误。

## 7. 事件

- [ ] 发布 `assignment.published`。
- [ ] 发布 `submission.created`。
- [ ] 发布 `submission.graded`。
- [ ] 发布 `submission.ai-reviewed`。
- [ ] 发布 `practice.started`。
- [ ] 发布 `practice.completed`。
- [ ] 发布 `mistake.created`。
- [ ] 发布 `mistake.reviewed`。
- [ ] 发布 `mastery.changed`。

## 8. 测试

- [ ] 作业发布测试。
- [ ] 作业提交测试。
- [ ] 教师评分测试。
- [ ] AI 初评测试。
- [ ] 题库创建测试。
- [ ] 题目创建测试。
- [ ] 练习开始测试。
- [ ] 自动判题测试。
- [ ] 错题生成测试。
- [ ] 错题复习测试。
- [ ] Gateway assessment 代理测试。
- [ ] Dashboard assessment 聚合测试。
- [ ] v1-v3 测试仍通过。

