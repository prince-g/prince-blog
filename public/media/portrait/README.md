# Personal portrait media

The portrait and background were supplied by the project owner on 2026-09-23.
The original source files are preserved outside this directory.

- `portrait-motion-60.mp4`: motion-compensated interpolation of the original
  source, H.264, 1280 × 720, 60 fps, all-intra (`g=1`), CRF 22, no audio,
  fast-start metadata; 599 frames, 9.9833 seconds, 19,253,199 bytes. This is the
  currently used runtime asset. The additional in-between frames are estimated
  motion, not newly captured source frames. The original video is unchanged.
- `portrait-gaze.mp4`: preserved earlier export, derived from
  `C:/Users/28645/Desktop/个人视频.mp4`; no longer used by the current player.
  H.264, 1280 × 720, 30 fps, 10 seconds, no audio, fast-start metadata, a keyframe
  every 8 frames for interactive seeking. This is the same performance and artwork;
  no generated replacement character or background is used.
- `portrait-poster.jpg`: the initial frame of that same source video.
- `portrait-background.png`: an unchanged copy of the owner's supplied background
  (`codex-clipboard-2a153ee2-77a5-4dc9-aa5f-abd03a7e74b1.png`), 1672 × 941.

## Source cadence and interpolation

The source reports a nominal `r_frame_rate` of 60, but it actually contains only
241 decoded video frames over 10.0167 seconds: about 24 independent frames per
second. Its timestamps alternate 50 ms and 33.33 ms gaps. Adjacent decoded source
frames have no identical MD5 hashes. The earlier 30 fps export repeats source
frames to reach 30 fps; it does not create smoother motion. The new 60 fps export
uses motion estimation to create intermediate frames, so it must still be checked
for local warping around eyes, hair, mouth, and stickers. The audit below records
spot checks at four motion checkpoints, not a guarantee about every frame.

## Current presentation

`PortraitVideo.tsx` uses one hidden video decoder and one opaque 1280 × 720 canvas.
The canvas holds the last valid decoded image during a seek; it never crossfades
two head poses or exposes a poster beneath a partially transparent face. The
initial presentation plays natively. Pointer control follows a damped video-time
target, allows only one in-flight seek, and draws the decoded result onto the
canvas. The poster supplies the initial image and failure fallback.

Pointer tracking uses an 8.4-second circular timeline and the shorter direction
around that timeline. The down-to-right sector passes through the returned-front
and initial-front endpoints. This can cross the small visual seam described
below. A 60 fps media file does not guarantee 60 presented browser frames per
second; decoding and seek latency still govern actual responsiveness.

## Inspected gaze landmarks

Directions below are relative to the screen, not the character's body.

| Pose | Best target time | Useful source interval |
| --- | ---: | --- |
| Initial / front | 0.0 s | 0.0–0.3 s |
| Right | 1.8 s | 1.4–2.1 s |
| Up | 2.8 s | 2.5–3.2 s |
| Left | 4.2 s | 4.0–4.7 s |
| Down | 6.2 s | 5.8–6.8 s |
| Returned front | 8.4 s | 8.2–10.0 s |

The source contains a single prerecorded path and changing expressions. Seeking
can select existing poses, but cannot synthesize arbitrary new head angles or
decouple eye movement from the recorded expression. Continuous video-time tracking
preserves its actual transition frames; large changes still follow the recorded
path. A single opaque display frame avoids the doubled faces caused by blending
different head poses over the resting poster.

The returning front pose at 8.4 seconds and the initial frame have the same overall
expression, but are not an exact seamless loop. Hair, gaze, and face registration
vary slightly. At 160 × 90 grayscale, mean absolute difference from the initial
frame is 4.35/255 around 8.4 seconds and 4.09/255 at the last frame. The current
tracking loop treats 8.4 and zero as equivalent time endpoints and returns to
zero on exit; that implementation choice does not make the seam pixel-identical.

The video has an opaque background. The supplied background closely matches its
composition and palette but is not pixel-identical (sampled empty regions differ
by about 3–8 RGB values on average). A CSS soft edge can blend the media rectangle
into it. A precise foreground-over-text effect needs a proper moving foreground
matte; a static silhouette is not accurate for the whole video.

## Reproduction

```text
ffmpeg -i 个人视频.mp4 -an -vf minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1 -c:v libx264 -preset fast -crf 22 -g 1 -keyint_min 1 -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart portrait-motion-60.mp4
ffmpeg -i 个人视频.mp4 -an -vf fps=30 -c:v libx264 -preset slow -crf 20 -g 8 -keyint_min 8 -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart portrait-gaze.mp4
ffmpeg -ss 0 -i 个人视频.mp4 -frames:v 1 -q:v 2 portrait-poster.jpg
```

Contact sheet and representative inspection frames are in
`docs/qa/portrait-media/`; the later cadence, ghosting, and motion interpolation
audit is in `docs/qa/portrait-motion-audit/`.
