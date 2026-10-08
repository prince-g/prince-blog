import { gsap } from "gsap";

export const CIRCLE_CENTERS = [[0.08, 0.18], [0.94, 0.08], [0.74, 0.94], [0.43, 0.72], [0.14, 0.98]] as const;

export function createCircularFrame() {
  return { circles: CIRCLE_CENTERS.map(() => ({ scale: 0 })), reveal: 0, opacity: 1 };
}

export function circularTimeline(frame: ReturnType<typeof createCircularFrame>, draw: () => void,
  onCovered: () => void, onComplete: () => void, reduced: boolean) {
  let covered = false, complete = false;
  const handoff = () => { if (!covered) { covered = true; onCovered(); } };
  const timeline = gsap.timeline({ onUpdate: draw, onComplete: () => {
    if (!complete) { complete = true; onComplete(); }
  } });
  if (reduced) {
    frame.circles.forEach((circle) => { circle.scale = 1; });
    frame.opacity = 0;
    draw();
    return timeline.to(frame, { opacity: 1, duration: 0.1 }).call(handoff)
      .to(frame, { opacity: 0, duration: 0.14 });
  }
  return timeline.to(frame.circles, { scale: 1, duration: 0.72, stagger: 0.065, ease: "power3.inOut" })
    .call(handoff)
    .to(frame, { reveal: 1, duration: 0.82, ease: "power3.inOut" }, "+=0.12");
}
