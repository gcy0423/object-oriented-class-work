const FIELD_WEIGHTS = {
  title: 8,
  aliases: 6,
  tags: 5,
  summary: 4,
  body: 3,
  content: 3,
  keywords: 6,
  objectives: 4,
  checkpoints: 4,
  examples: 3
};

const STOP_WORDS = new Set([
  "的",
  "了",
  "和",
  "或",
  "以及",
  "如何",
  "怎么",
  "什么",
  "为什么",
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of"
]);

export function tokenize(text) {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/[，。；：！？、（）()[\]{}"'`~@#$%^&*_+=<>|\\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return [];
  }
  const words = normalized.split(" ").filter((item) => item && !STOP_WORDS.has(item));
  const compact = normalized.replace(/\s+/g, "");
  const grams = [];
  if (/[\u4e00-\u9fff]/.test(compact)) {
    for (let size = 2; size <= 4; size += 1) {
      for (let index = 0; index <= compact.length - size; index += 1) {
        grams.push(compact.slice(index, index + size));
      }
    }
  }
  return [...new Set([...words, ...grams].filter((token) => token.length > 1))];
}

function countTokenHits(value, tokens) {
  const haystack = String(value || "").toLowerCase();
  return tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
}

function scoreField(value, tokens, weight) {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + scoreField(item, tokens, weight), 0);
  }
  return countTokenHits(value, tokens) * weight;
}

export function scoreConcept(concept, query, tokens) {
  const exact = String(concept.title).toLowerCase() === String(query).trim().toLowerCase() ? 20 : 0;
  const aliasExact = concept.aliases.some((alias) => String(alias).toLowerCase() === String(query).trim().toLowerCase()) ? 12 : 0;
  const score =
    exact +
    aliasExact +
    scoreField(concept.title, tokens, FIELD_WEIGHTS.title) +
    scoreField(concept.aliases, tokens, FIELD_WEIGHTS.aliases) +
    scoreField(concept.tags, tokens, FIELD_WEIGHTS.tags) +
    scoreField(concept.summary, tokens, FIELD_WEIGHTS.summary) +
    scoreField(concept.learningObjectives, tokens, FIELD_WEIGHTS.objectives);
  return {
    type: "concept",
    id: concept.id,
    title: concept.title,
    courseId: concept.courseId,
    conceptId: concept.id,
    category: concept.category,
    score,
    item: concept
  };
}

export function scoreArticle(article, concept, query, tokens) {
  const score =
    scoreField(article.title, tokens, FIELD_WEIGHTS.title) +
    scoreField(article.tags, tokens, FIELD_WEIGHTS.tags) +
    scoreField(article.body, tokens, FIELD_WEIGHTS.body) +
    scoreField(article.outline, tokens, FIELD_WEIGHTS.summary) +
    scoreField(article.examples, tokens, FIELD_WEIGHTS.examples) +
    scoreField(article.checkpoints, tokens, FIELD_WEIGHTS.checkpoints) +
    (concept ? scoreConcept(concept, query, tokens).score * 0.25 : 0);
  return {
    type: "article",
    id: article.id,
    title: article.title,
    courseId: article.courseId,
    conceptId: article.conceptId,
    conceptTitle: concept?.title || "",
    score,
    item: article
  };
}

export function scoreChunk(chunk, concept, tokens) {
  const score =
    scoreField(chunk.title, tokens, FIELD_WEIGHTS.title) +
    scoreField(chunk.keywords, tokens, FIELD_WEIGHTS.keywords) +
    scoreField(chunk.content, tokens, FIELD_WEIGHTS.content) +
    (concept ? scoreField(concept.title, tokens, FIELD_WEIGHTS.summary) : 0) +
    Number(chunk.weight || 1);
  return {
    type: "chunk",
    id: chunk.id,
    title: chunk.title,
    courseId: chunk.courseId,
    conceptId: chunk.conceptId,
    conceptTitle: concept?.title || "",
    score,
    item: chunk
  };
}

export function rankSearchResults({ query, concepts, articles, chunks, limit = 10 }) {
  const tokens = tokenize(query);
  const conceptMap = new Map(concepts.map((concept) => [concept.id, concept]));
  if (!tokens.length) {
    return concepts.slice(0, limit).map((concept) => ({
      type: "concept",
      id: concept.id,
      title: concept.title,
      courseId: concept.courseId,
      conceptId: concept.id,
      category: concept.category,
      score: 1,
      item: concept
    }));
  }
  const rows = [
    ...concepts.map((concept) => scoreConcept(concept, query, tokens)),
    ...articles.map((article) => scoreArticle(article, conceptMap.get(article.conceptId), query, tokens)),
    ...chunks.map((chunk) => scoreChunk(chunk, conceptMap.get(chunk.conceptId), tokens))
  ];
  return rows
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function explainMatches(result, query) {
  const tokens = tokenize(query);
  const source = result.item?.searchText ? result.item.searchText() : JSON.stringify(result.item || {});
  const lowered = source.toLowerCase();
  return tokens
    .filter((token) => lowered.includes(token))
    .slice(0, 8)
    .map((token) => ({ token, reason: `命中 ${result.type} 的可检索文本` }));
}
