import { createKeyAnimationState, type KeyAnimationState } from "../animation/key-animation";
import type { KeyAudioSink } from "./keyboard-audio";

export type KeyActuator = Readonly<{
  press?(): void;
  release?(): void;
  reset(): void;
}>;

export class KeyRegistry {
  private readonly actuators = new Map<string, KeyActuator>();
  private readonly pressed = new Map<string, Set<string>>();
  private readonly animations = new Map<string, KeyAnimationState>();
  private audio?: KeyAudioSink;

  setAudio(audio?: KeyAudioSink) {
    try { this.audio?.stop(); } catch { /* Audio is optional. */ }
    this.audio = audio;
  }

  isPressed(modelKey: string) { return this.pressed.has(modelKey); }

  getAnimation(modelKey: string): KeyAnimationState {
    let state = this.animations.get(modelKey);
    if (!state) { state = createKeyAnimationState(); this.animations.set(modelKey, state); }
    return state;
  }

  register(modelKey: string, actuator: KeyActuator) {
    this.actuators.set(modelKey, actuator);
    return () => { this.actuators.delete(modelKey); };
  }

  press(modelKey: string, source = "physical") {
    const sources = this.pressed.get(modelKey);
    if (sources) { sources.add(source); return; }
    this.pressed.set(modelKey, new Set([source]));
    const state = this.getAnimation(modelKey);
    state.pressed = true;
    state.holdRemaining = 0.035;
    this.actuators.get(modelKey)?.press?.();
    try { this.audio?.unlock(); this.audio?.play(modelKey, "press"); } catch { /* Audio must not interrupt typing. */ }
  }

  release(modelKey: string, source = "physical", silent = false) {
    const sources = this.pressed.get(modelKey);
    if (!sources?.delete(source) || sources.size > 0) return;
    this.pressed.delete(modelKey);
    const state = this.animations.get(modelKey);
    if (state) state.pressed = false;
    this.actuators.get(modelKey)?.release?.();
    try { if (!silent) this.audio?.play(modelKey, "up"); } catch { /* Audio must not interrupt typing. */ }
  }

  releaseAll(stopAudio = true) {
    for (const [key, state] of this.animations) {
      if (!state.pressed && state.offsetY === 0 && state.velocity === 0 && state.holdRemaining === 0) continue;
      Object.assign(state, createKeyAnimationState());
      this.actuators.get(key)?.reset();
    }
    this.pressed.clear();
    try { if (stopAudio) this.audio?.stop(); } catch { /* Reset remains safe when audio is unavailable. */ }
  }
}
