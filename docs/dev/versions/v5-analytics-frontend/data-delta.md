# v5 数据变化

## 数据所有权

v5 默认不新增持久化业务数据。analytics-service 只读聚合其他服务的数据。

| 数据 | 所有者 | v5 使用方式 |
| --- | --- | --- |
| 用户、角色 | identity-service | 查询用户列表和用户快照 |
| 课程、目标、任务、笔记 | learning-service | 计算学习进度 |
| 作业、提交、评分、练习、错题、掌握度 | assessment-service | 计算评测统计 |
| 消息、活动 | collaboration-service | 计算协作热度 |
| AI provider 状态 | ai-service | 展示 AI 运行状态 |

## analytics-service 内部 DTO

analytics-service 可在内存中构造以下 DTO，不写入 JSON 文件。

### `AnalyticsOverview`

```js
{
  role: "student",
  learning: {
    activeGoals: 0,
    completionRate: 0,
    studyMinutes: 0,
    noteCount: 0
  },
  assessment: {
    assignmentCount: 0,
    submissionCount: 0,
    gradedCount: 0,
    practiceCount: 0,
    mistakeCount: 0,
    masteryScore: 0
  },
  collaboration: {
    activityCount: 0,
    messageCount: 0
  },
  ai: {
    provider: "mock-local-llm",
    status: "up"
  }
}
```

### `CourseAnalytics`

```js
{
  courseId: "course_ood",
  courseTitle: "面向对象技术与方法",
  assignments: {
    published: 0,
    submitted: 0,
    graded: 0,
    completionRate: 0
  },
  practice: {
    sessions: 0,
    averageCorrectRate: 0,
    openMistakes: 0
  },
  mastery: [],
  activity: []
}
```

### `StudentAnalytics`

```js
{
  studentId: "user_student",
  profile: {},
  learning: {},
  assessment: {},
  recommendations: []
}
```

## 可选缓存

如果实现过程中需要缓存，v5 只允许内存缓存：

- 默认 TTL 不超过 30 秒。
- 测试环境可关闭缓存。
- 缓存不能成为正确性依赖。
- 不新增 `data/analytics.json`，除非后续版本单独定义。

## 迁移规则

- 不迁移现有 `data/*.json`。
- 不修改 v1-v4 已有数据文件结构。
- 如果 assessment-service 内部上下文不够 analytics 使用，优先扩展内部只读接口，不能让 analytics-service 直接读取 assessment 数据文件。

