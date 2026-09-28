import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { PortraitVideo } from "./PortraitVideo";
import "./PersonalHome.css";

const PortfolioExperience = lazy(() => import("../portfolio/PortfolioExperience"));

function Arrow({ down = false }: { down?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={down ? { transform: "rotate(90deg)" } : undefined}><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" /></svg>;
}

export function PersonalHome({ active, onReplay }: { active: boolean; onReplay: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const content = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const resting = useRef(false);
  const pendingScroll = useRef(false);
  const exitHero = useCallback(() => {
    if (resting.current) {
      content.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      return;
    }
    pendingScroll.current = true;
    setLeaving(true);
  }, []);
  const onRest = useCallback(() => {
    resting.current = true;
    if (pendingScroll.current) {
      pendingScroll.current = false;
      content.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }
  }, []);
  const toTop = () => { scroller.current?.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); setMenuOpen(false); };

  useEffect(() => {
    if (!active) return;
    title.current?.focus({ preventScroll: true });
    const container = scroller.current!;
    let touchY = 0;
    let scrolledAway = false;
    const wheel = (event: WheelEvent) => {
      if (container.scrollTop < 16 && event.deltaY > 4 && !resting.current) {
        event.preventDefault(); exitHero();
      } else if (pendingScroll.current) event.preventDefault();
    };
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("a,button,input,textarea,select")) return;
      if (["ArrowDown", "PageDown", " "].includes(event.key) && container.scrollTop < 16 && !resting.current) {
        event.preventDefault(); exitHero();
      }
    };
    const start = (event: TouchEvent) => { touchY = event.touches[0].clientY; };
    const move = (event: TouchEvent) => {
      if (container.scrollTop < 16 && touchY - event.touches[0].clientY > 12 && !resting.current) {
        event.preventDefault(); exitHero();
      }
    };
    const scroll = () => {
      if (container.scrollTop > 16) { scrolledAway = true; setLeaving(true); }
      else if (container.scrollTop <= 1 && scrolledAway && !pendingScroll.current) {
        scrolledAway = false; resting.current = false; setLeaving(false);
      }
    };
    container.addEventListener("wheel", wheel, { passive: false });
    container.addEventListener("touchstart", start, { passive: true });
    container.addEventListener("touchmove", move, { passive: false });
    container.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("keydown", key);
    return () => {
      container.removeEventListener("wheel", wheel); container.removeEventListener("touchstart", start);
      container.removeEventListener("touchmove", move); container.removeEventListener("scroll", scroll);
      window.removeEventListener("keydown", key);
    };
  }, [active, exitHero]);

  return <div className="personal-home" ref={scroller} data-portrait-active={active}>
    <section className="personal-hero" ref={hero} aria-label="Prince 个人首页" data-gaze-state={leaving ? "rest" : "active"}>
      <div className="personal-wordmark" aria-hidden="true">PRINCE.</div>
      <PortraitVideo active={active} leaving={leaving} onRest={onRest} />
      <header className="personal-header">
        <a className="personal-brand" href="#portrait-home" onClick={(event) => { event.preventDefault(); toTop(); }}>Prince<span> Blog</span><i>.</i></a>
        <nav className={`personal-nav${menuOpen ? " is-expanded" : ""}`} aria-label="个人主页导航">
          <a href="#portrait-home" aria-current="page" onClick={(event) => { event.preventDefault(); toTop(); }}>Home</a>
          <a href="/work">Work</a><a href="/notes">Notes</a><a href="/about">About</a>
        </nav>
        <button className="personal-menu" aria-label={menuOpen ? "关闭导航" : "打开导航"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path d={menuOpen ? "m5 5 10 10M15 5 5 15" : "M3 7h14M3 13h14"} stroke="currentColor" strokeWidth="1.5" /></svg><span>MENU</span>
        </button>
        {menuOpen && <div className="personal-menu-panel">
          <button onClick={toTop}>回到首屏</button>
          <button onClick={() => { setMenuOpen(false); exitHero(); }}>浏览栏目</button>
          <button onClick={onReplay}>重新体验键盘</button>
        </div>}
      </header>
      <div className="personal-copy" id="portrait-home">
        <h1 ref={title} tabIndex={-1}>A little code.<br />A lot of<br /><em>curiosity.</em></h1>
        <p>你好，我是 Prince。<br />在这里，记录想法，也把想法变成作品。</p>
        <div className="personal-actions">
          <button onClick={exitHero} className="personal-primary">探索我的世界 <span><Arrow /></span></button>
          <a href="/about" className="personal-secondary">关于我 <Arrow /></a>
        </div>
      </div>
      <div className="personal-footer"><span>CODE MORE. BE CURIOUS.</span><button onClick={exitHero}>向下探索 <Arrow down /></button></div>
    </section>
    <section ref={content} aria-label="视觉作品与交互探索">
      {active && <Suspense fallback={<div style={{ minHeight: "100svh", background: "#efebe3" }} />}><PortfolioExperience scroller={scroller} /></Suspense>}
    </section>
    <section className="personal-index" id="personal-index" aria-labelledby="personal-index-title">
      <div className="personal-index-heading"><h2 id="personal-index-title">想法，<br /><em>继续生长。</em></h2><p>作品、记录，以及屏幕之外的我。</p></div>
      <div className="personal-index-links">
        <a href="/work"><span>Work<small>作品与实验</small></span><Arrow /></a>
        <a href="/notes"><span>Notes<small>开发与日常记录</small></span><Arrow /></a>
        <a href="/about"><span>About<small>关于 Prince</small></span><Arrow /></a>
      </div>
      <footer><span>PRINCE BLOG</span><button onClick={onReplay}>重新体验键盘 <Arrow /></button></footer>
    </section>
  </div>;
}
