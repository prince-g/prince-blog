import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { KeyboardHero } from "../../features/keyboard/scene/KeyboardHero";
import "./HomePage.css";

gsap.registerPlugin(useGSAP);

type PlaceholderPageProps = Readonly<{ title: string }>;

export function HomePage() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();

    media.add({ reducedMotion: "(prefers-reduced-motion: reduce)" }, (context) => {
      const { reducedMotion } = context.conditions as { reducedMotion: boolean };
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (reducedMotion) {
        timeline
          .to("[data-site-header]", { autoAlpha: 1, duration: 0.01 }, 0)
          .to("[data-home-title]", { autoAlpha: 1, duration: 0.01 }, "<")
          .to("[data-key-prompt]", { autoAlpha: 1, duration: 0.01 }, "<");
      } else {
        timeline
          .fromTo("[data-site-header]", { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.44 }, 0)
          .fromTo("[data-home-title]", { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.7 }, "<0.12")
          .fromTo("[data-key-prompt]", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.36 }, "<0.34");
      }
    });

    return () => media.revert();
  }, { scope: root });

  return (
    <main className="home-shell" id="main-content" ref={root} tabIndex={-1}>
      <a className="skip-link" href="#main-content">跳至主要内容</a>
      <SiteHeader />
      <h1 className="home-title" data-home-title>Ideas become interfaces.</h1>
      <div className="home-keyboard">
        <KeyboardHero />
      </div>
      <p className="key-prompt" data-key-prompt>PRESS ANY KEY</p>
    </main>
  );
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <main className="placeholder-shell" id="main-content" tabIndex={-1}>
      <a className="skip-link" href="#main-content">跳至主要内容</a>
      <SiteHeader />
      <section className="placeholder-content">
        <h1>{title}</h1>
        <p>内容正在整理</p>
        <a className="return-home" href="/">返回首页</a>
      </section>
    </main>
  );
}
