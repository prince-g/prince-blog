import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

gsap.registerPlugin(useGSAP);

/** A slightly uneven, vertically opening tear. Final radius covers every corner. */
export function portalContour(progress: number, width: number, height: number) {
  const radius = Math.hypot(width, height) * Math.max(0, Math.min(1, progress));
  return Array.from({ length: 100 }, (_, index) => {
    const angle = index / 100 * Math.PI * 2;
    const wave = 1 + Math.sin(angle * 7 + progress * 6) * 0.035 + Math.cos(angle * 13 - progress * 4) * 0.025;
    return { x: width / 2 + Math.cos(angle) * radius * 0.82 * wave,
      y: height / 2 + Math.sin(angle) * radius * 1.12 * wave };
  });
}

export function TouchPortal({ revealing, complete, onComplete, children }: {
  revealing: boolean; complete: boolean; onComplete: () => void; children: ReactNode;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const sparks = useRef<HTMLCanvasElement>(null);
  useGSAP(() => {
    if (!revealing || !layer.current || !sparks.current) return;
    const element = layer.current;
    const canvas = sparks.current;
    const context = canvas.getContext("2d");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = innerWidth, height = innerHeight;
    const resize = () => {
      width = innerWidth; height = innerHeight;
      const density = Math.min(devicePixelRatio, 1.5);
      canvas.width = width * density; canvas.height = height * density;
      context?.setTransform(density, 0, 0, density, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const motion = { open: 0, glow: 0 };
    const draw = () => {
      if (reduced) { element.style.opacity = String(motion.open); return; }
      const points = portalContour(motion.open, width, height);
      element.style.clipPath = `polygon(${points.map(({ x, y }) => `${x}px ${y}px`).join(",")})`;
      if (!context) return;
      context.clearRect(0, 0, width, height);
      const fade = Math.min(1, (1 - motion.open) * 5);
      context.strokeStyle = `rgba(255,253,240,${fade * 0.85})`;
      context.lineWidth = 1.2;
      context.shadowColor = "#fff8dc"; context.shadowBlur = 12;
      for (let strand = 0; strand < 4; strand++) {
        context.beginPath();
        points.forEach(({ x, y }, index) => {
          const wobble = Math.sin(index * 1.3 + strand * 3 + motion.open * 30) * (3 + strand * 2);
          const px = x + wobble, py = y + Math.cos(index + strand) * wobble;
          if (index === 0) context.moveTo(px, py); else context.lineTo(px, py);
        });
        context.closePath(); context.stroke();
      }
      context.shadowBlur = 4;
      for (let index = 0; index < 380; index++) {
        const point = points[index % points.length];
        const seed = Math.sin(index * 127.1) * 43758.5453;
        const random = seed - Math.floor(seed);
        const scatter = (random - 0.4) * (18 + motion.open * 90);
        const angle = index / points.length * Math.PI * 2;
        context.fillStyle = `rgba(255,255,247,${fade * random})`;
        context.fillRect(point.x + Math.cos(angle) * scatter, point.y + Math.sin(angle) * scatter, 0.5 + random * 2, 0.5 + random * 2);
      }
      const glow = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, 90);
      glow.addColorStop(0, `rgba(255,255,255,${motion.glow})`);
      glow.addColorStop(0.12, `rgba(255,253,237,${motion.glow * 0.8})`);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = glow; context.fillRect(width / 2 - 90, height / 2 - 90, 180, 180);
    };
    element.style.visibility = "visible";
    element.style.opacity = reduced ? "0" : "1";
    if (reduced) element.style.clipPath = "none";
    draw();
    const timeline = gsap.timeline({ onUpdate: draw, onComplete });
    if (reduced) timeline.to(motion, { open: 1, duration: 0.2 });
    else timeline.to(motion, { glow: 1, duration: 0.25, ease: "power2.in" })
      .to(motion, { open: 1, duration: 1.45, ease: "power2.inOut" }, 0.2)
      .to(motion, { glow: 0, duration: 0.45 }, 0.32);
    return () => { window.removeEventListener("resize", resize); };
  }, { dependencies: [revealing, onComplete], scope: layer, revertOnUpdate: true });

  return <>
    <div ref={layer} className={`touch-portal${complete ? " is-open" : ""}`} inert={!complete} aria-hidden={!complete}>
      {children}
    </div>
    {revealing && <canvas ref={sparks} className="touch-sparks" aria-hidden="true" />}
  </>;
}
