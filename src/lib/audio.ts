/**
 * Web Audio based alert tones — no external audio files required.
 * All tones are synthesised locally in the browser.
 */

export type AudioCue =
  | "WARNING"
  | "CRITICAL"
  | "TAKEOVER"
  | "SAFE_STOP"
  | "ACCIDENT"
  | "BLOCKED"
  | "START";

let ctx: AudioContext | null = null;
let muted = false;

export function setAudioMuted(m: boolean) {
  muted = m;
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Unlock audio on first user gesture (called from start buttons). */
export function unlockAudio() {
  ensureCtx();
}

interface ToneOpts {
  freq: number;
  durationMs: number;
  delayMs?: number;
  type?: OscillatorType;
  gain?: number;
  sweepTo?: number;
}

function tone({
  freq,
  durationMs,
  delayMs = 0,
  type = "sine",
  gain = 0.14,
  sweepTo,
}: ToneOpts) {
  const ac = ensureCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delayMs / 1000;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo) {
    osc.frequency.linearRampToValueAtTime(sweepTo, t0 + durationMs / 1000);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.setValueAtTime(gain, t0 + durationMs / 1000 - 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.05);
}

export function playCue(cue: AudioCue) {
  if (muted) return;
  switch (cue) {
    case "START":
      tone({ freq: 440, durationMs: 90, type: "triangle" });
      tone({ freq: 660, durationMs: 120, delayMs: 100, type: "triangle" });
      break;
    case "WARNING":
      // double beep
      tone({ freq: 660, durationMs: 140, type: "square", gain: 0.09 });
      tone({
        freq: 660,
        durationMs: 140,
        delayMs: 200,
        type: "square",
        gain: 0.09,
      });
      break;
    case "CRITICAL":
      for (let i = 0; i < 3; i++) {
        tone({
          freq: 880,
          durationMs: 110,
          delayMs: i * 180,
          type: "square",
          gain: 0.12,
        });
      }
      break;
    case "TAKEOVER":
      // rising sweep — autonomous takeover alert
      tone({ freq: 420, sweepTo: 900, durationMs: 520, type: "sawtooth", gain: 0.1 });
      tone({ freq: 900, durationMs: 160, delayMs: 560, type: "square", gain: 0.1 });
      break;
    case "SAFE_STOP":
      // soft chime
      tone({ freq: 523, durationMs: 180, type: "sine", gain: 0.12 });
      tone({ freq: 659, durationMs: 180, delayMs: 170, type: "sine", gain: 0.12 });
      tone({ freq: 784, durationMs: 320, delayMs: 340, type: "sine", gain: 0.12 });
      break;
    case "ACCIDENT":
      tone({ freq: 130, durationMs: 700, type: "sawtooth", gain: 0.2 });
      tone({ freq: 98, durationMs: 500, delayMs: 120, type: "square", gain: 0.16 });
      break;
    case "BLOCKED":
      tone({ freq: 220, durationMs: 200, type: "square", gain: 0.1 });
      tone({ freq: 180, durationMs: 260, delayMs: 230, type: "square", gain: 0.1 });
      break;
  }
}
