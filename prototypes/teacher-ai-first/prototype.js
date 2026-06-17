const appShell = document.getElementById("appShell");
const toast = document.getElementById("toast");
const viewButtons = document.querySelectorAll("[data-view]");
const views = {
  aiDesk: document.getElementById("view-aiDesk"),
  assignments: document.getElementById("view-assignments"),
  assignmentPublish: document.getElementById("view-assignmentPublish"),
  assignmentDetail: document.getElementById("view-assignmentDetail"),
  grading: document.getElementById("view-grading"),
  gradingDetail: document.getElementById("view-gradingDetail"),
  questionBank: document.getElementById("view-questionBank"),
  questionDraft: document.getElementById("view-questionDraft"),
  analytics: document.getElementById("view-analytics"),
  collaboration: document.getElementById("view-collaboration")
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

window.setView = function setView(name) {
  if (!views[name]) return;
  Object.entries(views).forEach(([key, view]) => {
    view.classList.toggle("active", key === name);
  });
  viewButtons.forEach((button) => {
    const target = button.dataset.view;
    const active =
      target === name ||
      (target === "assignments" && name === "assignmentPublish") ||
      (target === "assignments" && name === "assignmentDetail") ||
      (target === "grading" && name === "gradingDetail") ||
      (target === "questionBank" && name === "questionDraft");
    button.classList.toggle("active", active);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
};

document.getElementById("toggleRail").addEventListener("click", () => {
  appShell.classList.toggle("rail-collapsed");
  showToast(appShell.classList.contains("rail-collapsed") ? "侧栏已收起。" : "侧栏已展开。");
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => window.setView(button.dataset.view));
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;
    document.querySelectorAll("[data-mode]").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".assignment-mode").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `mode-${mode}`);
    });
  });
});

document.getElementById("runAi")?.addEventListener("click", () => {
  showToast("AI 已生成今日教学处理顺序。");
});
