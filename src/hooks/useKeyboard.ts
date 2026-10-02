"use client";

/**
 * Keyboard vehicle control (only effective while manual control is enabled
 * inside the engine):
 *   W / ↑  accelerate     S / ↓  brake
 *   A / ←  steer left     D / →  steer right
 *   SPACE  emergency stop
 *
 * Event-driven: input is only written to the engine when a key state actually
 * changes, so the on-screen pad channel is never stomped by an idle poll.
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
    let raf = 0;

    const normalize = (k: string) => k.toLowerCase();

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

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = normalize(e.key);
      if (!CONTROL_KEYS.has(k)) return;
      // don't hijack keys while typing in inputs
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      if (k === " ") {
        simulationEngine.emergencyStop();
        return;
      }
      if (!pressed.has(k)) {
        pressed.add(k);
        schedule();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = normalize(e.key);
      if (pressed.delete(k)) schedule();
    };

    // window losing focus must not leave keys stuck down
    const onBlur = () => {
      if (pressed.size) {
        pressed.clear();
        schedule();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      pressed.clear();
    };
  }, [active]);
}
