# v4 范围

## 做什么

- 新增作业领域对象：`Assignment`、`Submission`、`Rubric`、`RubricCriterion`、`Grade`、`FeedbackItem`。
- 新增题库领域对象：`QuestionBank`、`Question`、`PracticeSession`、`AnswerRecord`、`MistakeItem`、`MasteryRecord`。
- 新增 assessment repository 和 seed。
- 新增作业发布、提交、评分、AI 初评服务。
- 新增题库、练习、判题、错题本服务。
- 新增 assessment-service 内部上下文接口，供 v5 analytics 和后续 AI 使用。
- Gateway 代理 assessment API。
- Dashboard 聚合 assessment 摘要。
- 增加作业、题库、练习、错题相关测试。

## 不做什么

- 不实现完整 analytics-service。
- 不做文件二进制上传。
- 不做复杂课程班级成员校验。
- 不做作业互评。
- 不做题目导入导出。
- 不把 AI 出题结果自动写入题库。
- 不新增 WebSocket。
- 不做分布式事务。

## 兼容要求

v4 新增 API，不改变 v1-v3 已有路径：

- `/api/auth/*`
- `/api/me`
- `/api/dashboard`
- `/api/courses`
- `/api/goals`
- `/api/tasks`
- `/api/notes`
- `/api/ai/*`
- `/api/collaboration/*`
- `/api/activity`
- `/api/events`

## 风险控制

- 作业最终成绩由 assessment-service 保存，ai-service 只生成建议。
- assessment-service 不直接读取 `data/identity.json`、`data/learning.json`、`data/ai.json`。
- AI 初评失败不能破坏 submission。
- collaboration-service 事件发布失败不能回滚作业或练习主业务。
- 普通测试必须使用 Mock AI。

