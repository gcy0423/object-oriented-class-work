import { Repository } from "../../../../shared/data/repository.js";
import { Entity } from "../../../../shared/domain/entity.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || "").trim();
}

export class KnowledgeConcept extends Entity {
  constructor(record) {
    super(record);
    this.courseId = normalizeText(record.courseId);
    this.title = normalizeText(record.title);
    this.aliases = asArray(record.aliases);
    this.summary = normalizeText(record.summary);
    this.category = normalizeText(record.category || "general");
    this.difficulty = normalizeText(record.difficulty || "core");
    this.tags = asArray(record.tags);
    this.learningObjectives = asArray(record.learningObjectives);
    this.commonMisconceptions = asArray(record.commonMisconceptions);
    this.evidence = asArray(record.evidence);
  }

  searchText() {
    return [
      this.title,
      ...this.aliases,
      this.summary,
      this.category,
      this.difficulty,
      ...this.tags,
      ...this.learningObjectives,
      ...this.commonMisconceptions,
      ...this.evidence
    ].join(" ");
  }
}

export class KnowledgeArticle extends Entity {
  constructor(record) {
    super(record);
    this.courseId = normalizeText(record.courseId);
    this.conceptId = normalizeText(record.conceptId);
    this.title = normalizeText(record.title);
    this.outline = asArray(record.outline);
    this.body = normalizeText(record.body);
    this.examples = asArray(record.examples);
    this.checkpoints = asArray(record.checkpoints);
    this.tags = asArray(record.tags);
  }

  searchText() {
    return [
      this.title,
      this.body,
      ...this.outline,
      ...this.examples,
      ...this.checkpoints,
      ...this.tags
    ].join(" ");
  }
}

export class KnowledgeChunk extends Entity {
  constructor(record) {
    super(record);
    this.courseId = normalizeText(record.courseId);
    this.conceptId = normalizeText(record.conceptId);
    this.articleId = normalizeText(record.articleId);
    this.kind = normalizeText(record.kind || "note");
    this.title = normalizeText(record.title);
    this.content = normalizeText(record.content);
    this.keywords = asArray(record.keywords);
    this.weight = Number(record.weight || 1);
  }

  searchText() {
    return [this.title, this.kind, this.content, ...this.keywords].join(" ");
  }
}

export class KnowledgeRelation extends Entity {
  constructor(record) {
    super(record);
    this.courseId = normalizeText(record.courseId);
    this.sourceId = normalizeText(record.sourceId);
    this.targetId = normalizeText(record.targetId);
    this.type = normalizeText(record.type || "related");
    this.strength = Number(record.strength || 1);
    this.reason = normalizeText(record.reason);
  }
}

export class ReviewCard extends Entity {
  constructor(record) {
    super(record);
    this.courseId = normalizeText(record.courseId);
    this.conceptId = normalizeText(record.conceptId);
    this.question = normalizeText(record.question);
    this.answer = normalizeText(record.answer);
    this.hints = asArray(record.hints);
    this.level = normalizeText(record.level || "basic");
  }
}

export class KnowledgeConceptRepository extends Repository {
  constructor(database) {
    super(database, "concepts", (record) => new KnowledgeConcept(record));
  }

  findByCourse(courseId) {
    return this.where((concept) => !courseId || concept.courseId === courseId);
  }

  findByTag(tag) {
    return this.where((concept) => concept.tags.includes(tag));
  }
}

export class KnowledgeArticleRepository extends Repository {
  constructor(database) {
    super(database, "articles", (record) => new KnowledgeArticle(record));
  }

  findByConcept(conceptId) {
    return this.where((article) => article.conceptId === conceptId);
  }
}

export class KnowledgeChunkRepository extends Repository {
  constructor(database) {
    super(database, "chunks", (record) => new KnowledgeChunk(record));
  }

  findByConcept(conceptId) {
    return this.where((chunk) => chunk.conceptId === conceptId);
  }
}

export class KnowledgeRelationRepository extends Repository {
  constructor(database) {
    super(database, "relations", (record) => new KnowledgeRelation(record));
  }

  findTouching(conceptId) {
    return this.where((relation) => relation.sourceId === conceptId || relation.targetId === conceptId);
  }

  findOutgoing(conceptId) {
    return this.where((relation) => relation.sourceId === conceptId);
  }
}

export class ReviewCardRepository extends Repository {
  constructor(database) {
    super(database, "reviewCards", (record) => new ReviewCard(record));
  }

  findByConcept(conceptId) {
    return this.where((card) => card.conceptId === conceptId);
  }
}
