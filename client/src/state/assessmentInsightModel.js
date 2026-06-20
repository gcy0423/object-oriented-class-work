function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function percentText(value) {
  return `${Math.round(asNumber(value))}%`;
}

function pushIf(items, condition, row) {
  if (condition) {
    items.push(row);
  }
}

function riskRank(level) {
  return { high: 3, medium: 2, low: 1 }[String(level || "").toLowerCase()] || 0;
}

function scoreSeverity(score) {
  const value = asNumber(score);
  if (value >= 90) {
    return "excellent";
  }
  if (value >= 75) {
    return "good";
  }
  if (value >= 60) {
    return "pass";
  }
  return "risk";
}

function summarizeBand(bands = {}) {
  const labels = { excellent: "优秀", good: "良好", pass: "达标", risk: "风险" };
  return Object.entries(bands)
    .filter(([, count]) => count)
    .map(([band, count]) => `${labels[band] || band}:${count}`)
    .join("，") || "暂无分段数据";
}

function conceptName(row) {
  return row.concept || row.title || row.conceptId || "unclassified";
}

function buildNarrativeCard(title, tone, lines = [], actions = []) {
  return {
    title,
    tone,
    lines: lines.filter(Boolean),
    actions: actions.filter(Boolean)
  };
}

function buildGradingNarrative(overview) {
  if (!overview) {
    return buildNarrativeCard("Grading overview", "neutral", ["暂无作业评分概览。"], ["请选择已有提交的作业。"]);
  }
  const consistency = overview.consistency || {};
  const gapLine = consistency.sampleSize
    ? `教师评分与 AI 评分样本 ${consistency.sampleSize} 条，平均差异 ${consistency.averageGap}，高风险差异 ${consistency.highRiskCount} 条。`
    : "教师评分与 AI 评分样本仍不足。";
  const actions = [];
  pushIf(actions, asNumber(consistency.highRiskCount) > 0, "发布最终反馈前，优先复核教师与 AI 评分差异较大的提交。");
  pushIf(actions, asNumber(overview.gradedCount) < asNumber(overview.submissionCount), "完成剩余提交评分，稳定班级统计。");
  pushIf(actions, asNumber(overview.average) < 70, "为低于达标线的学生补充一项巩固任务。");
  if (!actions.length) {
    actions.push("当前评分规则可继续使用，后续抽样复核评分一致性。");
  }
  return buildNarrativeCard("Grading overview", consistency.status || "stable", [
    `当前作业共有 ${overview.submissionCount || 0} 份提交，已评分 ${overview.gradedCount || 0} 份。`,
    `平均分 ${overview.average || 0}，分数范围 ${overview.minScore || 0}-${overview.maxScore || 0}。`,
    `分段分布：${summarizeBand(overview.bands)}。`,
    gapLine
  ], actions);
}

function buildRubricNarrative(profile) {
  if (!profile) {
    return buildNarrativeCard("Rubric quality", "neutral", ["暂无评分规则画像。"], ["请选择评分规则查看覆盖度。"]);
  }
  const missing = (profile.dimensionCoverage || []).filter((item) => !item.covered).map((item) => item.key);
  const tone = missing.length || (profile.warnings || []).length ? "warning" : "stable";
  return buildNarrativeCard("Rubric quality", tone, [
    `评分规则总分 ${profile.totalScore || 0}，质量分 ${profile.qualityScore || 0}%。`,
    `当前有 ${profile.criteria?.length || 0} 个评分项，缺失维度：${missing.join("，") || "无"}。`,
    `权重差异为 ${profile.weightBalance?.spread ?? 0} 分。`
  ], [
    ...(profile.improvementPlan || []),
    ...(missing.length ? ["为缺失维度补充明确的证据要求。"] : [])
  ]);
}

function buildPortfolioNarrative(portfolio) {
  if (!portfolio) {
    return buildNarrativeCard("Student portfolio", "neutral", ["暂无学生档案。"], ["请选择课程和学生范围。"]);
  }
  const risk = portfolio.risk || {};
  const assignmentProgress = portfolio.assignmentProgress || {};
  const practice = portfolio.practiceSummary || {};
  const gradeTrend = portfolio.gradeTrend || {};
  const actions = [];
  pushIf(actions, asNumber(assignmentProgress.completionRate) < 80, "跟进缺交作业，并确认学生理解截止时间。");
  pushIf(actions, asNumber(gradeTrend.averageScore) < 70, "根据已评分提交定位需要重讲的评分维度。");
  pushIf(actions, asNumber(practice.averageCorrectRate) < 70, "为正确率偏低的概念安排短练习。");
  pushIf(actions, risk.level === "high", "创建教师干预记录，并安排一次跟进。");
  if (!actions.length) {
    actions.push("学生档案证据稳定，保持每周观察。");
  }
  return buildNarrativeCard("Student portfolio", risk.level || "low", [
    `作业完成率 ${percentText(assignmentProgress.completionRate)}，已提交 ${assignmentProgress.submittedCount || 0}/${assignmentProgress.totalAssignments || 0}。`,
    `平均分 ${gradeTrend.averageScore || 0}，教师评分均值 ${gradeTrend.teacherAverageScore || 0}。`,
    `练习 ${practice.sessionCount || 0} 次，完成 ${practice.finishedCount || 0} 次，平均正确率 ${percentText(practice.averageCorrectRate)}。`,
    `档案风险等级 ${risk.level || "low"}，风险分 ${risk.score || 0}。`
  ], actions);
}

function buildCourseNarrative(report) {
  if (!report) {
    return buildNarrativeCard("Course report", "neutral", ["暂无课程评测报告。"], ["请选择课程后刷新报告。"]);
  }
  const distribution = report.gradeDistribution || {};
  const engagement = report.practiceEngagement || {};
  const mistakeLoad = report.mistakeLoad || {};
  const mastery = report.masteryCoverage || {};
  const riskCount = (report.riskRegister || []).filter((item) => item.risk?.level === "high").length;
  const actions = [];
  pushIf(actions, asNumber(distribution.risk) > 0, "复核风险分段提交，并补充评分规则维度反馈。");
  pushIf(actions, asNumber(engagement.finishRate) < 70, "通过提醒提高练习完成率。");
  pushIf(actions, asNumber(mistakeLoad.openMistakes) > 0, "根据待复习错题准备下一次讲评。");
  pushIf(actions, asNumber(mastery.weakRecordCount) > 0, "把薄弱掌握记录映射回知识概念和练习集。");
  pushIf(actions, riskCount > 0, "课前先查看风险清单，再安排干预。");
  if (!actions.length) {
    actions.push("课程证据整体平衡，继续收集评测数据。");
  }
  return buildNarrativeCard("Course report", riskCount ? "warning" : "stable", [
    `课程共有 ${report.assignmentCount || 0} 个作业、${report.submissionCount || 0} 份提交、${report.gradedSubmissionCount || 0} 份已评分提交。`,
    `成绩分布：优秀 ${distribution.excellent || 0}，良好 ${distribution.good || 0}，达标 ${distribution.pass || 0}，风险 ${distribution.risk || 0}。`,
    `练习完成率 ${percentText(engagement.finishRate)}，平均正确率 ${percentText(engagement.averageCorrectRate)}。`,
    `待复习错题 ${mistakeLoad.openMistakes || 0} 个，平均掌握度 ${percentText(mastery.averageMastery)}。`
  ], actions);
}

function buildMistakeNarrative(report) {
  if (!report) {
    return buildNarrativeCard("Mistake analysis", "neutral", ["暂无错题分析。"], ["请选择课程后刷新错题分析。"]);
  }
  const high = (report.concepts || []).filter((item) => item.priority === "high");
  const reasons = Object.entries(report.reasonSummary || {}).map(([reason, count]) => `${reason}:${count}`).join(", ");
  return buildNarrativeCard("Mistake analysis", high.length ? "high" : "stable", [
    `错题总数 ${report.totalMistakes || 0}，待复习 ${report.openMistakes || 0}，已复习 ${report.reviewedMistakes || 0}。`,
    `高优先级概念：${high.map((item) => item.concept).join("，") || "无"}。`,
    `原因概览：${reasons || "无"}。`
  ], [
    ...high.slice(0, 3).map((item) => `复习 ${item.concept}：${item.remediation?.advice || "再做一组练习"}`),
    ...(high.length ? ["从复习队列查看具体错因证据。"] : ["保持每周复习新增错题。"])
  ]);
}

function buildSessionNarrative(review) {
  if (!review) {
    return buildNarrativeCard("Practice review", "neutral", ["暂无练习复盘。"], ["请选择练习记录查看答题拆解。"]);
  }
  const total = asNumber(review.correctCount) + asNumber(review.incorrectCount);
  const rate = total ? Math.round((asNumber(review.correctCount) / total) * 100) : 0;
  const weakConcepts = (review.conceptBreakdown || []).filter((item) => asNumber(item.correctRate) < 70);
  return buildNarrativeCard("Practice review", weakConcepts.length ? "warning" : "stable", [
    `已答 ${review.answeredCount || 0} 题，正确 ${review.correctCount || 0}，错误 ${review.incorrectCount || 0}，待判定 ${review.pendingCount || 0}。`,
    `已判定正确率 ${rate}%。`,
    `薄弱概念：${weakConcepts.map((item) => item.concept).join("，") || "无"}。`
  ], [
    ...(review.nextActions || []),
    ...(weakConcepts.length ? ["根据薄弱概念生成自适应练习。"] : ["隔一天后进入混合复习。"])
  ]);
}

function buildAdaptivePlanNarrative(plan) {
  if (!plan) {
    return buildNarrativeCard("Adaptive plan", "neutral", ["暂无自适应练习方案。"], ["可基于当前薄弱证据生成练习方案。"]);
  }
  return buildNarrativeCard("Adaptive plan", plan.selectedCount < plan.targetCount ? "warning" : "stable", [
    `已选 ${plan.selectedCount || 0}/${plan.targetCount || 0} 题，预计 ${plan.estimatedMinutes || 0} 分钟。`,
    `薄弱概念 ${plan.weakConcepts?.length || 0} 个，覆盖概念 ${plan.coverage?.conceptCount || 0} 个。`,
    plan.strategy || ""
  ], [
    "先做第一个薄弱概念，再穿插两道非薄弱题。",
    "完成后刷新练习复盘，验证是否改善。"
  ]);
}

function buildRiskNarrative(register) {
  if (!register) {
    return buildNarrativeCard("Risk register", "neutral", ["暂无风险清单。"], ["请选择课程后查看风险清单。"]);
  }
  return buildNarrativeCard("Risk register", register.highRiskCount ? "high" : "stable", [
    `学生 ${register.totalStudents || 0} 人，高风险 ${register.highRiskCount || 0}，中风险 ${register.mediumRiskCount || 0}，低风险 ${register.lowRiskCount || 0}。`,
    `最高风险学生风险分 ${register.items?.[0]?.risk?.score ?? 0}。`
  ], [
    ...(register.items || []).filter((item) => item.risk?.level === "high").slice(0, 3).map(() => "为高风险学生安排干预。"),
    "发送干预消息前先查看学生档案证据。"
  ]);
}

export function buildInsightNarratives(insight) {
  return [
    buildGradingNarrative(insight.gradingOverview),
    buildRubricNarrative(insight.rubricInsight),
    buildPortfolioNarrative(insight.studentPortfolio),
    buildCourseNarrative(insight.courseReport),
    buildMistakeNarrative(insight.mistakeAnalysis),
    buildSessionNarrative(insight.sessionReview),
    buildAdaptivePlanNarrative(insight.adaptivePlan),
    buildRiskNarrative(insight.riskRegister)
  ];
}

export function buildInterventionQueue(insight) {
  const queue = [];
  for (const row of insight.riskRegister?.items || []) {
    pushIf(queue, row.risk?.level === "high" || row.risk?.level === "medium", {
      type: "risk-register",
      priority: row.risk?.level || "low",
      target: row.studentId,
      reason: `risk score ${row.risk?.score ?? 0}`,
      evidence: `completion=${row.assignmentCompletionRate ?? 0}, score=${row.averageScore ?? 0}, openMistakes=${row.openMistakes ?? 0}`,
      action: "Open student portfolio and create an intervention reminder."
    });
  }
  for (const row of insight.mistakeAnalysis?.nextReviewQueue || []) {
    queue.push({
      type: "mistake-review",
      priority: row.priority || "medium",
      target: row.concept,
      reason: row.reason || "mistake",
      evidence: row.stem || row.questionId,
      action: "Inspect mistake detail and assign a remediation question."
    });
  }
  for (const row of insight.gradingOverview?.rows || []) {
    pushIf(queue, asNumber(row.scoreGap) >= 15, {
      type: "grading-gap",
      priority: "high",
      target: row.studentName || row.studentId,
      reason: `teacher/AI gap ${row.scoreGap}`,
      evidence: row.submissionId,
      action: "Compare submission grading insight before final feedback."
    });
  }
  return queue.sort((a, b) => riskRank(b.priority) - riskRank(a.priority)).slice(0, 18);
}

export function buildEvidenceExportRows(insight) {
  const rows = [];
  for (const row of insight.studentPortfolio?.evidenceTimeline || []) {
    rows.push({
      source: "portfolio-timeline",
      id: row.id || "-",
      at: row.at || "",
      title: row.type || "event",
      value: row.summary || ""
    });
  }
  for (const row of insight.gradingOverview?.rows || []) {
    rows.push({
      source: "grading-overview",
      id: row.submissionId,
      at: row.submittedAt || "",
      title: row.studentName || row.studentId,
      value: `teacher=${row.teacherScore ?? "-"}; ai=${row.aiScore ?? "-"}; final=${row.finalScore ?? "-"}; band=${row.band}`
    });
  }
  for (const row of insight.mistakeAnalysis?.nextReviewQueue || []) {
    rows.push({
      source: "mistake-queue",
      id: row.mistakeId,
      at: row.updatedAt || "",
      title: row.concept,
      value: `${row.priority}; ${row.reason}; ${row.stem}`
    });
  }
  for (const row of insight.adaptivePlan?.questions || []) {
    rows.push({
      source: "adaptive-plan",
      id: row.id || row.questionId || "-",
      at: "",
      title: conceptName(row),
      value: `${row.difficulty || "-"}; ${row.reason || row.stem || ""}`
    });
  }
  return rows.slice(0, 40);
}

export function buildAssessmentInsightScorecard(insight) {
  const portfolioRisk = insight.studentPortfolio?.risk?.score ?? 0;
  const registerHigh = insight.riskRegister?.highRiskCount ?? 0;
  const gradingGap = insight.gradingOverview?.consistency?.averageGap ?? 0;
  const openMistakes = insight.mistakeAnalysis?.openMistakes ?? 0;
  const rubricQuality = insight.rubricInsight?.qualityScore ?? 0;
  const practiceCorrect = insight.sessionReview
    ? Math.round((asNumber(insight.sessionReview.correctCount) / Math.max(1, asNumber(insight.sessionReview.correctCount) + asNumber(insight.sessionReview.incorrectCount))) * 100)
    : 0;
  return {
    portfolioRisk,
    registerHigh,
    gradingGap,
    openMistakes,
    rubricQuality,
    practiceCorrect,
    overallReadiness: Math.max(0, Math.min(100, Math.round(
      rubricQuality * 0.25
      + practiceCorrect * 0.2
      + (100 - portfolioRisk) * 0.2
      + (100 - Math.min(100, gradingGap * 5)) * 0.15
      + (100 - Math.min(100, openMistakes * 10)) * 0.1
      + (100 - Math.min(100, registerHigh * 20)) * 0.1
    )))
  };
}

export function selectAssessmentInsightModel(state) {
  const insight = state.assessmentInsight || {};
  const scorecard = buildAssessmentInsightScorecard(insight);
  return {
    canManage: state.user?.role === "teacher" || state.user?.role === "admin",
    scorecard,
    narratives: buildInsightNarratives(insight),
    interventionQueue: buildInterventionQueue(insight),
    exportRows: buildEvidenceExportRows(insight)
  };
}
