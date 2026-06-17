# v4 验收清单

## assessment-service

- [ ] 作业领域对象已实现。
- [ ] 提交领域对象已实现。
- [ ] Rubric 和 Criterion 已实现。
- [ ] Grade 和 Feedback 已实现。
- [ ] 题库和题目已实现。
- [ ] 练习和答题记录已实现。
- [ ] 错题本已实现。
- [ ] 掌握度记录已实现。
- [ ] 使用 `data/assessment.json`。

## 作业与评分

- [ ] `/api/assignments` GET/POST 可用。
- [ ] `/api/assignments/:id` 可用。
- [ ] `/api/assignments/:id/submissions` 可用。
- [ ] `/api/submissions/:id/grade` 可用。
- [ ] `/api/submissions/:id/ai-review` 可用。
- [ ] AI 初评失败不破坏 submission。

## 题库与练习

- [ ] `/api/question-banks` GET/POST 可用。
- [ ] `/api/questions` GET/POST 可用。
- [ ] `/api/practice-sessions` POST 可用。
- [ ] `/api/practice-sessions/:id` GET 可用。
- [ ] `/api/practice-sessions/:id/answers` 可用。
- [ ] `/api/practice-sessions/:id/finish` 可用。
- [ ] `/api/mistakes` 可用。
- [ ] `/api/mistakes/:id/review` 可用。

## Gateway

- [ ] Gateway 代理 assessment API。
- [ ] `/api/dashboard` 聚合作业和练习摘要。
- [ ] Gateway 不直接读取 `data/assessment.json`。

## 事件

- [ ] 作业发布事件已发送。
- [ ] 作业提交事件已发送。
- [ ] 评分事件已发送。
- [ ] AI 初评事件已发送。
- [ ] 练习完成事件已发送。
- [ ] 错题创建/复习事件已发送。
- [ ] 事件发布失败不回滚主业务。

## 边界

- [ ] 未实现 analytics-service 真实统计。
- [ ] 未引入数据库、消息队列、Docker。
- [ ] 未删除旧单体代码。
- [ ] 普通测试不依赖 LM Studio。

## 测试

- [ ] assessment-service 测试通过。
- [ ] Gateway assessment 集成测试通过。
- [ ] v1-v3 测试仍通过。
- [ ] `npm test` 通过。

