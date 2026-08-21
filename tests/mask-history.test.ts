import { describe, expect, it } from "vitest";
import { emptyMaskHistory, recordMask, redoMask, undoMask } from "@/lib/client/mask-history";

function mask(values: number[]) {
  return Uint8Array.from(values);
}

describe("mask history", () => {
  it("undoes back to the recorded mask and can redo", () => {
    const first = mask([1, 0, 0]);
    const second = mask([1, 1, 0]);
    const recorded = recordMask(emptyMaskHistory(), first);
    const undone = undoMask(recorded, second);
    expect(undone).not.toBeNull();
    expect([...undone!.mask]).toEqual([1, 0, 0]);
    expect(undone!.history.past).toHaveLength(0);
    expect(undone!.history.future).toHaveLength(1);

    const redone = redoMask(undone!.history, undone!.mask);
    expect(redone).not.toBeNull();
    expect([...redone!.mask]).toEqual([1, 1, 0]);
  });

  it("returns null when there is nothing to undo or redo", () => {
    const current = mask([1]);
    expect(undoMask(emptyMaskHistory(), current)).toBeNull();
    expect(redoMask(emptyMaskHistory(), current)).toBeNull();
  });
});
