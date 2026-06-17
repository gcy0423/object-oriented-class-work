# v2 验收清单

## identity-service

- [ ] 用户领域对象已迁移。
- [ ] 登录逻辑已迁移。
- [ ] Token 签发逻辑已迁移。
- [ ] Token 校验逻辑已迁移。
- [ ] 内部用户查询接口可用。
- [ ] 使用 `data/identity.json`。

## learning-service

- [ ] 课程、目标、任务、笔记领域对象已迁移。
- [ ] Dashboard 学习数据接口可用。
- [ ] 创建目标可用。
- [ ] 创建任务可用。
- [ ] 完成任务可用。
- [ ] 创建笔记可用。
- [ ] 内部学习上下文接口可用。
- [ ] 使用 `data/learning.json`。

## Gateway

- [ ] `/api/auth/login` 代理到 identity-service。
- [ ] `/api/me` 代理到 identity-service。
- [ ] Gateway 能校验 Bearer Token。
- [ ] Gateway 转发学习接口时注入用户上下文。
- [ ] `/api/dashboard` 聚合 learning 数据和 users。
- [ ] Gateway 不直接读取 identity/learning 数据文件。

## 兼容

- [ ] 前端登录路径不变。
- [ ] 前端学习页面 API 路径不变。
- [ ] 旧单体 `npm start` 仍可用。
- [ ] 旧普通测试 `npm test` 仍可用。

## 边界

- [ ] 未迁移 AI。
- [ ] 未迁移协作和 SSE。
- [ ] 未新增作业、题库、统计。
- [ ] 未引入数据库、消息队列、Docker。
- [ ] 未删除旧单体代码。

## 测试

- [ ] identity-service 测试通过。
- [ ] learning-service 测试通过。
- [ ] Gateway v2 集成测试通过。
- [ ] v1 health 测试仍通过。
