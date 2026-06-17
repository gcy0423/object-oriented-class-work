# v4 架构变化

v4 相对 v3 的变化是：assessment-service 从 health 骨架变成真实评测服务，Gateway 对外新增作业、题库、练习、错题相关 API。

## 新目标拓扑

```text
Browser
  -> gateway-service :4077
      -> identity-service :4101
      -> learning-service :4102
      -> assessment-service :4103
          -> data/assessment.json
          -> identity-service /internal/users/*
          -> learning-service /internal/learning/context/:userId
          -> ai-service /internal/ai/review-submission
          -> collaboration-service /internal/events
      -> ai-service :4104
      -> collaboration-service :4105
```

analytics-service 在 v4 仍只保留 health，真实统计进入 v5。

## assessment-service 内部结构

```text
services/assessment-service/src/
  main.js
  config.js
  routes.js
  domain/
    assignment.js
    question.js
    assessment.js
  application/
    assignmentService.js
    gradingService.js
    questionBankService.js
    practiceService.js
    mistakeService.js
  infrastructure/
    seed.js
    clients/
      identityClient.js
      learningClient.js
      aiClient.js
      collaborationClient.js
```

## 服务职责

assessment-service 负责：

- 作业发布、关闭、查询。
- 学生提交作业。
- Rubric 评分规则。
- 教师评分和反馈。
- AI 初评结果保存。
- 题库、题目、选项。
- 练习会话。
- 自动判题。
- 错题本。
- 知识点掌握记录。

assessment-service 不负责：

- 用户认证。
- 课程原始数据。
- AI 文本生成。
- 事件/SSE 存储。
- 统计报表展示。

## Gateway 新职责

Gateway 新增代理：

- `/api/assignments*`
- `/api/submissions*`
- `/api/rubrics*`
- `/api/question-banks*`
- `/api/questions*`
- `/api/practice-sessions*`
- `/api/mistakes*`

Gateway `/api/dashboard` 新增：

- `assignments`
- `practice`
- `metrics.assignmentCompletionRate`
- `metrics.mistakeCount`
- `metrics.masteryScore`

## 事件变化

assessment-service 写操作后发布：

- `assignment.published`
- `submission.created`
- `submission.graded`
- `submission.ai-reviewed`
- `practice.started`
- `practice.completed`
- `mistake.created`
- `mistake.reviewed`
- `mastery.changed`

事件发布失败时不回滚主业务。

