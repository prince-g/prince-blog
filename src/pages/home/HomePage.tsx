import { SiteHeader } from "../../components/layout/SiteHeader";
import { KeyboardHero } from "../../features/keyboard/scene/KeyboardHero";
import { useCallback, useEffect, useState } from "react";
import { PersonalHome } from "../../features/portrait/PersonalHome";
import { CircularTransition } from "../../features/entrance/CircularTransition";
import { hasEnteredPersonalHome, rememberPersonalHome } from "./entrance-session";
import "./HomePage.css";

type PlaceholderPageProps = Readonly<{ title: string }>;

export function HomePage() {
  const [stage, setStage] = useState<"keyboard" | "covering" | "revealing" | "personal">(() => hasEnteredPersonalHome() ? "personal" : "keyboard");
  const continueHome = useCallback(() => setStage((current) => current === "keyboard" ? "covering" : current), []);
  const covered = useCallback(() => setStage((current) => current === "covering" ? "revealing" : current), []);
  const revealed = useCallback(() => { rememberPersonalHome(); setStage("personal"); }, []);
  useEffect(() => {
    // BFCache can restore an old document without mounting React again.
    const restore = () => { if (hasEnteredPersonalHome()) setStage("personal"); };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  return <main className="home-shell" id="main-content" tabIndex={-1} data-home-stage={stage}>
    <a className="skip-link" href="#main-content">跳至主要内容</a>
    {(stage === "keyboard" || stage === "covering") && <div className="home-keyboard">
      <h1 className="sr-only">Keychron K2 HE 交互体验</h1>
      <KeyboardHero onContinue={continueHome} interactionDisabled={stage !== "keyboard"} />
    </div>}
    <div className={`touch-portal${stage === "revealing" || stage === "personal" ? " is-open" : ""}`} inert={stage !== "personal"} aria-hidden={stage !== "personal"}>
      <PersonalHome active={stage === "personal"} />
    </div>
    {(stage === "covering" || stage === "revealing") && <CircularTransition onCovered={covered} onComplete={revealed} />}
  </main>;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return <main className="placeholder-shell" id="main-content" tabIndex={-1}>
    <a className="skip-link" href="#main-content">跳至主要内容</a>
    <SiteHeader />
    <section className="placeholder-content">
      <h1>{title}</h1><p>内容正在整理</p>
      <a className="return-home" href="/">返回首页</a>
    </section>
  </main>;
}
