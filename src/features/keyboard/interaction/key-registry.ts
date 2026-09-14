export type KeyActuator = Readonly<{
  press(): void;
  release(): void;
  reset(): void;
}>;

export class KeyRegistry {
  private readonly actuators = new Map<string, KeyActuator>();
  private readonly pressed = new Set<string>();

  register(modelKey: string, actuator: KeyActuator) {
    this.actuators.set(modelKey, actuator);
    return () => this.actuators.delete(modelKey);
  }

  press(modelKey: string) {
    if (this.pressed.has(modelKey)) return;
    this.pressed.add(modelKey);
    this.actuators.get(modelKey)?.press();
  }

  release(modelKey: string) {
    this.pressed.delete(modelKey);
    this.actuators.get(modelKey)?.release();
  }

  releaseAll() {
    for (const code of this.pressed) this.actuators.get(code)?.reset();
    this.pressed.clear();
  }
}
