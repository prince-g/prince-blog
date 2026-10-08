import type { ExperiencePhase, SceneMotion } from "../animation/experience";
import type { TypingPanelProjectionProps } from "./TypingPanelProjection";
import type { RefObject } from "react";
import type { KeyboardAppearance } from "../model/keycap-appearance";
import type { KeyboardTextInputHandler } from "../interaction/physical-keyboard";

export type SceneExperience = Readonly<{
  phase: ExperiencePhase;
  motion: SceneMotion;
  textPanel: Omit<TypingPanelProjectionProps, "visible">;
  onAssembled: () => void;
  onSwitch: () => void;
  onReturned: () => void;
  autoRotate: boolean;
  backdrop: RefObject<HTMLDivElement | null>;
  appearance?: KeyboardAppearance;
  onTextInput?: KeyboardTextInputHandler;
  interactionDisabled?: boolean;
}>;
