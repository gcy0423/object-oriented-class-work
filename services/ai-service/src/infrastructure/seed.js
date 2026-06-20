export function createAiSeed(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return {
    promptTemplates: [
      {
        id: "ask",
        title: "课程问答",
        system: "你是一个严谨、友好的学习教练，请结合课程目标给出可执行建议。",
        user: "用户问题：{{question}}\n当前课程：{{courses}}\n当前学习目标：{{goals}}",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "plan",
        title: "学习计划生成",
        system: "你是项目制学习计划助手，需要输出阶段、任务和检查点。",
        user: "请为目标“{{goal}}”生成一份到 {{targetDate}} 前完成的学习计划。",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "summarize",
        title: "笔记摘要",
        system: "你是课程笔记摘要助手，请提炼概念、行动项和疑问。",
        user: "笔记标题：{{title}}\n笔记正文：{{content}}",
        createdAt: today,
        updatedAt: today
      }
    ],
    aiRequests: [],
    aiResponses: [],
    providerHealth: [],
    studentAiResults: [],
    studentTaskDrafts: []
  };
}
