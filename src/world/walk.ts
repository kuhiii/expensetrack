import { GULLAK_LAYOUT } from './gullakLayout';

/**
 * Walking, the way a pixel game does it: a list of steps, played one every
 * STEP_MS. Each step says where her feet are (dp, screen space), how close she
 * is to the camera (k: art px per sprite px, 5 = right by the camera, 2 = deep
 * in the room), which frame of the walk cycle to show, which way she faces,
 * and — while she's in a doorway — the rectangle she's visible inside, so the
 * door's wall and the floor hide her one step at a time.
 */

export type Room = 'main' | 'categories' | 'savings';
export type View = 'back' | 'front' | 'side';
export type Clip = { x: number; y: number; w: number; h: number };
export type Step = { cx: number; fy: number; k: number; frame: string; flip: boolean; clip: Clip | null };

export const STEP_MS = 95;
const SIZE = GULLAK_LAYOUT.kuhi.size; // dp per k
const FEET = GULLAK_LAYOUT.kuhi.feet; // dp per k, from the sprite's top to her feet

/**
 * Where she stands in each room, back to the camera. Anchored to the bottom
 * of the screen actually available (status and navigation bars take some of
 * the phone's 780dp), so her top and a strip of jeans always show.
 */
let viewH = 780;
export function setViewportHeight(h: number) {
  if (h > 0) viewH = h;
}
const REST_X: Record<Room, number> = { main: 88, categories: 80, savings: 76 };
const restOf = (room: Room) => ({ cx: REST_X[room], fy: viewH + 30 });
export const REST = {
  get main() { return restOf('main'); },
  get categories() { return restOf('categories'); },
  get savings() { return restOf('savings'); },
} as Record<Room, { cx: number; fy: number }>;

// Inside a doorway she's only visible within the door's opening: the frame, the wall around
// it and the floor below the threshold hide her, so she goes *through* the door.
const O = GULLAK_LAYOUT.openings;
const MAIN_DOOR: Clip = O.main;
const LEFT_DOOR: Clip = O.up; // the stairs door on level 2 (and the savings room's back door — same spot)
const BACK_DOOR: Clip = O.back;
let rightDoor: Clip = O.savingsFromRightStrip;
/** The savings door's opening on screen, once the categories wall is scrolled to its right end. */
export function setRightStripLeft(screenX: number) {
  rightDoor = { ...O.savingsFromRightStrip, x: screenX + O.savingsFromRightStrip.x };
}
const mid = (c: Clip) => ({ cx: c.x + c.w / 2, fy: c.y + c.h });

export function spriteBox(s: { cx: number; fy: number; k: number }) {
  const size = SIZE * s.k;
  return { left: s.cx - size / 2, top: s.fy - FEET * s.k, size };
}

export function restStep(room: Room, frame = 'back'): Step {
  return { ...REST[room], k: 5, frame: `${frame}-5`, flip: false, clip: null };
}

const CYCLE = ['A', '', 'B', ''];
const snap = (v: number) => Math.round(v / 2) * 2; // keep her on the 2dp art-pixel grid

/** n steps from a to b, walking in `view`, getting closer/further by k. */
function walk(
  a: { cx: number; fy: number; k: number },
  b: { cx: number; fy: number; k: number },
  n: number,
  view: View,
  flip = false,
  clip: Clip | null = null,
  phase = 0
): Step[] {
  const out: Step[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    // Ease the size change so she shrinks smoothly as she walks deeper rather than all at once.
    const k = Math.max(1, Math.min(5, Math.round(a.k + (b.k - a.k) * t)));
    out.push({
      cx: snap(a.cx + (b.cx - a.cx) * t),
      fy: snap(a.fy + (b.fy - a.fy) * t),
      k,
      frame: `${view}${CYCLE[(i + phase) % 4]}-${k}`,
      flip,
      clip,
    });
  }
  return out;
}
const stand = (p: { cx: number; fy: number; k: number }, view: View, flip = false, clip: Clip | null = null): Step => ({
  ...p,
  frame: `${view}-${p.k}`,
  flip,
  clip,
});
/** Stairs inside a doorway: each step moves her by (dx, dy), small and clipped to the opening. */
function stairs(from: { cx: number; fy: number }, n: number, dx: number, dy: number, flip: boolean, clip: Clip): Step[] {
  return walk({ ...from, k: 1 }, { cx: from.cx + dx * n, fy: from.fy + dy * n, k: 1 }, n, 'side', flip, clip);
}

/** Up to the door (back to the camera), turn, and step into the opening. */
function toDoor(from: Room, door: Clip, side: 1 | -1): Step[] {
  const d = mid(door);
  const before = { cx: d.cx - side * 16, fy: d.fy + 10, k: 2 };
  return [
    ...walk({ ...REST[from], k: 5 }, before, 12, 'back'),
    stand(before, 'side', side < 0),
    ...walk(before, { ...d, k: 1 }, 2, 'side', side < 0, door),
  ];
}
/** Out of the opening, a step into the room, then toward the camera and turn round. */
function fromDoor(to: Room, door: Clip, side: 1 | -1): Step[] {
  const d = mid(door);
  const after = { cx: d.cx + side * 16, fy: d.fy + 10, k: 2 };
  const end = { ...REST[to], k: 5 };
  return [
    ...walk({ ...d, k: 1 }, after, 2, 'side', side < 0),
    stand(after, 'front'),
    ...walk(after, end, 10, 'front'),
    stand(end, 'back'),
  ];
}

/** Leaving `from` for `to`: she walks to the exit and disappears through it. */
export function exitPath(from: Room, to: Room): Step[] {
  if (from === 'main') {
    const d = mid(MAIN_DOOR); // stairs go down, deeper into the right-hand wall
    return [...toDoor('main', MAIN_DOOR, 1), ...stairs(d, 7, 5, 12, false, MAIN_DOOR)];
  }
  if (from === 'categories' && to === 'main') {
    const d = mid(LEFT_DOOR); // stairs go up, deeper into the left-hand wall
    return [...toDoor('categories', LEFT_DOOR, -1), ...stairs(d, 8, -5, -14, true, LEFT_DOOR)];
  }
  if (from === 'categories' && to === 'savings') {
    const d = mid(rightDoor);
    return [...toDoor('categories', rightDoor, 1), ...walk({ ...d, k: 1 }, { cx: d.cx + 60, fy: d.fy, k: 1 }, 6, 'side', false, rightDoor)];
  }
  const d = mid(BACK_DOOR);
  return [...toDoor('savings', BACK_DOOR, -1), ...walk({ ...d, k: 1 }, { cx: d.cx - 60, fy: d.fy, k: 1 }, 6, 'side', true, BACK_DOOR)];
}

/** Arriving in `to` from `from`: she comes through the door, walks toward the camera, then turns around. */
export function enterPath(from: Room, to: Room): Step[] {
  if (to === 'categories' && from === 'main') {
    const d = mid(LEFT_DOOR); // coming down the stairs inside the left-hand door
    return [...stairs({ cx: d.cx - 40, fy: d.fy - 112 }, 8, 5, 14, false, LEFT_DOOR), ...fromDoor('categories', LEFT_DOOR, 1)];
  }
  if (to === 'main') {
    const d = mid(MAIN_DOOR); // coming up the stairs inside the right-hand door
    return [...stairs({ cx: d.cx + 35, fy: d.fy + 84 }, 7, -5, -12, true, MAIN_DOOR), ...fromDoor('main', MAIN_DOOR, -1)];
  }
  if (to === 'savings') {
    const d = mid(BACK_DOOR);
    return [...walk({ cx: d.cx - 60, fy: d.fy, k: 1 }, { ...d, k: 1 }, 6, 'side', false, BACK_DOOR), ...fromDoor('savings', BACK_DOOR, 1)];
  }
  const d = mid(rightDoor);
  return [...walk({ cx: d.cx + 60, fy: d.fy, k: 1 }, { ...d, k: 1 }, 6, 'side', true, rightDoor), ...fromDoor('categories', rightDoor, -1)];
}
