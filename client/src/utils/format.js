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
    completed: "已完成",
    dismissed: "已忽略",
    converted: "已转任务",
    todo: "待办",
    done: "已完成",
    doing: "进行中",
    blocked: "受阻",
    neutral: "常规",
    stable: "稳定",
    warning: "注意",
    excellent: "优秀",
    good: "良好",
    pass: "达标",
    risk: "风险",
    high: "高",
    medium: "中",
    low: "低",
    urgent: "紧急",
    missing: "缺失",
    "insufficient-data": "证据不足",
    ungraded: "未评分",
    normal: "正常",
    proposed: "待确认",
    accepted: "已接受",
    rejected: "已拒绝",
    superseded: "已替代",
    pinned: "置顶",
    course: "课程",
    assignment: "作业",
    group: "小组",
    ad_hoc: "临时",
    private: "私密",
    public: "公开",
    owner: "负责人",
    mentions: "仅提醒",
    all: "全部",
    none: "不提醒",
    link: "链接",
    document: "文档",
    repository: "仓库",
    dataset: "数据集",
    rubric: "评分规则",
    meeting_note: "会议纪要",
    up: "正常",
    down: "异常"
  };
  return mapping[value] || String(value || "-");
}

export function roleText(value) {
  const mapping = {
    student: "学生",
    teacher: "教师",
    admin: "管理员",
    member: "成员",
    leader: "组长",
    reviewer: "评阅人"
  };
  return mapping[value] || String(value || "用户");
}

export function providerText(value) {
  const provider = String(value || "").toLowerCase();
  if (provider.includes("mock") || provider.includes("fallback")) {
    return "AI 服务就绪";
  }
  if (provider.includes("lmstudio") || provider.includes("llm")) {
    return "本地 AI";
  }
  return value ? "AI 已连接" : "AI 服务就绪";
}

export function plain(value) {
  return escapeHtml(value);
}
