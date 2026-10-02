/**
 * Helmet detection — pluggable layer.
 *
 * There is no reliable browser-runnable helmet classifier that works fully
 * offline without a trained model. Per the project spec, a clearly labeled
 * SIMULATION detector is used so the bike demo always works, and the UI
 * never implies it is a certified vision model. A real detector can be
 * plugged in via registerHelmetDetector().
 */

import type { HelmetStateValue } from "../types";
import {
  getHelmetDetector,
  helmetDetectors,
  registerHelmetDetector,
  SimulatedHelmetDetector,
} from "./visionTypes";

export { getHelmetDetector, helmetDetectors, registerHelmetDetector };

export function detectHelmet(): { state: HelmetStateValue; source: "SIMULATION" | "VISION"; detector: string } {
  const d = getHelmetDetector();
  return {
    state: d.detect(),
    source: d.source,
    detector: d.label,
  };
}

export function setSimulatedHelmetWorn(worn: boolean) {
  const d = helmetDetectors.simulated;
  if (d instanceof SimulatedHelmetDetector) {
    d.setWorn(worn);
  }
}
