import { selectAssessmentInsightModel } from "../state/assessmentInsightModel.js";
import { attr, escapeHtml } from "../utils/dom.js";
import { formatDateTime, formatPercent, statusText } from "../utils/format.js";
import { emptyState, metric, sectionCard, statusBadge } from "../widgets/cards.js";
import { horizontalBars } from "../widgets/charts.js";
import { dataTable } from "../widgets/tables.js";

function isTeacherLike(state) {
  return state.user?.role === "teacher" || state.user?.role === "admin";
}

function firstCourseId(state) {
  return state.filters.assessmentInsight.courseId || state.dashboard?.courses?.[0]?.id || "";
}

function selectedValue(primary, fallback = "") {
  return primary || fallback || "";
}

function optionRows(items, selected, labelFor = (item) => item.title || item.id) {
  return items.map((item) => `<option value="${attr(item.id)}" ${item.id === selected ? "selected" : ""}>${escapeHtml(labelFor(item))}</option>`).join("");
}

function compactText(value, fallback = "-") {
  const text = String(value ?? "").trim();
  return escapeHtml(text || fallback);
}

const narrativeTitleMap = {
  "Grading overview": "评分概览",
  "Rubric quality": "评分规则质量",
  "Student portfolio": "学生档案",
  "Course report": "课程报告",
  "Mistake analysis": "错题分析",
  "Practice review": "练习复盘",
  "Adaptive plan": "自适应练习",
  "Risk register": "风险清单"
};

function narrativeTitle(value) {
  return narrativeTitleMap[value] || value;
}

function summaryValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join("; ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => `${key}:${item}`).join(", ");
  }
  return value ?? "-";
}

function tagList(values = []) {
  return values.filter(Boolean).map((value) => `<span class="tag">${escapeHtml(value)}</span>`).join("");
}

function selectedStudentId(state) {
  const users = state.dashboard?.users || [];
  return state.filters.assessmentInsight.studentId
    || users.find((user) => user.role === "student")?.id
    || "";
}

function objectSummaryTable(source = {}) {
  const entries = Object.entries(source || {});
  if (!entries.length) {
    return emptyState("暂无摘要数据。");
  }
  return `<dl class="key-value-list insight-key-values">${entries.map(([key, value]) => `
    <div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(summaryValue(value))}</dd></div>
  `).join("")}</dl>`;
}

function insightMetrics(state) {
  const insight = state.assessmentInsight || {};
  const overview = insight.gradingOverview || {};
  const portfolio = insight.studentPortfolio || {};
  const risk = insight.riskRegister || {};
  const mistakes = insight.mistakeAnalysis || {};
  return `
    <section class="grid metric-grid insight-metrics">
      ${metric("作业", portfolio.assignmentProgress?.totalAssignments ?? overview.submissionCount ?? 0)}
      ${metric("平均分", portfolio.gradeTrend?.averageScore ?? overview.average ?? 0)}
      ${metric("待复习错题", mistakes.openMistakes ?? portfolio.mistakeSummary?.openMistakes ?? 0)}
      ${metric("高风险", risk.highRiskCount ?? portfolio.risk?.level ?? 0)}
    </section>
  `;
}

function filterForm(state) {
  const filter = state.filters.assessmentInsight;
  const courseId = firstCourseId(state);
  const assignments = state.assessment.assignments || [];
  const rubrics = state.assessment.rubrics || [];
  const sessions = state.assessment.practiceHistory || [];
  const mistakes = state.assessment.mistakes || [];
  const detailSubmissions = state.assessment.assignmentDetail?.submissions || [];
  const assignmentId = selectedValue(filter.assignmentId, assignments[0]?.id);
  const rubricId = selectedValue(filter.rubricId, state.assessment.assignmentDetail?.assignment?.rubricId || rubrics[0]?.id);
  const submissionId = selectedValue(filter.submissionId, detailSubmissions[0]?.id);
  const practiceSessionId = selectedValue(filter.practiceSessionId, sessions[0]?.id);
  const mistakeId = selectedValue(filter.mistakeId, mistakes[0]?.id);
  const users = state.dashboard?.users || [];
  const studentRows = users.filter((user) => user.role === "student");
  return `
    <form class="filter-toolbar insight-filter" data-form="assessment-insight-filter">
      <label><span>课程</span><select name="courseId">
        <option value="">默认课程</option>
        ${(state.dashboard?.courses || []).map((course) => `<option value="${attr(course.id)}" ${course.id === courseId ? "selected" : ""}>${escapeHtml(course.title)}</option>`).join("")}
      </select></label>
      <label><span>作业</span><select name="assignmentId">
        <option value="">自动选择</option>
        ${optionRows(assignments, assignmentId)}
      </select></label>
      <label><span>评分规则</span><select name="rubricId">
        <option value="">自动选择</option>
        ${optionRows(rubrics, rubricId)}
      </select></label>
      <label><span>提交</span><select name="submissionId">
        <option value="">自动选择</option>
        ${detailSubmissions.map((item) => `<option value="${attr(item.id)}" ${item.id === submissionId ? "selected" : ""}>${escapeHtml(item.studentSnapshot?.name || item.studentId || item.id)}</option>`).join("")}
      </select></label>
      <label><span>练习</span><select name="practiceSessionId">
        <option value="">自动选择</option>
        ${sessions.map((item, index) => `<option value="${attr(item.id)}" ${item.id === practiceSessionId ? "selected" : ""}>${escapeHtml(`练习 ${index + 1} / ${statusText(item.status || "active")}`)}</option>`).join("")}
      </select></label>
      <label><span>错题</span><select name="mistakeId">
        <option value="">自动选择</option>
        ${mistakes.map((item, index) => `<option value="${attr(item.id)}" ${item.id === mistakeId ? "selected" : ""}>${escapeHtml(`错题 ${index + 1} / ${statusText(item.status || "open")}`)}</option>`).join("")}
      </select></label>
      <label><span>学生</span><select name="studentId">
        ${studentRows.map((user) => `<option value="${attr(user.id)}" ${user.id === selectedStudentId(state) ? "selected" : ""}>${escapeHtml(user.name || user.id)}</option>`).join("")}
      </select></label>
      <div class="filter-actions">
        <button class="btn primary" type="submit">刷新洞察</button>
      </div>
    </form>
  `;
}

function gradingOverviewPanel(overview, canManage) {
  if (!canManage) {
    return emptyState("当前账号无权查看作业评分概览。");
  }
  if (!overview) {
    return emptyState("请选择作业查看评分概览。");
  }
  const bands = overview.bands || {};
  const rows = overview.rows || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("提交数", overview.submissionCount ?? 0)}
      ${metric("已评分", overview.gradedCount ?? 0)}
      ${metric("平均分", overview.average ?? 0)}
      ${metric("一致性", statusText(overview.consistency?.status || "-"))}
    </div>
    ${horizontalBars(Object.entries(bands).map(([band, count]) => ({ label: statusText(band), value: count * 20, text: count })), { label: "分数段" })}
    ${dataTable({
      columns: [
        { key: "studentName", label: "学生", render: (row) => compactText(row.studentName) },
        { key: "teacherScore", label: "教师评分", render: (row) => compactText(row.teacherScore) },
        { key: "aiScore", label: "AI", render: (row) => compactText(row.aiScore) },
        { key: "scoreGap", label: "差异", render: (row) => compactText(row.scoreGap) },
        { key: "band", label: "分段", render: (row) => statusBadge(row.band || "ungraded") },
        { key: "action", label: "操作", render: (row) => `<button class="btn small" data-action="load-submission-insight" data-id="${attr(row.submissionId)}">查看</button>` }
      ],
      rows,
      emptyText: "该作业暂无提交。"
    })}
  `;
}

function rubricInsightPanel(profile) {
  if (!profile) {
    return emptyState("请选择评分规则查看结构、分值和覆盖度。");
  }
  const criteria = profile.criteria || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("总分", profile.totalScore ?? 0)}
      ${metric("质量", `${profile.qualityScore ?? 0}%`)}
      ${metric("评分项", criteria.length)}
      ${metric("提醒", (profile.warnings || []).length)}
    </div>
    <div class="tag-row">${(profile.warnings || []).map((warning) => `<span class="badge warning">${escapeHtml(warning)}</span>`).join("")}</div>
    <div class="insight-dimension-grid">
      ${(profile.dimensionCoverage || []).map((item) => `
        <article class="${item.covered ? "is-covered" : "is-missing"}">
          <strong>${escapeHtml(item.key)}</strong>
          <span>${item.covered ? "已覆盖" : "待补充"}</span>
        </article>
      `).join("")}
    </div>
    ${dataTable({
      columns: [
        { key: "title", label: "评分项", render: (row) => compactText(row.title) },
        { key: "maxScore", label: "满分", render: (row) => compactText(row.maxScore) },
        { key: "weight", label: "权重", render: (row) => compactText(`${row.weight ?? 0}%`) },
        { key: "description", label: "说明", render: (row) => compactText(row.description) }
      ],
      rows: criteria,
      emptyText: "暂无评分项。"
    })}
    <ul class="plain-list insight-action-list">
      ${(profile.improvementPlan || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function submissionInsightPanel(insight) {
  if (!insight) {
    return emptyState("请选择提交记录，对比教师评分与 AI 评分。");
  }
  const comparison = insight.comparison || [];
  return `
    <div class="detail-block">
      <h3>${escapeHtml(insight.assignment?.title || "提交洞察")}</h3>
      <p class="muted">${escapeHtml(insight.recommendation || "")}</p>
      <div class="tag-row">
        <span class="tag">${escapeHtml(insight.submission?.studentSnapshot?.name || insight.submission?.studentId || "-")}</span>
        <span class="tag">${escapeHtml(formatDateTime(insight.submission?.submittedAt))}</span>
      </div>
    </div>
    ${dataTable({
      columns: [
        { key: "metric", label: "指标", render: (row) => compactText(row.metric) },
        { key: "teacher", label: "教师", render: (row) => compactText(row.teacher) },
        { key: "ai", label: "AI", render: (row) => compactText(row.ai) },
        { key: "gap", label: "差异", render: (row) => compactText(row.gap) },
        { key: "risk", label: "风险", render: (row) => statusBadge(row.risk || "normal") }
      ],
      rows: comparison,
      emptyText: "暂无可对比的教师评分与 AI 评分。"
    })}
    ${insight.aiEvidence ? `
      <div class="detail-block">
        <h3>提交前 AI 依据</h3>
        <p class="muted">${escapeHtml(insight.aiEvidence.aiCheck?.result?.summary || "暂无提交前 AI 自检摘要。")}</p>
      </div>
    ` : ""}
  `;
}

function portfolioPanel(portfolio) {
  if (!portfolio) {
    return emptyState("请选择课程和学生查看学习档案。");
  }
  const assignmentRows = portfolio.assignmentProgress?.rows || [];
  const timeline = portfolio.evidenceTimeline || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("完成率", formatPercent(portfolio.assignmentProgress?.completionRate))}
      ${metric("平均分", portfolio.gradeTrend?.averageScore ?? 0)}
      ${metric("练习", portfolio.practiceSummary?.sessionCount ?? 0)}
      ${metric("风险", `${portfolio.risk?.level || "-"} / ${portfolio.risk?.score ?? 0}`)}
    </div>
    ${dataTable({
      columns: [
        { key: "title", label: "作业", render: (row) => compactText(row.title) },
        { key: "submitted", label: "提交", render: (row) => row.submitted ? statusBadge("submitted") : statusBadge("missing", "warning") },
        { key: "teacherScore", label: "教师", render: (row) => compactText(row.teacherScore) },
        { key: "aiScore", label: "AI", render: (row) => compactText(row.aiScore) }
      ],
      rows: assignmentRows.slice(0, 8),
      emptyText: "暂无作业证据。"
    })}
    <ol class="insight-timeline">
      ${timeline.slice(0, 10).map((item) => `<li><time>${escapeHtml(formatDateTime(item.at))}</time><span>${escapeHtml(item.summary)}</span></li>`).join("")}
    </ol>
  `;
}

function courseReportPanel(report, canManage) {
  if (!canManage) {
    return emptyState("当前账号无权查看课程评测报告。");
  }
  if (!report) {
    return emptyState("请选择课程查看评测报告。");
  }
  const distribution = report.gradeDistribution || {};
  const engagement = report.practiceEngagement || {};
  const mistakeLoad = report.mistakeLoad || {};
  const mastery = report.masteryCoverage || {};
  return `
    <div class="stats-grid compact-stats">
      ${metric("作业", report.assignmentCount ?? 0)}
      ${metric("提交", report.submissionCount ?? 0)}
      ${metric("规则", report.rubricCount ?? 0)}
      ${metric("已评分", report.gradedSubmissionCount ?? 0)}
    </div>
    ${horizontalBars([
      { label: "优秀", value: (distribution.excellent || 0) * 20, text: distribution.excellent || 0 },
      { label: "良好", value: (distribution.good || 0) * 20, text: distribution.good || 0 },
      { label: "达标", value: (distribution.pass || 0) * 20, text: distribution.pass || 0 },
      { label: "风险", value: (distribution.risk || 0) * 20, text: distribution.risk || 0 }
    ], { label: "成绩分布" })}
    <div class="insight-mini-grid">
      <article><strong>练习</strong>${objectSummaryTable(engagement)}</article>
      <article><strong>错题</strong>${objectSummaryTable(mistakeLoad)}</article>
      <article><strong>掌握度</strong>${objectSummaryTable(mastery)}</article>
    </div>
  `;
}

function mistakeAnalysisPanel(report) {
  if (!report) {
    return emptyState("当前课程和学生暂无错题分析。");
  }
  const concepts = report.concepts || [];
  const queue = report.nextReviewQueue || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("总数", report.totalMistakes ?? 0)}
      ${metric("待复习", report.openMistakes ?? 0)}
      ${metric("已复习", report.reviewedMistakes ?? 0)}
      ${metric("概念", concepts.length)}
    </div>
    <div class="insight-concept-grid">
      ${concepts.slice(0, 8).map((item) => `
        <article>
          <div class="panel-header"><strong>${escapeHtml(item.concept)}</strong>${statusBadge(item.priority || "low")}</div>
          <p class="muted">${escapeHtml(item.remediation?.advice || "")}</p>
          <div class="tag-row">
            <span class="tag">待复习 ${escapeHtml(item.openCount ?? 0)}</span>
            <span class="tag">掌握度 ${escapeHtml(item.masteryScore ?? 0)}</span>
          </div>
        </article>
      `).join("")}
    </div>
    ${dataTable({
      columns: [
        { key: "concept", label: "概念", render: (row) => compactText(row.concept) },
        { key: "priority", label: "优先级", render: (row) => statusBadge(row.priority || "low") },
        { key: "stem", label: "题目", render: (row) => compactText(row.stem) },
        { key: "reason", label: "原因", render: (row) => compactText(row.reason) },
        { key: "action", label: "操作", render: (row) => `<button class="btn small" data-action="load-mistake-detail" data-id="${attr(row.mistakeId)}">详情</button>` }
      ],
      rows: queue,
      emptyText: "暂无待复习队列。"
    })}
  `;
}

function mistakeDetailPanel(detail) {
  if (!detail) {
    return emptyState("请选择错题查看详情。");
  }
  const question = detail.question || {};
  const answer = detail.answer || {};
  return `
    <div class="detail-block">
      <h3>${escapeHtml(question.stem || "错题详情")}</h3>
      <p class="muted">${escapeHtml(question.analysis || "")}</p>
      <div class="tag-row">${tagList([detail.reason, question.difficulty, detail.mistake?.status])}</div>
    </div>
    <dl class="key-value-list">
      <div><dt>学生答案</dt><dd>${compactText(Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer)}</dd></div>
      <div><dt>参考答案</dt><dd>${compactText(Array.isArray(question.answer) ? question.answer.join(", ") : question.answer)}</dd></div>
      <div><dt>建议</dt><dd>${compactText(detail.remediation?.advice)}</dd></div>
    </dl>
    <div class="tag-row">${tagList(detail.remediation?.evidenceToCollect || [])}</div>
  `;
}

function sessionReviewPanel(review) {
  if (!review) {
    return emptyState("请选择练习记录查看复盘。");
  }
  const conceptRows = review.conceptBreakdown || [];
  const difficulty = review.difficultyBreakdown || {};
  return `
    <div class="stats-grid compact-stats">
      ${metric("已答", review.answeredCount ?? 0)}
      ${metric("正确", review.correctCount ?? 0)}
      ${metric("错误", review.incorrectCount ?? 0)}
      ${metric("待判定", review.pendingCount ?? 0)}
    </div>
    ${horizontalBars(conceptRows.map((item) => ({ label: item.concept, value: item.correctRate, text: `${item.correctRate}%` })), { label: "概念正确率" })}
    <div class="insight-mini-grid">
      ${Object.entries(difficulty).map(([key, value]) => `<article><strong>${escapeHtml(key)}</strong>${objectSummaryTable(value)}</article>`).join("")}
    </div>
    <ul class="plain-list insight-action-list">${(review.nextActions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  `;
}

function adaptivePlanForm(state) {
  const draft = state.draft.adaptivePlan || {};
  const filter = state.filters.assessmentInsight;
  const courseId = firstCourseId(state);
  const users = state.dashboard?.users || [];
  const studentRows = users.filter((user) => user.role === "student");
  const selectedStudentId = filter.studentId || studentRows[0]?.id || "";
  const banks = state.assessment?.questionBanks || [];
  return `
    <form class="form-grid compact-form" data-form="adaptive-practice-plan">
      <div class="form-grid two-field-row">
        <label><span>课程</span><select name="courseId">
          ${(state.dashboard?.courses || []).map((course) => `<option value="${attr(course.id)}" ${course.id === courseId ? "selected" : ""}>${escapeHtml(course.title)}</option>`).join("")}
        </select></label>
        <label><span>学生</span><select name="studentId">
          ${studentRows.map((user) => `<option value="${attr(user.id)}" ${user.id === selectedStudentId ? "selected" : ""}>${escapeHtml(user.name || user.id)}</option>`).join("")}
        </select></label>
      </div>
      <div class="form-grid two-field-row">
        <label><span>题库</span><select name="bankId">
          <option value="">自动选择</option>
          ${banks.map((bank) => `<option value="${attr(bank.id)}" ${bank.id === draft.bankId ? "selected" : ""}>${escapeHtml(bank.title || bank.id)}</option>`).join("")}
        </select></label>
        <label><span>题目数量</span><input type="number" min="3" max="20" name="questionCount" value="${attr(draft.questionCount || 8)}" /></label>
      </div>
      <button class="btn primary" type="submit" ${state.saving.adaptivePlan ? "disabled" : ""}>${state.saving.adaptivePlan ? "生成中..." : "生成练习方案"}</button>
    </form>
  `;
}

function adaptivePlanPanel(plan) {
  if (!plan) {
    return emptyState("暂无自适应练习方案。");
  }
  const questions = plan.questions || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("已选", plan.selectedCount ?? 0)}
      ${metric("目标", plan.targetCount ?? 0)}
      ${metric("分钟", plan.estimatedMinutes ?? 0)}
      ${metric("薄弱概念", (plan.weakConcepts || []).length)}
    </div>
    <p class="muted">${escapeHtml(plan.strategy || "")}</p>
    ${dataTable({
      columns: [
        { key: "stem", label: "题目", render: (row) => compactText(row.stem) },
        { key: "concept", label: "概念", render: (row) => compactText(row.concept) },
        { key: "difficulty", label: "难度", render: (row) => statusBadge(row.difficulty || "medium") },
        { key: "reason", label: "原因", render: (row) => compactText(row.reason) }
      ],
      rows: questions.slice(0, 12),
      emptyText: "暂无推荐题目。"
    })}
  `;
}

function riskRegisterPanel(register, canManage) {
  if (!canManage) {
    return emptyState("当前账号无权查看风险清单。");
  }
  if (!register) {
    return emptyState("请选择课程查看风险清单。");
  }
  const rows = register.items || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("学生", register.totalStudents ?? 0)}
      ${metric("高", register.highRiskCount ?? 0)}
      ${metric("中", register.mediumRiskCount ?? 0)}
      ${metric("低", register.lowRiskCount ?? 0)}
    </div>
    ${dataTable({
      columns: [
        { key: "studentId", label: "学生", render: (row) => compactText(row.studentId) },
        { key: "risk", label: "风险", render: (row) => `${statusBadge(row.risk?.level || "low")} ${compactText(row.risk?.score ?? 0)}` },
        { key: "completion", label: "完成率", render: (row) => compactText(`${row.assignmentCompletionRate ?? 0}%`) },
        { key: "score", label: "平均分", render: (row) => compactText(row.averageScore) },
        { key: "mistakes", label: "待复习", render: (row) => compactText(row.openMistakes) },
        { key: "weak", label: "薄弱概念", render: (row) => tagList((row.weakConcepts || []).slice(0, 3).map((item) => item.concept)) }
      ],
      rows,
      emptyText: "暂无风险记录。"
    })}
  `;
}

function scorecardPanel(scorecard) {
  return `
    <div class="stats-grid compact-stats">
      ${metric("整体就绪", `${scorecard.overallReadiness ?? 0}%`)}
      ${metric("规则质量", `${scorecard.rubricQuality ?? 0}%`)}
      ${metric("练习正确率", `${scorecard.practiceCorrect ?? 0}%`)}
      ${metric("档案风险", scorecard.portfolioRisk ?? 0)}
    </div>
    ${horizontalBars([
      { label: "就绪度", value: scorecard.overallReadiness, text: `${scorecard.overallReadiness ?? 0}%` },
      { label: "规则", value: scorecard.rubricQuality, text: `${scorecard.rubricQuality ?? 0}%` },
      { label: "练习", value: scorecard.practiceCorrect, text: `${scorecard.practiceCorrect ?? 0}%` },
      { label: "风险压力", value: Math.max(0, 100 - (scorecard.portfolioRisk ?? 0)), text: `${scorecard.portfolioRisk ?? 0}` }
    ], { label: "评测就绪度" })}
  `;
}

function narrativePanel(items = []) {
  if (!items.length) {
    return emptyState("暂无洞察卡片。");
  }
  return `<div class="insight-narrative-grid">${items.map((item) => `
    <article>
      <div class="panel-header"><strong>${escapeHtml(narrativeTitle(item.title))}</strong>${statusBadge(item.tone || "neutral")}</div>
      <ul class="plain-list">${(item.lines || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
      <div class="insight-next-actions">
        ${(item.actions || []).slice(0, 4).map((action) => `<p>${escapeHtml(action)}</p>`).join("")}
      </div>
    </article>
  `).join("")}</div>`;
}

function interventionQueuePanel(rows = []) {
  return dataTable({
    columns: [
      { key: "type", label: "类型", render: (row) => compactText(row.type) },
      { key: "priority", label: "优先级", render: (row) => statusBadge(row.priority || "low") },
      { key: "target", label: "对象", render: (row) => compactText(row.target) },
      { key: "reason", label: "原因", render: (row) => compactText(row.reason) },
      { key: "action", label: "行动", render: (row) => compactText(row.action) }
    ],
    rows,
    emptyText: "暂无干预事项。"
  });
}

function evidenceExportPanel(rows = []) {
  return dataTable({
    columns: [
      { key: "source", label: "来源", render: (row) => compactText(row.source) },
      { key: "id", label: "编号", render: (row) => compactText(row.id) },
      { key: "at", label: "时间", render: (row) => compactText(row.at) },
      { key: "title", label: "标题", render: (row) => compactText(row.title) },
      { key: "value", label: "内容", render: (row) => compactText(row.value) }
    ],
    rows,
    emptyText: "暂无可导出的证据。"
  });
}

export function assessmentInsightView(state) {
  const insight = state.assessmentInsight || {};
  const model = selectAssessmentInsightModel(state);
  const canManage = isTeacherLike(state);
  return `
    ${insightMetrics(state)}
    ${filterForm(state)}
    <section class="insight-layout">
      <div class="insight-main">
        ${sectionCard("评测就绪度", scorecardPanel(model.scorecard))}
        ${sectionCard("洞察摘要", narrativePanel(model.narratives))}
        ${sectionCard("教师评分洞察", gradingOverviewPanel(insight.gradingOverview, canManage))}
        ${sectionCard("课程评测报告", courseReportPanel(insight.courseReport, canManage))}
        ${sectionCard("学生档案", portfolioPanel(insight.studentPortfolio))}
        ${sectionCard("错题分析", mistakeAnalysisPanel(insight.mistakeAnalysis))}
        ${sectionCard("练习复盘", sessionReviewPanel(insight.sessionReview))}
        ${sectionCard("自适应练习方案", adaptivePlanPanel(insight.adaptivePlan))}
      </div>
      <aside class="insight-side">
        ${sectionCard("生成练习方案", adaptivePlanForm(state))}
        ${sectionCard("干预队列", interventionQueuePanel(model.interventionQueue))}
        ${sectionCard("评分规则洞察", rubricInsightPanel(insight.rubricInsight))}
        ${sectionCard("提交评分洞察", submissionInsightPanel(insight.submissionInsight))}
        ${sectionCard("错题详情", mistakeDetailPanel(insight.mistakeDetail))}
        ${sectionCard("风险清单", riskRegisterPanel(insight.riskRegister, canManage))}
        ${sectionCard("证据导出预览", evidenceExportPanel(model.exportRows))}
      </aside>
    </section>
  `;
}
