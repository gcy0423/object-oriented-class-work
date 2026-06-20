# Tasks

## 1. Auth 数据模型

- [ ] `User` 实体新增密码和登录时间字段。
- [ ] 新增 session 实体和 repository。
- [ ] 用户 JSON 输出过滤密码字段。
- [ ] seed 用户补齐密码哈希。
- [ ] 历史用户启动迁移补齐密码哈希。

## 2. 密码与会话

- [ ] 新增密码哈希工具。
- [ ] 新增密码校验工具。
- [ ] token payload 增加 `jti`。
- [ ] 登录成功创建 session。
- [ ] token verify 检查 session 状态。
- [ ] logout 撤销当前 session。
- [ ] 禁用、归档、重置密码时撤销用户 session。

## 3. 注册和登录 API

- [ ] `POST /api/auth/register`。
- [ ] `POST /api/auth/login` 改为密码登录。
- [ ] `POST /api/auth/logout`。
- [ ] `GET /api/me` 保持兼容。
- [ ] Gateway 代理注册、登录、退出和 me。
- [ ] 移除登录自动建号语义。

## 4. 管理员账号 API

- [ ] `POST /api/admin/users`。
- [ ] `PATCH /api/admin/users/:id`。
- [ ] `POST /api/admin/users/:id/reset-password`。
- [ ] 用户列表返回最近登录和状态。
- [ ] 管理员创建教师和管理员账号。
- [ ] 非管理员不能创建或提权高权限账号。

## 5. 权限矩阵 API

- [ ] `GET /api/admin/role-permissions`。
- [ ] `PATCH /api/admin/role-permissions`。
- [ ] 校验三类基础角色存在。
- [ ] 校验 admin 保留账号和权限管理能力。
- [ ] Gateway 代理权限矩阵管理接口。

## 6. 前端登录注册

- [ ] 登录表单新增密码字段。
- [ ] 登录提交只发送 email/password。
- [ ] 新增注册表单或注册模式切换。
- [ ] 注册成功后提示登录。
- [ ] logout 调用后端接口再清空本地 token。
- [ ] 登录失败展示接口错误。

## 7. 管理员端页面

- [ ] `ApiClient` 增加注册、退出、管理员账号、重置密码和权限矩阵方法。
- [ ] `identityAdminView` 调整为账号与权限优先。
- [ ] 新增创建账号表单。
- [ ] 新增重置密码表单。
- [ ] 用户列表展示最近登录。
- [ ] 权限矩阵可编辑和保存。
- [ ] 保留班级、小组管理区。

## 8. 删除旧 AI 页面入口

- [ ] `routeTable` 移除旧 `ai` 导航入口。
- [ ] 管理员端不再展示 `AI` 页面。
- [ ] 直接访问 `#ai` 时路由回退到允许的默认页。
- [ ] 不删除 ai-service 和学生/教师 AI-first 页面。

## 9. 测试

- [ ] `npm test` 通过。
- [ ] `npm run test:services` 通过。
- [ ] 覆盖注册、登录、错误密码、退出、禁用账号。
- [ ] 覆盖管理员创建用户、重置密码、权限矩阵更新。
- [ ] 覆盖管理员导航不显示旧 AI 页面。
