# 服务边界开发契约

本文档定义每个服务的职责、数据所有权、允许调用关系和禁止事项。新增功能前必须先确认归属服务。

## 总原则

- 一个业务概念只能有一个服务拥有写权限。
- 服务之间不能直接读写对方 JSON 文件。
- 跨服务只通过 HTTP API 或事件接口协作。
- Gateway 只做入口、鉴权、转发和聚合，不写业务规则。
- analytics-service 默认只读，只写自己的统计快照。
- ai-service 不拥有课程、作业、题库原始数据，只通过 API 获取上下文。
- collaboration-service 拥有消息、事件、活动日志和 SSE。

## 服务职责表

| 服务 | 拥有数据 | 主要能力 |
| --- | --- | --- |
| identity-service | users、sessions | 登录、Token、用户查询、角色判断 |
| learning-service | courses、classrooms、enrollments、goals、tasks、notes、learningPaths | 学习过程管理 |
| assessment-service | assignments、submissions、rubrics、grades、questions、practiceSessions、answerRecords、mistakeItems | 作业、题库、练习、评分 |
| ai-service | promptTemplates、aiRequests、aiResponses、providerHealth、knowledgeResources | AI 答疑、计划、摘要、批改、出题 |
| collaboration-service | rooms、messages、activityLogs、events | 协作消息、事件记录、SSE |
| analytics-service | reportSnapshots、metricDefinitions、masterySnapshots | 统计分析 |
| gateway-service | 无业务数据 | 前端托管、鉴权、转发、聚合 |

## identity-service

负责：

- 用户演示登录。
- 用户资料读取。
- 角色：`student`、`teacher`、`admin`。
- Token 签发、校验、过期判断。
- 内部用户查询。

不负责：

- 班级成员关系。
- 作业提交权限。
- AI 调用额度。
- 学习进度。

对外接口：

- `POST /api/auth/login`
- `GET /api/me`
- `POST /internal/auth/verify`
- `GET /internal/users/:id`
- `POST /internal/users/batch`

边界规则：其他服务需要用户信息时调用 identity-service，不能读取 `identity.json`。

## learning-service

负责：

- 课程信息。
- 班级与选课关系。
- 学习目标。
- 学习任务。
- 学习笔记。
- 学习路径。
- 学习进度计算。
- 为 AI 和统计提供学习上下文。

拥有数据：

- `courses`
- `classrooms`
- `enrollments`
- `goals`
- `tasks`
- `notes`
- `learningPaths`
- `pathNodes`

不负责：

- 作业发布和提交。
- 题库、答题记录、错题本。
- 活动日志落库。
- AI 文本生成。

关键事件：

- `goal.created`
- `task.created`
- `task.completed`
- `note.created`
- `learning-path.generated`

## assessment-service

负责：

- 作业发布。
- 作业提交。
- Rubric 评分规则。
- 教师评分。
- AI 初评结果保存。
- 题库。
- 练习会话。
- 自动判题。
- 错题本。
- 知识点掌握状态。

拥有数据：

- `assignments`
- `submissions`
- `rubrics`
- `rubricCriteria`
- `grades`
- `feedbackItems`
- `questionBanks`
- `questions`
- `practiceSessions`
- `answerRecords`
- `mistakeItems`
- `masteryRecords`

不负责：

- 课程基础信息，只保存 `courseId`。
- 学生姓名和角色，只保存 `studentId`。
- AI 生成批改文本。
- 班级学生名单。

关键事件：

- `assignment.published`
- `submission.created`
- `submission.graded`
- `practice.completed`
- `mistake.created`
- `mastery.changed`

## ai-service

负责：

- Prompt 模板。
- Mock Provider。
- LM Studio Provider。
- OpenAI-compatible Provider。
- 本地课程知识库检索。
- AI 答疑。
- 学习计划生成。
- 笔记摘要。
- 作业批改建议。
- 自动出题。
- AI 调用记录。

拥有数据：

- `promptTemplates`
- `aiRequests`
- `aiResponses`
- `providerHealth`
- `knowledgeResources`

不负责：

- 保存学习目标、任务、笔记。
- 保存作业最终成绩。
- 判断学生是否属于某课程。
- SSE 推送。

上下文来源：

- `learning-service /internal/learning/context/:userId`
- `assessment-service /internal/assessment/context/:userId`
- `identity-service /internal/users/:id`

当前本地课程知识库由手写的 `server/src/domain/learningResourceCatalog.js` 提供，ai-service 通过 `resourceSearch.js` 复用检索能力。后续扩展知识库时应增加真实知识点结构、题型解析和检索权重，不能再引入纯生成文件充当代码量。

## collaboration-service

负责：

- 协作房间。
- 聊天消息。
- 活动日志。
- 领域事件接收。
- SSE 客户端连接。
- 多端刷新通知。

拥有数据：

- `rooms`
- `messages`
- `activityLogs`
- `events`

不负责：

- 学习业务规则。
- 作业业务规则。
- 用户权限核心判断。
- 统计报表计算。

内部事件入口：

```http
POST /internal/events
```

请求体：

```json
{
  "type": "task.completed",
  "actorId": "user_student",
  "source": "learning-service",
  "summary": "完成任务：补充顺序图",
  "payload": { "taskId": "task_1234" }
}
```

## analytics-service

负责：

- 学习时长统计。
- 任务完成率。
- 作业提交率。
- 评分分布。
- 题目正确率。
- 知识点掌握度。
- 班级趋势报表。

拥有数据：

- `reportSnapshots`
- `metricDefinitions`
- `masterySnapshots`

不负责：

- 修改学习任务。
- 修改作业成绩。
- 修改题目和答题记录。
- 生成 AI 建议。

analytics-service 可以读取其他服务 API，但不能直接写其他服务数据。

## gateway-service

负责：

- 对浏览器暴露统一地址。
- 托管 `client/`。
- 请求转发。
- 统一解析 Token。
- 注入用户上下文头。
- Dashboard 聚合。
- 服务健康状态聚合。

不负责：

- 直接实例化业务领域对象。
- 保存业务实体。
- 访问业务服务私有 JSON 文件。

## 跨服务调用矩阵

| 调用方 | 可调用服务 |
| --- | --- |
| gateway-service | identity、learning、assessment、ai、collaboration、analytics |
| identity-service | collaboration，可选 |
| learning-service | identity、collaboration、ai，可选 |
| assessment-service | identity、learning、ai、collaboration |
| ai-service | identity、learning、assessment、collaboration |
| collaboration-service | identity，可选 |
| analytics-service | identity、learning、assessment、collaboration |

禁止循环强依赖。核心写操作不能依赖 analytics-service。

## 新模块归属

| 功能 | 所属服务 |
| --- | --- |
| 班级管理 | learning-service |
| 选课/加入班级 | learning-service |
| 作业发布 | assessment-service |
| 作业提交 | assessment-service |
| Rubric 评分 | assessment-service |
| AI 作业初评 | ai-service 生成，assessment-service 保存 |
| 题库 | assessment-service |
| 错题本 | assessment-service |
| 学习路径 | learning-service，ai-service 可辅助 |
| 知识点掌握度 | assessment-service 记录，analytics-service 汇总 |
| 教师统计看板 | analytics-service |
| 协作消息 | collaboration-service |
| 操作日志 | collaboration-service |

## 数据引用规则

跨服务引用只保存 ID，不复制完整对象。

允许展示快照：

```json
{
  "studentId": "user_student",
  "studentSnapshot": {
    "name": "林知夏",
    "role": "student"
  }
}
```

snapshot 只能用于展示，不能用于权限判断。

## 事务边界

第一阶段没有分布式事务。采用“主服务先完成，事件后通知”。

完成任务流程：

1. learning-service 校验任务归属。
2. learning-service 更新 task。
3. learning-service 重算 goal progress。
4. learning-service 调用 collaboration-service 记录事件。
5. Gateway 刷新 Dashboard。

如果事件记录失败，不回滚任务完成，后续可以补偿。

AI 批改流程：

1. assessment-service 校验 submission。
2. assessment-service 调用 ai-service 生成初评。
3. assessment-service 保存 AI feedback。
4. assessment-service 发送事件。

如果 ai-service 失败，assessment-service 返回明确错误或保存待重试状态。

## 合并前检查

- 功能是否放在正确服务。
- 是否没有直接读取其他服务数据文件。
- 是否使用统一响应格式。
- 是否明确鉴权要求。
- 写操作是否发出必要事件。
- 是否有服务层或接口测试。
- 前端是否只访问 Gateway。
- 接口文档是否同步更新。

