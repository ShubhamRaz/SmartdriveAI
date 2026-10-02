"use client";

import { useStore } from "@/lib/store";
import { simulationEngine } from "@/lib/simulation/engine";
import {
  Play,
  Square,
  RotateCcw,
  Wine,
  Eye,
  CarFront,
  AlertOctagon,
  Lock,
  HardHat,
  Keyboard,
} from "lucide-react";
import type { VehicleType } from "@/lib/types";

export function ControlPanel() {
  const snap = useStore((s) => s.snap);
  const start = useStore((s) => s.start);
  const stop = useStore((s) => s.stop);
  const reset = useStore((s) => s.reset);
  const emergencyStop = useStore((s) => s.emergencyStop);
  const simulateAccident = useStore((s) => s.simulateAccident);
  const triggerAlcohol = useStore((s) => s.triggerAlcohol);
  const setAlcoholLevel = useStore((s) => s.setAlcoholLevel);
  const triggerDrowsiness = useStore((s) => s.triggerDrowsiness);
  const setHelmet = useStore((s) => s.setHelmet);
  const settings = useStore((s) => s.settings);

  const engineOff = snap.mode === "IDLE" || snap.mode === "SAFETY_CHECK";
  const manualControl =
    !snap.controlLocked &&
    (snap.mode === "READY" || snap.mode === "MANUAL" || snap.mode === "WARNING");
  const drowsySimOn = simulationEngine.simDrowsiness;
  const helmetWorn = snap.helmet.state === "HELMET_DETECTED";

  return (
    <div className="sd-panel p-4">
      <div className="flex items-center justify-between">
        <span className="sd-panel-title">Simulation Controls</span>
        <span className="hidden sm:flex items-center gap-1 text-[9px] text-white/30 tracking-wider">
          <Keyboard className="h-3 w-3" /> W/A/S/D + SPACE
        </span>
      </div>

      {/* primary controls */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={start}
          disabled={snap.mode !== "IDLE" && snap.mode !== "STOPPED"}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/6 disabled:text-white/30 text-black text-xs font-bold transition-colors"
        >
          <Play className="h-3.5 w-3.5 fill-current" /> START
        </button>
        <button
          onClick={stop}
          disabled={snap.mode === "IDLE" || snap.mode === "SAFETY_CHECK" || snap.mode === "STOPPED"}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/8 hover:bg-white/14 disabled:bg-white/4 disabled:text-white/25 text-white text-xs font-bold border border-white/10 transition-colors"
        >
          <Square className="h-3.5 w-3.5" /> STOP
        </button>
        <button
          onClick={reset}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/8 hover:bg-white/14 text-white text-xs font-bold border border-white/10 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" /> RESET
        </button>
        <button
          onClick={emergencyStop}
          disabled={snap.mode === "IDLE" || snap.mode === "SAFETY_CHECK" || snap.mode === "STOPPED"}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-500/90 hover:bg-red-500 disabled:bg-white/6 disabled:text-white/30 text-white text-xs font-bold transition-colors"
        >
          <AlertOctagon className="h-3.5 w-3.5" /> EMERGENCY
        </button>
      </div>

      {/* event triggers */}
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => triggerAlcohol(true)}
          disabled={snap.alcohol.detected}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 border border-rose-400/30 text-rose-200 text-xs font-semibold transition-colors"
        >
          <Wine className="h-3.5 w-3.5" /> SIMULATE ALCOHOL
        </button>
        <button
          onClick={() => triggerDrowsiness(!drowsySimOn)}
          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
            drowsySimOn
              ? "bg-amber-400/25 border-amber-300/50 text-amber-100"
              : "bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/30 text-amber-200"
          }`}
        >
          <Eye className="h-3.5 w-3.5" /> {drowsySimOn ? "DROWSY: ON" : "SIMULATE DROWSINESS"}
        </button>
        <button
          onClick={simulateAccident}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-500/12 hover:bg-red-500/22 border border-red-400/30 text-red-200 text-xs font-semibold transition-colors"
        >
          <CarFront className="h-3.5 w-3.5" /> SIMULATE ACCIDENT
        </button>
        {snap.vehicleType === "BIKE" ? (
          <button
            onClick={() => setHelmet(!helmetWorn)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
              helmetWorn
                ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
                : "bg-white/6 hover:bg-white/12 border-white/12 text-white/70"
            }`}
          >
            <HardHat className="h-3.5 w-3.5" /> HELMET: {helmetWorn ? "ON" : "OFF"}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/3 border border-white/6 text-white/25 text-xs">
            <Lock className="h-3.5 w-3.5" /> HELMET N/A
          </div>
        )}
      </div>

      {/* alcohol sensor slider */}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-[10px] text-white/40 tracking-wider whitespace-nowrap">
          ALCOHOL SENSOR {snap.alcohol.level.toFixed(0)}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={snap.alcohol.level}
          aria-label="Alcohol sensor level"
          onChange={(e) => setAlcoholLevel(Number(e.target.value))}
          className="flex-1 accent-orange-400"
        />
        <span className="text-[10px] text-white/35 sd-mono whitespace-nowrap">
          TH {settings.alcoholThreshold}
        </span>
      </div>

      {snap.startBlockedReason && engineOff && (
        <div className="mt-2.5 rounded-lg border border-red-400/40 bg-red-500/12 px-3 py-2 text-xs font-bold text-red-200 tracking-wide">
          ⛔ START BLOCKED — {snap.startBlockedReason}
          <span className="ml-2 font-medium text-red-200/70">
            (clear the condition, then RESET)
          </span>
        </div>
      )}
      {snap.stoppedByIntervention && snap.mode === "STOPPED" && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
          <Lock className="h-3.5 w-3.5" /> MANUAL CONTROL LOCKED — press RESET to
          run a new scenario
        </div>
      )}
      {manualControl && (
        <div className="mt-2.5 text-[10px] text-white/35 flex items-center gap-1.5">
          <Keyboard className="h-3 w-3" />
          Manual driving: hold GAS pedal or W/↑ throttle · S/↓ brake · A/← D/→
          steer · P autopilot · SPACE emergency stop
        </div>
      )}
    </div>
  );
}

export function vehicleLabel(t: VehicleType): string {
  return t;
}
