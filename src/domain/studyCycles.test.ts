import { describe, expect, it } from "vitest";
import { completeCycleNotebook, createStudyCycleProgress, getCycleProgressPercent, reconcileStudyCycle } from "./studyCycles";

describe("study cycles", () => {
  it("completes a pass after every active notebook is visited, regardless of visit duration", () => {
    let progress = createStudyCycleProgress("law", ["a", "b", "c", "d"]);
    for (const id of ["a", "b", "c"]) {
      expect(progress.notebookIds[progress.currentNotebookIndex]).toBe(id);
      progress = completeCycleNotebook(progress).progress;
    }
    const last = completeCycleNotebook(progress);
    expect(last.completedPass).toBe(true);
    expect(last.progress.completedPasses).toBe(1);
    expect(last.progress.visitedNotebookIds).toEqual([]);
    expect(last.nextNotebookId).toBe("a");
    expect(getCycleProgressPercent(last.progress)).toBe(0);
  });

  it("does not count a paused partial visit unless completion is explicitly recorded", () => {
    const progress = createStudyCycleProgress("law", ["a", "b"]);
    expect(progress.visitedNotebookIds).toEqual([]);
    expect(progress.completedPasses).toBe(0);
  });

  it("preserves visit history by permanent notebook ID when order changes", () => {
    const progress = { ...createStudyCycleProgress("law", ["a", "b", "c"]), visitedNotebookIds: ["a"], currentNotebookIndex: 1 };
    const reconciled = reconcileStudyCycle(progress, "law", ["c", "a", "b"]);
    expect(reconciled.visitedNotebookIds).toEqual(["a"]);
    expect(reconciled.notebookIds[reconciled.currentNotebookIndex]).toBe("b");
  });

  it("removes deleted notebooks from the current pass and preserves remaining visits", () => {
    const progress = { ...createStudyCycleProgress("law", ["a", "b", "c"]), visitedNotebookIds: ["a", "c"], currentNotebookIndex: 1 };
    const reconciled = reconcileStudyCycle(progress, "law", ["a", "b"]);
    expect(reconciled.visitedNotebookIds).toEqual(["a"]);
    const last = completeCycleNotebook(reconciled);
    expect(last.completedPass).toBe(true);
  });

  it("starts a new pass after the final eligible notebook", () => {
    let progress = createStudyCycleProgress("law", ["a"]);
    const step = completeCycleNotebook(progress);
    expect(step.completedPass).toBe(true);
    expect(step.progress.completedPasses).toBe(1);
    expect(step.nextNotebookId).toBe("a");
  });
});
