import { escapeHtml } from "../utils/dom.js";
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

function summaryMetrics(summary = {}) {
  return `
    <section class="grid metric-grid knowledge-metrics">
      ${metric("Concepts", summary.concepts ?? 0)}
      ${metric("Articles", summary.articles ?? 0)}
      ${metric("Chunks", summary.chunks ?? 0)}
      ${metric("Relations", summary.relations ?? 0)}
    </section>
  `;
}

function filterForm(state) {
  const filter = state.filters.knowledge;
  const courses = state.dashboard?.courses || [];
  return `
    <form class="filter-toolbar knowledge-filter" data-form="knowledge-filter">
      <label><span>Course</span><select name="courseId">
        <option value="">First course</option>
        ${courses.map((course) => `<option value="${escapeHtml(course.id)}" ${currentCourseId(state) === course.id ? "selected" : ""}>${escapeHtml(course.title)}</option>`).join("")}
      </select></label>
      <label><span>Query</span><input name="query" value="${escapeHtml(filter.query || "")}" placeholder="sequence diagram, domain object..." /></label>
      <label><span>Category</span><input name="category" value="${escapeHtml(filter.category || "")}" placeholder="analysis / design" /></label>
      <label><span>Difficulty</span><select name="difficulty">
        <option value="">Any</option>
        ${optionList(["basic", "intermediate", "advanced"], filter.difficulty)}
      </select></label>
      <label><span>Tag</span><input name="tag" value="${escapeHtml(filter.tag || "")}" placeholder="UML, RAG, testing" /></label>
      <div class="filter-actions">
        <button class="btn primary" type="submit">Search</button>
      </div>
    </form>
  `;
}

function conceptList(state) {
  const concepts = state.knowledge.concepts || [];
  const selectedId = state.filters.knowledge.conceptId;
  if (!concepts.length) {
    return emptyState("No concepts loaded for this filter.");
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
        <button class="btn small" data-action="select-knowledge-concept" data-id="${escapeHtml(concept.id)}">Open</button>
        <button class="btn small" data-action="focus-knowledge-practice" data-id="${escapeHtml(concept.id)}">Practice</button>
      </div>
    </article>
  `).join("")}</div>`;
}

function searchResults(results = []) {
  if (!results.length) {
    return emptyState("No search results yet.");
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
        <span class="tag">score ${escapeHtml(result.score ?? 0)}</span>
        ${(result.matches || []).slice(0, 3).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}
      </div>
      <div class="inline-actions">
        <button class="btn small" data-action="select-knowledge-concept" data-id="${escapeHtml(result.conceptId || result.id)}">Open concept</button>
      </div>
    </article>
  `).join("")}</div>`;
}

function graphPanel(state) {
  const graph = state.knowledge.graph;
  if (!graph || !(graph.nodes || []).length) {
    return emptyState("Select a concept or run a search to inspect graph evidence.");
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
    return emptyState("Open a concept to view articles, chunks, relations, and review cards.");
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
          <h4>Objectives</h4>
          ${(profile.learningObjectives || []).length ? `<ul class="plain-list">${profile.learningObjectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : emptyState("No objectives.")}
        </section>
        <section>
          <h4>Review Cards</h4>
          ${(profile.reviewCards || []).length ? `<ul class="plain-list">${profile.reviewCards.slice(0, 4).map((card) => `<li><strong>${escapeHtml(card.question)}</strong><br /><span class="muted">${escapeHtml(card.answer)}</span></li>`).join("")}</ul>` : emptyState("No review cards.")}
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
    return emptyState("No recommendations loaded.");
  }
  return `<div class="knowledge-recommendations">${items.map((item) => `
    <article>
      <strong>${escapeHtml(item.title)}</strong>
      <p class="muted">${escapeHtml(item.reason || "")}</p>
      <ul class="plain-list">
        ${(item.nextActions || []).map((action) => `<li>${escapeHtml(action)}</li>`).join("")}
      </ul>
      <div class="inline-actions">
        <button class="btn small" data-action="select-knowledge-concept" data-id="${escapeHtml(item.conceptId)}">Open</button>
      </div>
    </article>
  `).join("")}</div>`;
}

function pathForm(state) {
  const draft = state.draft.knowledgePath || {};
  const saving = state.saving.knowledgePath;
  return `
    <form class="form-grid compact-form" data-form="knowledge-path">
      <label><span>Goal</span><textarea name="goalText" rows="3" placeholder="Target concept, weak area, or project goal">${escapeHtml(draft.goalText || "")}</textarea></label>
      <div class="form-grid two-field-row">
        <label><span>Course</span><input name="courseId" value="${escapeHtml(currentCourseId(state))}" /></label>
        <label><span>Days</span><input type="number" min="1" max="21" name="days" value="${escapeHtml(draft.days || 5)}" /></label>
      </div>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${saving ? "Building..." : "Build path"}</button>
    </form>
  `;
}

function pathPanel(path) {
  if (!path) {
    return emptyState("Build a learning path from the current goal.");
  }
  return `
    <div class="stats-grid compact-stats">
      ${metric("Concepts", path.totalConcepts ?? 0)}
      ${metric("Minutes", path.totalMinutes ?? 0)}
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
      <label><span>Concept IDs</span><input name="conceptIds" value="${escapeHtml(draft.conceptIds || state.filters.knowledge.conceptId || "")}" placeholder="kc_sequence,kc_service_boundary" /></label>
      <div class="form-grid two-field-row">
        <label><span>Course</span><input name="courseId" value="${escapeHtml(currentCourseId(state))}" /></label>
        <label><span>Limit</span><input type="number" min="1" max="12" name="limit" value="${escapeHtml(draft.limit || 4)}" /></label>
      </div>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${saving ? "Building..." : "Build practice"}</button>
    </form>
  `;
}

function practicePanel(set) {
  if (!set) {
    return emptyState("Build a practice set from selected concepts.");
  }
  return `
    <div class="stats-grid compact-stats">
      ${metric("Concepts", set.conceptCount ?? 0)}
      ${metric("Questions", set.questionCount ?? (set.questions || []).length)}
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
      <label><span>Question</span><textarea name="question" rows="4">${escapeHtml(draft.question || "")}</textarea></label>
      <div class="form-grid two-field-row">
        <label><span>Course</span><input name="courseId" value="${escapeHtml(currentCourseId(state))}" /></label>
        <label><span>Limit</span><input type="number" min="1" max="8" name="limit" value="${escapeHtml(draft.limit || 4)}" /></label>
      </div>
      <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${saving ? "Building..." : "Build context"}</button>
    </form>
  `;
}

function contextPanel(context) {
  if (!context) {
    return emptyState("Build AI context to preview retrieval evidence.");
  }
  return `
    <div class="knowledge-context">
      <p><strong>Query:</strong> ${escapeHtml(context.query || "")}</p>
      <div class="knowledge-context-grid">
        <section>
          <h4>Concept Evidence</h4>
          ${(context.concepts || []).map((concept) => `
            <article>
              <strong>${escapeHtml(concept.title)}</strong>
              <p class="muted">${escapeHtml(concept.summary || "")}</p>
            </article>
          `).join("")}
        </section>
        <section>
          <h4>Prompt Hints</h4>
          ${(context.promptHints || []).length ? `<ul class="plain-list">${context.promptHints.map((hint) => `<li>${escapeHtml(hint)}</li>`).join("")}</ul>` : emptyState("No prompt hints.")}
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
        ${sectionCard("Search Results", searchResults(knowledge.searchResults || []))}
        ${sectionCard("Concept Catalog", conceptList(state))}
        ${sectionCard("Graph Evidence", graphPanel(state))}
        ${sectionCard("Learning Path", pathPanel(knowledge.learningPath))}
        ${sectionCard("Practice Set", practicePanel(knowledge.practiceSet))}
      </div>
      <aside class="knowledge-side">
        ${sectionCard("Concept Profile", profilePanel(knowledge.selectedConcept))}
        ${sectionCard("Recommendations", recommendationList(knowledge.recommendations || []))}
        ${sectionCard("Path Builder", pathForm(state))}
        ${sectionCard("Practice Builder", practiceForm(state))}
        ${sectionCard("AI Context Builder", contextForm(state))}
        ${sectionCard("AI Context Preview", contextPanel(knowledge.aiContext))}
      </aside>
    </section>
  `;
}
