export type StudyCycleProgress = {
  disciplineId: string;
  notebookIds: string[];
  currentNotebookIndex: number;
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
  return {
    ...progress,
    notebookIds: ordered,
    currentNotebookIndex: currentIndex >= 0
      ? currentIndex
      : Math.min(progress.currentNotebookIndex, Math.max(0, ordered.length - 1)),
    updatedAt,
  };
}

export function getCycleProgressPercent(progress: StudyCycleProgress): number {
  if (progress.notebookIds.length === 0) return 0;
  return Math.round((progress.currentNotebookIndex / progress.notebookIds.length) * 100);
}

export function completeCycleNotebook(
  progress: StudyCycleProgress,
  updatedAt = new Date().toISOString(),
): CycleStep {
  const count = progress.notebookIds.length;
  if (count === 0) {
    return { progress: { ...progress, updatedAt }, completedPass: false, progressPercent: 0 };
  }
  const lastNotebook = progress.currentNotebookIndex >= count - 1;
  const nextProgress: StudyCycleProgress = {
    ...progress,
    currentNotebookIndex: lastNotebook ? 0 : progress.currentNotebookIndex + 1,
    completedPasses: progress.completedPasses + (lastNotebook ? 1 : 0),
    updatedAt,
  };
  return {
    progress: nextProgress,
    completedPass: lastNotebook,
    nextNotebookId: nextProgress.notebookIds[nextProgress.currentNotebookIndex],
    progressPercent: getCycleProgressPercent(nextProgress),
  };
}
