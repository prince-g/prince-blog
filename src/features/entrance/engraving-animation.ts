import { gsap } from "gsap";

const phase = (time: number, start: number, duration: number) => Math.max(0, Math.min(1, (time - start) / duration));

export function engravingFrame(time: number, reduced = false) {
  if (reduced) return { first: 1, second: 1, hop: 1, beam: 0,
    opacity: 1 - phase(time, 0.65, 0.2), textOpacity: phase(time, 0, 0.18) };
  return {
    first: phase(time, 0.28, 1.2), second: phase(time, 1.72, 0.9),
    hop: phase(time, 1.48, 0.24), beam: phase(time, 0, 0.28) * (1 - phase(time, 2.62, 0.33)),
    opacity: 1 - phase(time, 3.17, 0.5), textOpacity: 1,
  };
}

export function createEngravingPlayback(render: (frame: ReturnType<typeof engravingFrame>, time: number) => void,
  onComplete: () => void, reduced: boolean) {
  const clock = { time: 0 };
  const page = typeof document === "undefined" ? null : document;
  let disposed = false, completed = false;
  const duration = reduced ? 0.85 : 3.67;
  const draw = () => { if (!disposed) render(engravingFrame(clock.time, reduced), clock.time); };
  const timeline = gsap.timeline({ paused: page?.hidden ?? false, onUpdate: draw, onComplete: () => {
    if (disposed || completed) return;
    completed = true;
    page?.removeEventListener("visibilitychange", visibility);
    onComplete();
  } }).to(clock, { time: duration, duration, ease: "none" });
  const visibility = () => {
    if (!disposed && !completed) timeline.paused(page?.hidden ?? false);
  };
  page?.addEventListener("visibilitychange", visibility);
  draw();
  return { timeline, dispose() {
    disposed = true;
    page?.removeEventListener("visibilitychange", visibility);
    timeline.kill();
  } };
}
