import { NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { explainMatches, rankSearchResults } from "./searchEngine.js";

function clampLimit(value, fallback, max) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
}

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function compactConcept(concept) {
  return {
    id: concept.id,
    courseId: concept.courseId,
    title: concept.title,
    aliases: concept.aliases,
    summary: concept.summary,
    category: concept.category,
    difficulty: concept.difficulty,
    tags: concept.tags,
    learningObjectives: concept.learningObjectives
  };
}

function compactArticle(article) {
  return {
    id: article.id,
    courseId: article.courseId,
    conceptId: article.conceptId,
    title: article.title,
    outline: article.outline,
    examples: article.examples,
    checkpoints: article.checkpoints,
    tags: article.tags
  };
}

function compactChunk(chunk) {
  return {
    id: chunk.id,
    courseId: chunk.courseId,
    conceptId: chunk.conceptId,
    articleId: chunk.articleId,
    kind: chunk.kind,
    title: chunk.title,
    content: chunk.content,
    keywords: chunk.keywords,
    weight: chunk.weight
  };
}

export class KnowledgeService {
  constructor({ config, concepts, articles, chunks, relations, reviewCards, importValidator, pathPlanner, practiceSetBuilder }) {
    this.config = config;
    this.concepts = concepts;
    this.articles = articles;
    this.chunks = chunks;
    this.relations = relations;
    this.reviewCards = reviewCards;
    this.importValidator = importValidator;
    this.pathPlanner = pathPlanner;
    this.practiceSetBuilder = practiceSetBuilder;
  }

  summary() {
    const concepts = this.concepts.all();
    const articles = this.articles.all();
    const chunks = this.chunks.all();
    const categories = {};
    const courses = {};
    for (const concept of concepts) {
      categories[concept.category] = (categories[concept.category] || 0) + 1;
      courses[concept.courseId] = (courses[concept.courseId] || 0) + 1;
    }
    return {
      concepts: concepts.length,
      articles: articles.length,
      chunks: chunks.length,
      relations: this.relations.all().length,
      reviewCards: this.reviewCards.all().length,
      categories,
      courses
    };
  }

  listConcepts({ courseId, category, tag, difficulty } = {}) {
    return this.concepts
      .all()
      .filter((concept) => !courseId || concept.courseId === courseId)
      .filter((concept) => !category || concept.category === category)
      .filter((concept) => !difficulty || concept.difficulty === difficulty)
      .filter((concept) => !tag || concept.tags.includes(tag))
      .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
      .map(compactConcept);
  }

  getConceptProfile(id) {
    const concept = this.concepts.findById(id);
    if (!concept) {
      throw new NotFoundError("知识点不存在。");
    }
    const articleRows = this.articles.findByConcept(id);
    const chunkRows = this.chunks.findByConcept(id);
    const relationRows = this.relations.findTouching(id);
    const cardRows = this.reviewCards.findByConcept(id);
    const conceptMap = byId(this.concepts.all());
    return {
      ...compactConcept(concept),
      articles: articleRows.map(compactArticle),
      chunks: chunkRows.map(compactChunk),
      relations: relationRows.map((relation) => ({
        id: relation.id,
        type: relation.type,
        sourceId: relation.sourceId,
        sourceTitle: conceptMap.get(relation.sourceId)?.title || relation.sourceId,
        targetId: relation.targetId,
        targetTitle: conceptMap.get(relation.targetId)?.title || relation.targetId,
        strength: relation.strength,
        reason: relation.reason
      })),
      reviewCards: cardRows.map((card) => ({
        id: card.id,
        question: card.question,
        answer: card.answer,
        hints: card.hints,
        level: card.level
      }))
    };
  }

  search({ query, courseId, limit } = {}) {
    const safeLimit = clampLimit(limit, 10, this.config.maxSearchLimit);
    const concepts = this.concepts.all().filter((item) => !courseId || item.courseId === courseId);
    const articles = this.articles.all().filter((item) => !courseId || item.courseId === courseId);
    const chunks = this.chunks.all().filter((item) => !courseId || item.courseId === courseId);
    const results = rankSearchResults({ query, concepts, articles, chunks, limit: safeLimit });
    return results.map((result) => ({
      type: result.type,
      id: result.id,
      title: result.title,
      courseId: result.courseId,
      conceptId: result.conceptId,
      conceptTitle: result.conceptTitle,
      score: Number(result.score.toFixed(2)),
      matches: explainMatches(result, query),
      preview: this.previewFor(result)
    }));
  }

  previewFor(result) {
    if (result.type === "concept") {
      return result.item.summary;
    }
    if (result.type === "article") {
      return result.item.body.slice(0, 160);
    }
    return result.item.content.slice(0, 160);
  }

  buildGraph({ courseId, conceptId, depth } = {}) {
    const safeDepth = clampLimit(depth, this.config.graphDepth, 4);
    const conceptMap = byId(this.concepts.all().filter((concept) => !courseId || concept.courseId === courseId));
    const allRelations = this.relations.all().filter((relation) => conceptMap.has(relation.sourceId) && conceptMap.has(relation.targetId));
    const seedIds = conceptId ? [conceptId] : [...conceptMap.keys()].slice(0, 12);
    const visited = new Set();
    const frontier = seedIds.filter((id) => conceptMap.has(id));

    for (let level = 0; level <= safeDepth && frontier.length; level += 1) {
      const current = frontier.splice(0, frontier.length);
      for (const id of current) {
        if (visited.has(id)) {
          continue;
        }
        visited.add(id);
        for (const relation of allRelations) {
          if (relation.sourceId === id && !visited.has(relation.targetId)) {
            frontier.push(relation.targetId);
          }
          if (relation.targetId === id && !visited.has(relation.sourceId)) {
            frontier.push(relation.sourceId);
          }
        }
      }
    }

    const nodes = [...visited].map((id) => {
      const concept = conceptMap.get(id);
      return {
        id,
        title: concept.title,
        category: concept.category,
        difficulty: concept.difficulty,
        tags: concept.tags
      };
    });
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = allRelations
      .filter((relation) => nodeIds.has(relation.sourceId) && nodeIds.has(relation.targetId))
      .map((relation) => ({
        id: relation.id,
        sourceId: relation.sourceId,
        targetId: relation.targetId,
        type: relation.type,
        strength: relation.strength,
        reason: relation.reason
      }));

    return { nodes, edges };
  }

  recommend({ courseId, goalText, weakConcepts = [], limit } = {}) {
    const queryParts = [goalText, ...weakConcepts].filter(Boolean);
    const query = queryParts.length ? queryParts.join(" ") : "面向对象 设计 模型 作业";
    const results = this.search({ query, courseId, limit: clampLimit(limit, 6, this.config.maxSearchLimit) });
    const seen = new Set();
    return results
      .filter((result) => {
        if (seen.has(result.conceptId)) {
          return false;
        }
        seen.add(result.conceptId);
        return true;
      })
      .map((result) => {
        const profile = this.getConceptProfile(result.conceptId);
        return {
          conceptId: profile.id,
          title: profile.title,
          reason: result.preview,
          nextActions: profile.learningObjectives.slice(0, 3),
          reviewCards: profile.reviewCards.slice(0, 2)
        };
      });
  }

  buildAiContext({ question, courseId, limit } = {}) {
    const query = String(question || "").trim();
    if (!query) {
      throw new ValidationError("问题不能为空。");
    }
    const results = this.search({ query, courseId, limit: clampLimit(limit, 5, this.config.maxSearchLimit) });
    const conceptIds = [...new Set(results.map((result) => result.conceptId).filter(Boolean))];
    const profiles = conceptIds.slice(0, 5).map((id) => this.getConceptProfile(id));
    return {
      query,
      courseId: courseId || null,
      concepts: profiles.map((profile) => ({
        id: profile.id,
        title: profile.title,
        summary: profile.summary,
        objectives: profile.learningObjectives,
        misconceptions: profile.commonMisconceptions,
        chunks: profile.chunks.slice(0, 3).map((chunk) => ({
          title: chunk.title,
          content: chunk.content
        }))
      })),
      promptHints: profiles.flatMap((profile) => profile.chunks)
        .filter((chunk) => chunk.kind === "prompt-hint" || chunk.kind === "rule")
        .slice(0, 6)
        .map((chunk) => `${chunk.title}：${chunk.content}`),
      searchResults: results
    };
  }

  validateImport(input) {
    return this.importValidator.validateBatch(input);
  }

  buildLearningPath(input = {}) {
    const conceptIds = Array.isArray(input.conceptIds) ? input.conceptIds : [];
    const searchConcepts = !conceptIds.length && input.goalText
      ? this.search({
        query: input.goalText,
        courseId: input.courseId || this.config.defaultCourseId,
        limit: 6
      }).map((result) => result.conceptId)
      : conceptIds;
    return this.pathPlanner.buildPlan({
      conceptIds: [...new Set(searchConcepts)],
      courseId: input.courseId || this.config.defaultCourseId,
      startDate: input.startDate,
      days: input.days
    });
  }

  buildPracticeSet(input = {}) {
    return this.practiceSetBuilder.buildSet({
      courseId: input.courseId || this.config.defaultCourseId,
      conceptIds: Array.isArray(input.conceptIds) ? input.conceptIds : [],
      limit: input.limit
    });
  }
}
