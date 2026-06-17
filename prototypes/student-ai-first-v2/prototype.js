const appShell = document.getElementById("appShell");
const toast = document.getElementById("toast");
const viewButtons = document.querySelectorAll("[data-view]");
const views = {
  aiDesk: document.getElementById("view-aiDesk"),
  learn: document.getElementById("view-learn"),
  assignments: document.getElementById("view-assignments"),
  assignmentDetail: document.getElementById("view-assignmentDetail"),
  assignmentSubmit: document.getElementById("view-assignmentSubmit"),
  practice: document.getElementById("view-practice"),
  notes: document.getElementById("view-notes")
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function setView(name) {
  if (!views[name]) return;
  Object.entries(views).forEach(([key, view]) => {
    view.classList.toggle("active", key === name);
  });
  viewButtons.forEach((button) => {
    const target = button.dataset.view;
    const active =
      target === name ||
      (target === "assignments" && (name === "assignmentDetail" || name === "assignmentSubmit"));
    button.classList.toggle("active", active);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("toggleRail").addEventListener("click", () => {
  appShell.classList.toggle("rail-collapsed");
  showToast(appShell.classList.contains("rail-collapsed") ? "侧栏已收起。" : "侧栏已展开。");
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
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

document.getElementById("generatePlan")?.addEventListener("click", () => {
  showToast("AI 已生成今日学习路径，并保留为待确认草稿。");
});

document.getElementById("openDraftDetail")?.addEventListener("click", () => {
  showToast("已打开草稿二级菜单，可确认加入或继续编辑。");
});
