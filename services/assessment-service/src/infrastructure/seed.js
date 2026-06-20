export function createAssessmentSeed(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return {
    assignments: [
      {
        id: "assignment_ood_model",
        courseId: "course_ood",
        classroomId: "class_ood_01",
        title: "领域模型设计作业",
        description: "提交用例图、类图和简要说明。",
        status: "published",
        rubricId: "rubric_ood_modeling",
        dueAt: "2026-06-21T23:59:59.000Z",
        createdBy: "user_teacher",
        createdAt: today,
        updatedAt: today
      }
    ],
    submissions: [],
    submissionDrafts: [],
    rubrics: [
      {
        id: "rubric_ood_modeling",
        courseId: "course_ood",
        title: "领域模型评分规则",
        createdBy: "user_teacher",
        createdAt: today,
        updatedAt: today
      }
    ],
    rubricCriteria: [
      {
        id: "criterion_model_integrity",
        rubricId: "rubric_ood_modeling",
        title: "模型完整性",
        description: "用例、实体和关系覆盖核心业务。",
        maxScore: 40,
        order: 1,
        createdAt: today,
        updatedAt: today
      },
      {
        id: "criterion_responsibility",
        rubricId: "rubric_ood_modeling",
        title: "职责划分",
        description: "类职责边界清晰，聚合关系合理。",
        maxScore: 30,
        order: 2,
        createdAt: today,
        updatedAt: today
      },
      {
        id: "criterion_expression",
        rubricId: "rubric_ood_modeling",
        title: "文档表达",
        description: "说明文字完整，术语准确。",
        maxScore: 30,
        order: 3,
        createdAt: today,
        updatedAt: today
      }
    ],
    grades: [],
    feedbackItems: [],
    uploads: [],
    questionBanks: [
      {
        id: "qbank_ood",
        courseId: "course_ood",
        title: "面向对象基础题库",
        description: "覆盖 UML、类设计与设计模式基础概念。",
        createdBy: "user_teacher",
        createdAt: today,
        updatedAt: today
      }
    ],
    questions: [
      {
        id: "question_uml_generalization",
        bankId: "qbank_ood",
        courseId: "course_ood",
        type: "single_choice",
        stem: "类图中空心三角箭头通常表示什么关系？",
        choices: [{ id: "A", text: "继承" }, { id: "B", text: "组合" }, { id: "C", text: "依赖" }, { id: "D", text: "关联" }],
        answer: "A",
        analysis: "空心三角箭头表示泛化，也就是继承关系。",
        concept: "UML 类图",
        difficulty: "easy",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "question_solid_single",
        bankId: "qbank_ood",
        courseId: "course_ood",
        type: "true_false",
        stem: "单一职责原则要求一个类只承担一种主要职责。",
        choices: [{ id: "true", text: "正确" }, { id: "false", text: "错误" }],
        answer: "true",
        analysis: "单一职责原则强调变化原因单一，降低类的耦合度。",
        concept: "设计原则",
        difficulty: "easy",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "question_sequence_message",
        bankId: "qbank_ood",
        courseId: "course_ood",
        type: "multiple_choice",
        stem: "顺序图通常强调哪些信息？",
        choices: [{ id: "A", text: "对象间消息顺序" }, { id: "B", text: "对象生命线" }, { id: "C", text: "数据库索引" }, { id: "D", text: "交互时机" }],
        answer: ["A", "B", "D"],
        analysis: "顺序图强调对象、生命线、消息以及时间先后，不涉及数据库索引。",
        concept: "顺序图",
        difficulty: "medium",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "question_factory_pattern",
        bankId: "qbank_ood",
        courseId: "course_ood",
        type: "single_choice",
        stem: "工厂方法模式最主要的价值是什么？",
        choices: [{ id: "A", text: "隐藏对象创建细节" }, { id: "B", text: "减少数据库查询" }, { id: "C", text: "取代继承" }, { id: "D", text: "提升网络带宽" }],
        answer: "A",
        analysis: "工厂方法把对象创建延迟到子类或工厂中，解耦创建逻辑。",
        concept: "设计模式",
        difficulty: "medium",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "question_domain_model_short",
        bankId: "qbank_ood",
        courseId: "course_ood",
        type: "short_answer",
        stem: "请简述领域模型与数据库表结构图的区别。",
        choices: [],
        answer: null,
        analysis: "领域模型强调业务概念与关系，数据库表结构图强调存储结构与约束。",
        concept: "领域建模",
        difficulty: "medium",
        createdAt: today,
        updatedAt: today
      }
    ],
    practiceSessions: [],
    answerRecords: [],
    mistakeItems: [],
    masteryRecords: []
  };
}
