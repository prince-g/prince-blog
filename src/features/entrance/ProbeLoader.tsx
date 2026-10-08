import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { createProbePlayback } from "./probe-progress";
import "./ProbeLoader.css";

gsap.registerPlugin(useGSAP);

type ProbeLoaderProps = { progress: number; ready: boolean; onComplete: () => void };
const phases = [[0, "POWERING PROBE CARD"], [24, "LOADING MASK SET"], [52, "MAPPING THE DIE"],
  [78, "CALIBRATING E-BEAM"], [100, "PRINCE / PROBE PASS"]] as const;

export function ProbeLoader({ progress, ready, onComplete }: ProbeLoaderProps) {
  const root = useRef<HTMLDivElement>(null);
  const playback = useRef<ReturnType<typeof createProbePlayback> | null>(null);
  const latest = useRef({ progress, ready, onComplete });
  latest.current = { progress, ready, onComplete };

  useGSAP(() => {
    const element = root.current;
    if (!element) return;
    const rig = element.querySelector<HTMLElement>(".probe-loader-rig")!;
    const meter = element.querySelector<HTMLElement>("[role=progressbar]")!;
    const count = element.querySelector<HTMLElement>("[data-probe-count]")!;
    const status = element.querySelector<HTMLElement>("[data-probe-status]")!;
    const button = element.querySelector<HTMLButtonElement>("button")!;
    const ticks = [...element.querySelectorAll<HTMLElement>(".probe-loader-tick")];
    let shown = -1, lit = -1;
    const player = createProbePlayback((frame) => {
      const value = Math.floor(frame.progress), active = Math.round(frame.progress / 100 * ticks.length);
      element.dataset.phase = frame.progress === 100 ? "pass" : frame.started ? "loading" : "waiting";
      element.style.opacity = String(frame.opacity);
      rig.style.transform = `scaleY(${frame.scaleY})`;
      button.disabled = frame.started;
      if (value !== shown || value === 0) {
        count.textContent = String(value);
        meter.setAttribute("aria-valuenow", String(value));
        const next = frame.started ? [...phases].reverse().find(([at]) => value >= at)![1] : "PROBE CARD READY";
        if (status.textContent !== next) status.textContent = next;
        shown = value;
      }
      if (active !== lit) {
        ticks.forEach((tick, index) => tick.classList.toggle("is-on", index < active));
        element.style.setProperty("--probe-lit", String(.2927 + active / 56 * .7073));
        lit = active;
      }
    }, () => latest.current.onComplete(), matchMedia("(prefers-reduced-motion: reduce)").matches);
    playback.current = player;
    player.update(latest.current.progress, latest.current.ready);
    const fit = () => {
      const narrow = innerWidth < 760;
      element.dataset.narrow = String(narrow);
      const scale = narrow ? Math.min((innerWidth - 24) / 720, innerHeight / 800) * .86
        : Math.min(innerWidth / 1200, innerHeight / 800, 1.1) * .5;
      element.style.setProperty("--probe-scale", String(scale));
    };
    const start = () => player.start();
    const enter = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.repeat) { event.preventDefault(); player.start(); }
    };
    fit(); button.focus({ preventScroll: true });
    button.addEventListener("click", start);
    window.addEventListener("keydown", enter);
    window.addEventListener("resize", fit);
    return () => {
      player.dispose(); playback.current = null;
      button.removeEventListener("click", start);
      window.removeEventListener("keydown", enter);
      window.removeEventListener("resize", fit);
    };
  }, { scope: root });

  useEffect(() => { playback.current?.update(progress, ready); }, [progress, ready]);

  return <div ref={root} className="probe-loader" data-phase="waiting">
    <div className="probe-loader-rig">
      <div className="probe-loader-stage">
        <div className="probe-loader-plate" aria-hidden="true" />
        <i className="probe-loader-bracket is-top" aria-hidden="true" />
        <i className="probe-loader-bracket is-bottom" aria-hidden="true" />
        <div className="probe-loader-readout" role="progressbar" aria-label="加载键盘模型" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
          <b data-probe-count>0</b><span aria-hidden="true">%</span>
        </div>
        <div className="probe-loader-haze" aria-hidden="true" />
        <div className="probe-loader-label" aria-hidden="true">WAFER PROBE</div>
        <div className="probe-loader-lot" aria-hidden="true">PRINCE / KEYBOARD</div>
        <div className="probe-loader-bar" aria-hidden="true">
          {Array.from({ length: 56 }, (_, index) => <i key={index} className={`probe-loader-tick${(index + 1) % 8 === 0 ? " is-major" : ""}`} />)}
        </div>
      </div>
      <div className="probe-loader-gate">
        <p className="probe-loader-status" role="status"><span data-probe-status>PROBE CARD READY</span><span className="probe-loader-dots" aria-hidden="true" /></p>
        <span className="probe-loader-action"><button className="probe-loader-power" type="button" aria-label="POWER ON，开始加载键盘模型">
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1v5M3 2.8a4.5 4.5 0 1 0 6 0" /></svg>
          <span>POWER ON</span>
        </button></span>
      </div>
    </div>
  </div>;
}
