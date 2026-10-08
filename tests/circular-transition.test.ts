import { describe, expect, it, vi } from "vitest";
import { createCircularFrame, circularTimeline } from "../src/features/entrance/circular-transition";

describe("circular page handoff", () => {
  it("covers the outgoing page before revealing the next and finishes exactly once", () => {
    const frame = createCircularFrame();
    const covered = vi.fn(), complete = vi.fn();
    const timeline = circularTimeline(frame, () => {}, covered, complete, false).pause();
    timeline.time(0.3, false);
    expect(frame.circles.some((circle) => circle.scale > 0)).toBe(true);
    expect(frame.reveal).toBe(0);
    expect(covered).not.toHaveBeenCalled();
    timeline.time(1.15, false);
    expect(frame.circles.every((circle) => circle.scale === 1)).toBe(true);
    expect(covered).toHaveBeenCalledOnce();
    expect(complete).not.toHaveBeenCalled();
    timeline.progress(1, false);
    expect(frame.reveal).toBe(1);
    expect(complete).toHaveBeenCalledOnce();
    timeline.kill();
  });

  it("uses a short fade for reduced motion and cancellation prevents handoff", () => {
    const frame = createCircularFrame();
    const covered = vi.fn(), complete = vi.fn();
    const timeline = circularTimeline(frame, () => {}, covered, complete, true).pause();
    expect(timeline.duration()).toBeLessThanOrEqual(0.3);
    timeline.time(0.05, false);
    expect(covered).not.toHaveBeenCalled();
    timeline.progress(1, false);
    expect(covered).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledOnce();
    expect(frame.opacity).toBe(0);
    timeline.kill();
    const cancelled = circularTimeline(createCircularFrame(), () => {}, covered, complete, false).pause();
    cancelled.time(0.2, false).kill();
    expect(covered).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledOnce();
  });
});
