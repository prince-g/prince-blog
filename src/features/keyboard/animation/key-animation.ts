export type KeyAnimationState = {
  pressed: boolean;
  offsetY: number;
  velocity: number;
  holdRemaining: number;
};

// The supplied switch spring morph compresses by about 0.252 model units.
export const KEY_TRAVEL = 0.25;
export const createKeyAnimationState = (): KeyAnimationState => ({
  pressed: false, offsetY: 0, velocity: 0, holdRemaining: 0,
});

function advance(state: KeyAnimationState, delta: number, down: boolean): void {
  const target = down ? -KEY_TRAVEL : 0;
  const frequency = down ? 100 : 38;
  const displacement = state.offsetY - target;
  const coefficient = state.velocity + frequency * displacement;
  const decay = Math.exp(-frequency * delta);
  state.offsetY = target + (displacement + coefficient * delta) * decay;
  state.velocity = (state.velocity - frequency * coefficient * delta) * decay;
  if (state.offsetY < -KEY_TRAVEL || state.offsetY > 0) {
    state.offsetY = Math.max(-KEY_TRAVEL, Math.min(0, state.offsetY));
    state.velocity = 0;
  }
}

export function stepKeyAnimation(state: KeyAnimationState, delta: number): void {
  if (!Number.isFinite(delta) || delta <= 0) return;
  const heldTime = Math.min(delta, state.holdRemaining);
  state.holdRemaining -= heldTime;
  if (state.pressed) advance(state, delta, true);
  else {
    // A down/up pair between frames still has a visible minimum key stroke.
    if (heldTime > 0) advance(state, heldTime, true);
    if (delta > heldTime) advance(state, delta - heldTime, false);
  }
  if (!state.pressed && state.holdRemaining === 0 && Math.abs(state.offsetY) < 0.00001 && Math.abs(state.velocity) < 0.001) {
    state.offsetY = state.velocity = 0;
  }
}
