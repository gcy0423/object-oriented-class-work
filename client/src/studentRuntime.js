import { StudentAiAdapter } from "./ai/studentAiAdapter.js";
import { buildStudentAiPanelModel, selectStudentAiContext, selectStudentNotesModel, selectStudentSubmitModel } from "./state/studentSelectors.js";
import { studentAiView } from "./views/student/studentAiView.js";
import { studentAiInsightView } from "./views/student/studentAiInsightView.js";
import { studentLearningView } from "./views/student/studentLearningView.js";
import { studentTaskDetailView } from "./views/student/studentTaskDetailView.js";
import { studentAssignmentsView } from "./views/student/studentAssignmentsView.js";
import { studentAssignmentDetailView } from "./views/student/studentAssignmentDetailView.js";
import { studentSubmitView } from "./views/student/studentSubmitView.js";
import { studentSubmitPreviewView } from "./views/student/studentSubmitPreviewView.js";
import { studentSubmitSuccessView } from "./views/student/studentSubmitSuccessView.js";
import { studentAssignmentHistoryView } from "./views/student/studentAssignmentHistoryView.js";
import { studentFeedbackView } from "./views/student/studentFeedbackView.js";
import { studentPracticeView } from "./views/student/studentPracticeView.js";
import { studentPracticeSessionView } from "./views/student/studentPracticeSessionView.js";
import { studentPracticeResultView } from "./views/student/studentPracticeResultView.js";
import { studentMistakeDetailView } from "./views/student/studentMistakeDetailView.js";
import { studentNotesView } from "./views/student/studentNotesView.js";
import { studentNoteEditorView } from "./views/student/studentNoteEditorView.js";
import { studentNoteAiResultView } from "./views/student/studentNoteAiResultView.js";
import { isStudentRoute, studentParentRoute, studentTitleFor } from "./views/studentRouteTable.js";
import { studentAiPanel } from "./widgets/studentAiPanel.js";
import { studentShell } from "./widgets/studentShell.js";

const studentViews = {
  "student-ai": studentAiView,
  "student-ai-insight": studentAiInsightView,
  "student-learning": studentLearningView,
  "student-task-detail": studentTaskDetailView,
  "student-assignments": studentAssignmentsView,
  "student-assignment-detail": studentAssignmentDetailView,
  "student-submit": studentSubmitView,
  "student-submit-preview": studentSubmitPreviewView,
  "student-submit-success": studentSubmitSuccessView,
  "student-assignment-history": studentAssignmentHistoryView,
  "student-feedback": studentFeedbackView,
  "student-practice": studentPracticeView,
  "student-practice-session": studentPracticeSessionView,
  "student-practice-result": studentPracticeResultView,
  "student-mistake-detail": studentMistakeDetailView,
  "student-notes": studentNotesView,
  "student-note-editor": studentNoteEditorView,
  "student-note-ai-result": studentNoteAiResultView
};

function defaultStudentStatePatch() {
  return {
    routeStack: [],
    ai: {
      dailyPlan: null,
      weaknessInsight: null,
      assignmentGuide: null,
      submissionCheck: null,
      noteOrganizeResult: null,
      timeline: [],
      organizeHistory: [],
      lastCommand: null
    },
    learning: {
      selectedCourseId: "",
      selectedTaskId: "",
      taskDrafts: []
    },
    assignments: {
      mode: "course",
      selectedAssignmentId: "",
      selectedSubmissionId: "",
      submitDraft: {
        id: "",
        assignmentId: "",
        content: "",
        attachments: [],
        attachmentsText: "",
        aiCheckResultId: "",
        updatedAt: ""
      },
      lastSubmission: null
    },
    practice: {
      selectedBankId: "",
      selectedSessionId: "",
      focusedQuestionIndex: 0,
      result: null
    },
    notes: {
      selectedCourseId: "",
      selectedNoteId: "",
      query: "",
      editorDraft: {
        title: "",
        content: "",
        tags: ""
      }
    }
  };
}

function mergeStudentState(student = {}, patch = {}) {
  return {
    ...defaultStudentStatePatch(),
    ...student,
    ...patch,
    ai: { ...defaultStudentStatePatch().ai, ...(student.ai || {}), ...(patch.ai || {}) },
    learning: { ...defaultStudentStatePatch().learning, ...(student.learning || {}), ...(patch.learning || {}) },
    assignments: { ...defaultStudentStatePatch().assignments, ...(student.assignments || {}), ...(patch.assignments || {}) },
    practice: { ...defaultStudentStatePatch().practice, ...(student.practice || {}), ...(patch.practice || {}) },
    notes: { ...defaultStudentStatePatch().notes, ...(student.notes || {}), ...(patch.notes || {}) }
  };
}

function normalizeAttachments(text = "") {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(": ");
      const fallbackSeparator = separator >= 0 ? separator : line.indexOf("|");
      const name = fallbackSeparator >= 0 ? line.slice(0, fallbackSeparator) : line;
      const url = fallbackSeparator >= 0 ? line.slice(fallbackSeparator + (separator >= 0 ? 2 : 1)) : "";
      return { name: String(name || "").trim(), url: String(url || "").trim() };
    })
    .filter((item) => item.name || item.url);
}

function attachmentsToText(attachments = []) {
  return attachments.map((item) => [item.name, item.url].filter(Boolean).join(": ")).filter(Boolean).join("\n");
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(reader.error || new Error("file read failed"));
    reader.readAsDataURL(file);
  });
}

async function collectSubmissionDraft(app, form, existingDraft = {}) {
  const content = form?.querySelector('[name="content"]')?.value || "";
  const attachmentsText = form?.querySelector('[name="attachmentsText"]')?.value || "";
  const attachments = [
    ...normalizeAttachments(attachmentsText),
    ...(existingDraft.attachments || []).filter((item) => item.id)
  ];
  const file = form?.querySelector('[name="attachmentFile"]')?.files?.[0] || null;
  if (file) {
    const uploaded = await app.api.uploadFile({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      base64: await readFileAsBase64(file)
    });
    attachments.push(uploaded.data);
    form.querySelector('[name="attachmentFile"]').value = "";
  }
  const nextAttachmentsText = attachmentsText || attachmentsToText(attachments);
  return { content, attachmentsText: nextAttachmentsText, attachments };
}

export async function hydrateStudentWorkspace(app, baseState = app.store.get()) {
  const state = baseState;
  if (state.user?.role !== "student") {
    return;
  }
  const adapter = new StudentAiAdapter({ api: app.api });
  const student = mergeStudentState(state.student);
  const aiPatch = {};

  if (!student.ai.dailyPlan) {
    aiPatch.dailyPlan = await buildAi(adapter, "buildDailyPlan", selectStudentAiContext(state, "student-ai"));
  }

  if ((state.route === "student-ai-insight" || state.route === "student-practice")
    && !student.ai.weaknessInsight
    && (state.assessment?.mistakes?.length || state.assessmentInsight?.mistakeAnalysis)) {
    aiPatch.weaknessInsight = await buildAi(adapter, "buildWeaknessInsight", selectStudentAiContext(state, "student-ai-insight"));
  }

  if (["student-assignment-detail", "student-submit", "student-submit-preview", "student-assignment-history", "student-feedback"].includes(state.route)
    && state.assessment?.assignmentDetail?.assignment
    && !student.ai.assignmentGuide) {
    aiPatch.assignmentGuide = await buildAi(adapter, "guideAssignment", selectStudentAiContext(state, state.route));
  }

  if (Object.keys(aiPatch).length) {
    app.setState({
      provider: aiPatch.assignmentGuide?.provider || aiPatch.weaknessInsight?.provider || aiPatch.dailyPlan?.provider || state.provider,
      student: mergeStudentState(app.store.get().student, {
        ai: {
          ...aiPatch,
          lastCommand: app.store.get().student?.ai?.lastCommand || "auto-hydrate"
        }
      })
    });
  }
}

function navigateStudent(app, route, patch = {}) {
  const state = app.store.get();
  const previousRoute = state.route;
  const routeStack = [...(state.student?.routeStack || [])];
  if (isStudentRoute(previousRoute) && previousRoute !== route && !["student-ai", "student-learning", "student-assignments", "student-practice", "student-notes"].includes(route)) {
    routeStack.push(previousRoute);
  }
  const studentPatch = mergeStudentState(state.student, { routeStack, ...(patch.student || {}) });
  app.writeRoute(route);
  app.setState({ route, ...patch, student: studentPatch });
  hydrateStudentWorkspace(app, app.store.get()).catch(() => {});
}

function replaceStudent(app, patch = {}) {
  const state = app.store.get();
  app.setState({ ...patch, student: mergeStudentState(state.student, patch.student || {}) });
}

async function buildAi(adapter, method, context) {
  return adapter[method](context);
}

function selectedPrimaryForBack(route) {
  if (route.startsWith("student-learning") || route === "student-task-detail") {
    return "student-learning";
  }
  if (route.startsWith("student-assignment") || route.startsWith("student-submit") || route === "student-feedback") {
    return "student-assignments";
  }
  if (route.startsWith("student-practice") || route === "student-mistake-detail") {
    return "student-practice";
  }
  if (route.startsWith("student-note")) {
    return "student-notes";
  }
  return "student-ai";
}

export function defaultRouteForUser(user, route = "") {
  if (user?.role === "student" && (!route || route === "dashboard")) {
    return "student-ai";
  }
  if (route && (isStudentRoute(route) || route === "dashboard" || route === "learning" || route === "assignments" || route === "practice" || route === "ai" || route === "team" || route === "settings" || route === "knowledge" || route === "workbench" || route === "reports" || route === "assessment-insight" || route === "analytics" || route === "question-banks" || route === "identity-admin" || route === "operations")) {
    return route;
  }
  return user?.role === "student" ? "student-ai" : "dashboard";
}

export function studentRouteVisible(route, user) {
  if (!isStudentRoute(route)) {
    return false;
  }
  return user?.role === "student";
}

export function renderStudentRoute(state) {
  let route = isStudentRoute(state.route) ? state.route : "student-ai";
  if (route === "student-task-detail" && !state.student?.learning?.selectedTaskId) {
    route = "student-learning";
  }
  if (["student-assignment-detail", "student-submit", "student-submit-preview", "student-assignment-history", "student-feedback"].includes(route)
    && !state.assessment?.assignmentDetail?.assignment
    && !state.student?.assignments?.selectedAssignmentId
    && !state.selected?.assignmentId) {
    route = "student-assignments";
  }
  if (["student-practice-session", "student-practice-result"].includes(route)
    && !state.assessment?.practiceSession
    && !state.student?.practice?.result) {
    route = "student-practice";
  }
  if (route === "student-mistake-detail" && !state.assessmentInsight?.mistakeDetail) {
    route = "student-practice";
  }
  const view = studentViews[route] || studentAiView;
  return studentShell({
    state: { ...state, route },
    title: studentTitleFor(route),
    subtitle: "",
    content: view(state),
    aiPanel: studentAiPanel(buildStudentAiPanelModel(state))
  });
}

export async function handleStudentAction(app, actionButton) {
  const action = actionButton.dataset.action;
  const state = app.store.get();
  const adapter = new StudentAiAdapter({ api: app.api });

  if (action === "student-route") {
    navigateStudent(app, actionButton.dataset.route);
    return true;
  }
  if (action === "student-back") {
    const routeStack = [...(state.student?.routeStack || [])];
    const previous = routeStack.pop() || studentParentRoute(state.route) || selectedPrimaryForBack(state.route);
    app.writeRoute(previous);
    app.setState({ route: previous, student: mergeStudentState(state.student, { routeStack }) });
    return true;
  }
  if (action === "student-select-course") {
    replaceStudent(app, {
      student: {
        learning: { selectedCourseId: actionButton.dataset.id },
        notes: { selectedCourseId: actionButton.dataset.id }
      }
    });
    return true;
  }
  if (action === "student-open-ai-insight") {
    app.patchSaving("studentAi", true);
    try {
      const result = await buildAi(adapter, "buildWeaknessInsight", selectStudentAiContext(state, "student-ai-insight"));
      navigateStudent(app, "student-ai-insight", { student: { ai: { weaknessInsight: result, lastCommand: "weakness-insight" } } });
    } finally {
      app.patchSaving("studentAi", false);
    }
    return true;
  }
  if (action === "student-build-daily-plan") {
    app.patchSaving("studentAi", true);
    try {
      const result = await buildAi(adapter, "buildDailyPlan", selectStudentAiContext(state, "student-ai"));
      replaceStudent(app, { student: { ai: { dailyPlan: result, lastCommand: "daily-plan" } }, provider: result.provider || state.provider });
    } finally {
      app.patchSaving("studentAi", false);
    }
    return true;
  }
  if (action === "student-open-assignment") {
    const detail = await app.api.studentAssignmentDetail(actionButton.dataset.id);
    navigateStudent(app, "student-assignment-detail", {
      selected: { ...state.selected, assignmentId: actionButton.dataset.id },
      assessment: { ...state.assessment, assignmentDetail: detail.data },
      student: { assignments: { selectedAssignmentId: actionButton.dataset.id } }
    });
    return true;
  }
  if (action === "student-open-submit") {
    navigateStudent(app, "student-submit");
    return true;
  }
  if (action === "student-build-assignment-guide") {
    app.patchSaving("studentAi", true);
    try {
      const result = await buildAi(adapter, "guideAssignment", selectStudentAiContext(state, state.route));
      replaceStudent(app, { student: { ai: { assignmentGuide: result, lastCommand: "assignment-guide" } }, provider: result.provider || state.provider });
    } finally {
      app.patchSaving("studentAi", false);
    }
    return true;
  }
  if (action === "student-open-history") {
    navigateStudent(app, "student-assignment-history");
    return true;
  }
  if (action === "student-open-feedback") {
    navigateStudent(app, "student-feedback");
    return true;
  }
  if (action === "student-save-submit-draft") {
    const form = app.root.querySelector('form[data-form="student-submission"]');
    if (!form) {
      return true;
    }
    const draftInput = await collectSubmissionDraft(app, form, state.student?.assignments?.submitDraft || {});
    const existingId = state.student?.assignments?.submitDraft?.id || "";
    const payload = existingId
      ? await app.api.updateSubmissionDraft(existingId, { content: draftInput.content, attachments: draftInput.attachments, aiCheckResultId: state.student?.assignments?.submitDraft?.aiCheckResultId || null })
      : await app.api.saveSubmissionDraft({ assignmentId: selectStudentSubmitModel(state).assignmentId, content: draftInput.content, attachments: draftInput.attachments, aiCheckResultId: state.student?.assignments?.submitDraft?.aiCheckResultId || null });
    replaceStudent(app, { student: { assignments: { submitDraft: { ...(payload.data || payload), attachmentsText: draftInput.attachmentsText } } } });
    app.toast("提交草稿已保存。");
    return true;
  }
  if (action === "student-check-submission") {
    const form = app.root.querySelector('form[data-form="student-submission"]');
    const draftInput = await collectSubmissionDraft(app, form, state.student?.assignments?.submitDraft || {});
    const updatedState = {
      ...state,
      student: mergeStudentState(state.student, {
        assignments: {
          submitDraft: {
            ...state.student?.assignments?.submitDraft,
            assignmentId: selectStudentSubmitModel(state).assignmentId,
            content: draftInput.content,
            attachments: draftInput.attachments,
            attachmentsText: draftInput.attachmentsText
          }
        }
      })
    };
    app.patchSaving("studentAi", true);
    try {
      const result = await buildAi(adapter, "checkSubmissionDraft", selectStudentAiContext(updatedState, "student-submit"));
      const existingId = state.student?.assignments?.submitDraft?.id || "";
      if (existingId) {
        await app.api.updateSubmissionDraft(existingId, {
          content: draftInput.content,
          attachments: draftInput.attachments,
          aiCheckResultId: result.id || null
        });
      }
      replaceStudent(app, {
        student: {
          ai: { submissionCheck: result.result || result, lastCommand: "submission-check" },
          assignments: {
            submitDraft: {
              id: state.student?.assignments?.submitDraft?.id || "",
              assignmentId: selectStudentSubmitModel(updatedState).assignmentId,
              content: draftInput.content,
              attachments: draftInput.attachments,
              attachmentsText: draftInput.attachmentsText,
              aiCheckResultId: result.id || "",
              updatedAt: new Date().toISOString()
            }
          }
        }
      });
    } finally {
      app.patchSaving("studentAi", false);
    }
    return true;
  }
  if (action === "student-preview-submission") {
    const form = app.root.querySelector('form[data-form="student-submission"]');
    const draftInput = await collectSubmissionDraft(app, form, state.student?.assignments?.submitDraft || {});
    navigateStudent(app, "student-submit-preview", {
      student: {
        assignments: {
          submitDraft: {
            id: state.student?.assignments?.submitDraft?.id || "",
            assignmentId: selectStudentSubmitModel(state).assignmentId,
            content: draftInput.content,
            attachments: draftInput.attachments,
            attachmentsText: draftInput.attachmentsText,
            aiCheckResultId: state.student?.assignments?.submitDraft?.aiCheckResultId || "",
            updatedAt: new Date().toISOString()
          }
        }
      }
    });
    return true;
  }
  if (action === "student-submit-confirm") {
    const submit = selectStudentSubmitModel(state);
    if (!submit.assignmentId || !submit.draft.content.trim()) {
      app.toast("请先填写提交正文。");
      return true;
    }
    app.patchSaving("studentSubmission", true);
    try {
      const result = submit.draft.id
        ? await app.api.submitSubmissionDraft(submit.draft.id)
        : await app.api.submitAssignment(submit.assignmentId, {
          content: submit.draft.content,
          attachments: submit.draft.attachments?.length ? submit.draft.attachments : normalizeAttachments(submit.draft.attachmentsText),
          aiCheckResultId: submit.draft.aiCheckResultId || null
        });
      app.setState({
        route: "student-submit-success",
        assessment: { ...state.assessment, assignmentDetail: state.assessment.assignmentDetail },
        student: mergeStudentState(state.student, {
          routeStack: [],
          assignments: {
            submitDraft: {
              id: "",
              assignmentId: submit.assignmentId,
              content: "",
              attachments: [],
              attachmentsText: "",
              aiCheckResultId: "",
              updatedAt: ""
            },
            lastSubmission: result.data
          }
        })
      });
      app.writeRoute("student-submit-success");
      await app.refreshApp("作业提交成功。");
    } finally {
      app.patchSaving("studentSubmission", false);
    }
    return true;
  }
  if (action === "student-set-assignment-mode") {
    replaceStudent(app, { student: { assignments: { mode: actionButton.dataset.mode || "course" } } });
    return true;
  }
  if (action === "student-open-task") {
    navigateStudent(app, "student-task-detail", { student: { learning: { selectedTaskId: actionButton.dataset.id } } });
    return true;
  }
  if (action === "student-complete-task") {
    await app.api.completeTask(actionButton.dataset.id);
    await app.refreshApp("任务已完成。");
    return true;
  }
  if (action === "student-ai-action") {
    const route = actionButton.dataset.route || "student-ai";
    if (route === "student-submit") {
      navigateStudent(app, route);
      return true;
    }
    if (route === "student-assignment-detail" && state.student?.assignments?.selectedAssignmentId) {
      navigateStudent(app, route);
      return true;
    }
    navigateStudent(app, route);
    return true;
  }
  if (action === "student-ai-action-status") {
    const resultId = actionButton.dataset.resultId || "";
    const actionId = actionButton.dataset.actionId || "";
    if (!resultId || !actionId) {
      app.toast("当前行动卡缺少可更新的 AI 结果编号。");
      return true;
    }
    await app.api.updateStudentAiAction(resultId, actionId, {
      status: actionButton.dataset.status || "completed",
      note: `学生标记为 ${actionButton.dataset.status || "completed"}`
    });
    await app.refreshApp("AI 行动状态已更新。");
    return true;
  }
  if (action === "student-start-practice") {
    const result = await app.api.startPractice({
      courseId: actionButton.dataset.courseId,
      bankId: actionButton.dataset.id,
      questionCount: 5
    });
    app.setState({
      route: "student-practice-session",
      selected: { ...state.selected, practiceSessionId: result.data.id },
      assessment: { ...state.assessment, practiceSession: result.data },
      student: mergeStudentState(state.student, {
        practice: { selectedBankId: actionButton.dataset.id, selectedSessionId: result.data.id, focusedQuestionIndex: 0, result: null }
      })
    });
    app.writeRoute("student-practice-session");
    return true;
  }
  if (action === "student-resume-practice") {
    const result = await app.api.practiceSession(actionButton.dataset.id);
    app.setState({
      route: "student-practice-session",
      selected: { ...state.selected, practiceSessionId: actionButton.dataset.id },
      assessment: { ...state.assessment, practiceSession: result.data },
      student: mergeStudentState(state.student, {
        practice: { selectedSessionId: actionButton.dataset.id, focusedQuestionIndex: 0 }
      })
    });
    app.writeRoute("student-practice-session");
    return true;
  }
  if (action === "student-focus-question") {
    replaceStudent(app, { student: { practice: { focusedQuestionIndex: Number(actionButton.dataset.index || 0) } } });
    return true;
  }
  if (action === "student-finish-practice") {
    const result = await app.api.finishPractice(actionButton.dataset.id);
    app.setState({
      route: "student-practice-result",
      student: mergeStudentState(state.student, { practice: { result: result.data } })
    });
    app.writeRoute("student-practice-result");
    await app.refreshApp("练习已完成。");
    return true;
  }
  if (action === "student-open-mistake") {
    const detail = await app.api.mistakeDetailAnalysis(actionButton.dataset.id);
    app.setState({
      route: "student-mistake-detail",
      assessmentInsight: { ...state.assessmentInsight, mistakeDetail: detail.data }
    });
    app.writeRoute("student-mistake-detail");
    return true;
  }
  if (action === "student-build-adaptive-plan") {
    const courseId = state.student?.learning?.selectedCourseId || state.dashboard?.courses?.[0]?.id || "";
    const bankId = state.assessment?.questionBanks?.[0]?.id || "";
    if (!courseId || !bankId) {
      app.toast("需要先有课程和题库。");
      return true;
    }
    app.patchSaving("studentAi", true);
    try {
      const result = await app.api.adaptivePracticePlan({ courseId, bankId, questionCount: 6 });
      app.setState({ assessmentInsight: { ...state.assessmentInsight, adaptivePlan: result.data } });
      app.toast("已生成推荐练习。");
    } finally {
      app.patchSaving("studentAi", false);
    }
    return true;
  }
  if (action === "student-new-note") {
    navigateStudent(app, "student-note-editor", {
      student: {
        notes: {
          editorDraft: { title: "", content: "", tags: "" }
        }
      }
    });
    return true;
  }
  if (action === "student-edit-note") {
    const notesModel = selectStudentNotesModel(state);
    const note = notesModel.notes.find((item) => item.id === actionButton.dataset.id) || null;
    navigateStudent(app, "student-note-editor", {
      student: {
        notes: {
          selectedNoteId: actionButton.dataset.id,
          editorDraft: {
            title: note?.title || "",
            content: note?.content || "",
            tags: Array.isArray(note?.tags) ? note.tags.join(", ") : ""
          }
        }
      }
    });
    return true;
  }
  if (action === "student-organize-note") {
    const form = app.root.querySelector('form[data-form="student-note-editor"]');
    const draft = {
      title: form?.querySelector('[name="title"]')?.value || "",
      content: form?.querySelector('[name="content"]')?.value || "",
      tags: form?.querySelector('[name="tags"]')?.value || ""
    };
    const nextState = { ...state, student: mergeStudentState(state.student, { notes: { editorDraft: draft } }) };
    app.patchSaving("studentAi", true);
    try {
      const result = await buildAi(adapter, "organizeNote", selectStudentAiContext(nextState, "student-note-editor"));
      app.setState({
        route: "student-note-ai-result",
        student: mergeStudentState(state.student, {
          ai: { noteOrganizeResult: result, lastCommand: "note-organize" },
          notes: { editorDraft: draft }
        })
      });
      app.writeRoute("student-note-ai-result");
    } finally {
      app.patchSaving("studentAi", false);
    }
    return true;
  }
  if (action === "student-save-note-organize") {
    const notesModel = selectStudentNotesModel(state);
    const organized = notesModel.organized;
    if (!organized) {
      app.toast("当前没有可保存的整理结果。");
      return true;
    }
    const courseId = notesModel.selectedCourseId || state.dashboard?.courses?.[0]?.id || "";
    if (!courseId) {
      app.toast("未找到课程，无法保存笔记。");
      return true;
    }
    app.patchSaving("studentNote", true);
    try {
      const resultId = state.student?.ai?.noteOrganizeResult?.id || "";
      if (resultId) {
        await app.api.saveOrganizeResultAsNote(resultId, {
          courseId,
          title: `${state.student?.notes?.editorDraft?.title || "课程笔记"} · AI整理`,
          tags: ["AI整理"]
        });
      } else {
        await app.api.createNote({
          courseId,
          title: `${state.student?.notes?.editorDraft?.title || "课程笔记"} · AI整理`,
          content: [organized.summary, ...(organized.assignmentParagraphs || [])].filter(Boolean).join("\n\n"),
          tags: ["AI整理"]
        });
      }
      await app.refreshApp("已保存 AI 整理结果为新笔记。");
    } finally {
      app.patchSaving("studentNote", false);
    }
    return true;
  }
  if (action === "student-apply-task-draft") {
    const index = Number(actionButton.dataset.index || 0);
    const draft = state.student?.learning?.taskDrafts?.[index];
    if (!draft?.goalId) {
      app.toast("当前草稿缺少目标，请先选择课程或目标后重新生成。");
      return true;
    }
    await app.api.confirmStudentAiTaskDraft(draft.id);
    await app.refreshApp("任务草稿已确认并创建。");
    return true;
  }

  if (action === "student-delete-note") {
    await app.api.deleteNote(actionButton.dataset.id);
    await app.refreshApp("笔记已删除。");
    navigateStudent(app, "student-notes");
    return true;
  }

  return false;
}

export async function handleStudentSubmit(app, form, data) {
  const state = app.store.get();
  const adapter = new StudentAiAdapter({ api: app.api });

  if (form.dataset.form === "student-ai-ask") {
    app.patchSaving("studentAi", true);
    try {
      const result = await app.api.askAI(data.question);
      const structured = await adapter.buildDailyPlan({
        ...selectStudentAiContext(state, "student-ai"),
        aiAnswer: result.data.answer
      });
      replaceStudent(app, { student: { ai: { dailyPlan: structured, lastCommand: "ai-ask" } }, provider: result.data.provider || state.provider });
    } finally {
      app.patchSaving("studentAi", false);
    }
    return true;
  }
  if (form.dataset.form === "student-task-create") {
    const learning = state.student?.learning || {};
    const goalId = state.dashboard?.goals?.find((item) => item.courseId === (learning.selectedCourseId || state.dashboard?.courses?.[0]?.id))?.id || state.dashboard?.goals?.[0]?.id || "";
    if (!goalId) {
      app.toast("当前没有可关联的学习目标，请先在学习页创建目标。");
      return true;
    }
    app.patchSaving("studentTask", true);
    try {
      await app.api.createTask({
        goalId,
        title: data.title,
        estimateMinutes: Number(data.estimateMinutes || 45),
        dueDate: ""
      });
      await app.refreshApp("学习任务已创建。");
    } finally {
      app.patchSaving("studentTask", false);
    }
    return true;
  }
  if (form.dataset.form === "student-task-draft") {
    app.patchSaving("studentAi", true);
    try {
      const result = await buildAi(adapter, "draftLearningTask", {
        ...selectStudentAiContext(state, "student-learning"),
        request: data.request
      });
      await app.api.studentAiTaskDraft({ resultId: result.id, draft: result.result?.draft, summary: result.result?.summary });
      await app.refreshApp("AI 任务草稿已保存。");
    } finally {
      app.patchSaving("studentAi", false);
    }
    return true;
  }
  if (form.dataset.form === "student-practice-answer") {
    app.patchSaving("practiceAnswer", true);
    try {
      await app.api.submitPracticeAnswer(data.sessionId, { questionId: data.questionId, answer: data.answer });
      await app.refreshApp("答案已提交。");
    } finally {
      app.patchSaving("practiceAnswer", false);
    }
    return true;
  }
  if (form.dataset.form === "student-note-editor") {
    const courseId = state.student?.notes?.selectedCourseId || state.dashboard?.courses?.[0]?.id || "";
    if (!courseId) {
      app.toast("请先选择课程。");
      return true;
    }
    app.patchSaving("studentNote", true);
    try {
      const payload = {
        courseId,
        title: data.title,
        content: data.content,
        tags: String(data.tags || "").split(/[，,]/).map((item) => item.trim()).filter(Boolean)
      };
      if (state.student?.notes?.selectedNoteId) {
        await app.api.updateNote(state.student.notes.selectedNoteId, payload);
      } else {
        await app.api.createNote(payload);
      }
      await app.refreshApp("笔记已保存。");
      navigateStudent(app, "student-notes");
    } finally {
      app.patchSaving("studentNote", false);
    }
    return true;
  }
  if (form.dataset.form === "student-submission") {
    const draftInput = await collectSubmissionDraft(app, form, state.student?.assignments?.submitDraft || {});
    replaceStudent(app, {
      student: {
        assignments: {
          submitDraft: {
            assignmentId: data.assignmentId,
            content: draftInput.content,
            attachments: draftInput.attachments,
            attachmentsText: draftInput.attachmentsText,
            updatedAt: new Date().toISOString()
          }
        }
      }
    });
    navigateStudent(app, "student-submit-preview");
    return true;
  }

  return false;
}
