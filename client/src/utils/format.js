import { escapeHtml } from "./dom.js";

export function formatDate(value) {
  if (!value) {
    return "未设置";
  }
  return String(value).slice(0, 10);
}

export function formatDateTime(value) {
  if (!value) {
    return "未设置";
  }
  return String(value).replace("T", " ").slice(0, 16);
}

export function formatPercent(value) {
  const number = Number(value || 0);
  return `${Number.isFinite(number) ? Math.round(number) : 0}%`;
}

export function formatCount(value) {
  const number = Number(value || 0);
  return String(Number.isFinite(number) ? number : 0);
}

export function statusText(value) {
  const mapping = {
    draft: "草稿",
    published: "已发布",
    closed: "已关闭",
    active: "进行中",
    finished: "已完成",
    open: "待复习",
    reviewed: "已复习",
    judged: "已判定",
    pending_review: "待评阅",
    submitted: "已提交",
    graded: "已评分",
    up: "正常",
    down: "异常"
  };
  return mapping[value] || String(value || "-");
}

export function plain(value) {
  return escapeHtml(value);
}
