# Code Blueprint

## 密码工具

```js
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = await scryptAsync(password, salt, 64);
  return {
    passwordSalt: salt,
    passwordHash: Buffer.from(hash).toString("base64url")
  };
}

export async function verifyPassword(password, user) {
  const hash = await scryptAsync(password, user.passwordSalt, 64);
  const expected = Buffer.from(user.passwordHash, "base64url");
  const actual = Buffer.from(hash);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
```

## Token Payload

```js
{
  sub: user.id,
  role: user.role,
  name: user.name,
  jti: session.tokenId,
  iat: now,
  exp: now + 7 * 24 * 3600
}
```

验证 token 时必须检查：

- 签名正确。
- `exp` 未过期。
- 用户存在。
- 用户状态为 `active`。
- session 存在。
- session 未撤销。
- session 未过期。

## AuthService 方法

```js
class AuthService {
  async register({ name, email, password }) {}
  async login({ email, password }) {}
  async logout(token) {}
  async createUser(requestUser, input) {}
  async updateUser(requestUser, userId, input) {}
  async resetPassword(requestUser, userId, input) {}
  verifyToken(token) {}
}
```

## User 输出过滤

```js
function publicUser(user) {
  const record = user.toJSON ? user.toJSON() : user;
  const { passwordHash, passwordSalt, ...safe } = record;
  return safe;
}
```

所有用户响应必须走等价过滤逻辑。

## 管理端导航

```js
export const routeTable = {
  // 删除 ai route 的可见入口
  "identity-admin": { label: "账号与权限", roles: ["admin"] }
};
```

教师如仍需课程和班级成员管理，应通过教师端页面或保留受限的成员管理区进入；管理员端主入口命名为账号与权限。

## 管理端表单

`identityAdminView` 至少包含：

- 账号筛选。
- 账号列表。
- 创建账号表单。
- 用户详情表单。
- 重置密码表单。
- 权限矩阵编辑区。
- 班级和小组管理区。
