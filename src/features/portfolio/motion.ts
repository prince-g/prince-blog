export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const wrapIndex = (index: number, count: number) => ((index % count) + count) % count;

export function sectionProgress(scrollTop: number, sectionTop: number, height: number, viewport: number) {
  return height <= viewport ? 0 : clamp((scrollTop - sectionTop) / (height - viewport));
}

export function galleryFrame(index: number, progress: number, count: number) {
  const distance = progress * (count - 1) - index;
  return {
    z: distance * 540,
    opacity: clamp((distance + 3) / 1.2) * (1 - clamp((distance - 0.45) / 0.7)),
    interactive: distance > -0.55 && distance < 0.55,
  };
}
