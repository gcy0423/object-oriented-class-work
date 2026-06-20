import { escapeHtml } from "../utils/dom.js";
import { statusText } from "../utils/format.js";
import { emptyState, metric, sectionCard, statusBadge } from "../widgets/cards.js";

function currentCourseId(state) {
  return state.filters.knowledge.courseId || state.dashboard?.courses?.[0]?.id || "";
}

function conceptTitle(state, conceptId) {
  const concept = (state.knowledge.concepts || []).find((item) => item.id === conceptId);
  return concept?.title || conceptId || "-";
}

function optionList(values, selected, labelFor = (item) => item) {
  return values.map((item) => `<option value="${escapeHtml(item)}" ${item === selected ? "selected" : ""}>${escapeHtml(labelFor(item))}</option>`).join("");
}

function tags(items = []) {
  return items.filter(Boolean).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("");
}

function courseSelect(state, selected = currentCourseId(state)) {
  const courses = state.dashboard?.courses || [];
  return `<select name="courseId">
    ${courses.length ? "" : `<option value="">默认课程</option>`}
    ${courses.map((course) => `<option value="${escapeHtml(course.id)}" ${course.id === selected ? "selected" : ""}>${escapeHtml(course.title)}</option>`).join("")}
  </select>`;
}

function summaryMetrics(summary = {}) {
  return `
    <section class="grid metric-grid knowledge-metrics">
      ${metric("概念", summary.concepts ?? 0)}
      ${metric("文章", summary.articles ?? 0)}
      ${metric("片段", summary.chunks ?? 0)}
      ${metric("关联", summary.relations ?? 0)}
    </section>
  `;
}

function filterForm(state) {
  const filter = state.filters.knowledge;
  const courses = state.dashboard?.courses || [];
  return `
    <form class="filter-toolbar knowledge-filter" data-form="knowledge-filter">
      <label><span>课程</span><select name="courseId">
        <option value="">默认课程</option>
        ${courses.map((course) => `<option value="${escapeHtml(course.id)}" ${currentCourseId(state) === course.id ? "selected" : ""}>${escapeHtml(course.title)}</option>`).join("")}
      </select></label>
      <label><span>关键词</span><input name="query" value="${escapeHtml(filter.query || "")}" placeholder="顺序图、领域对象..." /></label>
      <label><span>分类</span><input name="category" value="${escapeHtml(filter.category || "")}" placeholder="分析 / 设计" /></label>
      <label><span>难度</span><select name="difficulty">
        <option value="">不限</option>
        ${optionList(["basic", "intermediate", "advanced"], filter.difficulty, statusText)}
      </select></label>
      <label><span>标签</span><input name="tag" value="${escapeHtml(filter.tag || "")}" placeholder="UML、测试、建模" /></label>
      <div class="filter-actions">
        <button class="btn primary" type="submit">搜索</button>
      </div>
    </form>
  `;
}

function conceptList(state) {
  const concepts = state.knowledge.concepts || [];
  const selectedId = state.filters.knowledge.conceptId;
  if (!concepts.length) {
    return emptyState("当前筛选下没有概念。");
  }
  return `<div class="knowledge-concept-list">${concepts.slice(0, 24).map((concept) => `
    <article class="knowledge-concept ${selectedId === concept.id ? "is-selected" : ""}">
      <div class="knowledge-concept-head">
        <strong>${escapeHtml(concept.title)}</strong>
        ${statusBadge(concept.difficulty || "basic")}
      </div>
      <p class="muted">${escapeHtml(concept.summary || "")}</p>
      <div class="tag-row">${tags([concept.category, ...(concept.tags || []).slice(0, 3)])}</div>
      <div class="inline-actions">
        <button class="btn small" data-action="select-knowledge-concept" data-id="${escapeHtml(concept.id)}">打开</button>
        <button class="btn small" data-action="focus-knowledge-practice" data-id="${escapeHtml(concept.id)}">练习</button>
      </div>
    </article>
  `).join("")}</div>`;
}

function searchResults(results = []) {
  if (!results.length) {
    return emptyState("输入关键词后查看搜索结果。");
  }
  return `<div class="knowledge-result-list">${results.map((result) => `
    <article class="knowledge-result">
      <div class="knowledge-result-head">
        <strong>${escapeHtml(result.title)}</strong>
        <span class="tag">${escapeHtml(result.type)}</span>
      </div>
      <p>${escapeHtml(result.preview || "")}</p>
      <div class="tag-row">
        <span class="tag">${escapeHtml(result.conceptTitle || result.conceptId || "-")}</span>
        <span class="tag">匹配度 ${escapeHtml(result.score ?? 0)}</span>
        ${(result.matches || []).slice(0, 3).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}
      </div>
      <div class="inline-actions">
        <button class="btn small" data-action="select-knowledge-concept" data-id="${escapeHtml(result.conceptId || result.id)}">打开概念</button>
      </div>
    </article>
  `).join("")}</div>`;
}

function graphPanel(state) {
  const graph = state.knowledge.graph;
  if (!graph || !(graph.nodes || []).length) {
    return emptyState("选择概念或搜索后查看知识关联。");
  }
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  return `
    <div class="knowledge-graph">
      <div class="knowledge-node-cloud">
        ${nodes.map((node) => `
          <button class="knowledge-node" data-action="select-knowledge-concept" data-id="${escapeHtml(node.id)}">
            <strong>${escapeHtml(node.title)}</strong>
            <span>${escapeHtml(node.category || "-")} / ${escapeHtml(node.difficulty || "-")}</span>
          </button>
        `).join("")}
      </div>
      <div class="knowledge-edge-list">
        ${edges.slice(0, 12).map((edge) => `
          <div class="knowledge-edge">
            <strong>${escapeHtml(conceptTitle(state, edge.sourceId))}</strong>
            <span>${escapeHtml(edge.type)}</span>
            <strong>${escapeHtml(conceptTitle(state, edge.targetId))}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function profilePanel(profile) {
  if (!profile) {
    return emptyState("打开概念后查看文章、片段、关联和复习卡片。");
  }
  return `
    <article class="knowledge-profile">
      <div class="knowledge-profile-head">
        <div>
          <h3>${escapeHtml(profile.title)}</h3>
          <p class="muted">${escapeHtml(profile.summary || "")}</p>
        </div>
        ${statusBadge(profile.difficulty || "basic")}
      </div>
      <div class="tag-row">${tags([profile.category, ...(profile.tags || [])])}</div>
      <div class="knowledge-profile-grid">
        <section>
          <h4>学习目标</h4>
          ${(profile.learningObjectives || []).length ? `<ul class="plain-list">${profile.learningObjectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : emptyState("暂无学习目标。")}
        </section>
        <section>
          <h4>复习卡片</h4>
          ${(profile.reviewCards || []).length ? `<ul class="plain-list">${profile.reviewCards.slice(0, 4).map((card) => `<li><strong>${escapeHtml(card.question)}</strong><br /><span class="muted">${escapeHtml(card.answer)}</span></li>`).join("")}</ul>` : emptyState("暂无复习卡片。")}
        </section>
      </div>
      <div class="knowledge-chunk-list">
        ${(profile.chunks || []).slice(0, 6).map((chunk) => `
          <article>
            <strong>${escapeHtml(chunk.title)}</strong>
            <span class="tag">${escapeHtml(chunk.kind)}</span>
            <p>${escapeHtml(chunk.content)}</p>
          </article>
        `).join("")}
      </div>
    </article>
  `;
}

function recommendationList(items = []) {
  if (!items.length) {
    return emptyState("暂无推荐概念。");
  }
  return `<div class="knowledge-recommendations">${items.map((item) => `
    <article>
      <strong>${escapeHtml(item.title)}</strong>
      <p class="muted">${escapeHtml(item.reason || "")}</p>
      <ul class="plain-list">
        ${(item.nextActions || []).map((action) => `<li>${escapeHtml(action)}</li>`).join("")}
      </ul>
      <div class="inline-actions">
        <button class="btn small" data-action="select-knowledge-concept" data-id="${escapeHtml(item.conceptId)}">打开</button>
      </div>
    </article>
  `).join("")}</div>`;
}

function pathForm(state) {
  const draft = state.draft.knowledgePath || {};
  const saving = state.saving.knowledgePath;
  return `
    <form class="form-grid compact-form" data-form="knowledge-path">
      <label><span>目标</span><textarea name="goalText" rows="3" placeholder="目标概念、薄弱点或项目目标">${escapeHtml(draft.goalText || "")}</textarea></label>
      <div class="form-grid two-field-row">
        <label><span>课程</span>${courseSelect(state)}</label>
        <label><span>天数</span><input type="number" min="1" max="21" name="days" value="${escapeHtml(draft.days || 5)}" /></label>
      </div>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${saving ? "生成中..." : "生成路径"}</button>
    </form>
  `;
}

function pathPanel(path) {
  if (!path) {
    return emptyState("根据当前目标生成学习路径。");
  }
  return `
    <div class="stats-grid compact-stats">
      ${metric("概念", path.totalConcepts ?? 0)}
      ${metric("分钟", path.totalMinutes ?? 0)}
    </div>
    <ol class="knowledge-schedule">
      ${(path.schedule || []).map((day) => `
        <li>
          <time>${escapeHtml(day.date)}</time>
          <div>
            <strong>${escapeHtml(day.minutes ?? 0)} min</strong>
            ${(day.items || []).map((item) => `
              <article>
                <span>${escapeHtml(item.title)}</span>
                <small>${escapeHtml(item.category)} / ${escapeHtml(item.difficulty)} / ${escapeHtml(item.estimateMinutes)} min</small>
              </article>
            `).join("")}
          </div>
        </li>
      `).join("")}
    </ol>
  `;
}

function practiceForm(state) {
  const draft = state.draft.knowledgePractice || {};
  const saving = state.saving.knowledgePractice;
  return `
    <form class="form-grid compact-form" data-form="knowledge-practice">
      <label><span>概念</span><input name="conceptIds" value="${escapeHtml(draft.conceptIds || state.filters.knowledge.conceptId || "")}" placeholder="选择概念后自动填入" /></label>
      <div class="form-grid two-field-row">
        <label><span>课程</span>${courseSelect(state)}</label>
        <label><span>题数</span><input type="number" min="1" max="12" name="limit" value="${escapeHtml(draft.limit || 4)}" /></label>
      </div>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${saving ? "生成中..." : "生成练习"}</button>
    </form>
  `;
}

function practicePanel(set) {
  if (!set) {
    return emptyState("从选中的概念生成练习。");
  }
  return `
    <div class="stats-grid compact-stats">
      ${metric("概念", set.conceptCount ?? 0)}
      ${metric("题目", set.questionCount ?? (set.questions || []).length)}
    </div>
    <div class="knowledge-question-list">
      ${(set.questions || []).slice(0, 10).map((question) => `
        <article>
          <div class="knowledge-result-head">
            <strong>${escapeHtml(question.title || question.conceptId)}</strong>
            <span class="tag">${escapeHtml(question.type)}</span>
          </div>
          <p>${escapeHtml(question.question)}</p>
          ${question.referenceAnswer ? `<p class="muted">${escapeHtml(question.referenceAnswer)}</p>` : ""}
          ${question.explanation ? `<p class="muted">${escapeHtml(question.explanation)}</p>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function contextForm(state) {
  const draft = state.draft.knowledgeContext || {};
  const saving = state.saving.knowledgeContext;
  return `
    <form class="form-grid compact-form" data-form="knowledge-context">
      <label><span>问题</span><textarea name="question" rows="4">${escapeHtml(draft.question || "")}</textarea></label>
      <div class="form-grid two-field-row">
        <label><span>课程</span>${courseSelect(state)}</label>
        <label><span>数量</span><input type="number" min="1" max="8" name="limit" value="${escapeHtml(draft.limit || 4)}" /></label>
      </div>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${saving ? "生成中..." : "生成上下文"}</button>
    </form>
  `;
}

function contextPanel(context) {
  if (!context) {
    return emptyState("生成 AI 上下文后预览检索证据。");
  }
  return `
    <div class="knowledge-context">
      <p><strong>问题：</strong> ${escapeHtml(context.query || "")}</p>
      <div class="knowledge-context-grid">
        <section>
          <h4>概念证据</h4>
          ${(context.concepts || []).map((concept) => `
            <article>
              <strong>${escapeHtml(concept.title)}</strong>
              <p class="muted">${escapeHtml(concept.summary || "")}</p>
            </article>
          `).join("")}
        </section>
        <section>
          <h4>提示要点</h4>
          ${(context.promptHints || []).length ? `<ul class="plain-list">${context.promptHints.map((hint) => `<li>${escapeHtml(hint)}</li>`).join("")}</ul>` : emptyState("暂无提示要点。")}
        </section>
      </div>
    </div>
  `;
}

export function knowledgeView(state) {
  const knowledge = state.knowledge || {};
  return `
    ${summaryMetrics(knowledge.summary || {})}
    ${filterForm(state)}
    <section class="knowledge-layout">
      <div class="knowledge-main">
        ${sectionCard("搜索结果", searchResults(knowledge.searchResults || []))}
        ${sectionCard("概念目录", conceptList(state))}
        ${sectionCard("知识关联", graphPanel(state))}
        ${sectionCard("学习路径", pathPanel(knowledge.learningPath))}
        ${sectionCard("练习集", practicePanel(knowledge.practiceSet))}
      </div>
      <aside class="knowledge-side">
        ${sectionCard("概念详情", profilePanel(knowledge.selectedConcept))}
        ${sectionCard("推荐概念", recommendationList(knowledge.recommendations || []))}
        ${sectionCard("路径生成", pathForm(state))}
        ${sectionCard("练习生成", practiceForm(state))}
        ${sectionCard("AI 上下文", contextForm(state))}
        ${sectionCard("上下文预览", contextPanel(knowledge.aiContext))}
      </aside>
    </section>
  `;
}
