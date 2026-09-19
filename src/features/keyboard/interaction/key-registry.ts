import { createKeyAnimationState, type KeyAnimationState } from "../animation/key-animation";

export type KeyActuator = Readonly<{
  press?(): void;
  release?(): void;
  reset(): void;
}>;

export class KeyRegistry {
  private readonly actuators = new Map<string, KeyActuator>();
  private readonly pressed = new Set<string>();
  private readonly animations = new Map<string, KeyAnimationState>();

  getAnimation(modelKey: string): KeyAnimationState {
    let state = this.animations.get(modelKey);
    if (!state) { state = createKeyAnimationState(); this.animations.set(modelKey, state); }
    return state;
  }

  register(modelKey: string, actuator: KeyActuator) {
    this.actuators.set(modelKey, actuator);
    return () => { this.actuators.delete(modelKey); };
  }

  press(modelKey: string) {
    if (this.pressed.has(modelKey)) return;
    this.pressed.add(modelKey);
    const state = this.getAnimation(modelKey);
    state.pressed = true;
    state.holdRemaining = 0.035;
    this.actuators.get(modelKey)?.press?.();
    // TODO(keyboard-audio): Play the chosen switch's key-down sample here after
    // user audio activation; pair it with key-up below. No audio is loaded yet.
  }

  release(modelKey: string) {
    this.pressed.delete(modelKey);
    const state = this.animations.get(modelKey);
    if (state) state.pressed = false;
    this.actuators.get(modelKey)?.release?.();
    // TODO(keyboard-audio): Play the matching key-up sample when audio is added.
  }

  releaseAll() {
    for (const [key, state] of this.animations) {
      if (!state.pressed && state.offsetY === 0 && state.velocity === 0 && state.holdRemaining === 0) continue;
      Object.assign(state, createKeyAnimationState());
      this.actuators.get(key)?.reset();
    }
    this.pressed.clear();
  }
}
