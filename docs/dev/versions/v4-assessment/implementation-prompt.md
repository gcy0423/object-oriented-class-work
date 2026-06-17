# v4 实现提示词

下面的提示词用于启动 v4-assessment 阶段开发。

```text
请开始实现 docs/dev/versions/v4-assessment/ 定义的 v4 阶段。

开发前必须阅读并遵守：
- docs/dev/architecture.md
- docs/dev/service-boundaries.md
- docs/dev/api-contracts.md
- docs/dev/migration-plan.md
- docs/dev/versions/v4-assessment/README.md
- docs/dev/versions/v4-assessment/scope.md
- docs/dev/versions/v4-assessment/architecture-delta.md
- docs/dev/versions/v4-assessment/api-delta.md
- docs/dev/versions/v4-assessment/data-delta.md
- docs/dev/versions/v4-assessment/tasks.md
- docs/dev/versions/v4-assessment/test-plan.md
- docs/dev/versions/v4-assessment/acceptance.md

本阶段目标：
1. 将 assessment-service 从 health 骨架扩展为真实评测服务。
2. 实现作业、提交、Rubric、评分、AI 初评、题库、练习、错题本。
3. Gateway 接管 assessment 相关 /api 路径。
4. assessment-service 调用 identity、learning、ai、collaboration，但不能直接读取它们的数据文件。
5. 新增 data/assessment.json，旧 data/app-data.json 保留给单体。
6. Dashboard 聚合作业和练习摘要。

本阶段明确不做：
1. 不实现 analytics-service 真实统计。
2. 不做二进制文件上传。
3. 不做复杂班级成员权限。
4. 不做作业互评。
5. 不做题目导入导出。
6. 不引入数据库、Docker、消息队列、注册中心。
7. 不删除旧 server/src 单体代码。

实现要求：
1. assessment-service 实现 Assignment、Submission、Rubric、RubricCriterion、Grade、QuestionBank、Question、PracticeSession、AnswerRecord、MistakeItem、MasteryRecord。
2. assessment-service 实现作业发布、提交、教师评分、AI 初评、题库、练习、判题、错题复习。
3. ai-service 实现 POST /internal/ai/review-submission，供 assessment-service 调用。
4. assessment-service 写操作向 collaboration-service /internal/events 发布事件；发布失败不能回滚主业务。
5. Gateway 代理 /api/assignments、/api/submissions、/api/rubrics、/api/question-banks、/api/questions、/api/practice-sessions、/api/mistakes。
6. Gateway /api/dashboard 聚合 assessment dashboard。
7. 普通测试使用 Mock AI，不依赖 LM Studio。
8. 测试使用临时 JSON 数据文件，不污染真实 data 目录。

测试要求：
1. 运行 npm test，确认旧单体回归不破坏。
2. 运行 npm run test:services，确认 v1-v4 服务测试通过。
3. 如当前环境没有 Node/npm，需要说明无法运行测试，并保留明确的本机测试命令。

完成后请按 docs/dev/versions/v4-assessment/acceptance.md 给出验收结果。
```

短指令：

```text
实现 v4-assessment：扩展 assessment-service 为作业/评分/题库/练习/错题服务，Gateway 保持 /api 路径兼容；接入 ai-service 初评和 collaboration 事件；不做 analytics；按 v4 acceptance.md 验收。
```

