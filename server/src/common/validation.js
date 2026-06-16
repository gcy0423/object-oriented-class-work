import { ValidationError } from "./errors.js";

export function requireText(value, label, options = {}) {
  const text = String(value || "").trim();
  if (!text) {
    throw new ValidationError(`${label}不能为空。`, { field: options.field || label });
  }
  if (options.maxLength && text.length > options.maxLength) {
    throw new ValidationError(`${label}不能超过 ${options.maxLength} 个字符。`, {
      field: options.field || label,
      maxLength: options.maxLength,
      actualLength: text.length
    });
  }
  return text;
}

export function optionalText(value, label, options = {}) {
  if (value === undefined || value === null || value === "") {
    return options.defaultValue || "";
  }
  return requireText(value, label, options);
}

export function requireOneOf(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${label}不在允许范围内。`, { value, allowed });
  }
  return value;
}

export function toPositiveInteger(value, label, options = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new ValidationError(`${label}必须是正整数。`, { value });
  }
  if (options.max && number > options.max) {
    throw new ValidationError(`${label}不能大于 ${options.max}。`, { value, max: options.max });
  }
  return number;
}

export function normalizeTags(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 12);
}
