# v3-ai-collaboration

v3 在 v2 identity-service、learning-service 已可用的基础上，迁移 AI 服务和协作服务。完成后，AI 问答、学习计划、笔记摘要、协作消息、活动日志、SSE 实时刷新都应由独立服务处理，Gateway 对外继续保持原 `/api/*` 路径兼容。

## 版本目标

- ai-service 接管 Prompt、Provider、AI 问答、计划生成、笔记摘要。
- ai-service 迁入本地课程知识库检索能力。
- collaboration-service 接管协作消息、活动日志、领域事件接收和 SSE。
- Gateway 代理 `/api/ai/*`、`/api/collaboration/messages`、`/api/activity`、`/api/events`。
- learning-service 在创建目标、创建任务、完成任务、创建笔记后向 collaboration-service 发布内部事件。
- Dashboard 聚合 activity logs，恢复旧总览页近期活动展示。
- 普通测试继续使用 Mock AI，不依赖 LM Studio。
- LM Studio 真实接入测试仍独立运行。

## 本版本不做

- 不新增作业、题库、评分、错题本。
- 不新增 analytics-service 统计能力。
- 不做 AI 作业批改。
- 不做 AI 自动出题。
- 不引入消息队列。
- 不引入数据库、Docker、注册中心。
- 不删除旧单体代码。

## 目标启动命令

```bash
npm run start:services:mock
npm run test:services
npm test
npm run test:lmstudio
```

Windows 本地脚本：

```bat
start-services-local.cmd
test-services-local.cmd
test-local.cmd
verify-lmstudio-local.cmd
```

## 版本完成标准

- Gateway `/api/ai/ask` 转发到 ai-service。
- Gateway `/api/ai/plan` 转发到 ai-service。
- Gateway `/api/ai/summarize` 转发到 ai-service。
- ai-service 通过 learning-service `/internal/learning/context/:userId` 获取上下文。
- ai-service 支持 Mock Provider 和 LM Studio Provider。
- collaboration-service 支持消息列表、发送消息、活动日志、SSE、内部事件发布。
- learning-service 写操作能调用 collaboration-service `/internal/events`。
- Gateway `/api/dashboard` 聚合 learning 数据、users、activity logs 和 provider meta。
- 前端 AI 页、协作页在微服务模式下可用。

