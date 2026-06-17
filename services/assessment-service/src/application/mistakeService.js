import { ForbiddenError, NotFoundError } from "../../../../shared/http/errors.js";
import { sortByCreatedDesc } from "../domain/assessment.js";

export class MistakeService {
  constructor({ mistakeItems, questions, collaborationClient, logger = console }) {
    this.mistakeItems = mistakeItems;
    this.questions = questions;
    this.collaborationClient = collaborationClient;
    this.logger = logger;
  }

  listMistakes(user, filters = {}) {
    const items = sortByCreatedDesc(this.mistakeItems.findByOwner(user.id))
      .filter((item) => {
        if (filters.courseId && item.courseId !== filters.courseId) {
          return false;
        }
        if (filters.status && item.status !== filters.status) {
          return false;
        }
        return true;
      });
    return items.map((item) => ({
      ...item.toJSON(),
      question: this.questions.findById(item.questionId)?.toJSON() || null
    }));
  }

  async reviewMistake(user, mistakeId, input) {
    const mistake = this.mistakeItems.findById(mistakeId);
    if (!mistake) {
      throw new NotFoundError("错题不存在。");
    }
    if (mistake.ownerId !== user.id) {
      throw new ForbiddenError("只能更新自己的错题。");
    }
    mistake.status = String(input.status || "reviewed").trim() || "reviewed";
    mistake.reviewNote = String(input.note || "").trim();
    mistake.touch();
    const saved = await this.mistakeItems.save(mistake);
    await this.publishEvent({
      type: "mistake.reviewed",
      actorId: user.id,
      source: "assessment-service",
      summary: "完成一次错题复习",
      payload: { mistakeId: saved.id, status: saved.status }
    });
    return saved;
  }

  async publishEvent(event) {
    if (!this.collaborationClient) {
      return;
    }
    try {
      await this.collaborationClient.publishEvent(event);
    } catch (error) {
      this.logger.warn?.(`assessment-service event publish failed: ${error.message}`);
    }
  }
}
