/**
 * Vision type contracts shared by the AI pipeline modules.
 */

import type {
  DrowsinessLevel,
  HelmetStateValue,
} from "../types";

export interface FaceBox {
  x: number; // normalized 0..1
  y: number;
  w: number;
  h: number;
}

export interface FaceReading {
  faceDetected: boolean;
  eyeClosed: boolean;
  blinkScore: number; // 0..1 (1 = fully closed)
  headYaw: number; // -1..1 (negative = left, positive = right)
  box: FaceBox | null;
}

export function eyeClosedFromScore(score: number, threshold: number): boolean {
  return score >= threshold;
}

export function drowsinessLevelFor(
  closureDuration: number,
  warningDuration: number,
  criticalDuration: number,
): DrowsinessLevel {
  if (closureDuration >= criticalDuration) return "CRITICAL";
  if (closureDuration >= warningDuration) return "WARNING";
  if (closureDuration > 0.18) return "BLINK";
  return "NORMAL";
}

/** Pluggable helmet detection architecture. */
export interface HelmetDetector {
  id: string;
  label: string;
  source: "SIMULATION" | "VISION";
  detect(): HelmetStateValue;
}

/**
 * Clearly-labeled simulation detector. Browser helmet classification without
 * a dedicated trained model is not reliable, so the demo always uses this
 * detector and the UI labels the source as SIMULATION.
 */
export class SimulatedHelmetDetector implements HelmetDetector {
  id = "simulated";
  label = "Simulated helmet detector";
  source = "SIMULATION" as const;
  private worn = false;

  setWorn(worn: boolean) {
    this.worn = worn;
  }

  detect(): HelmetStateValue {
    return this.worn ? "HELMET_DETECTED" : "HELMET_NOT_DETECTED";
  }
}

export const helmetDetectors: Record<string, HelmetDetector> = {
  simulated: new SimulatedHelmetDetector(),
};

let activeHelmetDetector: HelmetDetector = helmetDetectors.simulated;

export function getHelmetDetector(): HelmetDetector {
  return activeHelmetDetector;
}

export function registerHelmetDetector(d: HelmetDetector) {
  helmetDetectors[d.id] = d;
  activeHelmetDetector = d;
}
