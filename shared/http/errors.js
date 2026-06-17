export class AppError extends Error {
  constructor(message, status = 500, code = "APP_ERROR", details = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = undefined) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class AuthError extends AppError {
  constructor(message = "登录状态无效，请重新登录。") {
    super(message, 401, "AUTH_REQUIRED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "当前请求没有访问权限。", details = undefined) {
    super(message, 403, "FORBIDDEN", details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "未找到请求的资源。") {
    super(message, 404, "NOT_FOUND");
  }
}

export function toHttpError(error) {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        ok: false,
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
  }

  return {
    status: 500,
    body: {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "服务暂时不可用，请稍后重试。"
    }
  };
}
