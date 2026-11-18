import { describe, expect, it } from "vitest";
import {
  completeCycleNotebook,
  createStudyCycleProgress,
  getCycleProgressPercent,
  reconcileStudyCycle,
} from "./studyCycles";

describe("study cycles", () => {
  it("does not complete a full pass after one 15-minute notebook block", () => {
    const progress = createStudyCycleProgress("law", ["a", "b", "c", "d"]);
    const step = completeCycleNotebook(progress, "2026-11-18T12:00:00.000Z");
    expect(step.completedPass).toBe(false);
    expect(step.progress.completedPasses).toBe(0);
    expect(step.nextNotebookId).toBe("b");
    expect(step.progressPercent).toBe(25);
  });

  it("completes a pass only after every notebook in the cycle", () => {
    let progress = createStudyCycleProgress("law", ["a", "b", "c", "d"]);
    for (let i = 0; i < 3; i += 1) {
      const step = completeCycleNotebook(progress);
      expect(step.completedPass).toBe(false);
      progress = step.progress;
    }
    const last = completeCycleNotebook(progress);
    expect(last.completedPass).toBe(true);
    expect(last.progress.completedPasses).toBe(1);
    expect(last.progress.currentNotebookIndex).toBe(0);
    expect(last.nextNotebookId).toBe("a");
    expect(getCycleProgressPercent(last.progress)).toBe(0);
  });

  it("keeps the current notebook when the cycle is reconciled", () => {
    const progress = { ...createStudyCycleProgress("law", ["a", "b", "c"]), currentNotebookIndex: 1 };
    const reconciled = reconcileStudyCycle(progress, "law", ["a", "b", "c", "d"]);
    expect(reconciled.notebookIds[reconciled.currentNotebookIndex]).toBe("b");
  });

  it("moves to the nearest valid index when the current notebook was removed", () => {
    const progress = { ...createStudyCycleProgress("law", ["a", "b", "c"]), currentNotebookIndex: 2 };
    const reconciled = reconcileStudyCycle(progress, "law", ["a", "b"]);
    expect(reconciled.currentNotebookIndex).toBe(1);
  });
});
