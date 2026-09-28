import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPortraitPlayback, PortraitVideo } from './PortraitVideo';

class FakeVideo extends EventTarget {
  private time = 0;
  seeks: number[] = [];
  readyState = 2;
  seeking = false;
  error = null;
  ended = false;
  get currentTime() { return this.time; }
  set currentTime(value: number) { this.time = value; this.seeking = true; this.seeks.push(value); }
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  decode() { this.seeking = false; this.dispatchEvent(new Event('seeked')); }
}

function setup() {
  vi.useFakeTimers();
  let clock = 0, id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key));
  const video = new FakeVideo(), present = vi.fn(), poster = vi.fn();
  const player = createPortraitPlayback(video as unknown as HTMLVideoElement, present, poster);
  const step = () => {
    clock += 1000 / 60;
    const callbacks = [...frames.values()]; frames.clear();
    callbacks.forEach((callback) => callback(clock));
    vi.advanceTimersByTime(1000 / 60);
  };
  return { video, present, poster, player, step, frames };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('one opaque portrait surface', () => {
  it('renders one canvas and one hidden decoder, without opacity-mixed faces or a permanent poster layer', () => {
    const markup = renderToStaticMarkup(<PortraitVideo active={false} leaving={false} />);
    expect(markup.match(/<canvas\b/g)).toHaveLength(1);
    expect(markup.match(/<video\b/g)).toHaveLength(1);
    expect(markup).toMatch(/<video[^>]*hidden/);
    expect(markup).not.toContain('opacity');
    expect(markup).not.toContain('background-image');
  });

  it('presents decoded frames and permits the next frame without a 180ms fade lock', () => {
    const { video, present, poster, player, step } = setup();
    player.requestPose(4.2); step();
    expect(video.seeking).toBe(true);
    expect(present).not.toHaveBeenCalled();
    video.decode();
    expect(present).toHaveBeenCalledOnce();
    for (let i = 0; i < 12; i++) { step(); if (video.seeking) video.decode(); }
    expect(present.mock.calls.length).toBeGreaterThan(8);
    expect(poster).not.toHaveBeenCalled();
    player.dispose();
  });

  it('keeps at most one pending seek and pursues the newest target after slow decoding', () => {
    const { video, player, step } = setup();
    player.requestPose(1.8); step();
    const count = video.seeks.length;
    player.requestPose(2.8);
    for (let i = 0; i < 8; i++) step();
    expect(video.seeks).toHaveLength(count);
    video.decode();
    for (let i = 0; i < 160; i++) { step(); if (video.seeking) video.decode(); }
    expect(video.currentTime).toBeCloseTo(2.8, 1);
    player.dispose();
  });

  it('makes repeated center requests idempotent and reports rest only after presenting the final frame', () => {
    const { video, present, player, step } = setup();
    player.requestPose(1.8);
    for (let i = 0; i < 100; i++) { step(); if (video.seeking) video.decode(); }
    const restored = vi.fn();
    player.requestPose(0, restored);
    for (let i = 0; i < 100; i++) {
      player.requestPose(0); step();
      if (video.seeking) { expect(restored).not.toHaveBeenCalled(); video.decode(); }
      if (restored.mock.calls.length) break;
    }
    expect(video.currentTime).toBeCloseTo(0, 2);
    expect(present).toHaveBeenCalled();
    expect(restored).toHaveBeenCalledOnce();
    player.dispose();
  });

  it('ignores late frames after suspension and cleans up all pending work', () => {
    const { video, present, player, step, frames } = setup();
    player.requestPose(4.2); step(); player.suspend();
    video.decode(); step();
    expect(present).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
    player.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retains the last frame after a stalled seek and accepts fresh input', () => {
    const { video, present, player, step, frames } = setup();
    player.requestPose(4.2); step();
    vi.advanceTimersByTime(1600);
    expect(frames.size).toBe(0);
    expect(present).not.toHaveBeenCalled();
    video.seeking = false;
    player.requestPose(1.8); step(); video.decode();
    expect(present).toHaveBeenCalledOnce();
    player.dispose();
  });

  it('can leave the hero if the video never obtains metadata', () => {
    const { video, poster, player, step } = setup();
    video.readyState = 0;
    const restored = vi.fn();
    player.requestPose(0, restored); step();
    vi.advanceTimersByTime(1600);
    expect(poster).toHaveBeenCalledOnce();
    expect(restored).toHaveBeenCalledOnce();
    player.dispose();
  });

  it('does not let an aborted old play cancel a newer intro after visibility recovery', async () => {
    const { video, player, frames } = setup();
    let rejectOld!: (error: Error) => void;
    video.play.mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectOld = reject; }));
    player.startIntro(); player.suspend(); player.startIntro();
    rejectOld(new Error('old play aborted'));
    await Promise.resolve();
    expect(frames.size).toBe(1);
    player.dispose();
  });

  it('stops requesting animation frames when a half-frame target has settled', () => {
    const { video, player, step, frames } = setup();
    player.requestPose(2.1916666666666664);
    for (let i = 0; i < 150; i++) { step(); if (video.seeking) video.decode(); }
    expect(frames.size).toBe(0);
    player.dispose();
  });
});

