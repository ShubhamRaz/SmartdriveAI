"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useStore } from "@/lib/store";
import { fmtClock, fmtDuration } from "@/lib/timestamps";
import { VEHICLE_META } from "@/lib/simulation/vehicleRules";
import { Activity, ShieldAlert, Eye, Wine, CarFront, Timer, CheckCircle2, Sparkles } from "lucide-react";

const EVENT_COLORS = ["#38bdf8", "#fbbf24", "#f87171", "#f97316", "#34d399"];
const OUTCOME_COLORS: Record<string, string> = {
  SAFE_STOP: "#34d399",
  EMERGENCY_STOP: "#f87171",
  MANUAL_STOP: "#94a3b8",
  INCOMPLETE: "#64748b",
};

export function AnalyticsView() {
  const sessions = useStore((s) => s.sessions);
  const clearAllData = useStore((s) => s.clearAllData);

  const totals = useMemo(() => {
    let interventions = 0;
    let drowsiness = 0;
    let alcohol = 0;
    let accident = 0;
    let safeStops = 0;
    let interventionTimeSum = 0;
    let interventionTimeN = 0;
    for (const s of sessions) {
      interventions += s.counts.interventions;
      drowsiness += s.counts.drowsiness;
      alcohol += s.counts.alcohol;
      accident += s.counts.accident;
      safeStops += s.counts.safeStops;
      if (s.interventionTimeSec !== null && s.interventionTimeSec > 0) {
        interventionTimeSum += s.interventionTimeSec;
        interventionTimeN += 1;
      }
    }
    return {
      interventions,
      drowsiness,
      alcohol,
      accident,
      safeStops,
      avgIntervention: interventionTimeN > 0 ? interventionTimeSum / interventionTimeN : null,
    };
  }, [sessions]);

  const eventsByType = useMemo(() => {
    const acc = { INFO: 0, WARNING: 0, CRITICAL: 0, AI: 0, SAFE: 0 };
    for (const s of sessions) {
      acc.INFO += s.eventCounts.info;
      acc.WARNING += s.eventCounts.warning;
      acc.CRITICAL += s.eventCounts.critical;
      acc.AI += s.eventCounts.ai;
      acc.SAFE += s.counts.safeStops;
    }
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const byVehicle = useMemo(() => {
    const acc: Record<string, number> = { BIKE: 0, CAR: 0, TRUCK: 0 };
    for (const s of sessions) {
      acc[s.vehicle] += s.counts.interventions;
    }
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const outcomes = useMemo(() => {
    const acc: Record<string, number> = {
      SAFE_STOP: 0,
      EMERGENCY_STOP: 0,
      MANUAL_STOP: 0,
      INCOMPLETE: 0,
    };
    for (const s of sessions) acc[s.result] += 1;
    return Object.entries(acc)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const hasData = sessions.length > 0;

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">
            Simulation Analytics
          </h1>
          <p className="text-xs text-white/45 mt-0.5">
            Aggregated from sessions stored locally in your browser.
          </p>
        </div>
        {hasData && (
          <button
            onClick={clearAllData}
            className="px-3 py-1.5 rounded-lg border border-red-400/30 bg-red-500/10 text-red-200 text-xs font-semibold hover:bg-red-500/20"
          >
            CLEAR ALL DATA
          </button>
        )}
      </div>

      {/* stat cards */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2.5">
        <Stat icon={<Activity className="h-3.5 w-3.5" />} label="Simulations" value={sessions.length} />
        <Stat icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Interventions" value={totals.interventions} />
        <Stat icon={<Eye className="h-3.5 w-3.5" />} label="Drowsiness" value={totals.drowsiness} />
        <Stat icon={<Wine className="h-3.5 w-3.5" />} label="Alcohol" value={totals.alcohol} />
        <Stat icon={<CarFront className="h-3.5 w-3.5" />} label="Accidents" value={totals.accident} />
        <Stat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Safe stops" value={totals.safeStops} />
        <Stat
          icon={<Timer className="h-3.5 w-3.5" />}
          label="Avg intervention"
          value={totals.avgIntervention !== null ? `${totals.avgIntervention.toFixed(1)}s` : "—"}
        />
      </div>

      {hasData ? (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <ChartCard title="Safety Events by Type">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={eventsByType} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} stroke="rgba(255,255,255,0.15)" />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} stroke="rgba(255,255,255,0.15)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#0d1420", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                  />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                    {eventsByType.map((_, i) => (
                      <Cell key={i} fill={EVENT_COLORS[i % EVENT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Interventions by Vehicle">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byVehicle} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} stroke="rgba(255,255,255,0.15)" />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} stroke="rgba(255,255,255,0.15)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#0d1420", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                  />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]} fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Simulation Outcomes">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={outcomes}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={3}
                    stroke="rgba(0,0,0,0.35)"
                  >
                    {outcomes.map((o) => (
                      <Cell key={o.name} fill={OUTCOME_COLORS[o.name] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }} />
                  <Tooltip
                    contentStyle={{ background: "#0d1420", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* recent sessions */}
          <div className="sd-panel mt-4 p-4">
            <span className="sd-panel-title">Recent sessions</span>
            <div className="mt-2.5 max-h-72 overflow-y-auto sd-scroll">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-white/35 tracking-wider uppercase text-[9px]">
                    <th className="text-left py-1.5 font-semibold">Time</th>
                    <th className="text-left py-1.5 font-semibold">Vehicle</th>
                    <th className="text-left py-1.5 font-semibold">Duration</th>
                    <th className="text-left py-1.5 font-semibold">Intervention</th>
                    <th className="text-left py-1.5 font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sessions].reverse().map((s) => (
                    <tr key={s.id} className="border-t border-white/5">
                      <td className="py-1.5 text-white/50 sd-mono">{fmtClock(s.startedAt)}</td>
                      <td className="py-1.5 text-white/80">
                        {VEHICLE_META[s.vehicle].icon} {VEHICLE_META[s.vehicle].label}
                      </td>
                      <td className="py-1.5 text-white/60 sd-mono">{fmtDuration(s.durationSec)}</td>
                      <td className="py-1.5 text-white/60">{s.intervention ?? "—"}</td>
                      <td className="py-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            s.result === "EMERGENCY_STOP"
                              ? "bg-red-500/15 text-red-300"
                              : s.result === "MANUAL_STOP"
                                ? "bg-white/10 text-white/60"
                                : "bg-emerald-500/12 text-emerald-300"
                          }`}
                        >
                          {s.result.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="sd-panel mt-4 p-10 text-center">
          <Sparkles className="h-6 w-6 mx-auto text-white/25" />
          <p className="mt-3 text-sm font-semibold text-white/70">
            No sessions yet
          </p>
          <p className="mt-1 text-xs text-white/40 max-w-md mx-auto leading-relaxed">
            Run a simulation (try the Truck alcohol scenario in Demo Mode) and
            the analytics will populate automatically. Every intervention,
            safety event and outcome is recorded locally on this machine.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="sd-panel p-3">
      <div className="flex items-center gap-1.5 text-white/40 text-[10px] tracking-wider uppercase">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 sd-mono text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sd-panel p-4">
      <span className="sd-panel-title">{title}</span>
      <div className="mt-2">{children}</div>
    </div>
  );
}
