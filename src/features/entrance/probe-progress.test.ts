import { afterEach, describe, expect, it, vi } from "vitest";
import { gsap } from "gsap";
import { createProbePlayback } from "./probe-progress";

let frameId = 0;
const frames = new Map<number, FrameRequestCallback>();

function setup(reduced = false) {
  let clock = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  const render = vi.fn(), complete = vi.fn();
  const playback = createProbePlayback(render, complete, reduced);
  gsap.ticker.sleep();
  const step = (count = 1) => {
    for (let index = 0; index < count; index++) {
      clock += 1000 / 60;
      const callbacks = [...frames.values()]; frames.clear();
      callbacks.forEach((callback) => callback(clock));
      gsap.ticker.sleep();
    }
  };
  return { playback, render, complete, step, frames };
}

afterEach(() => { gsap.ticker.sleep(); frames.clear(); vi.unstubAllGlobals(); });

describe("probe loading progress", () => {
  it("stays at zero until powered on even when all resources are ready", () => {
    const { playback, render, step, frames, complete } = setup();
    playback.update(99, true); step(180);
    expect(render.mock.lastCall?.[0].progress).toBe(0);
    expect(frames.size).toBe(0);
    expect(complete).not.toHaveBeenCalled();
    playback.start(); step(30);
    expect(render.mock.lastCall?.[0].progress).toBeGreaterThan(0);
    expect(render.mock.lastCall?.[0].progress).toBeLessThan(100);
    playback.dispose();
  });

  it("never outruns resource progress or reaches 100 before renderer readiness", () => {
    const { playback, render, step } = setup();
    playback.update(31, false); playback.start(); step(240);
    expect(render.mock.lastCall?.[0].progress).toBe(31);
    expect(render.mock.calls.every(([frame]) => frame.progress <= 31)).toBe(true);
    playback.update(100, false); step(180);
    expect(render.mock.lastCall?.[0].progress).toBe(99);
    playback.dispose();
  });

  it("smooths a late readiness jump then holds 100 before folding and completes once", () => {
    const { playback, render, complete, step } = setup();
    playback.update(20, false); playback.start(); step(180);
    playback.update(99, true); step();
    expect(render.mock.lastCall?.[0].progress).toBeLessThan(25);
    step(150);
    playback.exit.pause();
    expect(render.mock.lastCall?.[0]).toMatchObject({ progress: 100, scaleY: 1, opacity: 1 });
    expect(complete).not.toHaveBeenCalled();
    playback.exit.seek(0.1, false);
    expect(render.mock.lastCall?.[0]).toMatchObject({ progress: 100, scaleY: 1, opacity: 1 });
    playback.exit.seek(0.45, false);
    expect(render.mock.lastCall?.[0].scaleY).toBeLessThan(1);
    playback.exit.progress(1, false);
    expect(render.mock.lastCall?.[0].opacity).toBe(0);
    expect(complete).toHaveBeenCalledOnce();
    playback.start(); playback.exit.restart().progress(1, false);
    expect(complete).toHaveBeenCalledOnce();
    playback.dispose();
  });

  it("retains credited work if an older resource update arrives later", () => {
    const { playback, render, step } = setup();
    playback.update(70, false); playback.start(); step(180);
    playback.update(20, false); step(30);
    expect(render.mock.lastCall?.[0].progress).toBe(70);
    playback.update(99, true); playback.update(90, false); step(120);
    expect(render.mock.lastCall?.[0].progress).toBe(100);
    playback.dispose();
  });

  it("cancels pending animation and completion after unmount", () => {
    const { playback, render, complete, frames, step } = setup();
    playback.update(99, true); playback.start(); step(20);
    playback.dispose(); render.mockClear();
    step(200); playback.exit.progress(1, false); playback.start(); playback.update(99, true);
    gsap.ticker.sleep();
    expect(render).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });

  it("shortens reduced motion without bypassing activation or readiness", () => {
    const { playback, render, complete, step } = setup(true);
    playback.update(99, false); step(30);
    expect(render.mock.lastCall?.[0].progress).toBe(0);
    playback.start(); step(30);
    expect(render.mock.lastCall?.[0].progress).toBe(99);
    expect(complete).not.toHaveBeenCalled();
    playback.update(99, true); step(20); playback.exit.pause();
    expect(render.mock.lastCall?.[0].progress).toBe(100);
    expect(playback.exit.duration()).toBeLessThan(0.5);
    playback.exit.progress(1, false);
    expect(render.mock.lastCall?.[0].scaleY).toBe(1);
    expect(complete).toHaveBeenCalledOnce();
    playback.dispose();
  });
});
