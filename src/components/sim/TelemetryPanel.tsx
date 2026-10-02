"use client";

import { useStore } from "@/lib/store";
import { VEHICLE_META } from "@/lib/simulation/vehicleRules";
import { Gauge, MoveHorizontal, Activity, Route, Zap } from "lucide-react";

export function TelemetryPanel() {
  const snap = useStore((s) => s.snap);
  const meta = VEHICLE_META[snap.vehicleType];
  const speedPct = Math.min(100, (snap.speedKmh / (meta.label === "BIKE" ? 80 : meta.label === "CAR" ? 120 : 90)) * 100);
  const steerLabel =
    snap.steer > 0.15 ? "RIGHT" : snap.steer < -0.15 ? "LEFT" : "CENTER";
  const lateral = snap.lateral;

  return (
    <div className="sd-panel p-4">
      <div className="flex items-center justify-between">
        <span className="sd-panel-title">Vehicle Telemetry</span>
        <span className="text-[10px] tracking-widest text-white/35 uppercase">
          Simulated
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl" aria-hidden>{meta.icon}</span>
        <div>
          <div className="text-lg font-black text-white tracking-wide">{meta.label}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest">
            {snap.engineOn ? "Engine running" : "Engine off"}
            {snap.powerLimited && (
              <span className="ml-1.5 text-amber-400 font-semibold">POWER LIMITED</span>
            )}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="sd-mono text-3xl font-bold text-white leading-none">
            {snap.speedKmh.toFixed(0)}
          </div>
          <div className="text-[10px] text-white/40 tracking-widest">KM/H</div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <Bar
          icon={<Gauge className="h-3 w-3" />}
          label="SPEED"
          value={`${snap.speedKmh.toFixed(0)} km/h`}
          pct={speedPct}
          color="bg-orange-400"
        />
        <Bar
          icon={<Activity className="h-3 w-3" />}
          label="ACCELERATION"
          value={`${snap.accelMs2 > 0 ? "+" : ""}${snap.accelMs2.toFixed(1)} m/s²`}
          pct={Math.min(100, Math.abs(snap.accelMs2) * 12)}
          color={snap.accelMs2 < -0.5 ? "bg-red-400" : "bg-teal-300"}
        />
        <Bar
          icon={<Route className="h-3 w-3" />}
          label="ROADSIDE OFFSET"
          value={`${lateral.toFixed(1)} m`}
          pct={Math.min(100, (Math.max(0, lateral) / 6.5) * 100)}
          color="bg-amber-400"
        />
        <div className="flex items-center gap-2 text-[11px]">
          <MoveHorizontal className="h-3 w-3 text-white/40" />
          <span className="text-white/40 tracking-wider">STEERING</span>
          <span className="ml-auto font-semibold text-white/80">
            {snap.controlLocked ? "LOCKED" : steerLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <Zap className="h-3 w-3 text-white/40" />
          <span className="text-white/40 tracking-wider">ODOMETER</span>
          <span className="ml-auto font-semibold text-white/80 sd-mono">
            {(snap.odometerM / 1000).toFixed(2)} km
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-white/40 tracking-wider">HAZARD LIGHTS</span>
          <span
            className={`ml-auto font-semibold tracking-wider ${
              snap.hazardsOn ? "text-amber-400 sd-blink" : "text-white/40"
            }`}
          >
            {snap.hazardsOn ? "● ACTIVE" : "OFF"}
          </span>
        </div>
      </div>
    </div>
  );
}

function Bar({
  icon,
  label,
  value,
  pct,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] mb-1">
        <span className="text-white/40">{icon}</span>
        <span className="text-white/40 tracking-wider">{label}</span>
        <span className="ml-auto font-semibold text-white/80 sd-mono">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}
