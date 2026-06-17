import { attr, escapeHtml } from "../utils/dom.js";
import { formatDateTime } from "../utils/format.js";
import { emptyState, statusBadge } from "../widgets/cards.js";
import { horizontalBars } from "../widgets/charts.js";
import { dataTable } from "../widgets/tables.js";
import { selectPracticeViewModel } from "../state/selectors.js";

function questionBankCards(banks = []) {
  if (!banks.length) {
    return emptyState("当前没有可练习的题库。");
  }
  return `<div class="course-list">${banks.map((bank) => `
    <article class="course-item">
      <strong>${escapeHtml(bank.title)}</strong>
      <div class="muted">${escapeHtml(bank.description || "暂无题库说明。")}</div>
      <div class="tag-row"><span class="tag">${escapeHtml(bank.courseId)}</span></div>
      <div class="button-row"><button class="btn primary" data-action="start-practice" data-id="${attr(bank.id)}" data-course-id="${attr(bank.courseId)}">开始练习</button></div>
    </article>
  `).join("")}</div>`;
}

function answerSheet(session) {
  const questions = session?.questions || [];
  if (!questions.length) {
    return emptyState("开始练习后会显示答题卡。");
  }
  const answers = new Map((session.answers || []).map((item) => [item.questionId, item]));
  return `
    <div class="answer-sheet">
      ${questions.map((question, index) => {
        const answer = answers.get(question.id);
        const tone = answer?.correct === true ? "reviewed" : answer?.correct === false ? "down" : answer ? "active" : "";
        return `<button class="${tone ? `${tone} ` : ""}answer-index" type="button" data-action="focus-question" data-id="${attr(question.id)}">${index + 1}</button>`;
      }).join("")}
    </div>
  `;
}

function questionRunner(session, saving, focusedQuestionId = "") {
  if (!session?.questions?.length) {
    return emptyState("当前没有进行中的练习。");
  }
  const answers = new Map((session.answers || []).map((item) => [item.questionId, item]));
  return `
    <div class="grid">
      ${session.questions.map((question) => {
        const answer = answers.get(question.id);
        const highlighted = focusedQuestionId === question.id ? "focused-question" : "";
        return `
          <form class="panel form-grid compact-form ${highlighted}" data-form="practice-answer">
            <input type="hidden" name="sessionId" value="${attr(session.id)}" />
            <input type="hidden" name="questionId" value="${attr(question.id)}" />
            <div class="question-stem">${escapeHtml(question.stem)}</div>
            ${question.choices?.length ? `<div class="choice-list">${question.choices.map((choice) => `<div class="choice-item">${escapeHtml(choice.id)}. ${escapeHtml(choice.text)}</div>`).join("")}</div>` : ""}
            <label>
              <span>我的答案</span>
              <input name="answer" value="${attr(Array.isArray(answer?.answer) ? answer.answer.join(",") : answer?.answer || "")}" />
              <small class="helper">客观题填写选项，主观题填写文本说明。</small>
            </label>
            ${answer ? `<div class="inline-feedback ${answer.correct === false ? "danger-text" : ""}">${escapeHtml(answer.explanation || (answer.correct ? "回答正确。" : "答案已保存。"))}</div>` : ""}
            <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${saving ? "提交中..." : "提交答案"}</button>
          </form>
        `;
      }).join("")}
      <div class="button-row"><button class="btn" data-action="finish-practice" data-id="${attr(session.id)}">完成练习</button></div>
    </div>
  `;
}

function mistakeReplay(items = []) {
  if (!items.length) {
    return emptyState("当前没有待回放的错题。");
  }
  return `<div class="grid">${items.map((item) => `
    <article class="panel">
      <div class="panel-header"><strong>${escapeHtml(item.question?.stem || item.questionId)}</strong>${statusBadge(item.status || "open")}</div>
      <p class="muted">${escapeHtml(item.question?.analysis || "暂无解析。")}</p>
      <div class="button-row">${item.status === "reviewed" ? "" : `<button class="btn small" data-action="review-mistake" data-id="${attr(item.id)}">标记已复习</button>`}</div>
    </article>
  `).join("")}</div>`;
}

function practiceHistoryTable(items = []) {
  return dataTable({
    columns: [
      { key: "startedAt", label: "开始时间", render: (row) => escapeHtml(formatDateTime(row.startedAt)) },
      { key: "status", label: "状态", render: (row) => statusBadge(row.status || "active") },
      { key: "answeredCount", label: "已答", render: (row) => escapeHtml(row.answeredCount ?? row.totalCount ?? row.questionIds?.length ?? 0) },
      { key: "correctRate", label: "正确率", render: (row) => escapeHtml(`${row.correctRate ?? 0}%`) },
      { key: "actions", label: "操作", render: (row) => `<button class="btn small" data-action="resume-practice" data-id="${attr(row.id)}">查看</button>` }
    ],
    rows: items,
    emptyText: "还没有练习历史。"
  });
}

export function practiceView(state) {
  const vm = selectPracticeViewModel(state);
  return `
    <section class="practice-layout">
      <div class="panel"><div class="panel-header"><h2>练习入口</h2></div>${questionBankCards(vm.banks)}</div>
      <div class="panel">
        <div class="panel-header"><h2>当前练习</h2><span class="tag">已答 ${escapeHtml(vm.progress.answered)} / ${escapeHtml(vm.progress.total)}</span></div>
        ${horizontalBars([{ label: "练习进度", value: vm.progress.percent, text: `${vm.progress.percent}%` }], { label: "练习进度" })}
        ${answerSheet(vm.session)}
        ${questionRunner(vm.session, state.saving.practiceAnswer, state.ui.focusedQuestionId)}
      </div>
      <div class="panel"><div class="panel-header"><h2>错题回放</h2></div>${mistakeReplay(vm.mistakes)}</div>
      <div class="panel"><div class="panel-header"><h2>练习历史</h2></div>${practiceHistoryTable(vm.history)}</div>
    </section>
  `;
}
