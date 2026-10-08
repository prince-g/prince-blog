import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { createEngravingPlayback, engravingFrame } from "./engraving-animation";
import "./EngravingTransition.css";

gsap.registerPlugin(useGSAP);

type GlyphLine = { x: number; y: number; width: number; height: number; size: number;
  hot: HTMLCanvasElement; glow: HTMLCanvasElement; pad: number; revealOffset: number };
type Frame = ReturnType<typeof engravingFrame>;
const BLUE = "47,155,255", HOT = "232,244,255";

// Adapted from the supplied k1-chip.html entrance-glyphs.js / power-off.js.
// Each line owns its mask, so a descender can never reveal the next line early.
function glyphLine(element: HTMLElement, origin: DOMRect, density: number): GlyphLine | null {
  const css = getComputedStyle(element), size = parseFloat(css.fontSize);
  const range = document.createRange(); range.selectNodeContents(element);
  const rect = range.getBoundingClientRect(), pad = size * 0.45;
  const sheets = [document.createElement("canvas"), document.createElement("canvas")];
  for (let index = 0; index < sheets.length; index++) {
    const sheet = sheets[index];
    sheet.width = Math.ceil((rect.width + pad * 2) * density);
    sheet.height = Math.ceil((rect.height + pad * 2) * density);
    const context = sheet.getContext("2d");
    if (!context) return null;
    context.setTransform(density, 0, 0, density, 0, 0);
    context.font = `${css.fontWeight} ${size}px ${css.fontFamily}`;
    context.letterSpacing = css.letterSpacing;
    context.textBaseline = "alphabetic";
    const text = element.textContent || "", metrics = context.measureText(text);
    const ascent = metrics.fontBoundingBoxAscent || size * 0.8;
    const descent = metrics.fontBoundingBoxDescent || size * 0.2;
    context.translate(pad, pad + ascent + (rect.height - ascent - descent) / 2);
    context.scale(rect.width / Math.max(1, metrics.width), 1);
    if (index === 0) { context.fillStyle = `rgb(${HOT})`; context.fillText(text, 0, 0); }
    else {
      context.filter = `blur(${Math.max(2, size * 0.028)}px)`;
      context.strokeStyle = `rgb(${BLUE})`; context.lineWidth = Math.max(2.5, size * 0.03);
      context.strokeText(text, 0, 0);
    }
  }
  return { x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width,
    height: rect.height, size, hot: sheets[0], glow: sheets[1], pad,
    revealOffset: rect.left - element.getBoundingClientRect().left };
}

function drawLaser(context: CanvasRenderingContext2D, lines: GlyphLine[], frame: Frame, time: number, density: number) {
  const [first, second] = lines;
  const hop = frame.hop * frame.hop * (3 - 2 * frame.hop);
  const x = frame.first < 1 ? first.x + first.width * frame.first
    : frame.hop < 1 ? first.x + first.width + (second.x - first.x - first.width) * hop
      : second.x + second.width * frame.second;
  const y1 = first.y + first.height * 0.52, y2 = second.y + second.height * 0.52;
  const y = frame.first < 1 ? y1 : y1 + (y2 - y1) * hop;
  const power = frame.beam, scale = Math.min(1, first.size / 90);
  context.globalCompositeOperation = "lighter";
  const beam = context.createLinearGradient(x + 26, 0, x, y);
  beam.addColorStop(0, `rgba(${BLUE},0)`); beam.addColorStop(0.5, `rgba(${BLUE},${power * 0.45})`);
  beam.addColorStop(1, `rgba(${HOT},${power})`);
  context.strokeStyle = beam; context.lineWidth = 1.5; context.shadowColor = `rgb(${BLUE})`; context.shadowBlur = 13;
  context.beginPath(); context.moveTo(x + 26, 0); context.lineTo(x, y); context.stroke(); context.shadowBlur = 0;

  const glow = context.createRadialGradient(x, y, 0, x, y, 35 * scale);
  glow.addColorStop(0, `rgba(${HOT},${power})`); glow.addColorStop(0.14, `rgba(${HOT},${power * 0.8})`);
  glow.addColorStop(0.4, `rgba(${BLUE},${power * 0.35})`); glow.addColorStop(1, `rgba(${BLUE},0)`);
  context.fillStyle = glow; context.fillRect(x - 35, y - 35, 70, 70);

  const line = frame.first < 1 ? first : frame.hop >= 1 && frame.second < 1 ? second : null;
  if (line && power > 0) {
    context.save(); context.beginPath(); context.rect(x - Math.max(16, line.size * 0.3), line.y - line.pad, Math.max(16, line.size * 0.3) + 2, line.height + line.pad * 2); context.clip();
    context.globalAlpha = power;
    for (const sheet of [line.glow, line.hot]) context.drawImage(sheet, line.x - line.pad, line.y - line.pad, sheet.width / density, sheet.height / density);
    context.restore();
  }
  context.lineWidth = 1;
  for (let index = 0; index < 22; index++) {
    const random = (offset: number) => { const value = Math.sin((index + 1) * 127.1 + offset * 311.7) * 43758.5453; return value - Math.floor(value); };
    const age = (time * 2.8 + random(1)) % 1, angle = Math.PI + (random(2) - 0.5) * 2.2;
    const speed = (40 + random(3) * 90) * scale;
    const px = x + Math.cos(angle) * speed * age, py = y + Math.sin(angle) * speed * age + age * age * 35 * scale;
    context.strokeStyle = `rgba(${HOT},${(1 - age) ** 2 * power * 0.9})`;
    context.beginPath(); context.moveTo(px - Math.cos(angle) * speed * 0.07, py - Math.sin(angle) * speed * 0.07); context.lineTo(px, py); context.stroke();
  }
  context.globalCompositeOperation = "source-over";
}

export function EngravingTransition({ onComplete }: { onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const completion = useRef(onComplete); completion.current = onComplete;
  useGSAP((_context, contextSafe) => {
    const element = root.current, surface = canvas.current;
    if (!element || !surface || !contextSafe) return;
    const spans = [...element.querySelectorAll<HTMLElement>(".engraving-line")];
    let disposed = false, fontTimer: ReturnType<typeof setTimeout> | undefined;
    let playback: ReturnType<typeof createEngravingPlayback> | undefined;
    let resize = () => {};
    const launch = contextSafe((fontReady: boolean) => {
      if (disposed) return;
      element.style.setProperty("--engraving-font", fontReady ? '"Entrance Michroma", sans-serif' : "sans-serif");
      let context: CanvasRenderingContext2D | null = null;
      try { context = surface.getContext("2d"); } catch { /* A static title still completes entry. */ }
      let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || !context;
      let density = 1, lines: GlyphLine[] = [], current = engravingFrame(0, reduced), time = 0;
      const draw = (frame = current, nextTime = time) => {
        current = frame; time = nextTime;
        element.style.opacity = String(frame.opacity);
        spans.forEach((span, index) => {
          const progress = reduced ? 1 : index === 0 ? frame.first : frame.second;
          const line = lines[index];
          const edge = line ? line.revealOffset + progress * line.width : 0;
          span.style.webkitMaskImage = span.style.maskImage = progress >= 1 ? "none"
            : progress <= 0 ? "linear-gradient(transparent,transparent)"
              : `linear-gradient(90deg,#000 ${edge}px,transparent ${edge + 0.75}px)`;
          span.style.opacity = String(frame.textOpacity);
        });
        if (!context) return;
        context.clearRect(0, 0, surface.width / density, surface.height / density);
        if (!reduced && lines.length === 2 && frame.beam > 0) drawLaser(context, lines, frame, time, density);
      };
      resize = () => {
        if (disposed) return;
        density = Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 2);
        const bounds = element.getBoundingClientRect();
        surface.width = Math.ceil(bounds.width * density); surface.height = Math.ceil(bounds.height * density);
        context?.setTransform(density, 0, 0, density, 0, 0);
        if (!reduced) {
          try {
            lines = spans.map((span) => glyphLine(span, bounds, density)).filter((line): line is GlyphLine => line !== null);
            if (lines.length !== 2) reduced = true;
          } catch { reduced = true; }
        }
        element.dataset.renderMode = reduced ? "static" : "laser";
        draw();
      };
      resize();
      window.addEventListener("resize", resize);
      playback = createEngravingPlayback(draw, () => completion.current(), reduced);
    });
    // A failed or stalled font must never trap navigation. Freeze the fallback
    // family after this deadline, so a late font swap cannot move the laser mask.
    const fonts = document.fonts?.load('400 48px "Entrance Michroma"');
    if (fonts) {
      let started = false;
      const start = (ready: boolean) => { if (started || disposed) return; started = true; clearTimeout(fontTimer); launch(ready); };
      fontTimer = setTimeout(() => start(false), 650);
      fonts.then((loaded) => start(loaded.length > 0), () => start(false));
    } else launch(false);
    return () => { disposed = true; clearTimeout(fontTimer); playback?.dispose(); window.removeEventListener("resize", resize); };
  }, { scope: root });

  return <div ref={root} className="engraving-transition" role="status" aria-label="正在进入博客">
    <h2 className="engraving-title" aria-label="into the blog">
      <span className="engraving-line" aria-hidden="true">into the</span>
      <span className="engraving-line" aria-hidden="true">blog</span>
    </h2>
    <canvas ref={canvas} className="engraving-laser" aria-hidden="true" />
  </div>;
}
