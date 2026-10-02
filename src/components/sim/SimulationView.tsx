"use client";

import { useSimulationLoop } from "@/hooks/useSimulationLoop";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useStore } from "@/lib/store";
import { AnimatePresence } from "framer-motion";
import { CameraPanel } from "./CameraPanel";
import { RoadCanvas } from "./RoadCanvas";
import { DriveControls } from "./DriveControls";
import { TelemetryPanel } from "./TelemetryPanel";
import { SafetyPanel } from "./SafetyPanel";
import { ControlPanel } from "./ControlPanel";
import { EventTimeline } from "./EventTimeline";
import { AlertBanner, DecisionPanel, ModeStrip } from "./AlertBanner";
import { SessionReport } from "./SessionReport";
import { DemoPanel } from "./DemoPanel";
import { VehicleSelector } from "./VehicleSelector";

export function SimulationView() {
  const snap = useStore((s) => s.snap);
  useSimulationLoop(true);
  useKeyboard(true);

  return (
    <div className="mx-auto max-w-[1800px] px-3 sm:px-5 py-4">
      {/* top bar: vehicle selection + state chips */}
      <div className="flex flex-wrap items-center gap-3">
        <VehicleSelector />
        <div className="ml-auto flex items-center gap-2">
          <StateChip label="AI DETECTION" active={snap.vision.active} />
          <StateChip label="SIMULATED SENSORS" active />
          <StateChip label="SAFETY ENGINE" active={snap.mode !== "IDLE"} />
          <StateChip label="VEHICLE SIM" active />
        </div>
      </div>

      {/* mode strip */}
      <div className="mt-3">
        <ModeStrip />
      </div>

      {/* main 3-column dashboard */}
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* left: camera */}
        <div className="order-2 xl:order-1">
          <CameraPanel />
        </div>

        {/* center: simulation */}
        <div className="order-1 xl:order-2 flex flex-col gap-3 min-w-0">
          <AnimatePresence>
            <AlertBanner key={bannerKey(snap)} />
          </AnimatePresence>
          <RoadCanvas />
          <DriveControls />
          <ControlPanel />
        </div>

        {/* right: telemetry + decision */}
        <div className="order-3 flex flex-col gap-3">
          <TelemetryPanel />
          <SafetyPanel />
          <DecisionPanel />
        </div>
      </div>

      {/* bottom: demo + timeline */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <DemoPanel />
        <EventTimeline />
      </div>

      <SessionReport />
    </div>
  );
}

function bannerKey(snap: ReturnType<typeof useStore.getState>["snap"]): string {
  if (snap.mode === "EMERGENCY") return "emergency";
  if (snap.mode === "AUTONOMOUS") return "autonomous";
  if (snap.mode === "STOPPING") return "stopping";
  if (snap.mode === "SAFETY_CHECK") return "check";
  if (snap.startBlockedReason) return "blocked";
  if (snap.safetyStatus === "CRITICAL") return "critical";
  if (snap.safetyStatus === "WARNING") return "warning";
  return "none";
}

function StateChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-bold tracking-widest ${
        active
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
          : "border-white/10 bg-white/[0.03] text-white/30"
      }`}
    >
      <span
        className={`sd-status-dot ${active ? "sd-pulse text-emerald-400" : "text-white/25"}`}
        aria-hidden
      />
      {label}
    </span>
  );
}
