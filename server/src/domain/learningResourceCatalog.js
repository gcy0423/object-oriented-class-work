const RESOURCE_DEFINITIONS = [
  {
    id: "res_ood_domain_modeling",
    courseId: "course_ood",
    courseTitle: "面向对象技术与方法",
    topic: "领域建模",
    concept: "从用例提取领域对象、属性和关联",
    level: "core",
    scenario: "用于解释学习目标、任务、作业、题库和协作消息等对象边界。",
    checklist: [
      "识别名词短语并区分实体、值对象和服务。",
      "为核心对象补充不变量和生命周期状态。",
      "用类图说明对象之间的一对多、多对多或组合关系。"
    ],
    promptHint: "回答领域建模问题时，优先结合 EduMind Agent 的 Course、LearningGoal、Assignment 和 QuestionBank。"
  },
  {
    id: "res_ood_service_boundary",
    courseId: "course_ood",
    courseTitle: "面向对象技术与方法",
    topic: "服务边界",
    concept: "按业务能力拆分服务并保持数据所有权清晰",
    level: "advanced",
    scenario: "用于说明 identity、learning、assessment、ai、collaboration 和 analytics 的职责划分。",
    checklist: [
      "每个业务概念只能有一个写入方。",
      "跨服务协作通过 HTTP API 或事件完成。",
      "Gateway 只负责入口、鉴权、代理和聚合。"
    ],
    promptHint: "回答微服务拆分问题时，强调数据所有权、接口契约和失败隔离。"
  },
  {
    id: "res_ood_design_pattern",
    courseId: "course_ood",
    courseTitle: "面向对象技术与方法",
    topic: "设计模式",
    concept: "Repository、Facade、Strategy 在项目中的落地",
    level: "core",
    scenario: "用于解释 JSON 持久化、AI Provider 切换和应用服务封装。",
    checklist: [
      "Repository 隔离存储细节。",
      "Facade 聚合作业、题库、练习和掌握度能力。",
      "Strategy 让 Mock、LM Studio 和 OpenAI-compatible Provider 可替换。"
    ],
    promptHint: "回答设计模式问题时，给出项目中的真实类名和调用路径。"
  },
  {
    id: "res_ai_provider",
    courseId: "course_ai",
    courseTitle: "人工智能应用实践",
    topic: "LLM Provider",
    concept: "OpenAI-compatible 接口与 LM Studio 本地模型接入",
    level: "core",
    scenario: "用于解释 qwopus3.6-27b-v2-mtp@iq4_xs 的本地部署和离线演示策略。",
    checklist: [
      "普通测试使用 Mock Provider，不依赖本地模型。",
      "真实模型测试通过 verifyLmStudio.mjs 单独执行。",
      "Provider 返回 reasoning_content 时也能提取回答。"
    ],
    promptHint: "回答 AI 接入问题时，说明 endpoint 规范化、超时和 maxTokens 配置。"
  },
  {
    id: "res_assessment_loop",
    courseId: "course_ood",
    courseTitle: "面向对象技术与方法",
    topic: "作业与练习闭环",
    concept: "Assignment、Submission、Question、PracticeSession、MistakeItem 协作",
    level: "advanced",
    scenario: "用于解释教师发布作业、学生提交、AI 初评、练习和错题本闭环。",
    checklist: [
      "作业提交与评分状态分离。",
      "客观题自动判分，主观题保留待评状态。",
      "错题进入 MistakeItem 并参与掌握度统计。"
    ],
    promptHint: "回答作业模块问题时，串联 assessment-service 的应用服务和领域对象。"
  },
  {
    id: "res_frontend_workbench",
    courseId: "course_ood",
    courseTitle: "面向对象技术与方法",
    topic: "前端工作台",
    concept: "无构建工具的模块化 ESM 前端",
    level: "practice",
    scenario: "用于说明 client/src/views、forms、widgets、state 和 utils 的职责。",
    checklist: [
      "视图模块只负责页面组合。",
      "表单模块负责输入校验和提交。",
      "selectors 从原始状态派生权限、进度和统计。"
    ],
    promptHint: "回答前端结构问题时，说明页面、组件、状态和 API 客户端的分层。"
  }
];

export const LEARNING_RESOURCE_CATALOG = Object.freeze(
  RESOURCE_DEFINITIONS.map((item) =>
    Object.freeze({
      ...item,
      checklist: Object.freeze(item.checklist),
      quiz: Object.freeze({
        question: `${item.concept} 适合解决什么项目问题？`,
        answer: item.scenario
      })
    })
  )
);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/\s+|,|\.|;|:|\?|!|，|。|；|：|？|！|、|\(|\)|（|）/)
    .filter(Boolean);
}

export function searchLearningResources(query, limit = 5) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const tokens = tokenize(normalizedQuery);
  if (!normalizedQuery && !tokens.length) {
    return LEARNING_RESOURCE_CATALOG.slice(0, limit);
  }

  const scored = LEARNING_RESOURCE_CATALOG.map((item) => {
    const haystack = [
      item.courseTitle,
      item.topic,
      item.concept,
      item.level,
      item.scenario,
      item.promptHint,
      ...item.checklist
    ]
      .join(" ")
      .toLowerCase();
    const phraseScore = normalizedQuery && haystack.includes(normalizedQuery) ? 3 : 0;
    const tokenScore = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
    return { item, score: phraseScore + tokenScore };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function resourcesByCourse(courseId) {
  return LEARNING_RESOURCE_CATALOG.filter((item) => item.courseId === courseId);
}
