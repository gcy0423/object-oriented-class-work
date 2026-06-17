# v1 测试计划

## 单体回归

```bash
npm test
```

目的：确保 v1 新增骨架不破坏当前单体业务。

## 服务健康检查测试

新增测试建议：

```bash
npm run test:services
```

覆盖：

- identity-service `/health`。
- learning-service `/health`。
- assessment-service `/health`。
- ai-service `/health`。
- collaboration-service `/health`。
- analytics-service `/health`。
- gateway-service `/api/health` 聚合结果。

## ServiceClient 测试

覆盖：

- GET JSON 成功。
- POST JSON 成功。
- 下游返回错误时保留 `code` 和 `message`。
- 请求超时时返回明确错误。

## userContext 测试

覆盖：

- 从请求头读取 `x-edumind-user-id`。
- 缺少用户头时返回 null 或抛出明确错误。
- `requireInternal` 正确校验 `x-edumind-internal-key`。

## 手动验证

- 启动 Gateway。
- 访问 `http://127.0.0.1:4077`。
- 访问 `http://127.0.0.1:4077/api/health`。
- 停止一个下游服务，确认 Gateway 能报告该服务 down，而不是整体崩溃。

