import { describe, expect, it, vi } from "vitest";
import { assemblyTimeline, canEnterSwitch, createSceneMotion, exitTimeline, returnTimeline } from "../src/features/keyboard/animation/experience";
import { initialKeyboardHeroRuntimeState, updateKeyboardHeroRuntimeState } from "../src/features/keyboard/scene/KeyboardHero";

describe("keyboard experience gates", () => {
  it("hands off once and rejects returning or continuing while the page transition runs", () => {
    const focused = { status: "switch" as const, canvasKey: 0 };
    const leaving = updateKeyboardHeroRuntimeState(focused, "continue");
    expect(leaving.status).toBe("leaving");
    expect(updateKeyboardHeroRuntimeState(leaving, "continue")).toBe(leaving);
    expect(updateKeyboardHeroRuntimeState(leaving, "back")).toBe(leaving);
    expect(updateKeyboardHeroRuntimeState({ status: "ready", canvasKey: 0 }, "continue").status).toBe("ready");
  });
  it("keeps input locked after assets load until the assembly completes", () => {
    const assembling = updateKeyboardHeroRuntimeState(initialKeyboardHeroRuntimeState, "ready");
    expect(assembling.status).toBe("assembling");
    expect(canEnterSwitch(assembling.status as "assembling", "hello", "button")).toBe(false);
    const ready = updateKeyboardHeroRuntimeState(assembling, "assembled");
    expect(ready.status).toBe("ready");
    expect(updateKeyboardHeroRuntimeState(ready, "ready")).toBe(ready);
  });

  it("requires nonblank text for Enter, permits the button, and rejects duplicate entry", () => {
    for (const text of ["", " ", "\n\t"]) expect(canEnterSwitch("ready", text, "keyboard")).toBe(false);
    expect(canEnterSwitch("ready", "你好", "keyboard")).toBe(true);
    expect(canEnterSwitch("ready", "", "button")).toBe(true);
    expect(canEnterSwitch("exiting", "hello", "keyboard")).toBe(false);
    const ready = { status: "ready" as const, canvasKey: 0 };
    const exiting = updateKeyboardHeroRuntimeState(ready, "enter");
    expect(exiting.status).toBe("exiting");
    expect(updateKeyboardHeroRuntimeState(exiting, "enter")).toBe(exiting);
    expect(updateKeyboardHeroRuntimeState(exiting, "switch").status).toBe("switch");
    const returning = updateKeyboardHeroRuntimeState({ status: "switch", canvasKey: 0 }, "back");
    expect(returning.status).toBe("returning");
    expect(canEnterSwitch("returning", "hello", "button")).toBe(false);
    expect(updateKeyboardHeroRuntimeState(returning, "back")).toBe(returning);
    expect(updateKeyboardHeroRuntimeState(returning, "enter")).toBe(returning);
    expect(updateKeyboardHeroRuntimeState(returning, "returned").status).toBe("ready");
  });
});

describe("scene choreography", () => {
  it("reveals the exploded board before folding and unlocks only at its end", () => {
    const motion = createSceneMotion();
    const done = vi.fn();
    const timeline = assemblyTimeline(motion, done, false).pause();
    timeline.seek(1, false);
    expect(motion.reveal).toBeGreaterThan(0.9);
    expect(motion.assembly).toBe(1);
    expect(done).not.toHaveBeenCalled();
    timeline.progress(1, false);
    expect(motion.assembly).toBe(0);
    expect(motion.reveal).toBe(1);
    expect(done).toHaveBeenCalledOnce();
    timeline.kill();
  });

  it("removes caps, flies the switches out, then moves the camera to the isolated switch", () => {
    const motion = { ...createSceneMotion(), assembly: 0, reveal: 1 };
    const done = vi.fn();
    const timeline = exitTimeline(motion, done, false).pause();
    timeline.seek(1, false);
    expect(motion.capExit).toBe(1);
    expect(motion.switchExit).toBeGreaterThan(0);
    expect(motion.focus).toBe(0);
    timeline.seek(3.4, false);
    expect(motion.switchExit).toBe(1);
    expect(motion.focus).toBeGreaterThan(0);
    expect(done).not.toHaveBeenCalled();
    timeline.progress(1, false);
    expect(motion.focus).toBe(1);
    expect(motion.boardExit).toBe(1);
    expect(done).toHaveBeenCalledOnce();
    timeline.kill();
  });

  it.each([false, true])("returns switches and then caps without replaying internal assembly (reduced=%s)", (reduced) => {
    const motion = { ...createSceneMotion(), assembly: 0, reveal: 1, capExit: 1, switchExit: 1, focus: 1, boardExit: 1 };
    const done = vi.fn();
    const timeline = returnTimeline(motion, done, reduced).pause();
    for (const progress of [0, 0.2, 0.45, 0.7, 0.9]) {
      timeline.progress(progress, false);
      expect(motion.assembly).toBe(0);
      expect(motion.reveal).toBe(1);
      expect(done).not.toHaveBeenCalled();
    }
    timeline.progress(1, false);
    expect(motion).toMatchObject({ capExit: 0, switchExit: 0, focus: 0, boardExit: 0 });
    expect(done).toHaveBeenCalledOnce();
    timeline.kill();
  });

  it("seats the returning switches before the caps become solid", () => {
    const motion = { ...createSceneMotion(), assembly: 0, reveal: 1, capExit: 1, switchExit: 1, focus: 1, boardExit: 1 };
    const timeline = returnTimeline(motion, () => {}, false).pause();
    timeline.seek(1.4);
    expect(motion.capExit).toBe(1);
    expect(motion.boardExit).toBe(0);
    timeline.seek(2.6);
    expect(motion.switchExit).toBe(0);
    expect(motion.capExit).toBeGreaterThan(0);
    timeline.kill();
  });
});
