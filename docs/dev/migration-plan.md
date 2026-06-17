# 单体到轻量微服务迁移计划

本文档描述从当前 Node.js 单体迁移到轻量微服务的施工步骤。每个阶段都必须保持项目可运行、可测试、可回退。

## 目标

- Gateway 作为浏览器唯一入口。
- identity、learning、assessment、ai、collaboration、analytics 独立服务运行。
- 当前已有功能完整保留。
- 新增作业、题库、评分、学习路径、统计模块。
- 普通测试不依赖 LM Studio。
- LM Studio 测试独立运行。
- 文档、接口、服务边界与代码一致。

## 迁移原则

1. 先搭骨架，再迁移业务。
2. 先保持兼容，再逐步拆分。
3. 每一步都能启动和测试。
4. 不引入不必要基础设施。
5. 不跨服务直接读写数据文件。
6. 保留单体启动作为过渡兜底。

## 阶段 0：基线确认

当前功能：

- 登录。
- 当前用户。
- Dashboard。
- 课程列表。
- 创建学习目标。
- 创建学习任务。
- 完成学习任务。
- 创建学习笔记。
- AI 问答。
- AI 计划生成。
- AI 笔记摘要。
- 协作消息。
- 活动日志。
- SSE 事件。

当前核心文件：

| 文件 | 说明 |
| --- | --- |
| `server/src/main.js` | 单体启动入口 |
| `server/src/application/controllers.js` | REST API |
| `server/src/application/services.js` | 应用服务 |
| `server/src/domain/identity.js` | 用户与角色 |
| `server/src/domain/learning.js` | 课程、目标、任务、笔记 |
| `server/src/domain/ai.js` | Prompt 与 Provider |
| `server/src/domain/collaboration.js` | 消息、活动日志 |
| `server/src/framework/*` | Router、HTTP、错误、响应、SSE |
| `server/src/infrastructure/jsonDatabase.js` | JSON 持久化 |
| `test/kernel.test.mjs` | 当前测试 |

完成标准：

- 当前接口已记录。
- `npm start` 保留。
- `npm test` 保留。

## 阶段 1：共享基础设施与服务骨架

新增：

```text
shared/
  http/router.js
  http/response.js
  http/errors.js
  http/server.js
  data/jsonDatabase.js
  data/repository.js
  domain/entity.js
  client/serviceClient.js
  auth/userContext.js
services/
  gateway-service/
  identity-service/
  learning-service/
  assessment-service/
  ai-service/
  collaboration-service/
  analytics-service/
```

迁移或复制：

- `server/src/framework/router.js` -> `shared/http/router.js`
- `server/src/framework/response.js` -> `shared/http/response.js`
- `server/src/framework/errors.js` -> `shared/http/errors.js`
- `server/src/infrastructure/jsonDatabase.js` -> `shared/data/jsonDatabase.js`
- `server/src/domain/shared.js` -> `shared/domain/entity.js` 和 `shared/data/repository.js`

新增能力：

- `ServiceClient`：内部 HTTP 调用。
- `readUserContext(req)`：读取 Gateway 注入的用户头。
- `requireInternal(req)`：校验内部密钥。
- `createServiceServer()`：统一服务启动。

完成标准：

- 每个服务有 `GET /health`。
- 每个服务可以单独启动。
- Gateway 可以聚合健康状态。
- 单体入口不受影响。

## 阶段 2：迁移 identity-service

迁移：

| 来源 | 目标 |
| --- | --- |
| `server/src/domain/identity.js` | `services/identity-service/src/domain/identity.js` |
| `AuthService` | `services/identity-service/src/application/authService.js` |
| users seed | `services/identity-service/src/infrastructure/seed.js` |

接口：

- `POST /api/auth/login`
- `GET /api/me`
- `POST /internal/auth/verify`
- `GET /internal/users/:id`
- `POST /internal/users/batch`

数据：

```text
data/identity.json
```

测试：

- 登录新用户。
- 登录已有用户。
- 非法 Token 返回 401。
- Gateway 注入用户上下文。

完成标准：

- 前端登录流程不变。
- 其他服务可以通过用户头识别当前用户。

## 阶段 3：迁移 learning-service

迁移：

| 来源 | 目标 |
| --- | --- |
| `server/src/domain/learning.js` | `services/learning-service/src/domain/learning.js` |
| `LearningService` | `services/learning-service/src/application/learningService.js` |
| courses/goals/tasks/notes seed | `services/learning-service/src/infrastructure/seed.js` |

接口：

- `GET /api/courses`
- `POST /api/courses`
- `GET /api/goals`
- `POST /api/goals`
- `POST /api/tasks`
- `PATCH /api/tasks/:id/complete`
- `POST /api/notes`
- `GET /internal/learning/context/:userId`

数据：

```text
data/learning.json
```

新增功能：

- 班级管理。
- 选课关系。
- 学习路径。
- 任务状态扩展。
- 笔记标签和搜索。

测试：

- 创建目标。
- 创建任务并重算进度。
- 完成任务并重算目标进度。
- 学生不能修改其他学生任务。
- 教师可以查看班级学生学习进度。

完成标准：

- 当前学习页面功能可用。
- Dashboard 学习数据来自 learning-service。

## 阶段 4：迁移 collaboration-service

迁移：

| 来源 | 目标 |
| --- | --- |
| `server/src/domain/collaboration.js` | `services/collaboration-service/src/domain/` |
| `ActivityService` | `services/collaboration-service/src/application/activityService.js` |
| `CollaborationService` | `services/collaboration-service/src/application/collaborationService.js` |
| `SyncHub` | `services/collaboration-service/src/application/syncHub.js` |

接口：

- `GET /api/collaboration/messages`
- `POST /api/collaboration/messages`
- `GET /api/activity`
- `GET /api/events`
- `POST /internal/events`

数据：

```text
data/collaboration.json
```

测试：

- 发送消息。
- 拉取消息。
- 发布内部事件。
- 活动日志倒序。
- SSE ready 事件正常。

完成标准：

- 协作页面功能不变。
- learning-service 完成任务后能产生活动日志。
- 前端收到 SSE 后刷新数据。

## 阶段 5：迁移 ai-service

迁移：

| 来源 | 目标 |
| --- | --- |
| `server/src/domain/ai.js` | `services/ai-service/src/domain/ai.js` |
| `AITutorService` | `services/ai-service/src/application/aiTutorService.js` |
| `learningResourceCatalog.js` | `services/ai-service/src/infrastructure/knowledge/resourceSearch.js` 复用检索能力 |
| `verifyLmStudio.mjs` | `services/ai-service/scripts/` 或根 scripts |

接口：

- `POST /api/ai/ask`
- `POST /api/ai/plan`
- `POST /api/ai/summarize`
- `POST /api/ai/generate-questions`
- `POST /internal/ai/review-submission`
- `GET /internal/ai/provider-health`

数据：

```text
data/ai.json
```

测试：

- Mock AI 问答。
- Mock AI 生成计划。
- Mock AI 笔记摘要。
- LM Studio endpoint 规范化。
- Provider 失败返回明确错误。

完成标准：

- AI 页面功能不变。
- 普通测试不访问 LM Studio。
- LM Studio 真实请求单独测试。

## 阶段 6：新增 assessment-service

领域对象：

- `Assignment`
- `Submission`
- `Rubric`
- `RubricCriterion`
- `Grade`
- `FeedbackItem`
- `QuestionBank`
- `Question`
- `PracticeSession`
- `AnswerRecord`
- `MistakeItem`
- `MasteryRecord`

应用服务：

- `AssignmentService`
- `SubmissionService`
- `GradingService`
- `QuestionBankService`
- `PracticeService`
- `MistakeService`
- `MasteryService`

数据：

```text
data/assessment.json
```

协作：

- 调用 learning-service 验证课程和班级。
- 调用 identity-service 获取学生和教师信息。
- 调用 ai-service 生成批改建议和题目。
- 调用 collaboration-service 发布事件。

测试：

- 教师发布作业。
- 学生提交作业。
- 教师按 Rubric 评分。
- AI 初评失败时不破坏提交。
- 单选题自动判分。
- 简答题保存待评状态。
- 错题自动进入错题本。

完成标准：

- 前端可看作业列表。
- 学生可提交作业。
- 教师可评分。
- 题库和练习形成闭环。

## 阶段 7：新增 analytics-service

领域对象：

- `MetricDefinition`
- `ReportSnapshot`
- `MasterySnapshot`
- `TrendPoint`
- `ClassroomReport`

应用服务：

- `LearningAnalyticsService`
- `AssessmentAnalyticsService`
- `MasteryAnalyticsService`
- `DashboardAggregationService`

接口：

- `GET /api/analytics/learning-summary`
- `GET /api/analytics/classrooms/:id`
- `GET /api/analytics/mastery`
- `POST /internal/analytics/snapshots`

测试：

- 计算任务完成率。
- 计算作业提交率。
- 计算平均分。
- 计算知识点掌握度。
- 空数据返回 0。

完成标准：

- Dashboard 展示扩展指标。
- 教师可以查看班级统计。
- 学生可以查看自己的掌握度。

## 阶段 8：前端改造

新增页面：

- 作业中心。
- 题库练习。
- 错题本。
- 教师工作台。
- 统计分析。

`client/src/api.js` 增加：

- assignment API
- submission API
- grading API
- question API
- practice API
- analytics API

完成标准：

- 当前页面不退化。
- 新模块有可操作页面。
- 表单失败显示错误。
- SSE 事件能触发刷新。

## 阶段 9：测试体系

推荐目录：

```text
test/
  unit/
  services/
    identity.test.mjs
    learning.test.mjs
    assessment.test.mjs
    ai.test.mjs
    collaboration.test.mjs
    analytics.test.mjs
  integration/
    gateway-flow.test.mjs
    learning-assessment-flow.test.mjs
  lmstudio/
    lmstudio-provider.test.mjs
```

要求：

- `npm test` 不需要网络和 LM Studio。
- `npm run test:services` 覆盖微服务核心流程。
- `npm run test:lmstudio` 单独验证真实模型。

## 回退策略

- 阶段 1-3：保留原 `server/src` 单体入口。
- 阶段 4-5：前端仍通过 Gateway 访问原路径。
- 阶段 6-7：新增服务失败不影响原学习功能。
- 阶段 8：新增页面不破坏旧页面。

如果某阶段阻塞：

1. 保留已完成服务代码。
2. Gateway 临时回退对应路径到单体实现。
3. 测试恢复通过后再继续拆分。

## 代码量扩展策略

有效代码优先级：

1. 领域对象和业务规则。
2. 应用服务。
3. HTTP 接口。
4. 前端交互页面。
5. 测试用例。
6. 可复用基础设施。
7. 真实 fixtures 和 seed 数据。

不允许继续扩大纯模板生成的知识库文件。若要扩展知识库代码量，应在 ai-service 中增加可审查的真实结构，例如章节、依赖关系、题型解析、Prompt 检索权重、与作业题库关联。

## 里程碑

| 里程碑 | 内容 | 验收 |
| --- | --- | --- |
| M1 | shared + gateway + health | 所有服务可启动 |
| M2 | identity-service | 登录和鉴权通过 Gateway |
| M3 | learning-service | 原学习功能迁移完成 |
| M4 | collaboration + ai | SSE 和 AI 迁移完成 |
| M5 | assessment-service | 作业、题库、练习闭环 |
| M6 | analytics-service | Dashboard 和教师统计 |
| M7 | 前端完整接入 | 所有模块可演示 |
| M8 | 测试和文档同步 | 普通测试通过 |

