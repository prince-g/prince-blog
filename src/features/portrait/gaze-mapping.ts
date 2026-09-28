const QUARTER_TURN = Math.PI / 2;
const TIMES = [1.8, 2.8, 4.2, 6.2] as const;
export const PORTRAIT_CYCLE_SECONDS = 8.4;

function wrapTime(time: number) {
  if (time >= 0 && time < PORTRAIT_CYCLE_SECONDS) return time;
  return ((time % PORTRAIT_CYCLE_SECONDS) + PORTRAIT_CYCLE_SECONDS) % PORTRAIT_CYCLE_SECONDS;
}

/** Frame zero and the returned-front pose are the same point on the gaze loop. */
export function portraitTimeDelta(from: number, to: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  const delta = (to - from) % PORTRAIT_CYCLE_SECONDS;
  const half = PORTRAIT_CYCLE_SECONDS / 2;
  return delta > half ? delta - PORTRAIT_CYCLE_SECONDS : delta < -half ? delta + PORTRAIT_CYCLE_SECONDS : delta || 0;
}

/** Damp toward the target without crossing the loop seam the long way around. */
export function stepPortraitTime(current: number, target: number, deltaSeconds: number): number {
  if (!Number.isFinite(current)) return 0;
  if (!Number.isFinite(target) || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return current;
  const delta = portraitTimeDelta(current, target);
  if (delta === 0) return current;
  const elapsed = Math.min(deltaSeconds, 0.05);
  const distance = Math.min(Math.abs(delta) * (1 - Math.exp(-12 * elapsed)), 10 * elapsed);
  return wrapTime(current + Math.sign(delta) * distance);
}

/** Select only angles that actually occur in the owner's footage. */
export function gazeTimeFromPointer(x: number, y: number, width: number, height: number, previousTime = 0): number {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return 0;
  const horizontal = (x / width - 0.5) * 2;
  const vertical = (0.5 - y / height) * 2;
  const radius = Math.hypot(horizontal, vertical);
  if (radius < 0.09) return 0;
  if (radius <= 0.18) return Number.isFinite(previousTime) ? wrapTime(previousTime) : 0;

  const angle = (Math.atan2(vertical, horizontal) + Math.PI * 2) % (Math.PI * 2);
  const quadrant = angle / QUARTER_TURN;
  // Bridge the unrecorded down-to-right turn through the two front endpoints.
  if (quadrant >= 3.5) return (quadrant - 3.5) * 2 * TIMES[0];
  if (quadrant >= 3) return TIMES[3] + (quadrant - 3) * 2 * (PORTRAIT_CYCLE_SECONDS - TIMES[3]);
  const index = Math.floor(quadrant);
  return TIMES[index] + (TIMES[index + 1] - TIMES[index]) * (quadrant - index);
}
