/**
 * Drowsiness detection — temporal logic on top of the eye-closure signal.
 *
 * A single blink never triggers drowsiness. Closure must persist beyond the
 * configured warning / critical durations (see Settings) before escalation.
 */

import type { DrowsinessLevel } from "../types";
import { drowsinessLevelFor } from "./visionTypes";

export interface DrowsinessThresholds {
  warningDuration: number; // seconds
  criticalDuration: number; // seconds
  eyeClosureThreshold: number; // blendshape score threshold
}

export const DEFAULT_THRESHOLDS: DrowsinessThresholds = {
  warningDuration: 2.0,
  criticalDuration: 3.5,
  eyeClosureThreshold: 0.35,
};

export function isEyeClosed(blinkScore: number, t: DrowsinessThresholds): boolean {
  return blinkScore >= t.eyeClosureThreshold;
}

export function levelFor(
  closureDuration: number,
  t: DrowsinessThresholds,
): DrowsinessLevel {
  return drowsinessLevelFor(
    closureDuration,
    Math.max(0.6, t.warningDuration),
    Math.max(1.0, t.criticalDuration),
  );
}

/** Drowsiness score 0..100 derived from measured closure time (never random). */
export function scoreFor(closureDuration: number, t: DrowsinessThresholds): number {
  const crit = Math.max(1.0, t.criticalDuration);
  return Math.min(100, (closureDuration / crit) * 100);
}

export function severityLabel(level: DrowsinessLevel): string {
  switch (level) {
    case "NORMAL":
      return "NORMAL";
    case "BLINK":
      return "BLINK";
    case "WARNING":
      return "DROWSINESS WARNING";
    case "CRITICAL":
      return "CRITICAL DROWSINESS";
  }
}
