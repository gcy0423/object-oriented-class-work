# v9 代码蓝图

## Student AI result API

```js
router.get("/api/student-ai/results", async (req) => {
  const user = requireUserContext(req);
  return ok({ items: services.studentAiMemory.listResults(user, req.query) });
});

router.patch("/api/student-ai/results/:id/actions/:actionId", async (req) => {
  const user = requireUserContext(req);
  return ok(await services.studentAiMemory.updateAction(user, req.params.id, req.params.actionId, await readJson(req)));
});
```

## Submission draft API

```js
router.post("/api/assignment-submission-drafts", async (req) => {
  const user = requireUserContext(req);
  return ok(await services.submissionDraftService.saveDraft(user, await readJson(req)));
});

router.post("/api/assignment-submission-drafts/:id/submit", async (req) => {
  const user = requireUserContext(req);
  return ok(await services.submissionDraftService.submitDraft(user, req.params.id));
});
```

## Upload API

```js
router.post("/api/uploads", async (req) => {
  const user = requireUserContext(req);
  return ok(await services.uploadService.createUpload(user, await readJson(req)));
});
```

## Notes CRUD

```js
router.get("/api/notes", async (req) => {
  const user = requireUserContext(req);
  return ok({ items: services.learningService.listNotes(user, req.query) });
});
```

