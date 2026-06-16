export const ErrorCodes = Object.freeze({
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  AI_PROVIDER_ERROR: "AI_PROVIDER_ERROR",
  MIGRATION_ERROR: "MIGRATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR"
});

export const ErrorCatalog = Object.freeze({
  [ErrorCodes.VALIDATION_ERROR]: { status: 400, retryable: false, title: "请求参数错误" },
  [ErrorCodes.AUTH_REQUIRED]: { status: 401, retryable: false, title: "需要登录" },
  [ErrorCodes.FORBIDDEN]: { status: 403, retryable: false, title: "权限不足" },
  [ErrorCodes.NOT_FOUND]: { status: 404, retryable: false, title: "资源不存在" },
  [ErrorCodes.CONFLICT]: { status: 409, retryable: false, title: "资源状态冲突" },
  [ErrorCodes.RATE_LIMITED]: { status: 429, retryable: true, title: "请求过于频繁" },
  [ErrorCodes.AI_PROVIDER_ERROR]: { status: 502, retryable: true, title: "AI 服务调用失败" },
  [ErrorCodes.MIGRATION_ERROR]: { status: 500, retryable: false, title: "数据库迁移失败" },
  [ErrorCodes.INTERNAL_ERROR]: { status: 500, retryable: false, title: "服务内部错误" }
});

export class AppError extends Error {
  constructor(message, status = 500, code = ErrorCodes.INTERNAL_ERROR, details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryable = ErrorCatalog[code]?.retryable || false;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = undefined) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, details);
  }
}

export class AuthError extends AppError {
  constructor(message = "登录状态无效，请重新登录。") {
    super(message, 401, ErrorCodes.AUTH_REQUIRED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "当前角色没有执行该操作的权限。", details = undefined) {
    super(message, 403, ErrorCodes.FORBIDDEN, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "未找到请求的资源。", details = undefined) {
    super(message, 404, ErrorCodes.NOT_FOUND, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "资源状态冲突。", details = undefined) {
    super(message, 409, ErrorCodes.CONFLICT, details);
  }
}

export class AiProviderError extends AppError {
  constructor(message = "AI 服务暂时不可用。", details = undefined) {
    super(message, 502, ErrorCodes.AI_PROVIDER_ERROR, details);
  }
}

export class MigrationError extends AppError {
  constructor(message = "数据库迁移失败。", details = undefined) {
    super(message, 500, ErrorCodes.MIGRATION_ERROR, details);
  }
}

export function toHttpError(error) {
  if (error instanceof AppError) {
    const catalog = ErrorCatalog[error.code] || ErrorCatalog[ErrorCodes.INTERNAL_ERROR];
    return {
      status: error.status || catalog.status,
      body: {
        ok: false,
        code: error.code,
        title: catalog.title,
        message: error.message,
        retryable: error.retryable,
        details: error.details
      }
    };
  }
  return {
    status: 500,
    body: {
      ok: false,
      code: ErrorCodes.INTERNAL_ERROR,
      title: ErrorCatalog[ErrorCodes.INTERNAL_ERROR].title,
      message: "服务暂时不可用，请稍后重试。",
      retryable: false
    }
  };
}
