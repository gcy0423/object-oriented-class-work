function optionSet(answer, distractors) {
  const values = [answer, ...distractors].filter(Boolean);
  return [...new Set(values)].slice(0, 4);
}

export class PracticeSetBuilder {
  constructor({ concepts, chunks, reviewCards }) {
    this.concepts = concepts;
    this.chunks = chunks;
    this.reviewCards = reviewCards;
  }

  buildShortAnswer(concept, card) {
    return {
      id: `practice_${concept.id}_${card.id}_short`,
      type: "short-answer",
      conceptId: concept.id,
      title: concept.title,
      question: card.question,
      referenceAnswer: card.answer,
      hints: card.hints,
      difficulty: card.level,
      gradingPoints: concept.learningObjectives.slice(0, 3)
    };
  }

  buildChoiceQuestion(concept, relatedConcepts) {
    const distractors = relatedConcepts
      .filter((item) => item.id !== concept.id)
      .slice(0, 3)
      .map((item) => item.title);
    return {
      id: `practice_${concept.id}_choice`,
      type: "single-choice",
      conceptId: concept.id,
      title: concept.title,
      question: `下列哪一项最符合“${concept.title}”的核心含义？`,
      options: optionSet(concept.title, distractors),
      answer: concept.title,
      explanation: concept.summary,
      difficulty: concept.difficulty
    };
  }

  buildScenarioQuestion(concept) {
    const rule = this.chunks
      .findByConcept(concept.id)
      .find((chunk) => chunk.kind === "rule" || chunk.kind === "prompt-hint");
    return {
      id: `practice_${concept.id}_scenario`,
      type: "scenario-analysis",
      conceptId: concept.id,
      title: concept.title,
      question: `在 EduMind Agent 中，如何用“${concept.title}”解释一个真实设计决策？`,
      referenceAnswer: rule?.content || concept.summary,
      checklist: [
        "说明问题背景。",
        "说明涉及的对象、服务或接口。",
        "说明为什么这种设计能降低风险。"
      ],
      difficulty: concept.difficulty
    };
  }

  buildSet({ courseId, conceptIds = [], limit = 8 }) {
    const allConcepts = this.concepts.findByCourse(courseId);
    const conceptMap = new Map(allConcepts.map((concept) => [concept.id, concept]));
    const selected = (conceptIds.length ? conceptIds : allConcepts.map((concept) => concept.id))
      .map((id) => conceptMap.get(id))
      .filter(Boolean)
      .slice(0, Math.max(1, Number(limit) || 8));
    const questions = [];
    for (const concept of selected) {
      const cards = this.reviewCards.findByConcept(concept.id);
      if (cards[0]) {
        questions.push(this.buildShortAnswer(concept, cards[0]));
      }
      questions.push(this.buildChoiceQuestion(concept, allConcepts));
      questions.push(this.buildScenarioQuestion(concept));
    }
    return {
      courseId,
      conceptCount: selected.length,
      questionCount: questions.length,
      questions
    };
  }
}
