import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createKeyboardAudio, keyboardSoundSample } from "../src/features/keyboard/interaction/keyboard-audio";

class AudioSource {
  buffer: { url: string } | null = null;
  onended: (() => void) | null = null;
  started = false;
  get active() { return this.started && this.context.state === "running"; }
  connected = false;
  constructor(private context: BrowserAudioContext) {}
  connect() { this.connected = true; }
  disconnect() { this.connected = false; }
  start() { this.started = true; }
  stop() { this.started = false; }
  finish() { this.started = false; this.onended?.(); }
}

class BrowserAudioContext {
  static instances: BrowserAudioContext[] = [];
  state = "suspended";
  destination = {};
  sources: AudioSource[] = [];
  decoded: string[] = [];
  resumeCalls = 0;
  closed = false;
  resumeResult: Promise<void> | undefined;

  constructor() { BrowserAudioContext.instances.push(this); }
  async decodeAudioData(bytes: ArrayBuffer) {
    const url = new TextDecoder().decode(bytes);
    this.decoded.push(url);
    return { url };
  }
  resume() {
    this.resumeCalls += 1;
    if (this.resumeResult) return this.resumeResult;
    this.state = "running";
    return Promise.resolve();
  }
  createBufferSource() {
    const source = new AudioSource(this);
    this.sources.push(source);
    return source;
  }
  async close() { this.closed = true; this.state = "closed"; }
}

const fetchSample = async (url: string) => new Response(new TextEncoder().encode(url));
const audioContext = () => BrowserAudioContext.instances[0];

beforeEach(() => {
  BrowserAudioContext.instances = [];
  vi.stubGlobal("AudioContext", BrowserAudioContext);
  vi.stubGlobal("fetch", vi.fn(fetchSample));
});

afterEach(() => vi.unstubAllGlobals());

describe("keyboard audio", () => {
  it("selects the dedicated key recordings and uses stable ordinary-key samples", () => {
    const mappings = {
      KeyD: "D", KeyH: "H", KeyL: "L", Backspace: "backspace", Enter: "enter", Space: "space",
      ShiftLeft: "shift", ShiftRight: "shift", AltLeft: "option", AltRight: "option",
      ControlLeft: "option", ControlRight: "option", MetaLeft: "option", MetaRight: "option", Fn: "option",
    };
    for (const [key, sample] of Object.entries(mappings)) expect(keyboardSoundSample(key)).toBe(sample);
    const ordinaryKeys = ["KeyA", "Digit1", "Comma", "ArrowRight", "LightMode"];
    const first = ordinaryKeys.map(keyboardSoundSample);
    for (const sample of first) expect(["D", "H", "L"]).toContain(sample);
    expect(ordinaryKeys.map(keyboardSoundSample)).toEqual(first);
  });

  it("loads and decodes each of the 16 samples once per player", async () => {
    const audio = createKeyboardAudio();
    await Promise.all([audio.preload(), audio.preload()]);
    await audio.preload();

    expect(BrowserAudioContext.instances).toHaveLength(1);
    expect(audioContext().decoded.sort()).toEqual([
      "/audio/keyboard/D_press.mp3", "/audio/keyboard/D_up.mp3",
      "/audio/keyboard/H_press.mp3", "/audio/keyboard/H_up.mp3",
      "/audio/keyboard/L_press.mp3", "/audio/keyboard/L_up.mp3",
      "/audio/keyboard/backspace_press.mp3", "/audio/keyboard/backspace_up.mp3",
      "/audio/keyboard/enter_press.mp3", "/audio/keyboard/enter_up.mp3",
      "/audio/keyboard/option_press.mp3", "/audio/keyboard/option_up.mp3",
      "/audio/keyboard/shift_press.mp3", "/audio/keyboard/shift_up.mp3",
      "/audio/keyboard/space_press.mp3", "/audio/keyboard/space_up.mp3",
    ].sort());
    expect(fetch).toHaveBeenCalledTimes(16);
  });

  it("resumes immediately during unlock and overlaps distinct press/up voices", async () => {
    const audio = createKeyboardAudio();
    await audio.preload();
    audio.unlock();
    expect(audioContext().resumeCalls).toBe(1);
    audio.play("KeyD", "press");
    audio.play("KeyD", "up");
    audio.play("KeyH", "press");

    expect(audioContext().sources.map(source => source.buffer?.url)).toEqual([
      "/audio/keyboard/D_press.mp3", "/audio/keyboard/D_up.mp3", "/audio/keyboard/H_press.mp3",
    ]);
    expect(audioContext().sources.every(source => source.active && source.connected)).toBe(true);
    audioContext().sources[0].finish();
    expect(audioContext().sources[0].connected).toBe(false);
    expect(audioContext().sources[1].active).toBe(true);
  });

  it("does not replay preactivation or loading-time presses", async () => {
    let finishFetch!: () => void;
    const gate = new Promise<void>(resolve => { finishFetch = resolve; });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => { await gate; return fetchSample(url); }));
    const audio = createKeyboardAudio();
    audio.play("KeyD", "press");
    const loading = audio.preload();
    audio.play("KeyD", "press");
    audio.unlock();
    audio.play("KeyD", "up");
    finishFetch();
    await loading;

    expect(audioContext().sources).toHaveLength(0);
    audio.play("KeyH", "press");
    expect(audioContext().sources).toHaveLength(1);
  });

  it("schedules the first press while resume is pending and plays it once the context runs", async () => {
    const audio = createKeyboardAudio();
    await audio.preload();
    let finishResume!: () => void;
    audioContext().resumeResult = new Promise<void>(resolve => { finishResume = resolve; });
    audio.unlock();
    audio.play("KeyD", "press");
    expect(audioContext().sources).toHaveLength(1);
    expect(audioContext().sources[0].active).toBe(false);
    audioContext().state = "running";
    finishResume();
    await Promise.resolve();
    expect(audioContext().sources[0].active).toBe(true);
    expect(audioContext().sources[0].buffer?.url).toBe("/audio/keyboard/D_press.mp3");
  });

  it("cancels scheduled first-gesture audio when blur occurs before resume finishes", async () => {
    const audio = createKeyboardAudio();
    await audio.preload();
    let finishResume!: () => void;
    audioContext().resumeResult = new Promise<void>(resolve => { finishResume = resolve; });
    audio.unlock();
    audio.play("KeyD", "press");
    audio.stop();
    audioContext().state = "running";
    finishResume();
    await Promise.resolve();

    expect(audioContext().sources).toHaveLength(1);
    expect(audioContext().sources[0].active).toBe(false);
    expect(audioContext().sources[0].connected).toBe(false);
    audio.play("KeyH", "press");
    expect(audioContext().sources).toHaveLength(2);
    expect(audioContext().sources[1].active).toBe(true);
  });

  it("caps rapid polyphony by stopping the oldest voices", async () => {
    const audio = createKeyboardAudio();
    await audio.preload();
    audio.unlock();
    for (let index = 0; index < 40; index += 1) audio.play("KeyD", "press");

    expect(audioContext().sources.filter(source => source.active)).toHaveLength(24);
    expect(audioContext().sources.slice(0, 16).every(source => !source.connected && !source.active)).toBe(true);
    expect(audioContext().sources.slice(-24).every(source => source.active)).toBe(true);
  });

  it("stop silences active voices while leaving loaded audio available", async () => {
    const audio = createKeyboardAudio();
    await audio.preload();
    audio.unlock();
    audio.play("Enter", "press");
    audio.play("Space", "press");
    audio.stop();
    audio.stop();

    expect(audioContext().sources.every(source => !source.active && !source.connected)).toBe(true);
    audio.play("Enter", "press");
    expect(audioContext().sources.at(-1)?.active).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(16);
  });

  it("dispose closes its context and ignores all future activity", async () => {
    const audio = createKeyboardAudio();
    await audio.preload();
    audio.unlock();
    audio.play("KeyD", "press");
    audio.dispose();
    audio.dispose();
    audio.unlock();
    audio.play("KeyD", "up");
    await audio.preload();

    expect(audioContext().closed).toBe(true);
    expect(audioContext().sources).toHaveLength(1);
    expect(audioContext().sources[0].active).toBe(false);
    expect(audioContext().sources[0].connected).toBe(false);
    expect(BrowserAudioContext.instances).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(16);
  });

  it("dispose during loading never decodes or plays late resources", async () => {
    let finishFetch!: () => void;
    const gate = new Promise<void>(resolve => { finishFetch = resolve; });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => { await gate; return fetchSample(url); }));
    const audio = createKeyboardAudio();
    const loading = audio.preload();
    audio.unlock();
    audio.dispose();
    finishFetch();
    await loading;
    audio.play("KeyD", "press");

    expect(audioContext().closed).toBe(true);
    expect(audioContext().decoded).toHaveLength(0);
    expect(audioContext().sources).toHaveLength(0);
  });

  it("isolates failed samples and still plays recordings that loaded", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("D_press.mp3")) throw new Error("offline");
      if (url.endsWith("D_up.mp3")) return new Response(null, { status: 503 });
      return fetchSample(url);
    }));
    const audio = createKeyboardAudio();
    await expect(audio.preload()).resolves.toBeUndefined();
    audio.unlock();
    expect(() => audio.play("KeyD", "press")).not.toThrow();
    audio.play("KeyD", "up");
    audio.play("KeyH", "press");

    expect(audioContext().sources.map(source => source.buffer?.url)).toEqual(["/audio/keyboard/H_press.mp3"]);
  });

  it("catches rejected activation and can retry on a later user gesture", async () => {
    const audio = createKeyboardAudio();
    await audio.preload();
    audioContext().resumeResult = Promise.reject(new Error("activation denied"));
    expect(() => audio.unlock()).not.toThrow();
    audio.play("KeyD", "press");
    await Promise.resolve();
    expect(audioContext().sources).toHaveLength(1);
    expect(audioContext().sources[0].active).toBe(false);
    expect(audioContext().sources[0].connected).toBe(false);
    audioContext().resumeResult = undefined;
    audio.unlock();
    audio.play("KeyD", "press");
    expect(audioContext().sources.filter(source => source.active)).toHaveLength(1);
  });

  it("stays optional when Web Audio is unavailable or construction fails", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const unsupported = createKeyboardAudio();
    await expect(unsupported.preload()).resolves.toBeUndefined();
    expect(() => { unsupported.unlock(); unsupported.play("KeyD", "press"); unsupported.stop(); unsupported.dispose(); }).not.toThrow();
    vi.stubGlobal("AudioContext", class { constructor() { throw new Error("device unavailable"); } });
    const unavailable = createKeyboardAudio();
    await expect(unavailable.preload()).resolves.toBeUndefined();
    expect(() => { unavailable.unlock(); unavailable.play("KeyD", "press"); unavailable.dispose(); }).not.toThrow();
  });
});
