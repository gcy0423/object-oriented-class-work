import { selectStudentNotesModel } from "../../state/studentSelectors.js";
import { courseTabs, listCards, noteCard, studentSection } from "./shared.js";

export function studentNotesView(state) {
  const model = selectStudentNotesModel(state);
  return `
    <section class="student-page-grid">
      ${studentSection("课程筛选", `${courseTabs(model.courses, model.selectedCourseId)}<div class="button-row"><button class="btn primary" data-action="student-new-note">新建笔记</button></div>`)}
      ${studentSection("当前课程笔记", listCards(model.notes, noteCard))}
    </section>
  `;
}
