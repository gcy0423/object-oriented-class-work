import { ForbiddenError } from "../../../../shared/http/errors.js";

export function isTeacherRole(role) {
  return role === "teacher" || role === "admin";
}

export function ensureTeacherRole(user) {
  if (!isTeacherRole(user.role)) {
    throw new ForbiddenError("只有教师或管理员可以查看教师统计。");
  }
}

export function average(values = []) {
  if (!values.length) {
    return 0;
  }
  return Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length);
}

export function percentage(numerator, denominator) {
  if (!denominator) {
    return 0;
  }
  return Math.round((numerator / denominator) * 100);
}

export function sum(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

export function sortByCreatedDesc(items = [], field = "createdAt") {
  return [...items].sort((left, right) => String(right?.[field] || "").localeCompare(String(left?.[field] || "")));
}

export function groupAverageBy(items = [], keyField, valueField) {
  const groups = new Map();
  for (const item of items) {
    const key = String(item?.[keyField] || "").trim();
    if (!key) {
      continue;
    }
    const current = groups.get(key) || [];
    current.push(Number(item?.[valueField] || 0));
    groups.set(key, current);
  }
  return [...groups.entries()].map(([key, values]) => ({
    key,
    score: average(values)
  }));
}

export function uniqueBy(items = [], keySelector) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keySelector(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
