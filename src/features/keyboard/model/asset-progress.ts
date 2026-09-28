import { useSyncExternalStore } from "react";
import { LoadingManager } from "three";

let progress = 0;
const listeners = new Set<() => void>();

function publish(value: number): void {
  if (value === progress) return;
  progress = value;
  for (const listener of listeners) listener();
}

function createKeyboardLoadingManager(): LoadingManager {
  const manager = new LoadingManager();
  let failed = false;
  manager.onError = () => { failed = true; };
  manager.onProgress = (_url, completed, total) => {
    if (manager !== keyboardLoadingManager || failed || total === 0) return;
    // GLBs discover embedded resources while loading. Keep progress monotonic;
    // only the scene's ready signal can complete the remaining one percent.
    publish(Math.max(progress, Math.min(99, Math.floor(completed / total * 99))));
  };
  return manager;
}

export let keyboardLoadingManager = createKeyboardLoadingManager();

export function getAssetProgress(): number { return progress; }

export function subscribeAssetProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function resetAssetProgress(): void {
  // A fresh manager also isolates callbacks still arriving from a failed attempt.
  keyboardLoadingManager = createKeyboardLoadingManager();
  publish(0);
}

export function useAssetProgress(): number {
  return useSyncExternalStore(subscribeAssetProgress, getAssetProgress, getAssetProgress);
}
