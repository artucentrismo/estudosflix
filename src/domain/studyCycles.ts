export type StudyCycleProgress = {
  disciplineId: string;
  notebookIds: string[];
  currentNotebookIndex: number;
  /** IDs already visited during the current pass; position is never used as identity. */
  visitedNotebookIds: string[];
  completedPasses: number;
  updatedAt: string;
};

export type CycleStep = {
  progress: StudyCycleProgress;
  completedPass: boolean;
  nextNotebookId?: string;
  progressPercent: number;
};

export function createStudyCycleProgress(
  disciplineId: string,
  notebookIds: string[],
  updatedAt = new Date().toISOString(),
): StudyCycleProgress {
  return {
    disciplineId,
    notebookIds: [...notebookIds],
    currentNotebookIndex: 0,
    visitedNotebookIds: [],
    completedPasses: 0,
    updatedAt,
  };
}

export function reconcileStudyCycle(
  progress: StudyCycleProgress | undefined,
  disciplineId: string,
  notebookIds: string[],
  updatedAt = new Date().toISOString(),
): StudyCycleProgress {
  const ordered = [...notebookIds];
  if (!progress || progress.disciplineId !== disciplineId) {
    return createStudyCycleProgress(disciplineId, ordered, updatedAt);
  }
  const currentId = progress.notebookIds[progress.currentNotebookIndex];
  const currentIndex = currentId ? ordered.indexOf(currentId) : -1;
  const visitedNotebookIds = (progress.visitedNotebookIds ?? []).filter(id => ordered.includes(id));
  const nextIndex = currentIndex >= 0
    ? currentIndex
    : ordered.findIndex(id => !visitedNotebookIds.includes(id));
  return {
    ...progress,
    notebookIds: ordered,
    visitedNotebookIds,
    currentNotebookIndex: nextIndex >= 0 ? nextIndex : 0,
    updatedAt,
  };
}

export function getCycleProgressPercent(progress: StudyCycleProgress): number {
  if (progress.notebookIds.length === 0) return 0;
  const visited = progress.visitedNotebookIds ?? [];
  return Math.round((visited.filter(id => progress.notebookIds.includes(id)).length / progress.notebookIds.length) * 100);
}

/**
 * Records a completed visit, not a 15-minute threshold.
 * Pausing a partial block must not call this; an intentional manual end may.
 */
export function completeCycleNotebook(
  progress: StudyCycleProgress,
  updatedAt = new Date().toISOString(),
): CycleStep {
  const ids = progress.notebookIds;
  if (ids.length === 0) {
    return { progress: { ...progress, visitedNotebookIds: [], updatedAt }, completedPass: false, progressPercent: 0 };
  }
  const currentId = ids[Math.min(Math.max(0, progress.currentNotebookIndex), ids.length - 1)];
  const visited = new Set((progress.visitedNotebookIds ?? []).filter(id => ids.includes(id)));
  if (currentId) visited.add(currentId);
  const completedPass = ids.every(id => visited.has(id));
  const nextVisited = completedPass ? [] : [...visited];
  const currentIndex = ids.indexOf(currentId);
  let nextIndex = 0;
  if (!completedPass) {
    for (let offset = 1; offset <= ids.length; offset += 1) {
      const candidate = (currentIndex + offset) % ids.length;
      if (!nextVisited.has(ids[candidate])) {
        nextIndex = candidate;
        break;
      }
    }
  }
  const nextProgress: StudyCycleProgress = {
    ...progress,
    visitedNotebookIds: nextVisited,
    currentNotebookIndex: nextIndex,
    completedPasses: progress.completedPasses + (completedPass ? 1 : 0),
    updatedAt,
  };
  return {
    progress: nextProgress,
    completedPass,
    nextNotebookId: ids[nextIndex],
    progressPercent: getCycleProgressPercent(nextProgress),
  };
}
