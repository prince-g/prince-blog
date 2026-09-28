import type { ExperiencePhase, SceneMotion } from "../animation/experience";
import type { TypingPanelProjectionProps } from "./TypingPanelProjection";
import type { RefObject } from "react";

export type SceneExperience = Readonly<{
  phase: ExperiencePhase;
  motion: SceneMotion;
  textPanel: Omit<TypingPanelProjectionProps, "visible">;
  onAssembled: () => void;
  onSwitch: () => void;
  onReturned: () => void;
  autoRotate: boolean;
  backdrop: RefObject<HTMLDivElement | null>;
}>;
