"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { VEHICLE_META } from "@/lib/simulation/vehicleRules";
import { BrainCircuit, AlertTriangle, ShieldAlert, Ban } from "lucide-react";
import type { VehicleMode } from "@/lib/types";

/** Large state banner above the road — unmistakable at demo distance. */
export function AlertBanner() {
  const snap = useStore((s) => s.snap);

  if (snap.mode === "EMERGENCY") {
    return (
      <Banner
        tone="critical"
        title="🚨 ACCIDENT — EMERGENCY PROTOCOL ACTIVE"
        subtitle="Vehicle control disabled · emergency event logged"
      />
    );
  }
  if (snap.mode === "AUTONOMOUS") {
    return (
      <Banner
        tone="autonomous"
        title="AUTONOMOUS SAFETY MODE — MANUAL CONTROL DISABLED"
        subtitle={
          snap.decision.reason || "Bringing the vehicle to the safe stop zone"
        }
      />
    );
  }
  if (snap.mode === "STOPPING") {
    return (
      <Banner
        tone="autonomous"
        title="CONTROLLED STOP IN PROGRESS"
        subtitle={snap.decision.reason || "Safety intervention engaged"}
      />
    );
  }
  if (snap.safetyStatus === "CRITICAL" && snap.mode !== "STOPPED") {
    return (
      <Banner
        tone="critical"
        title="🚨 CRITICAL SAFETY EVENT"
        subtitle={snap.decision.reason}
      />
    );
  }
  if (snap.safetyStatus === "WARNING" && snap.mode !== "IDLE") {
    return (
      <Banner
        tone="warning"
        title="⚠ DRIVER WARNING ISSUED"
        subtitle={snap.decision.reason}
      />
    );
  }
  if (snap.mode === "SAFETY_CHECK") {
    return <Banner tone="info" title="PRE-START SAFETY CHECKS RUNNING…" subtitle="Helmet · alcohol · driver presence" />;
  }
  if (snap.startBlockedReason) {
    return (
      <Banner
        tone="warning"
        title="⛔ START BLOCKED"
        subtitle={snap.decision.reason}
      />
    );
  }
  return null;
}

function Banner({
  tone,
  title,
  subtitle,
}: {
  tone: "critical" | "autonomous" | "warning" | "info";
  title: string;
  subtitle?: string;
}) {
  const styles = {
    critical:
      "border-red-400/60 bg-red-500/15 text-red-100 sd-alert-critical",
    autonomous:
      "border-orange-400/60 bg-orange-500/15 text-orange-100",
    warning: "border-amber-400/50 bg-amber-400/12 text-amber-100",
    info: "border-teal-300/40 bg-teal-400/10 text-teal-100",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`rounded-xl border px-4 py-2.5 ${styles}`}
      role="alert"
    >
      <div className="text-sm font-black tracking-wide">{title}</div>
      {subtitle && (
        <div className="text-[11px] font-medium opacity-80 mt-0.5">{subtitle}</div>
      )}
    </motion.div>
  );
}

/** WHY DID THE SYSTEM INTERVENE? — AI decision explanation for judges. */
export function DecisionPanel() {
  const snap = useStore((s) => s.snap);
  const d = snap.decision;
  const intervened =
    d.trigger !== null &&
    d.recommendedAction !== "NONE" &&
    snap.mode !== "IDLE";

  return (
    <div className="sd-panel p-4">
      <div className="flex items-center gap-1.5">
        <BrainCircuit className="h-3.5 w-3.5 text-teal-300" />
        <span className="sd-panel-title">Why did the system intervene?</span>
      </div>

      {intervened ? (
        <div className="mt-3 space-y-2.5 text-xs">
          <Row label="Trigger" value={humanTrigger(d.trigger)} />
          {d.evidence.length > 0 && (
            <div>
              <div className="text-white/35 tracking-wider text-[10px] uppercase mb-1">
                Evidence
              </div>
              <ul className="space-y-1">
                {d.evidence.map((e, i) => (
                  <li key={i} className="flex gap-1.5 text-white/75">
                    <span className="text-teal-300 mt-0.5">•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Row label="Decision" value={humanAction(d.recommendedAction)} />
          <Row label="Vehicle" value={VEHICLE_META[snap.vehicleType].label} />
          <Row
            label="Action"
            value={actionDetail(d.recommendedAction)}
            accent
          />
          <div className="text-[9px] text-white/30 leading-relaxed">
            Decision produced by the central safety engine (evaluateSafety) from
            AI detection + simulated sensor inputs. AI DETECTION and SIMULATED
            SENSOR INPUT layers are labeled at their source.
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
          <Ban className="h-3.5 w-3.5" />
          No intervention in progress — safety monitors nominal.
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="text-white/35 tracking-wider text-[10px] uppercase w-20 shrink-0 pt-0.5">
        {label}
      </span>
      <span className={`font-semibold ${accent ? "text-orange-300" : "text-white/85"}`}>
        {value}
      </span>
    </div>
  );
}

function humanTrigger(t: string | null): string {
  switch (t) {
    case "ALCOHOL":
      return "Alcohol detection";
    case "DROWSINESS":
      return "Critical drowsiness";
    case "HELMET":
      return "Helmet interlock";
    case "ACCIDENT":
      return "Accident / impact";
    case "DRIVER_PRESENCE":
      return "Driver presence lost";
    case "EMERGENCY":
      return "Operator emergency stop";
    default:
      return "Safety rule";
  }
}

function humanAction(a: string): string {
  switch (a) {
    case "BLOCK_START":
      return "Engine start blocked";
    case "WARN":
      return "Driver warning issued";
    case "REDUCE_POWER":
      return "Motor power reduction";
    case "CONTROLLED_STOP":
      return "Controlled safety stop";
    case "AUTONOMOUS_STOP":
      return "Autonomous safety stop";
    case "EMERGENCY_STOP":
      return "Emergency stop";
    default:
      return "None";
  }
}

function actionDetail(a: string): string {
  switch (a) {
    case "AUTONOMOUS_STOP":
      return "Reduce speed → move to roadside → stop in safe zone";
    case "CONTROLLED_STOP":
      return "Warn → brake smoothly → stop";
    case "REDUCE_POWER":
      return "Limit motor power → glide to a stop";
    case "BLOCK_START":
      return "Keep ignition locked until condition cleared";
    case "EMERGENCY_STOP":
      return "Disable control → full braking → stop";
    default:
      return "—";
  }
}

/** Mode chip row under the canvas. */
export function ModeStrip() {
  const snap = useStore((s) => s.snap);
  const modes: VehicleMode[] = [
    "IDLE",
    "SAFETY_CHECK",
    "READY",
    "MANUAL",
    "WARNING",
    "AUTONOMOUS",
    "STOPPING",
    "STOPPED",
  ];
  const activeIdx = modes.indexOf(snap.mode);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {modes.map((m, i) => (
        <div
          key={m}
          className={`px-2 py-1 rounded-md text-[9px] font-bold tracking-wider border transition-colors ${
            i === activeIdx
              ? snap.mode === "WARNING"
                ? "bg-amber-400/20 border-amber-400/50 text-amber-200"
                : snap.mode === "AUTONOMOUS"
                  ? "bg-orange-500/25 border-orange-400/60 text-orange-200"
                  : snap.mode === "STOPPED"
                    ? "bg-emerald-400/15 border-emerald-400/40 text-emerald-200"
                    : "bg-white/12 border-white/25 text-white"
              : "bg-white/[0.03] border-white/8 text-white/30"
          }`}
        >
          {m}
        </div>
      ))}
    </div>
  );
}

export function AlertIcons() {
  return (
    <div className="flex gap-1">
      <AlertTriangle className="h-3 w-3 text-amber-400" />
      <ShieldAlert className="h-3 w-3 text-red-400" />
    </div>
  );
}
