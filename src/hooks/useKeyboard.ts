"use client";

/**
 * Keyboard vehicle control (only effective while manual control is enabled
 * inside the engine):
 *   W / ↑  accelerate     S / ↓  brake
 *   A / ←  steer left     D / →  steer right
 *   SPACE  emergency stop
 */

import { useEffect } from "react";
import { simulationEngine } from "@/lib/simulation/engine";

const CONTROL_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  " ",
]);

export function useKeyboard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const pressed = new Set<string>();

    const normalize = (k: string) => (k.length === 1 ? k.toLowerCase() : k.toLowerCase());

    const onKeyDown = (e: KeyboardEvent) => {
      const k = normalize(e.key);
      if (!CONTROL_KEYS.has(k)) return;
      // don't hijack keys while typing in inputs
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      pressed.add(k);
      if (k === " ") {
        simulationEngine.emergencyStop();
        pressed.delete(" ");
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = normalize(e.key);
      pressed.delete(k);
    };

    const apply = () => {
      const throttle =
        pressed.has("w") || pressed.has("arrowup") ? 1 : 0;
      const brake = pressed.has("s") || pressed.has("arrowdown") ? 1 : 0;
      const steer =
        (pressed.has("d") || pressed.has("arrowright") ? 1 : 0) -
        (pressed.has("a") || pressed.has("arrowleft") ? 1 : 0);
      simulationEngine.setThrottle(throttle);
      simulationEngine.setBrake(brake);
      simulationEngine.setSteer(steer);
    };

    const iv = setInterval(apply, 50);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      clearInterval(iv);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      pressed.clear();
    };
  }, [active]);
}
