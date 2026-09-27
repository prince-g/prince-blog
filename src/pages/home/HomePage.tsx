import { SiteHeader } from "../../components/layout/SiteHeader";
import { KeyboardHero } from "../../features/keyboard/scene/KeyboardHero";
import { useCallback, useState } from "react";
import { PersonalHome } from "../../features/portrait/PersonalHome";
import { TouchPortal } from "../../features/portrait/TouchPortal";
import "./HomePage.css";

type PlaceholderPageProps = Readonly<{ title: string }>;

export function HomePage() {
  const [stage, setStage] = useState<"keyboard" | "revealing" | "personal">("keyboard");
  const [visit, setVisit] = useState(0);
  const continueHome = useCallback(() => setStage((current) => current === "keyboard" ? "revealing" : current), []);
  const revealed = useCallback(() => setStage("personal"), []);
  const replay = useCallback(() => { setStage("keyboard"); setVisit((current) => current + 1); }, []);
  return <main className="home-shell" id="main-content" tabIndex={-1} data-home-stage={stage}>
    <a className="skip-link" href="#main-content">跳至主要内容</a>
    {stage !== "personal" && <div className="home-keyboard" inert={stage === "revealing"} aria-hidden={stage === "revealing"}>
      <h1 className="sr-only">Keychron K2 HE 交互体验</h1>
      <KeyboardHero onContinue={continueHome} interactionDisabled={stage === "revealing"} />
    </div>}
    <TouchPortal key={visit} revealing={stage === "revealing"} complete={stage === "personal"} onComplete={revealed}>
      <PersonalHome active={stage === "personal"} onReplay={replay} />
    </TouchPortal>
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
