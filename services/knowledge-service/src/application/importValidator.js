import { ValidationError } from "../../../../shared/http/errors.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(record, field, errors) {
  if (!String(record[field] || "").trim()) {
    errors.push({ field, message: `${field} 不能为空` });
  }
}

function requireArray(record, field, errors) {
  if (!Array.isArray(record[field])) {
    errors.push({ field, message: `${field} 必须是数组` });
  }
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

export class KnowledgeImportValidator {
  constructor({ concepts, articles, relations }) {
    this.concepts = concepts;
    this.articles = articles;
    this.relations = relations;
  }

  validateConcept(record, index = 0) {
    const errors = [];
    if (!isPlainObject(record)) {
      return [{ index, field: "record", message: "知识点记录必须是对象" }];
    }
    requireString(record, "id", errors);
    requireString(record, "courseId", errors);
    requireString(record, "title", errors);
    requireString(record, "summary", errors);
    requireArray(record, "tags", errors);
    requireArray(record, "learningObjectives", errors);
    if (record.id && this.concepts.findById(record.id)) {
      errors.push({ field: "id", message: "知识点 id 已存在" });
    }
    return errors.map((error) => ({ index, ...error }));
  }

  validateArticle(record, index = 0) {
    const errors = [];
    if (!isPlainObject(record)) {
      return [{ index, field: "record", message: "文章记录必须是对象" }];
    }
    requireString(record, "id", errors);
    requireString(record, "courseId", errors);
    requireString(record, "conceptId", errors);
    requireString(record, "title", errors);
    requireString(record, "body", errors);
    requireArray(record, "outline", errors);
    if (record.conceptId && !this.concepts.findById(record.conceptId)) {
      errors.push({ field: "conceptId", message: "关联知识点不存在" });
    }
    if (record.id && this.articles.findById(record.id)) {
      errors.push({ field: "id", message: "文章 id 已存在" });
    }
    return errors.map((error) => ({ index, ...error }));
  }

  validateRelation(record, index = 0) {
    const errors = [];
    if (!isPlainObject(record)) {
      return [{ index, field: "record", message: "关系记录必须是对象" }];
    }
    requireString(record, "id", errors);
    requireString(record, "courseId", errors);
    requireString(record, "sourceId", errors);
    requireString(record, "targetId", errors);
    requireString(record, "type", errors);
    if (record.sourceId && !this.concepts.findById(record.sourceId)) {
      errors.push({ field: "sourceId", message: "源知识点不存在" });
    }
    if (record.targetId && !this.concepts.findById(record.targetId)) {
      errors.push({ field: "targetId", message: "目标知识点不存在" });
    }
    if (record.sourceId && record.targetId && record.sourceId === record.targetId) {
      errors.push({ field: "targetId", message: "关系不能指向自身" });
    }
    return errors.map((error) => ({ index, ...error }));
  }

  validateBatch(input) {
    const concepts = Array.isArray(input?.concepts) ? input.concepts : [];
    const articles = Array.isArray(input?.articles) ? input.articles : [];
    const relations = Array.isArray(input?.relations) ? input.relations : [];
    const errors = [
      ...concepts.flatMap((record, index) => this.validateConcept(record, index)),
      ...articles.flatMap((record, index) => this.validateArticle(record, index)),
      ...relations.flatMap((record, index) => this.validateRelation(record, index))
    ];
    const ids = uniqueValues([
      ...concepts.map((item) => item?.id),
      ...articles.map((item) => item?.id),
      ...relations.map((item) => item?.id)
    ]);
    const requestedIds = concepts.length + articles.length + relations.length;
    if (ids.length !== requestedIds) {
      errors.push({ index: -1, field: "id", message: "导入批次内存在重复 id" });
    }
    return {
      valid: errors.length === 0,
      errors,
      summary: {
        concepts: concepts.length,
        articles: articles.length,
        relations: relations.length
      }
    };
  }

  assertBatch(input) {
    const result = this.validateBatch(input);
    if (!result.valid) {
      throw new ValidationError("知识库导入校验失败。", result);
    }
    return result;
  }
}
