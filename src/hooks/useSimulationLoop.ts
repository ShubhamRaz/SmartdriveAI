"use client";

/**
 * Main simulation loop — drives the engine at 60 fps, mirrors a snapshot
 * into the store at ~10 Hz, and advances the demo scenario runner.
 */

import { useEffect } from "react";
import { simulationEngine } from "@/lib/simulation/engine";
import { useStore } from "@/lib/store";

export function useSimulationLoop(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    let lastSync = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      try {
        simulationEngine.tick(dt);
      } catch {
        /* engine robustness: never let one bad tick kill the loop */
      }

      const st = useStore.getState();
      try {
        st.demoTick(now);
      } catch {
        /* ignore */
      }
      if (now - lastSync > 100) {
        lastSync = now;
        st.sync();
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}
