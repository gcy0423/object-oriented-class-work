# v10 代码蓝图

## Teacher evidence proxy

```js
router.get("/api/teacher/students/:id/ai-results", async (req) => {
  const teacher = await services.verifyUser(req);
  return services.ai.get(`/api/internal/teacher/students/${req.params.id}/ai-results`, {
    headers: buildUserHeaders(config, teacher)
  });
});
```

## Intervention

```js
router.post("/api/teacher/students/:id/interventions", async (req) => {
  const teacher = await services.verifyUser(req);
  const body = await readJson(req);
  const notification = await services.notification.post("/api/notifications", {
    recipientIds: [req.params.id],
    title: "教师学习建议",
    body: body.message,
    category: "intervention"
  }, { headers: buildUserHeaders(config, teacher) });
  return notification;
});
```

