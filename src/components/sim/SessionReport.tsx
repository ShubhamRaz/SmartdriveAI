"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { fmtDuration, fmtSeconds } from "@/lib/timestamps";
import { VEHICLE_META } from "@/lib/simulation/vehicleRules";
import { FileDown, Printer, ShieldCheck, X } from "lucide-react";
import type { SessionRecord } from "@/lib/types";

export function SessionReport() {
  const report = useStore((s) => s.report);
  const open = useStore((s) => s.reportOpen);
  const dismiss = useStore((s) => s.dismissReport);
  const exportReport = useStore((s) => s.exportReport);

  return (
    <AnimatePresence>
      {open && report && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Simulation report"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="sd-panel w-full max-w-lg p-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sd-print-area bg-[#0a0f14]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.04]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-black tracking-[0.18em] text-white">
                    SIMULATION REPORT
                  </h2>
                </div>
                <button
                  onClick={dismiss}
                  aria-label="Close report"
                  className="text-white/50 hover:text-white print:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ReportBody r={report} />
            </div>

            <div className="flex gap-2 px-5 py-3.5 border-t border-white/10 print:hidden">
              <button
                onClick={exportReport}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold transition-colors"
              >
                <FileDown className="h-3.5 w-3.5" /> EXPORT REPORT (JSON)
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/8 hover:bg-white/14 border border-white/10 text-white text-xs font-bold transition-colors"
              >
                <Printer className="h-3.5 w-3.5" /> PRINT / SAVE PDF
              </button>
              <button
                onClick={dismiss}
                className="px-3 py-2 rounded-lg bg-white/8 hover:bg-white/14 border border-white/10 text-white text-xs font-bold transition-colors"
              >
                CLOSE
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ReportBody({ r }: { r: SessionRecord }) {
  const meta = VEHICLE_META[r.vehicle];
  return (
    <div className="px-5 py-4 space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vehicle" value={`${meta.icon} ${meta.label}`} />
        <Field label="Duration" value={fmtDuration(r.durationSec)} />
        <Field
          label="Intervention"
          value={r.intervention ?? "None"}
        />
        <Field
          label="Intervention Time"
          value={fmtSeconds(r.interventionTimeSec)}
        />
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/35 mb-1">
          Result
        </div>
        <div
          className={`inline-block px-3 py-1.5 rounded-lg text-sm font-black tracking-widest border ${
            r.result === "EMERGENCY_STOP"
              ? "border-red-400/50 bg-red-500/15 text-red-200"
              : "border-emerald-400/50 bg-emerald-500/12 text-emerald-200"
          }`}
        >
          {r.result.replace("_", " ")}
        </div>
      </div>

      <Field label="Reason" value={r.reason ?? "—"} />

      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/35 mb-1.5">
          Safety event counters
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          <Counter label="Drowsiness" value={r.counts.drowsiness} />
          <Counter label="Alcohol" value={r.counts.alcohol} />
          <Counter label="Accident" value={r.counts.accident} />
          <Counter label="Interventions" value={r.counts.interventions} />
          <Counter label="Safe stops" value={r.counts.safeStops} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-[10px] text-white/40 sd-mono">
        <span>INFO {r.eventCounts.info}</span>
        <span className="text-amber-300/70">WARN {r.eventCounts.warning}</span>
        <span className="text-red-300/70">CRIT {r.eventCounts.critical}</span>
        <span className="text-orange-300/70">AI {r.eventCounts.ai}</span>
      </div>

      <div className="text-[9px] text-white/30">
        Report ID {r.id} · Generated locally · SIMULATION MODE — NOT FOR REAL
        VEHICLE CONTROL
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/35">
        {label}
      </div>
      <div className="mt-0.5 font-semibold text-white/85">{value}</div>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.04] px-2 py-1.5 text-center">
      <div className="sd-mono text-base font-bold text-white">{value}</div>
      <div className="text-[9px] text-white/40 leading-tight">{label}</div>
    </div>
  );
}
