export interface MaskHistory {
  past: Uint8Array[];
  future: Uint8Array[];
}

export function emptyMaskHistory(): MaskHistory {
  return { past: [], future: [] };
}

export function recordMask(history: MaskHistory, current: Uint8Array): MaskHistory {
  return {
    past: [...history.past.slice(-19), new Uint8Array(current)],
    future: [],
  };
}

export function undoMask(history: MaskHistory, current: Uint8Array): { history: MaskHistory; mask: Uint8Array } | null {
  if (!history.past.length) return null;
  return {
    mask: history.past[history.past.length - 1],
    history: {
      past: history.past.slice(0, -1),
      future: [new Uint8Array(current), ...history.future].slice(0, 20),
    },
  };
}

export function redoMask(history: MaskHistory, current: Uint8Array): { history: MaskHistory; mask: Uint8Array } | null {
  if (!history.future.length) return null;
  return {
    mask: history.future[0],
    history: {
      past: [...history.past, new Uint8Array(current)].slice(-20),
      future: history.future.slice(1),
    },
  };
}
