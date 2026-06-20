# Implementation Prompt

你要实现 v12 真实账号与鉴权系统，并调整管理员端账号管理。请只按本目录文档实现，不扩大到 OAuth、多租户、邮件验证码或生产级风控。

核心目标：

> 用户必须用真实账号和密码登录；管理员端管理账号、密码、角色和权限矩阵；旧 AI 页面不再作为管理员入口。

## 必须遵守

1. 登录不能自动创建用户。
2. 注册只能创建学生账号。
3. 教师和管理员账号只能由管理员创建或提权。
4. 密码不能明文保存或返回。
5. 继续使用 Bearer Token。
6. token 必须能通过 session 撤销。
7. logout 后旧 token 必须失效。
8. 用户状态不是 active 时不能登录。
9. 管理员可以重置密码。
10. 管理员可以编辑权限矩阵。
11. 管理员导航必须移除旧 `AI` 页面入口。

## 实现建议

- 先补 identity-service 的密码哈希、session repository 和用户输出过滤。
- 再改 auth API：register、login、logout、verify。
- 然后补 Gateway 代理和前端 `ApiClient`。
- 接着调整登录/注册界面。
- 最后升级 `identityAdminView` 和导航入口。

## 禁止

- 禁止在任何 JSON 数据中保存明文密码。
- 禁止把 `passwordHash`、`passwordSalt` 返回给前端或 dashboard。
- 禁止继续信任登录请求中的 role。
- 禁止普通注册创建 teacher/admin。
- 禁止删除 ai-service 或学生/教师 AI-first 功能。
- 禁止为了权限矩阵重写全站权限系统。
