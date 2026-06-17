# v1 任务清单

## 1. shared 基础设施

- [ ] 新增 `shared/http/router.js`。
- [ ] 新增 `shared/http/response.js`。
- [ ] 新增 `shared/http/errors.js`。
- [ ] 新增 `shared/http/server.js`。
- [ ] 新增 `shared/data/jsonDatabase.js`。
- [ ] 新增 `shared/domain/entity.js`。
- [ ] 新增 `shared/data/repository.js`。
- [ ] 新增 `shared/client/serviceClient.js`。
- [ ] 新增 `shared/auth/userContext.js`。

## 2. 服务骨架

- [ ] 新增 `services/gateway-service`。
- [ ] 新增 `services/identity-service`。
- [ ] 新增 `services/learning-service`。
- [ ] 新增 `services/assessment-service`。
- [ ] 新增 `services/ai-service`。
- [ ] 新增 `services/collaboration-service`。
- [ ] 新增 `services/analytics-service`。

## 3. 健康检查

- [ ] 每个服务实现 `GET /health`。
- [ ] Gateway 实现 `GET /api/health` 聚合。
- [ ] 聚合健康检查能处理下游服务不可用。

## 4. 启动脚本

- [ ] 更新 `package.json`，增加单服务启动脚本。
- [ ] 增加 `start-services-local.cmd`。
- [ ] 增加 `test-services-local.cmd`。

## 5. 验证

- [ ] 单体 `npm start` 仍可用。
- [ ] 单体 `npm test` 仍可用。
- [ ] 每个服务可单独启动。
- [ ] Gateway 可访问前端首页。
- [ ] Gateway 健康检查返回服务列表。

