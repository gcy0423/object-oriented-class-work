function dayOffset(startDate, offset) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function difficultyWeight(difficulty) {
  if (difficulty === "basic") {
    return 1;
  }
  if (difficulty === "advanced") {
    return 3;
  }
  return 2;
}

export class LearningPathPlanner {
  constructor({ concepts, relations, reviewCards }) {
    this.concepts = concepts;
    this.relations = relations;
    this.reviewCards = reviewCards;
  }

  prerequisitesFor(conceptId) {
    return this.relations
      .all()
      .filter((relation) => relation.targetId === conceptId && ["derives", "supports", "prerequisite"].includes(relation.type))
      .map((relation) => relation.sourceId);
  }

  expandWithPrerequisites(conceptIds) {
    const ordered = [];
    const visited = new Set();
    const visit = (id) => {
      if (visited.has(id)) {
        return;
      }
      visited.add(id);
      for (const prerequisiteId of this.prerequisitesFor(id)) {
        visit(prerequisiteId);
      }
      ordered.push(id);
    };
    conceptIds.forEach(visit);
    return ordered;
  }

  estimateMinutes(concept) {
    const cards = this.reviewCards.findByConcept(concept.id).length;
    return 35 + difficultyWeight(concept.difficulty) * 20 + cards * 8;
  }

  buildPlan({ conceptIds, courseId, startDate = new Date().toISOString().slice(0, 10), days = 7 }) {
    const conceptMap = new Map(this.concepts.all().map((concept) => [concept.id, concept]));
    const selectedIds = conceptIds?.length
      ? conceptIds
      : this.concepts.findByCourse(courseId).slice(0, 6).map((concept) => concept.id);
    const orderedIds = this.expandWithPrerequisites(selectedIds).filter((id) => conceptMap.has(id));
    const buckets = Array.from({ length: Math.max(1, Number(days) || 7) }, (_, index) => ({
      date: dayOffset(startDate, index),
      items: [],
      minutes: 0
    }));

    orderedIds.forEach((id, index) => {
      const concept = conceptMap.get(id);
      const bucket = buckets[index % buckets.length];
      const minutes = this.estimateMinutes(concept);
      bucket.items.push({
        conceptId: concept.id,
        title: concept.title,
        category: concept.category,
        difficulty: concept.difficulty,
        objectives: concept.learningObjectives.slice(0, 2),
        estimateMinutes: minutes
      });
      bucket.minutes += minutes;
    });

    return {
      startDate,
      days: buckets.length,
      totalConcepts: orderedIds.length,
      totalMinutes: buckets.reduce((sum, bucket) => sum + bucket.minutes, 0),
      schedule: buckets.filter((bucket) => bucket.items.length > 0)
    };
  }
}
