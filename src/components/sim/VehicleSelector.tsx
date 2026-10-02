"use client";

import { useStore } from "@/lib/store";
import { VEHICLE_META } from "@/lib/simulation/vehicleRules";
import type { VehicleType } from "@/lib/types";

/** Compact vehicle switcher shown at the top of the simulation dashboard. */
export function VehicleSelector() {
  const snap = useStore((s) => s.snap);
  const selectVehicle = useStore((s) => s.selectVehicle);
  const types: VehicleType[] = ["BIKE", "CAR", "TRUCK"];

  return (
    <div
      className="flex items-center gap-1.5 p-1 rounded-xl border border-white/10 bg-white/[0.04]"
      role="group"
      aria-label="Vehicle selection"
    >
      {types.map((t) => {
        const meta = VEHICLE_META[t];
        const active = snap.vehicleType === t;
        const switchable =
          snap.mode === "IDLE" || snap.mode === "READY" || snap.mode === "STOPPED";
        return (
          <button
            key={t}
            onClick={() => switchable && selectVehicle(t)}
            disabled={!switchable}
            title={
              switchable
                ? `Switch to ${meta.label}`
                : "Reset the scenario before switching vehicle"
            }
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-colors disabled:cursor-not-allowed ${
              active
                ? "bg-orange-500/20 border border-orange-400/50 text-orange-200"
                : "border border-transparent text-white/50 hover:text-white hover:bg-white/6 disabled:hover:text-white/50"
            }`}
          >
            <span aria-hidden>{meta.icon}</span>
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
