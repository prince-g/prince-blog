export type KeyAudioSink = {
  unlock(): void;
  play(modelKey: string, edge: "press" | "up"): void;
  stop(): void;
};

const samples = ["D", "H", "L", "backspace", "enter", "option", "shift", "space"] as const;
type SoundSample = typeof samples[number];

export function keyboardSoundSample(modelKey: string): SoundSample {
  if (modelKey === "KeyD") return "D";
  if (modelKey === "KeyH") return "H";
  if (modelKey === "KeyL") return "L";
  if (modelKey === "Backspace") return "backspace";
  if (modelKey === "Enter") return "enter";
  if (modelKey === "Space") return "space";
  if (modelKey.startsWith("Shift")) return "shift";
  if (/^(Alt|Control|Meta)/.test(modelKey) || modelKey === "Fn") return "option";
  const hash = [...modelKey].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return samples[hash % 3];
}

export function createKeyboardAudio(): KeyAudioSink & { preload(): Promise<void>; dispose(): void } {
  let context: AudioContext | undefined;
  let loading: Promise<void> | undefined;
  let activated = false;
  let resuming = false;
  let disposed = false;
  const buffers = new Map<string, AudioBuffer>();
  const voices = new Set<AudioBufferSourceNode>();
  const abort = new AbortController();

  const getContext = () => {
    if (disposed) return undefined;
    try {
      if (!context && typeof AudioContext !== "undefined") context = new AudioContext();
    } catch { /* Audio is optional when the browser/device rejects a context. */ }
    return context;
  };

  const preload = (): Promise<void> => {
    if (disposed) return Promise.resolve();
    if (loading) return loading;
    const current = getContext();
    if (!current) return Promise.resolve();
    loading = Promise.all(samples.flatMap(sample => ["press", "up"].map(async edge => {
      const name = `${sample}_${edge}`;
      try {
        const response = await fetch(`/audio/keyboard/${name}.mp3`, { signal: abort.signal });
        if (!response.ok || disposed) return;
        const bytes = await response.arrayBuffer();
        if (disposed) return;
        const buffer = await current.decodeAudioData(bytes);
        if (!disposed) buffers.set(name, buffer);
      } catch { /* A missing or invalid sample must not disable other keys. */ }
    }))).then(() => {});
    return loading;
  };

  const releaseVoice = (source: AudioBufferSourceNode, stop: boolean) => {
    voices.delete(source);
    source.onended = null;
    if (stop) {
      try { source.stop(); } catch { /* Already stopped or unavailable. */ }
    }
    try { source.disconnect(); } catch { /* Already disconnected. */ }
  };

  const stop = () => {
    for (const source of voices) releaseVoice(source, true);
  };

  return {
    preload,
    unlock() {
      const current = getContext();
      if (!current) return;
      activated = true;
      // Resume in the gesture's synchronous call stack, never after fetching.
      try {
        if (current.state !== "running" && !resuming) {
          resuming = true;
          void current.resume().then(() => { resuming = false; }, () => {
            resuming = activated = false;
            stop();
          });
        }
      } catch {
        resuming = activated = false;
        stop();
      }
      void preload();
    },
    play(modelKey, edge) {
      const buffer = buffers.get(`${keyboardSoundSample(modelKey)}_${edge}`);
      // Drop unavailable events rather than replaying a burst after activation.
      if (disposed || !activated || !buffer || !context || (context.state !== "running" && !resuming)) return;
      let source: AudioBufferSourceNode | undefined;
      try {
        if (voices.size >= 24) releaseVoice(voices.values().next().value!, true);
        source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        voices.add(source);
        const voice = source;
        source.onended = () => releaseVoice(voice, false);
        // A suspended context holds this source until resume completes. Keeping
        // the native scheduled source lets stop() also cancel a first gesture.
        source.start();
      } catch {
        if (source) releaseVoice(source, true);
      }
    },
    stop,
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      stop();
      buffers.clear();
      try { void context?.close().catch(() => {}); } catch { /* Device already closed. */ }
    },
  };
}
