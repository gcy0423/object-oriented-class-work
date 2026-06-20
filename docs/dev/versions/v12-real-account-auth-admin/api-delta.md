# API Delta

## Auth

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/me
```

### Register

```json
{
  "name": "林知夏",
  "email": "student@edumind.local",
  "password": "student123"
}
```

规则：

- 注册接口只创建 `student` 角色。
- 邮箱必须唯一。
- 密码必须非空，建议最少 8 位。
- 返回 `user`，不返回密码字段。

### Login

```json
{
  "email": "student@edumind.local",
  "password": "student123"
}
```

规则：

- 不再接受 `role` 作为登录凭据。
- 不再按邮箱自动创建用户。
- 用户状态不是 `active` 时拒绝登录。
- 登录成功创建 session 并返回 Bearer Token。

### Logout

```text
POST /api/auth/logout
Authorization: Bearer <token>
```

规则：

- 将当前 token 对应 session 标记为 revoked。
- 重复退出返回成功，不暴露 session 是否存在。

## Admin Users

```text
POST /api/admin/users
PATCH /api/admin/users/:id
POST /api/admin/users/:id/reset-password
GET /api/identity/users
GET /api/identity/users/:id/profile
PATCH /api/identity/users/:id/profile
```

### Create User

```json
{
  "name": "周老师",
  "email": "teacher@edumind.local",
  "role": "teacher",
  "password": "teacher123",
  "status": "active"
}
```

规则：

- 只有管理员可以创建 `teacher` 或 `admin`。
- 邮箱必须唯一。
- 创建结果不返回密码字段。

### Update User

```json
{
  "name": "周老师",
  "role": "teacher",
  "status": "active",
  "department": "School of Computer Science",
  "teacherNo": "T2026001"
}
```

规则：

- 只有管理员可以把用户提权为 `teacher` 或 `admin`。
- 账号状态可为 `active`、`inactive`、`archived`、`pending`。
- 将用户改为非 `active` 后，应撤销该用户现有 session。

### Reset Password

```json
{
  "password": "newPassword123"
}
```

规则：

- 只有管理员可以重置他人密码。
- 重置后更新 `passwordUpdatedAt`。
- 重置后撤销该用户旧 session。

## Role Permissions

```text
GET /api/admin/role-permissions
PATCH /api/admin/role-permissions
```

### Update Role Permissions

```json
{
  "permissions": [
    {
      "role": "teacher",
      "resource": "assessment",
      "actions": ["create:assignment", "grade:submission", "read:course-report"],
      "description": "Teachers manage assessment workflows."
    }
  ]
}
```

规则：

- 只有管理员可以编辑权限矩阵。
- 必须保留 `student`、`teacher`、`admin` 三类角色。
- `admin` 必须保留账号和权限管理能力。

## 废弃或调整

- 废弃登录请求中的 `name` 和 `role` 自动建号语义。
- 管理端不再展示旧 `ai` route。
- `GET /api/role-permissions` 可保留为只读兼容接口；管理端编辑走 `/api/admin/role-permissions`。
