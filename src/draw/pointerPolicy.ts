export type PointerRole = 'draw' | 'navigate' | 'ignore';

export interface PointerPolicy {
  down(e: { pointerId: number; pointerType: string }): PointerRole;
  up(e: { pointerId: number }): void;
  readonly penSeen: boolean;
}

const PEN_MEMORY_KEY = 'storyboard.penSeen';

function readPenMemory(): boolean {
  try {
    return localStorage.getItem(PEN_MEMORY_KEY) === '1';
  } catch {
    return false;
  }
}

// Remembered across sketches and across launches: a device that has a pen keeps having one.
let penSeen = readPenMemory();

function rememberPen(): void {
  if (penSeen) return;
  penSeen = true;
  try {
    localStorage.setItem(PEN_MEMORY_KEY, '1');
  } catch {
    // Without storage the memory lasts for this visit only.
  }
}

/** Forgets that a pen was ever used. For tests. */
export function resetPenMemory(): void {
  penSeen = false;
  try {
    localStorage.removeItem(PEN_MEMORY_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * Decides what each pointer may do on the canvas.
 * A pen always draws. Once a pen has been seen, fingers never draw: one finger is ignored
 * (a resting palm), two fingers pan and zoom. Without a pen, one finger or the mouse draws.
 */
export function createPointerPolicy(): PointerPolicy {
  const pens = new Set<number>();
  const touches = new Set<number>();

  return {
    get penSeen() {
      return penSeen;
    },
    down(e) {
      if (e.pointerType === 'pen') {
        rememberPen();
        pens.add(e.pointerId);
        return 'draw';
      }
      if (e.pointerType !== 'touch') return 'draw';
      if (pens.size > 0) return 'ignore';
      touches.add(e.pointerId);
      if (touches.size >= 2) return 'navigate';
      return penSeen ? 'ignore' : 'draw';
    },
    up(e) {
      pens.delete(e.pointerId);
      touches.delete(e.pointerId);
    },
  };
}
