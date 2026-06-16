export const LEARNING_RESOURCE_CATALOG = Object.freeze([
  Object.freeze({
    id: "ood_domain_modeling",
    courseId: "course_ood",
    courseTitle: "面向对象技术与方法",
    topic: "领域建模",
    concept: "实体、值对象与聚合边界",
    level: "项目实践",
    promptHint: "回答领域建模问题时，优先说明实体身份、生命周期、值对象不可变性和聚合根职责。",
    keywords: Object.freeze(["领域模型", "实体", "值对象", "聚合", "类图"])
  }),
  Object.freeze({
    id: "ood_use_case",
    courseId: "course_ood",
    courseTitle: "面向对象技术与方法",
    topic: "UML 用例分析",
    concept: "参与者、用例、系统边界与权限",
    level: "入门",
    promptHint: "回答用例图问题时，先明确参与者和系统边界，再说明认证、鉴权和核心业务用例。",
    keywords: Object.freeze(["用例图", "参与者", "权限", "系统边界"])
  }),
  Object.freeze({
    id: "ood_sequence",
    courseId: "course_ood",
    courseTitle: "面向对象技术与方法",
    topic: "顺序图",
    concept: "对象协作与消息时序",
    level: "进阶",
    promptHint: "回答顺序图问题时，按照前端、控制器、应用服务、领域对象、仓储和外部服务的调用顺序组织。",
    keywords: Object.freeze(["顺序图", "对象协作", "消息", "时序"])
  }),
  Object.freeze({
    id: "ai_prompt_engineering",
    courseId: "course_ai",
    courseTitle: "人工智能应用实践",
    topic: "LLM 提示词",
    concept: "系统提示、用户提示与上下文注入",
    level: "项目实践",
    promptHint: "回答 AI 接入问题时，说明系统提示词、用户输入、课程上下文和知识库检索结果如何共同构成消息。",
    keywords: Object.freeze(["LLM", "提示词", "上下文", "Provider", "LM Studio"])
  }),
  Object.freeze({
    id: "ai_provider_resilience",
    courseId: "course_ai",
    courseTitle: "人工智能应用实践",
    topic: "AI 服务可靠性",
    concept: "超时、重试、降级与错误映射",
    level: "进阶",
    promptHint: "回答 AI 稳定性问题时，说明超时时间、Provider 抽象、Mock 降级和统一错误码。",
    keywords: Object.freeze(["超时", "重试", "降级", "错误处理"])
  }),
  Object.freeze({
    id: "project_task_breakdown",
    courseId: "course_project",
    courseTitle: "软件项目管理",
    topic: "任务拆解",
    concept: "目标、任务、依赖与检查点",
    level: "项目实践",
    promptHint: "回答项目计划问题时，优先把目标拆成可验证任务，并给出依赖、负责人和验收标准。",
    keywords: Object.freeze(["任务拆解", "里程碑", "验收", "计划"])
  }),
  Object.freeze({
    id: "backend_auth",
    courseId: "course_backend",
    courseTitle: "服务端架构与接口设计",
    topic: "认证与鉴权",
    concept: "Token 校验、角色权限与资源归属",
    level: "进阶",
    promptHint: "回答权限问题时，区分认证、角色权限、资源所有者校验和审计记录。",
    keywords: Object.freeze(["认证", "鉴权", "Token", "角色", "资源归属"])
  }),
  Object.freeze({
    id: "backend_migration",
    courseId: "course_backend",
    courseTitle: "服务端架构与接口设计",
    topic: "数据库迁移",
    concept: "迁移版本、校验和与可追溯 schema",
    level: "项目实践",
    promptHint: "回答数据库演化问题时，说明迁移文件、版本记录、校验和和回滚策略。",
    keywords: Object.freeze(["数据库", "迁移", "schema", "checksum", "SQL"])
  })
]);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/\s+|，|。|、|；|：|,|\.|;|:|\/|-/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreResource(item, tokens) {
  const haystack = [
    item.courseTitle,
    item.topic,
    item.concept,
    item.level,
    item.promptHint,
    ...(item.keywords || [])
  ]
    .join(" ")
    .toLowerCase();
  return tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
}

export function searchLearningResources(query, limit = 5) {
  const tokens = tokenize(query);
  if (!tokens.length) {
    return [];
  }
  return LEARNING_RESOURCE_CATALOG.map((item) => ({ item, score: scoreResource(item, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function resourcesByCourse(courseId) {
  return LEARNING_RESOURCE_CATALOG.filter((item) => item.courseId === courseId);
}
