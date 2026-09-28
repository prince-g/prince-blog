import { useEffect, useRef } from 'react';
import { gazeTimeFromPointer, PORTRAIT_CYCLE_SECONDS, portraitTimeDelta, stepPortraitTime } from './gaze-mapping';

const SOURCE = '/media/portrait/portrait-motion-60.mp4';
const POSTER = '/media/portrait/portrait-poster.jpg';
const FRAME = 1 / 60;

/** One decoder and one opaque presentation surface. Never mix two faces. */
export function createPortraitPlayback(video: HTMLVideoElement, present: () => void, poster: () => void) {
  let mode: 'idle' | 'intro' | 'tracking' | 'suspended' = 'idle';
  let disposed = false;
  let goal = 0, position = 0, displayed = NaN;
  let pending = false, pendingTime = 0;
  let frameId = 0, previousTick = 0;
  let playbackGeneration = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let onRest: (() => void) | undefined;
  const normalize = (time: number) => ((time % PORTRAIT_CYCLE_SECONDS) + PORTRAIT_CYCLE_SECONDS) % PORTRAIT_CYCLE_SECONDS;
  const stop = () => {
    playbackGeneration++;
    cancelAnimationFrame(frameId); frameId = 0; previousTick = 0;
    clearTimeout(timeout); timeout = undefined; pending = false;
    video.pause();
  };
  const settle = () => {
    if (Number.isFinite(displayed) && Math.abs(portraitTimeDelta(displayed, goal)) <= FRAME / 2 + 1e-6) {
      const callback = onRest; onRest = undefined; callback?.();
      return true;
    }
    return false;
  };
  const schedule = () => {
    if (!frameId && !disposed && (mode === 'intro' || mode === 'tracking')) frameId = requestAnimationFrame(tick);
  };
  const failed = () => {
    stop(); mode = 'idle';
    if (onRest) { poster(); displayed = position = goal = 0; const callback = onRest; onRest = undefined; callback(); }
    // A failed seek keeps the last good image until fresh input; no retry loop.
  };
  const decoded = () => {
    if (disposed || mode !== 'tracking' || !pending || video.seeking || video.readyState < 2) return;
    clearTimeout(timeout); timeout = undefined; pending = false;
    present(); displayed = pendingTime;
    if (!settle()) schedule();
  };
  function tick(now: number) {
    frameId = 0;
    if (disposed || (mode !== 'intro' && mode !== 'tracking')) return;
    const delta = previousTick ? Math.min((now - previousTick) / 1000, 0.05) : FRAME;
    previousTick = now;
    if (mode === 'intro') {
      if (video.readyState >= 2 && !video.seeking) {
        if (Math.abs(video.currentTime - displayed) >= FRAME / 2 || !Number.isFinite(displayed)) {
          present(); displayed = video.currentTime;
        }
        position = video.currentTime >= PORTRAIT_CYCLE_SECONDS ? 0 : video.currentTime;
      }
      if (!video.ended) schedule();
      else mode = 'idle';
      return;
    }
    position = stepPortraitTime(position, goal, delta);
    if (Math.abs(portraitTimeDelta(position, goal)) < FRAME / 2) position = goal;
    const desired = normalize(Math.round(position / FRAME) * FRAME);
    if (!pending && video.readyState >= 2 && !video.seeking) {
      if (Number.isFinite(displayed) && Math.abs(portraitTimeDelta(displayed, desired)) < FRAME / 2) {
        if (settle()) return;
      } else {
        pending = true; pendingTime = desired;
        timeout = setTimeout(failed, 1500);
        if (Math.abs(video.currentTime - desired) < FRAME / 3) decoded();
        else video.currentTime = desired;
      }
    }
    schedule();
  }
  const loaded = () => {
    if (!pending) { clearTimeout(timeout); timeout = undefined; }
    if (mode === 'intro' || mode === 'tracking') schedule();
  };
  video.addEventListener('seeked', decoded);
  video.addEventListener('loadeddata', loaded);
  video.addEventListener('error', failed);
  return {
    requestPose(time: number, restored?: () => void, immediate = false) {
      if (disposed) return;
      if (mode !== 'tracking') {
        stop();
        position = Number.isFinite(displayed) && displayed < PORTRAIT_CYCLE_SECONDS ? displayed : 0;
        mode = 'tracking';
      }
      goal = normalize(time);
      if (restored) onRest = restored;
      if (immediate) position = goal;
      if (video.error) { failed(); return; }
      if (video.readyState < 2 && timeout === undefined) timeout = setTimeout(failed, 1500);
      // Repeated center requests retain the existing seek and completion callback.
      schedule();
    },
    startIntro() {
      if (disposed) return;
      stop(); onRest = undefined; mode = 'intro';
      const generation = playbackGeneration;
      void video.play().catch(() => { if (!disposed && generation === playbackGeneration && mode === 'intro') { stop(); mode = 'idle'; } });
      schedule();
    },
    suspend() { stop(); onRest = undefined; mode = 'suspended'; },
    dispose() {
      disposed = true; stop(); onRest = undefined;
      video.removeEventListener('seeked', decoded);
      video.removeEventListener('loadeddata', loaded);
      video.removeEventListener('error', failed);
    },
  };
}

export interface PortraitVideoProps {
  active: boolean;
  leaving: boolean;
  onRest?: () => void;
}

export function PortraitVideo({ active, leaving, onRest }: PortraitVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<ReturnType<typeof createPortraitPlayback> | null>(null);
  const introStarted = useRef(false);
  const pointerControlled = useRef(false);
  const target = useRef(0);
  const callback = useRef(onRest);
  callback.current = onRest;

  useEffect(() => {
    const video = videoRef.current!, canvas = canvasRef.current!;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;
    let disposed = false, hasFrame = false;
    const image = new Image();
    const drawPoster = () => {
      if (!disposed && image.complete && image.naturalWidth) {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        hasFrame = true; canvas.dataset.mediaTime = '0';
      }
    };
    image.onload = () => { if (!hasFrame) drawPoster(); };
    image.src = POSTER;
    const present = () => {
      if (disposed || video.readyState < 2) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      hasFrame = true;
      canvas.dataset.mediaTime = video.currentTime.toFixed(3);
      canvas.dataset.presentedFrames = String(Number(canvas.dataset.presentedFrames ?? 0) + 1);
    };
    const player = createPortraitPlayback(video, present, drawPoster);
    playerRef.current = player;
    return () => { disposed = true; image.onload = null; player.dispose(); playerRef.current = null; };
  }, []);

  useEffect(() => {
    const player = playerRef.current, video = videoRef.current;
    if (!player || !video) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(any-pointer: fine)');
    let lastPointer: { x: number; y: number } | null = null;
    const applyMode = () => {
      if (!active || document.hidden) player.suspend();
      else if (leaving) { target.current = 0; player.requestPose(0, () => callback.current?.(), reducedMotion.matches); }
      else if (reducedMotion.matches) player.requestPose(0, undefined, true);
      else if (!introStarted.current || (!pointerControlled.current && !video.ended)) {
        introStarted.current = true; player.startIntro();
      }
    };
    const move = (event: PointerEvent) => {
      if (!active || leaving || document.hidden || reducedMotion.matches || !finePointer.matches || event.pointerType !== 'mouse' || !event.isTrusted) return;
      if (lastPointer?.x === event.clientX && lastPointer.y === event.clientY) return;
      if (!lastPointer && event.movementX === 0 && event.movementY === 0) { lastPointer = { x: event.clientX, y: event.clientY }; return; }
      lastPointer = { x: event.clientX, y: event.clientY };
      pointerControlled.current = true;
      target.current = gazeTimeFromPointer(event.clientX, event.clientY, innerWidth, innerHeight, target.current);
      player.requestPose(target.current);
    };
    applyMode();
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('visibilitychange', applyMode);
    reducedMotion.addEventListener('change', applyMode);
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('visibilitychange', applyMode);
      reducedMotion.removeEventListener('change', applyMode);
      player.suspend();
    };
  }, [active, leaving]);

  return <div className="portrait-film" role="img" aria-label="随鼠标转动视线的人物肖像">
    <canvas ref={canvasRef} className="portrait-film__frame" width={1280} height={720} aria-hidden="true" />
    <video ref={videoRef} src={SOURCE} hidden preload="auto" muted playsInline disablePictureInPicture aria-hidden="true" tabIndex={-1} />
  </div>;
}

