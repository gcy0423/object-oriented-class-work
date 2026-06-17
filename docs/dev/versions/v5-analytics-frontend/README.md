# v5-analytics-frontend

v5 在 v4 已具备 identity、learning、assessment、ai、collaboration 真实业务服务的基础上，补齐 analytics-service 和前端完整接入。完成后，系统应能通过 Gateway 打开 `client/` 前端，完成学生学习、评测练习、AI 辅助、协作消息和教师统计查看等核心流程。

## 版本目标

- analytics-service 从 health 骨架扩展为真实统计服务。
- analytics-service 通过内部接口读取 learning、assessment、collaboration、identity 的聚合上下文，不直接读取其他服务数据文件。
- Gateway 代理 analytics API，并把 analytics 摘要纳入 `/api/dashboard`。
- 前端 `client/` 接入 v4 已实现的作业、评分、题库、练习、错题能力。
- 前端新增教师视角的数据面板，展示课程、作业、练习、错题、掌握度和活动统计。
- 前端保持无构建依赖，继续使用原生 HTML、CSS、ESM。
- 服务测试覆盖 analytics 和前端所依赖的 Gateway API。

## 本版本不做

- 不引入 React、Vue、Vite、Webpack 等前端框架或构建链。
- 不引入数据库、消息队列、Docker、注册中心。
- 不实现复杂可视化库，只用轻量 DOM/CSS 表达统计。
- 不做文件上传、题目导入导出、作业互评。
- 不做真实多租户权限和复杂班级成员校验。
- 不删除旧 `server/src` 单体代码。
- 不要求普通测试连接 LM Studio。

## 目标启动命令

```bash
npm run start:services:mock
npm run test:services
npm test
```

浏览器访问：

```text
http://127.0.0.1:4077/
```

## 版本完成标准

- `analytics-service /health` 正常。
- `analytics-service /api/analytics/overview` 可返回学习、评测、协作、AI 统计摘要。
- `analytics-service /api/analytics/courses/:id` 可返回课程级统计。
- `analytics-service /api/analytics/students/:id` 可返回学生画像。
- Gateway 代理 `/api/analytics/*`。
- Gateway `/api/dashboard` 包含 analytics 摘要。
- 前端可通过 Gateway 登录、查看总览、学习、AI、协作、作业、练习、错题、统计。
- 教师用户可看到教师工作台，学生用户只能看到自己的学习与评测数据。
- `npm run test:services` 和 `npm test` 通过。

