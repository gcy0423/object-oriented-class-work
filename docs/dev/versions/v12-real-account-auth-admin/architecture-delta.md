# Architecture Delta

## 身份系统变化

v12 继续以 `identity-service` 作为账号、角色、权限和会话所有者。Gateway 仍负责校验 Bearer Token，并把用户上下文转成内部请求头传给其他服务。

```text
client
  -> gateway-service
    -> identity-service
      users
      sessions
      rolePermissions
```

## 鉴权策略

- 前端继续把 token 保存在 `ApiClient` 当前使用的本地存储位置。
- 登录成功返回 `user` 和 `token`。
- token payload 增加 `jti`，用于和 `sessions` collection 对齐。
- Gateway 校验 token 时调用 `POST /internal/auth/verify`。
- identity-service 验证签名、过期时间、用户状态和 session 是否有效。
- 退出登录调用 `POST /api/auth/logout`，将当前 session 标记为 revoked。

## 密码策略

- 密码哈希使用 Node 标准库能力实现，不新增外网依赖。
- `users` 只保存 `passwordHash`、`passwordSalt`、`passwordUpdatedAt`。
- `toJSON()` 和所有用户响应必须过滤密码字段。
- seed 账号必须在初始化时写入哈希，不允许保存明文密码。

## 管理端结构变化

旧 `ai` 页面不再作为管理员导航入口。账号与权限管理集中在 `identity-admin`：

```text
client/src/
  app.js
  api.js
  widgets/layout.js
  views/identityAdminView.js
  state/appState.js
```

`identityAdminView` 保留班级、小组能力，但页面主层级改为账号系统优先。

## 权限边界

- 学生只能注册自己、登录、查看和更新允许范围内的个人资料。
- 教师可以继续管理班级、学生关系和课程内成员。
- 管理员可以创建账号、调整角色、修改账号状态、重置密码和编辑权限矩阵。
- 管理员不能通过普通注册接口创建管理员账号。
