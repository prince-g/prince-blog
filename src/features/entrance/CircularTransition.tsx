import { useId, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { CIRCLE_CENTERS, circularTimeline, createCircularFrame } from "./circular-transition";
import "./CircularTransition.css";

gsap.registerPlugin(useGSAP);

export function CircularTransition({ onCovered, onComplete }: { onCovered: () => void; onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onCovered, onComplete });
  callbacks.current = { onCovered, onComplete };
  const maskId = useId();
  useGSAP(() => {
    const element = root.current!;
    const circles = [...element.querySelectorAll<SVGCircleElement>(".circular-transition__circle")];
    const edges = [...element.querySelectorAll<SVGCircleElement>(".circular-transition__edge")];
    const opening = element.querySelector<SVGCircleElement>(".circular-transition__opening")!;
    const frame = createCircularFrame();
    let diagonal = Math.hypot(element.clientWidth, element.clientHeight);
    const draw = () => {
      element.style.opacity = String(frame.opacity);
      circles.forEach((circle, index) => {
        circle.setAttribute("r", String(diagonal * 0.7 * frame.circles[index].scale));
        edges[index].setAttribute("r", String(diagonal * 0.74 * frame.circles[index].scale));
      });
      opening.setAttribute("r", String(diagonal * frame.reveal));
    };
    const resize = () => { diagonal = Math.hypot(element.clientWidth, element.clientHeight); draw(); };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    circularTimeline(frame, draw, () => callbacks.current.onCovered(), () => callbacks.current.onComplete(), reduced);
    return () => observer.disconnect();
  }, { scope: root });

  return <div ref={root} className="circular-transition" role="status" aria-label="正在进入个人主页">
    <svg width="100%" height="100%" aria-hidden="true">
      <defs><mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
        <rect width="100%" height="100%" fill="white" />
        <circle className="circular-transition__opening" cx="57%" cy="54%" r="0" fill="black" />
      </mask></defs>
      <g mask={`url(#${maskId})`}>
        {CIRCLE_CENTERS.map(([x, y], index) => <circle key={`edge-${index}`} className="circular-transition__edge" cx={`${x * 100}%`} cy={`${y * 100}%`} r="0" />)}
        {CIRCLE_CENTERS.map(([x, y], index) => <circle key={index} className="circular-transition__circle" cx={`${x * 100}%`} cy={`${y * 100}%`} r="0" />)}
      </g>
    </svg>
  </div>;
}
