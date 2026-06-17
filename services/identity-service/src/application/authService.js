import { createHmac, timingSafeEqual } from "node:crypto";
import { AuthError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { Roles, User } from "../domain/identity.js";

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function requireText(value, label) {
  if (!String(value || "").trim()) {
    throw new ValidationError(`${label}不能为空。`);
  }
  return String(value).trim();
}

function normalizeRole(role) {
  return Object.values(Roles).includes(role) ? role : Roles.STUDENT;
}

export function parseBearerToken(header = "") {
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export class AuthService {
  constructor({ users, config }) {
    this.users = users;
    this.secret = config.tokenSecret;
  }

  async login({ email, name, role }) {
    const safeRole = normalizeRole(role);
    const safeEmail = String(email || `${name || "student"}@edumind.local`).trim().toLowerCase();
    let user = this.users.findByEmail(safeEmail);

    if (!user) {
      const now = new Date().toISOString();
      user = new User({
        id: `user_${base64url(safeEmail).slice(0, 8)}`,
        name: requireText(name || safeEmail.split("@")[0], "用户名"),
        role: safeRole,
        email: safeEmail,
        avatar: (name || safeEmail).slice(0, 1).toUpperCase(),
        createdAt: now,
        updatedAt: now
      });
      user = await this.users.save(user);
    }

    return {
      user,
      token: this.issueToken(user)
    };
  }

  issueToken(user) {
    const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT-lite" }));
    const payload = base64url(JSON.stringify({
      sub: user.id,
      role: user.role,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600
    }));
    const unsigned = `${header}.${payload}`;
    return `${unsigned}.${sign(unsigned, this.secret)}`;
  }

  verifyToken(token) {
    if (!token || token.split(".").length !== 3) {
      throw new AuthError();
    }

    const [header, payload, signature] = token.split(".");
    const unsigned = `${header}.${payload}`;
    const expected = sign(unsigned, this.secret);
    const givenBuffer = Buffer.from(signature || "");
    const expectedBuffer = Buffer.from(expected);

    if (givenBuffer.length !== expectedBuffer.length || !timingSafeEqual(givenBuffer, expectedBuffer)) {
      throw new AuthError();
    }

    let claims;
    try {
      claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      throw new AuthError();
    }

    if (claims.exp < Math.floor(Date.now() / 1000)) {
      throw new AuthError("登录状态已过期。");
    }

    const user = this.users.findById(claims.sub);
    if (!user) {
      throw new AuthError();
    }

    return { user, claims };
  }

  getCurrentUserFromHeader(header) {
    return this.verifyToken(parseBearerToken(header)).user;
  }

  getUserById(id) {
    const user = this.users.findById(id);
    if (!user) {
      throw new NotFoundError("用户不存在。");
    }
    return user;
  }

  getUsersByIds(ids = []) {
    const uniqueIds = [...new Set(Array.isArray(ids) ? ids.filter(Boolean) : [])];
    return uniqueIds
      .map((id) => this.users.findById(id))
      .filter(Boolean);
  }

  listUsers() {
    return this.users.all();
  }
}
