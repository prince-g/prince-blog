import { afterEach, describe, expect, it, vi } from "vitest";
import { createEngravingPlayback, engravingFrame } from "./engraving-animation";

describe("laser engraving playback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reveals the first line before the second, without exposing the second line during the hop", () => {
    expect(engravingFrame(0)).toMatchObject({ first: 0, second: 0 });
    expect(engravingFrame(0.8).first).toBeGreaterThan(0);
    expect(engravingFrame(0.8).first).toBeLessThan(1);
    expect(engravingFrame(0.8).second).toBe(0);
    expect(engravingFrame(1.6)).toMatchObject({ first: 1, second: 0 });
    expect(engravingFrame(2.1).first).toBe(1);
    expect(engravingFrame(2.1).second).toBeGreaterThan(0);
    expect(engravingFrame(2.1).second).toBeLessThan(1);
  });

  it("holds the finished outlines after the laser retracts, then fades the overlay", () => {
    expect(engravingFrame(3)).toMatchObject({ first: 1, second: 1, beam: 0, opacity: 1 });
    expect(engravingFrame(3.4).opacity).toBeGreaterThan(0);
    expect(engravingFrame(3.4).opacity).toBeLessThan(1);
  });

  it("completes once only after the final frame, including repeated terminal renders", () => {
    const complete = vi.fn(), render = vi.fn();
    const playback = createEngravingPlayback(render, complete, false);
    playback.timeline.pause().seek(3, false);
    expect(complete).not.toHaveBeenCalled();
    expect(render.mock.lastCall?.[0]).toMatchObject({ first: 1, second: 1, opacity: 1 });
    playback.timeline.progress(1, false);
    expect(render.mock.lastCall?.[0].opacity).toBe(0);
    expect(complete).toHaveBeenCalledOnce();
    playback.timeline.restart().progress(1, false);
    expect(complete).toHaveBeenCalledOnce();
    playback.dispose();
  });

  it("cancels completion and rendering after disposal", () => {
    const complete = vi.fn(), render = vi.fn();
    const playback = createEngravingPlayback(render, complete, false);
    playback.timeline.pause().seek(0.8, false);
    playback.dispose();
    render.mockClear();
    playback.timeline.progress(1, false);
    expect(complete).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it("uses a short readable fade when motion or canvas is unavailable", () => {
    const complete = vi.fn(), render = vi.fn();
    const playback = createEngravingPlayback(render, complete, true);
    playback.timeline.pause().seek(0.3, false);
    expect(render.mock.lastCall?.[0]).toMatchObject({ first: 1, second: 1, beam: 0, opacity: 1 });
    expect(playback.timeline.duration()).toBeLessThan(1);
    playback.timeline.progress(1, false);
    expect(complete).toHaveBeenCalledOnce();
    playback.dispose();
  });

  it("pauses while hidden, resumes at the same frame, and removes the visibility listener on disposal", () => {
    const page = Object.assign(new EventTarget(), { hidden: true });
    vi.stubGlobal("document", page);
    const remove = vi.spyOn(page, "removeEventListener");
    const playback = createEngravingPlayback(vi.fn(), vi.fn(), false);
    expect(playback.timeline.paused()).toBe(true);
    playback.timeline.seek(0.8, false);
    page.hidden = false;
    page.dispatchEvent(new Event("visibilitychange"));
    expect(playback.timeline.paused()).toBe(false);
    expect(playback.timeline.time()).toBeCloseTo(0.8);
    page.hidden = true;
    page.dispatchEvent(new Event("visibilitychange"));
    expect(playback.timeline.paused()).toBe(true);
    playback.dispose();
    expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    page.hidden = false;
    page.dispatchEvent(new Event("visibilitychange"));
    expect(playback.timeline.paused()).toBe(true);
  });
});
