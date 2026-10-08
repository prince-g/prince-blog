import { gsap } from "gsap";

export type ProbeFrame = { progress: number; started: boolean; scaleY: number; opacity: number };

const script = [[0, 0], [.05, 8], [.12, 9], [.2, 22], [.26, 23], [.37, 38], [.42, 39],
  [.53, 53], [.58, 54], [.68, 68], [.73, 69], [.83, 81], [.88, 82], [.96, 99], [1, 100]];

function pacedProgress(time: number) {
  for (let index = 1; index < script.length; index++) {
    const [end, value] = script[index], [start, previous] = script[index - 1];
    if (time <= end) return previous + (value - previous) * (1 - (1 - (time - start) / (end - start)) ** 2.1);
  }
  return 100;
}

export function createProbePlayback(render: (frame: ProbeFrame) => void, onComplete: () => void, reduced = false) {
  const frame: ProbeFrame = { progress: 0, started: false, scaleY: 1, opacity: 1 };
  let available = 0, request = 0, previous = 0, elapsed = 0, disposed = false, completed = false;
  const draw = () => { if (!disposed) render({ ...frame }); };
  const exit = gsap.timeline({ paused: true, onUpdate: draw, onComplete: () => {
    if (disposed || completed) return;
    completed = true;
    onComplete();
  } });
  if (!reduced) exit.to(frame, { scaleY: .012, duration: .32, ease: "power3.in" }, .2);
  exit.to(frame, { opacity: 0, duration: reduced ? .12 : .3, ease: "power1.inOut" }, reduced ? .08 : .42);

  function advance(now: number) {
    if (disposed) return;
    const delta = previous ? Math.min((now - previous) / 1000, 1 / 30) : 1 / 60;
    previous = now; elapsed += delta;
    const target = Math.min(available, pacedProgress(elapsed / (reduced ? .18 : 1.5)));
    const gap = target - frame.progress;
    frame.progress = gap < .05 ? target : frame.progress + Math.min(gap * (1 - Math.exp(-delta * (reduced ? 50 : 20))) + .02, gap, (reduced ? 900 : 180) * delta);
    draw();
    if (frame.progress === 100) { request = 0; exit.play(); }
    else request = requestAnimationFrame(advance);
  }

  draw();
  return {
    exit,
    update(progress: number, ready: boolean) {
      if (disposed || completed) return;
      available = Math.max(available, ready ? 100 : Math.max(0, Math.min(99, Number.isFinite(progress) ? progress : 0)));
    },
    start() {
      if (disposed || frame.started) return;
      frame.started = true; draw();
      request = requestAnimationFrame(advance);
    },
    dispose() { disposed = true; cancelAnimationFrame(request); exit.kill(); },
  };
}
