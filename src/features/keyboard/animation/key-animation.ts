export type KeyAnimationState = {
  pressed: boolean;
  offsetY: number;
  glow: number;
};

export const createKeyAnimationState = (): KeyAnimationState => ({
  pressed: false,
  offsetY: 0,
  glow: 0,
});

export function stepKeyAnimation(state: KeyAnimationState, delta: number): void {
  const positionTarget = state.pressed ? -0.16 : 0;
  const glowTarget = state.pressed ? 1 : 0;
  const positionAlpha = 1 - Math.exp(-24 * delta);
  const glowAlpha = 1 - Math.exp(-(state.pressed ? 30 : 14) * delta);

  state.offsetY += (positionTarget - state.offsetY) * positionAlpha;
  state.glow += (glowTarget - state.glow) * glowAlpha;

  if (!state.pressed && Math.abs(state.offsetY) < 0.0001) state.offsetY = 0;
  if (!state.pressed && state.glow < 0.0001) state.glow = 0;
}
