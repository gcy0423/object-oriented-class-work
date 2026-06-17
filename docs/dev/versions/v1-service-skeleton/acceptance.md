# v1 验收清单

## 结构

- [ ] `shared/` 目录存在。
- [ ] `services/` 目录存在。
- [ ] 七个服务目录存在。
- [ ] 每个服务有 `src/main.js`、`src/config.js`、`src/routes.js`。

## 启动

- [ ] `npm start` 仍启动当前单体。
- [ ] `npm test` 仍运行当前普通测试。
- [ ] 每个 `npm run start:*` 单服务命令可启动对应服务。
- [ ] `npm run start:services:mock` 可启动所有服务，或提供等价本地脚本。

## API

- [ ] 每个服务 `GET /health` 返回 `ok: true`。
- [ ] Gateway `GET /api/health` 返回所有服务状态。
- [ ] 下游服务不可用时 Gateway 健康检查仍返回可解析 JSON。

## 边界

- [ ] v1 未迁移业务数据。
- [ ] v1 未改变前端业务接口。
- [ ] v1 未引入 Docker、消息队列、数据库。
- [ ] Gateway 没有直接读取业务 JSON 文件。

## 文档

- [ ] v1 文档与实际目录一致。
- [ ] 后续 v2 可以基于 v1 迁移 identity 和 learning。

