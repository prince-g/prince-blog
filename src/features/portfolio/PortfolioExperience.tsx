import { memo, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useReducedMotion } from "motion/react";
import FlipCard from "../../components/FlipCard";
import { featuredStudies, practiceImages, studies, type Study } from "./content";
import { clamp, galleryFrame, sectionProgress, wrapIndex } from "./motion";
import "./PortfolioExperience.css";

type Scroller = RefObject<HTMLDivElement | null>;
const number = (index: number) => String(index + 1).padStart(2, "0");
const smooth = (p: number) => p * p * (3 - 2 * p);

function Arrow({ direction = "right" }: { direction?: "left" | "right" | "down" }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ transform: `rotate(${direction === "left" ? 180 : direction === "down" ? 90 : 0}deg)` }}><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.4" /></svg>;
}

function useChapter(scroller: Scroller) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState({ progress: 0, visible: false });
  useEffect(() => {
    const container = scroller.current, chapter = ref.current;
    if (!container || !chapter) return;
    let frame = 0, top = 0, height = 1, viewport = 1;
    const update = () => {
      frame = 0;
      const scroll = container.scrollTop;
      const progress = sectionProgress(scroll, top, height, viewport);
      const visible = scroll + viewport > top && scroll < top + height;
      setState(previous => Math.abs(previous.progress - progress) < .0001 && previous.visible === visible ? previous : { progress, visible });
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      top = chapter.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      height = chapter.offsetHeight; viewport = container.clientHeight; queue();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(chapter); observer.observe(container);
    container.addEventListener("scroll", queue, { passive: true });
    measure();
    return () => { observer.disconnect(); container.removeEventListener("scroll", queue); cancelAnimationFrame(frame); };
  }, [scroller]);
  return { ref, ...state };
}

function scrollToChapter(scroller: Scroller, element: HTMLElement | null, progress = 0, reduce = false) {
  const container = scroller.current;
  if (!container || !element) return;
  const top = element.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  container.scrollTo({ top: top + Math.max(0, element.offsetHeight - container.clientHeight) * progress, behavior: reduce ? "instant" : "smooth" });
}

const Artwork = memo(function Artwork({ study, play = false }: { study: Study; play?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className="portfolio-artwork">
    <img src={study.image} alt={study.alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    {failed && <span className="portfolio-image-error">{study.title}<small>图片暂时无法加载</small></span>}
    {play && study.video && <video src={study.video} poster={study.image} autoPlay muted loop playsInline preload="none" aria-hidden="true" onError={event => { event.currentTarget.style.display = "none"; }} />}
  </div>;
});

const StudyCard = memo(function StudyCard({ study, index, onOpen, playing = false }: { study: Study; index: number; onOpen: (index: number) => void; playing?: boolean }) {
  const [flipped, setFlipped] = useState(false);
  return <FlipCard className="portfolio-flip" width={300} height={400} radius={14} background="#ede9df" color="#292b24" shadowOpacity={.17} hoverScale={1.025} tiltMax={7} glareOpacity={.14}
    ariaLabel={`${study.title}，点击或左右拖动翻转卡片`} onFlipChange={setFlipped}
    front={<Artwork study={study} play={playing && !flipped} />}
    back={<div className="portfolio-card-back"><span className="portfolio-meta">{number(index)} / {study.category}</span><h3>{study.title}</h3><p>{study.short}</p><button onClick={() => onOpen(index)}>查看作品 <Arrow /></button><small>点击空白处翻回正面</small></div>} />;
});

function Orbit({ scroller, onOpen, reduce }: { scroller: Scroller; onOpen: (index: number) => void; reduce: boolean }) {
  const { ref, progress, visible } = useChapter(scroller);
  const [selection, setSelection] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [angle, setAngle] = useState(0);
  const angleRef = useRef(0), targetRef = useRef(0);
  const dragging = useRef<{ x: number; angle: number } | null>(null);
  useEffect(() => {
    if (reduce) { setAngle(targetRef.current); return; }
    if (!visible) return;
    let frame = 0, previous = 0;
    const tick = (now: number) => {
      const dt = previous ? Math.min(now - previous, 40) : 16; previous = now;
      if (!paused && !hovered && !dragging.current && progress < .45 && !document.hidden) targetRef.current += dt * .0018;
      angleRef.current += (targetRef.current - angleRef.current) * (1 - Math.exp(-dt / 130));
      setAngle(angleRef.current);
      const current = wrapIndex(Math.round(-angleRef.current / 45), featuredStudies.length);
      setSelection(current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, paused, hovered, progress, reduce]);
  const move = (delta: number) => {
    setPaused(true);
    targetRef.current = Math.round(targetRef.current / 45) * 45 - delta * 45;
    if (reduce) { setAngle(targetRef.current); setSelection(wrapIndex(Math.round(-targetRef.current / 45), featuredStudies.length)); }
  };
  const gather = reduce ? 0 : smooth(clamp((progress - .32) / .62));
  return <section ref={ref} className="portfolio-chapter portfolio-orbit" aria-labelledby="portfolio-title">
    <div className="portfolio-stage">
      <div className="portfolio-heading"><h2 id="portfolio-title">A world in<br /><em>every image.</em></h2><p>在一张图像里，<br />发现另一个世界。</p></div>
      <div className="portfolio-orbit-field" aria-label="精选视觉作品" onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
        onFocusCapture={() => setPaused(true)}
        onPointerDown={event => { if ((event.target as Element).closest(".flip-card") || event.button !== 0 || reduce) return; dragging.current = { x: event.clientX, angle: targetRef.current }; event.currentTarget.setPointerCapture(event.pointerId); setPaused(true); }}
        onPointerMove={event => { if (dragging.current) targetRef.current = dragging.current.angle + (event.clientX - dragging.current.x) * .22; }}
        onPointerUp={() => { dragging.current = null; targetRef.current = Math.round(targetRef.current / 45) * 45; }}
        onPointerCancel={() => { dragging.current = null; }}>
        {featuredStudies.map((study, index) => {
          const radians = (index * 45 + angle) * Math.PI / 180;
          const facing = Math.cos(radians);
          const x = Math.sin(radians) * (1 - gather);
          const z = (facing - 1) * 260 * (1 - gather) - index * 2 * gather;
          const selected = index === selection;
          return <div key={study.id} className="portfolio-orbit-card" inert={!selected || gather > .8} aria-hidden={!selected || gather > .8} style={{
            "--orbit-x": x, "--orbit-y": `${Math.sin(radians * 2) * 24 * (1 - gather) + gather * 42}px`,
            transform: `translate(-50%, -50%) translateX(calc(var(--orbit-radius) * ${x})) translateY(var(--orbit-y)) translateZ(${z}px) rotateY(${-Math.sin(radians) * 30 * (1 - gather)}deg) rotateZ(${(index - 3.5) * 3 * gather}deg)`,
            opacity: .55 + .45 * (facing + 1) / 2,
          } as CSSProperties}>
            <StudyCard study={study} index={index} onOpen={onOpen} playing={visible && selected && hovered && !reduce && progress < .7} />
          </div>;
        })}
      </div>
      <div className="portfolio-orbit-caption"><span className="portfolio-meta">{number(selection)} / {number(featuredStudies.length - 1)} — {featuredStudies[selection].category}</span><h3>{featuredStudies[selection].title}</h3></div>
      <div className="portfolio-orbit-controls"><button aria-label="上一件作品" onClick={() => move(-1)}><Arrow direction="left" /></button><button aria-label="下一件作品" onClick={() => move(1)}><Arrow /></button><button className="portfolio-rotation" aria-label={paused ? "开启自动旋转" : "暂停自动旋转"} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "旋转" : "暂停"}</button></div>
      <p className="portfolio-instruction">点击翻面 · 横向拖拽卡片 · 向下继续 <Arrow direction="down" /></p>
    </div>
  </section>;
}

const practiceCopy = [
  { title: "Image", caption: "A different point of view.", text: "一束光，一道折痕，一种材质。换个角度，熟悉的事物便有了另一种可能。" },
  { title: "Motion", caption: "The image finds its rhythm.", text: "让静止的画面有了节奏。停顿、转动与轻盈的瞬间，让想象开始流动。" },
  { title: "Interaction", caption: "Your presence changes the picture.", text: "不止于观看。移动指针、转动图像，让你的参与成为画面的一部分。" },
];

function Practice({ scroller, reduce }: { scroller: Scroller; reduce: boolean }) {
  const { ref, progress } = useChapter(scroller);
  const [manualStep, setManualStep] = useState(0), [turn, setTurn] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const step = reduce ? manualStep : Math.min(2, Math.floor(progress * 3));
  const spread = reduce ? step / 2 : smooth(clamp(progress * 1.15));
  const count = step === 0 ? 3 : step === 1 ? 5 : 11;
  return <section ref={ref} className="portfolio-chapter portfolio-practice" aria-label="图像、动态与交互">
    <div className="portfolio-stage">
      <div className="portfolio-practice-copy"><h2>{practiceCopy[step].title}<span>.</span></h2><h3>{practiceCopy[step].caption}</h3><p>{practiceCopy[step].text}</p>{step === 2 && <button className="portfolio-text-button" onClick={() => setTurn(value => value + 180)}>转动图像 <Arrow /></button>}</div>
      <div className="portfolio-practice-art" aria-hidden="true" onPointerMove={event => { if (step !== 2 || reduce || event.pointerType === "touch") return; const r = event.currentTarget.getBoundingClientRect(); setPointer({ x: (event.clientX - r.left) / r.width - .5, y: (event.clientY - r.top) / r.height - .5 }); }} onPointerLeave={() => setPointer({ x: 0, y: 0 })}>
        <div className="portfolio-practice-fan" style={{ transform: `rotateY(${turn + pointer.x * 15}deg) rotateX(${-pointer.y * 12}deg)` }}>
          {Array.from({ length: 11 }, (_, index) => {
            const distance = index - 5, shown = Math.abs(distance) <= (count - 1) / 2;
            return <img key={index} src={practiceImages[wrapIndex(index, practiceImages.length)]} alt="" loading="lazy" decoding="async" style={{ opacity: shown ? 1 : 0, transform: `translate(-50%, -50%) translateX(calc(var(--fan-step) * ${distance * (.4 + spread)})) translateY(${Math.abs(distance) * (9 + spread * 9)}px) translateZ(${-Math.abs(distance) * 34}px) rotateZ(${distance * (4 + spread * 4)}deg)` }} />;
          })}
        </div>
      </div>
      <div className="portfolio-practice-tabs" aria-label="选择创作方式">{practiceCopy.map((item, index) => <button key={item.title} aria-pressed={step === index} onClick={() => { setManualStep(index); if (!reduce) scrollToChapter(scroller, ref.current, (index + .2) / 3, reduce); }}><span>{number(index)}</span>{item.title}</button>)}</div>
      <span className="portfolio-practice-foot">One material. Endless possibilities.</span>
    </div>
  </section>;
}

function Gallery({ scroller, onOpen, reduce }: { scroller: Scroller; onOpen: (index: number) => void; reduce: boolean }) {
  const { ref, progress } = useChapter(scroller);
  const travel = clamp((progress - .04) / .84);
  const current = Math.min(studies.length - 1, Math.round(travel * (studies.length - 1)));
  const ending = smooth(clamp((progress - .91) / .08));
  return <section ref={ref} className={`portfolio-chapter portfolio-gallery${reduce ? " is-static" : ""}`} aria-labelledby="portfolio-gallery-title">
    <div className="portfolio-stage">
      <div className="portfolio-gallery-heading" style={{ opacity: reduce ? 1 : 1 - clamp(progress / .13) }}><h2 id="portfolio-gallery-title">Follow your<br /><em>curiosity.</em></h2><p>沿着好奇心，再走远一点。</p></div>
      <div className="portfolio-tunnel" aria-label="作品探索">{studies.map((study, index) => {
        const pose = galleryFrame(index, travel, studies.length), side = index % 2 ? 1 : -1;
        return <div key={study.id} className="portfolio-tunnel-card" aria-hidden={!reduce && (!pose.interactive || ending > .5)} inert={!reduce && (!pose.interactive || ending > .5)} style={reduce ? undefined : {
          opacity: pose.opacity * (1 - ending), visibility: pose.opacity > .01 ? "visible" : "hidden",
          transform: `translate(-50%, -50%) translateX(calc(var(--tunnel-lane) * ${side})) translateY(${index % 3 * 25 - 25}px) translateZ(${Math.min(600, pose.z)}px) rotateY(${-side * 10}deg) rotateZ(${side * 2}deg)`,
        }}><StudyCard study={study} index={index} onOpen={onOpen} /></div>;
      })}</div>
      {!reduce && <div className="portfolio-gallery-rail" inert={ending > .5} aria-hidden={ending > .5} style={{ opacity: 1 - ending }}><div><span className="portfolio-meta">{number(current)} / {studies.length} — {studies[current].category}</span><button onClick={() => onOpen(current)}>{studies[current].title}<Arrow /></button></div><div className="portfolio-gallery-controls"><button aria-label="上一件展览作品" onClick={() => scrollToChapter(scroller, ref.current, .04 + Math.max(0, current - 1) / (studies.length - 1) * .84, reduce)}><Arrow direction="left" /></button><button aria-label="下一件展览作品" onClick={() => scrollToChapter(scroller, ref.current, .04 + Math.min(studies.length - 1, current + 1) / (studies.length - 1) * .84, reduce)}><Arrow /></button></div></div>}
      <div className="portfolio-finale" inert={!reduce && ending < .9} style={{ opacity: reduce ? 1 : ending, transform: `translateY(${reduce ? 0 : (1 - ending) * 40}px)` }}><h2>Keep making.<br /><em>Stay curious.</em></h2><p>图像之外，想法继续生长。</p><button className="portfolio-text-button" onClick={() => scrollToChapter(scroller, document.getElementById("personal-index"), 0, reduce)}>继续探索 <Arrow direction="down" /></button></div>
    </div>
  </section>;
}

function StudyDialog({ index, onChange, onClose, scroller }: { index: number; onChange: (index: number) => void; onClose: () => void; scroller: Scroller }) {
  const ref = useRef<HTMLDialogElement>(null);
  const study = studies[index];
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const container = scroller.current;
    const previousOverflow = container?.style.overflow ?? "";
    if (container) container.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      if (container) container.style.overflow = previousOverflow;
      previous?.focus({ preventScroll: true });
    };
  }, [scroller]);
  return <dialog className="portfolio-dialog" ref={ref} aria-labelledby="portfolio-detail-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose(); } }}>
    <button className="portfolio-dialog-close" aria-label="关闭作品详情" onClick={onClose}><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></button>
    <div className="portfolio-dialog-media">{study.video ? <video key={study.id} src={study.video} poster={study.image} controls muted playsInline preload="none" /> : <img src={study.image} alt={study.alt} />}</div>
    <div className="portfolio-dialog-copy"><span className="portfolio-meta">{number(index)} / {study.category}</span><h2 id="portfolio-detail-title">{study.title}</h2><p className="portfolio-detail-lead">{study.short}</p><p>{study.description}</p><small>{study.detail}</small><div className="portfolio-dialog-nav"><button onClick={() => onChange(wrapIndex(index - 1, studies.length))} aria-label="上一件详情"><Arrow direction="left" /></button><span>继续发现</span><button onClick={() => onChange(wrapIndex(index + 1, studies.length))} aria-label="下一件详情"><Arrow /></button></div><p className="portfolio-reference-note">参考 HTML 中的视觉习作 · 展示素材</p></div>
  </dialog>;
}

export default function PortfolioExperience({ scroller }: { scroller: Scroller }) {
  const reduce = !!useReducedMotion();
  const [opened, setOpened] = useState<number | null>(null);
  return <div className="portfolio-experience" data-reduced-motion={reduce || undefined}>
    <Orbit scroller={scroller} onOpen={setOpened} reduce={reduce} />
    <Practice scroller={scroller} reduce={reduce} />
    <Gallery scroller={scroller} onOpen={setOpened} reduce={reduce} />
    <p className="portfolio-source-note">Visual studies from the supplied reference · 图像与动态展示</p>
    {opened !== null && <StudyDialog index={opened} onChange={setOpened} onClose={() => setOpened(null)} scroller={scroller} />}
  </div>;
}
