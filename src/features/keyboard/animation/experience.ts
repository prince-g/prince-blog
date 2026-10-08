import { gsap } from "gsap";

export type ExperiencePhase = "loading" | "assembling" | "ready" | "exiting" | "switch" | "returning" | "leaving";

/** Mutable animation values shared by the scene; React only owns phase boundaries. */
export type SceneMotion = {
  assembly: number;
  reveal: number;
  capExit: number;
  switchExit: number;
  focus: number;
  boardExit: number;
  switchOpen: number;
};

export function createSceneMotion(): SceneMotion {
  return { assembly: 1, reveal: 0, capExit: 0, switchExit: 0, focus: 0, boardExit: 0, switchOpen: 0 };
}

export function canEnterSwitch(phase: ExperiencePhase, text: string, source: "button" | "keyboard") {
  return phase === "ready" && (source === "button" || text.trim().length > 0);
}

export function assemblyTimeline(motion: SceneMotion, onComplete: () => void, reducedMotion: boolean) {
  const timeline = gsap.timeline({ defaults: { ease: "power2.inOut" }, onComplete });
  if (reducedMotion) return timeline.to(motion, { assembly: 0, reveal: 1, duration: 0.15 });
  return timeline
    .to(motion, { reveal: 1, duration: 0.8 }, 0.3)
    .to(motion, { assembly: 0, duration: 2.8, ease: "power3.inOut" }, 1.1);
}

export function exitTimeline(motion: SceneMotion, onComplete: () => void, reducedMotion: boolean) {
  const timeline = gsap.timeline({ defaults: { ease: "power2.inOut" }, onComplete });
  if (reducedMotion) return timeline.to(motion, { capExit: 1, switchExit: 1, focus: 1, boardExit: 1, duration: 0.15 });
  return timeline
    .to(motion, { capExit: 1, duration: 0.85, ease: "power1.in" }, 0)
    .to(motion, { switchExit: 1, duration: 2.0, ease: "none" }, 0.6)
    .to(motion, { focus: 1, duration: 2.2 }, 2.4)
    .to(motion, { boardExit: 1, duration: 1.6 }, 2.9);
}

/** Return only the caps and switches; the lower assembly never unfolds again. */
export function returnTimeline(motion: SceneMotion, onComplete: () => void, reducedMotion: boolean) {
  const timeline = gsap.timeline({ defaults: { ease: "power2.inOut" }, onComplete });
  if (reducedMotion) return timeline.to(motion, { capExit: 0, switchExit: 0, focus: 0, boardExit: 0, duration: 0.15 });
  return timeline
    .to(motion, { boardExit: 0, duration: 1.3 }, 0)
    .to(motion, { focus: 0, duration: 1.75 }, 0)
    .to(motion, { switchExit: 0, duration: 1.7, ease: "none" }, 0.7)
    .to(motion, { capExit: 0, duration: 1.15, ease: "power1.out" }, 2.35);
}
