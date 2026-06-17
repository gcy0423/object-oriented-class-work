# v3 测试计划

## 普通回归测试

```bash
npm test
```

目的：确认旧单体没有被破坏。

## 服务测试

```bash
npm run test:services
```

v3 在 v1/v2 服务测试基础上新增 AI、协作、SSE 和事件测试。

## ai-service 测试

覆盖：

- Mock Provider 问答。
- Mock Provider 生成学习计划。
- Mock Provider 笔记摘要。
- ai-service 通过 learning-service 内部接口读取学习上下文。
- 本地知识库检索命中。
- Provider health 返回 provider 名称。
- AI request/response 被记录。
- LM Studio endpoint 规范化。
- LM Studio 真实请求不进入普通测试。

## collaboration-service 测试

覆盖：

- `GET /api/collaboration/messages` 返回 seed 消息。
- `POST /api/collaboration/messages` 保存消息。
- 发送消息后记录 activity。
- `GET /api/activity` 按时间倒序返回。
- `POST /internal/events` 保存 event 和 activity。
- 内部密钥错误返回 403。
- SSE 连接返回 `ready` 事件。
- 事件发布后 SSE 客户端可收到对应事件。

## learning-service 事件测试

覆盖：

- 创建目标后调用 collaboration-service 内部事件。
- 创建任务后调用 collaboration-service 内部事件。
- 完成任务后调用 collaboration-service 内部事件。
- 创建笔记后调用 collaboration-service 内部事件。
- collaboration-service 不可用时，主业务写操作仍成功。

## Gateway 集成测试

覆盖：

- Gateway `/api/ai/ask` 能代理并返回 AIResponse。
- Gateway `/api/ai/plan` 能代理并返回 AIResponse。
- Gateway `/api/ai/summarize` 能代理并返回 AIResponse。
- Gateway `/api/collaboration/messages` 能 GET/POST。
- Gateway `/api/activity` 能返回活动日志。
- Gateway `/api/events` 能建立 SSE。
- Gateway `/api/dashboard` 聚合 learning、users、activity、provider。
- 未登录访问 AI/协作接口返回 401。

## LM Studio 测试

```bash
npm run test:lmstudio
```

要求：

- LM Studio 已启动 OpenAI-compatible Server。
- 模型为 `qwopus3.6-27b-v2-mtp@iq4_xs`。
- 默认地址为 `http://10.108.10.110:1234/v1/chat/completions`。

该测试独立运行，不能作为 `npm test` 的前置条件。

## 手动验证

1. 启动服务：

```bat
start-services-local.cmd
```

2. 打开：

```text
http://127.0.0.1:4077
```

3. 验证：

- 可以登录。
- 学习页面仍可新增目标、任务、笔记。
- AI 页面可以问答、生成计划。
- 协作页面可以发送消息。
- 总览页可以看到近期活动。
- 打开两个浏览器窗口，发送消息或完成任务后另一个窗口能刷新或收到 SSE。

## 测试数据隔离

测试应使用临时 JSON 文件，不污染：

- `data/ai.json`
- `data/collaboration.json`
- `data/identity.json`
- `data/learning.json`

