"use client";

import { useStore } from "@/lib/store";
import {
  Eye,
  Wine,
  User,
  HardHat,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { SafetyStatus } from "@/lib/types";

const SEVERITY_STYLE: Record<SafetyStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  SAFE: { bg: "border-emerald-400/30 bg-emerald-400/10", text: "text-emerald-300", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  WARNING: { bg: "border-amber-400/30 bg-amber-400/10", text: "text-amber-300", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  CRITICAL: { bg: "border-red-400/30 bg-red-400/10", text: "text-red-300", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  EMERGENCY: { bg: "border-red-500/40 bg-red-500/12", text: "text-red-300", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
};

export function SafetyPanel() {
  const snap = useStore((s) => s.snap);
  const sev = SEVERITY_STYLE[snap.safetyStatus];

  const drowsy = snap.drowsiness;
  const drowsyColor =
    drowsy.level === "CRITICAL"
      ? "text-red-300"
      : drowsy.level === "WARNING"
        ? "text-amber-300"
        : drowsy.level === "BLINK"
          ? "text-white/80"
          : "text-emerald-300";

  return (
    <div className="sd-panel p-4">
      <div className="flex items-center justify-between">
        <span className="sd-panel-title">AI Safety Status</span>
        <span
          className={`flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md border ${sev.bg} ${sev.text}`}
        >
          {sev.icon}
          {snap.safetyStatus}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {/* drowsiness */}
        <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2.5">
          <div className="flex items-center gap-2 text-[11px]">
            <Eye className="h-3.5 w-3.5 text-white/45" />
            <span className="text-white/45 tracking-wider">DROWSINESS</span>
            <span className={`ml-auto font-bold tracking-wider text-[11px] ${drowsyColor}`}>
              {drowsy.level === "WARNING" ? "⚠ DROWSINESS WARNING" : drowsy.level === "CRITICAL" ? "🚨 CRITICAL" : drowsy.level}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] sd-mono">
            <Metric label="EYE STATE" value={drowsy.eyeClosed ? "CLOSED" : "OPEN"} />
            <Metric label="CLOSURE" value={`${drowsy.closureDuration.toFixed(1)}s`} />
            <Metric
              label="SOURCE"
              value={drowsy.source === "NONE" ? "STANDBY" : drowsy.source}
              muted={drowsy.source === "NONE"}
            />
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${drowsy.level === "CRITICAL" ? "bg-red-400" : drowsy.level === "WARNING" ? "bg-amber-400" : "bg-teal-300"}`}
              style={{ width: `${drowsy.score}%` }}
            />
          </div>
          <div className="mt-1 text-[9px] text-white/30">
            Measured closure time vs critical threshold — never simulated randomness
          </div>
        </div>

        {/* driver + helmet */}
        <div className="grid grid-cols-2 gap-2">
          <StatusCard
            icon={<User className="h-3.5 w-3.5" />}
            label="DRIVER"
            value={
              snap.driver.source === "CAMERA"
                ? snap.driver.faceDetected
                  ? "DETECTED"
                  : "NOT DETECTED"
                : "MONITORED"
            }
            sub={`SRC: ${snap.driver.source === "NONE" ? "STANDBY" : snap.driver.source}`}
            ok={snap.driver.source !== "CAMERA" || snap.driver.faceDetected}
          />
          <StatusCard
            icon={<HardHat className="h-3.5 w-3.5" />}
            label="HELMET"
            value={
              snap.vehicleType !== "BIKE"
                ? "N/A"
                : snap.helmet.state === "HELMET_DETECTED"
                  ? "✓ DETECTED"
                  : "✕ NOT DETECTED"
            }
            sub={snap.vehicleType === "BIKE" ? `SRC: ${snap.helmet.source}` : "—"}
            ok={snap.vehicleType !== "BIKE" || snap.helmet.state === "HELMET_DETECTED"}
            warn={snap.vehicleType !== "BIKE"}
          />
        </div>

        {/* alcohol */}
        <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2.5">
          <div className="flex items-center gap-2 text-[11px]">
            <Wine className="h-3.5 w-3.5 text-white/45" />
            <span className="text-white/45 tracking-wider">ALCOHOL SENSOR</span>
            <span
              className={`ml-auto font-bold tracking-wider ${snap.alcohol.detected ? "text-red-300" : "text-emerald-300"}`}
            >
              {snap.alcohol.detected ? "🚨 DETECTED" : "✓ SAFE"}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[9px] text-white/35">SAFE</span>
            <div className="relative flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div
                className={`h-full ${snap.alcohol.detected ? "bg-red-400" : "bg-emerald-400"}`}
                style={{ width: `${snap.alcohol.level}%` }}
              />
              <div
                className="absolute top-[-2px] h-[10px] w-[2px] bg-white/60"
                style={{ left: `${snap.alcohol.threshold}%` }}
                title={`Threshold ${snap.alcohol.threshold}`}
              />
            </div>
            <span className="text-[9px] text-white/35">DANGER</span>
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] sd-mono text-white/55">
            <span>LEVEL {snap.alcohol.level.toFixed(0)}</span>
            <span className="text-white/35">THRESHOLD {snap.alcohol.threshold}</span>
            <span className="text-white/35">SRC: {snap.alcohol.source}</span>
          </div>
        </div>

        {/* control mode */}
        <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] p-2.5 text-[11px]">
          <ShieldAlert className="h-3.5 w-3.5 text-white/45" />
          <span className="text-white/45 tracking-wider">CONTROL</span>
          <span
            className={`ml-auto font-bold tracking-widest ${
              snap.controlMode === "AUTONOMOUS"
                ? "text-orange-300"
                : snap.controlMode === "LOCKED"
                  ? "text-red-300"
                  : snap.controlMode === "AUTOPILOT"
                    ? "text-cyan-300"
                    : "text-emerald-300"
            }`}
          >
            {snap.controlMode}
          </span>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="text-white/30 tracking-wider">{label}</div>
      <div className={`font-semibold ${muted ? "text-white/35" : "text-white/85"}`}>{value}</div>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  sub,
  ok,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  ok?: boolean;
  warn?: boolean;
}) {
  const color = warn ? "text-white/45" : ok ? "text-emerald-300" : "text-red-300";
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-white/45 tracking-wider">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-[11px] font-bold ${color}`}>{value}</div>
      <div className="text-[9px] text-white/30 mt-0.5">{sub}</div>
    </div>
  );
}

export function SeverityLegend() {
  return (
    <div className="flex items-center gap-1.5 text-[9px] text-white/30">
      <XCircle className="h-3 w-3" /> Status text is always provided in addition
      to colors for accessibility.
    </div>
  );
}
