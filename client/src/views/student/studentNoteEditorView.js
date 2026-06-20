import { studentNoteForm } from "../../forms/studentNoteForm.js";
import { selectStudentNotesModel } from "../../state/studentSelectors.js";
import { studentSection } from "./shared.js";

export function studentNoteEditorView(state) {
  const model = selectStudentNotesModel(state);
  return `
    <section class="student-page-grid">
      ${studentSection("笔记编辑", studentNoteForm({ draft: model.editorDraft, noteId: model.selectedNoteId, saving: state.saving.studentNote }))}
    </section>
  `;
}
