import { attr, escapeHtml } from "../../utils/dom.js";
import { selectStudentPracticeSessionModel } from "../../state/studentSelectors.js";
import { studentSection } from "./shared.js";

export function studentPracticeSessionView(state) {
  const model = selectStudentPracticeSessionModel(state);
  return `
    <section class="student-detail-layout">
      <div class="student-page-grid">
        ${studentSection("答题卡", `
          <div class="answer-sheet">
            ${model.questions.map((item, index) => `<button class="answer-index ${index === model.focusedQuestionIndex ? "active" : ""}" data-action="student-focus-question" data-index="${attr(index)}">${index + 1}</button>`).join("") || '<div class="student-empty">当前没有题目。</div>'}
          </div>
          <p>已答 ${escapeHtml(model.answeredCount)} / ${escapeHtml(model.totalCount)}</p>
        `)}
        ${studentSection("当前题目", model.currentQuestion ? `
          <form class="student-form-card" data-form="student-practice-answer">
            <input type="hidden" name="sessionId" value="${attr(model.session?.id || "")}" />
            <input type="hidden" name="questionId" value="${attr(model.currentQuestion.id)}" />
            <h3>${escapeHtml(model.currentQuestion.stem)}</h3>
            <div class="choice-list">${(model.currentQuestion.choices || []).map((choice) => `<label class="student-choice"><input type="radio" name="answer" value="${attr(choice.id)}" />${escapeHtml(choice.id)}. ${escapeHtml(choice.text)}</label>`).join("") || ""}</div>
            ${(model.currentQuestion.choices || []).length ? "" : `<label><span>我的答案</span><textarea name="answer" rows="5"></textarea></label>`}
            <div class="button-row">
              <button class="btn primary" type="submit">提交答案</button>
              <button class="btn" type="button" data-action="student-finish-practice" data-id="${attr(model.session?.id || "")}">完成练习</button>
            </div>
          </form>
        ` : '<div class="student-empty">当前没有聚焦题目。</div>')}
      </div>
    </section>
  `;
}
