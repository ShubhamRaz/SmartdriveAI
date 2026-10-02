"use client";

import { useStore } from "@/lib/store";
import { scenarioById, DEMO_SCENARIOS } from "@/lib/simulation/scenarioEngine";
import { VEHICLE_META } from "@/lib/simulation/vehicleRules";
import { Clapperboard, CheckCircle2, X, ListChecks, Play } from "lucide-react";

/** Tech-fest demo mode: scenario picker + step-by-step progress script. */
export function DemoPanel() {
  const demo = useStore((s) => s.demo);
  const startDemo = useStore((s) => s.startDemo);
  const cancelDemo = useStore((s) => s.cancelDemo);
  const scenario = demo.scenarioId ? scenarioById(demo.scenarioId) : null;

  return (
    <div className="sd-panel p-4">
      <div className="flex items-center justify-between">
        <span className="sd-panel-title flex items-center gap-1.5">
          <Clapperboard className="h-3.5 w-3.5 text-orange-400" />
          Tech Fest Demo Mode
        </span>
        {demo.active && (
          <button
            onClick={cancelDemo}
            className="flex items-center gap-1 text-[10px] font-bold text-red-300 hover:text-red-200 border border-red-400/30 bg-red-500/10 px-2 py-1 rounded-md"
          >
            <X className="h-3 w-3" /> CANCEL DEMO
          </button>
        )}
      </div>

      {!demo.active ? (
        <>
          <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {DEMO_SCENARIOS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => startDemo(s.id)}
                className="text-left rounded-lg border border-white/10 bg-white/[0.04] hover:bg-orange-500/10 hover:border-orange-400/40 px-2.5 py-2 transition-colors"
              >
                <div className="text-[8px] tracking-[0.18em] text-white/35 uppercase">
                  Scenario {i + 1} · {VEHICLE_META[s.vehicle].icon}
                </div>
                <div className="text-[11px] font-semibold text-white/85 leading-tight mt-0.5">
                  {s.title}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-white/35">
            One click runs a fully scripted, judge-ready demonstration — the app
            selects the vehicle, starts the engine and triggers the safety event
            automatically.
          </p>
        </>
      ) : scenario ? (
        <div className="mt-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-white">{scenario.title}</div>
            <div className="text-[10px] text-white/40 sd-mono">
              STEP {Math.min(demo.stepIndex + 1, scenario.steps.length)}/
              {scenario.steps.length}
            </div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full bg-orange-400 transition-all duration-300"
              style={{
                width: `${((demo.stepIndex + (demo.running ? 0.5 : 1)) / scenario.steps.length) * 100}%`,
              }}
            />
          </div>

          <ol className="mt-3 space-y-1.5 max-h-52 overflow-y-auto sd-scroll pr-1">
            {scenario.steps.map((st, i) => {
              const done = i < demo.stepIndex || (!demo.running && i === scenario.steps.length - 1);
              const current = i === demo.stepIndex && demo.running;
              return (
                <li
                  key={i}
                  className={`flex items-start gap-2 text-[11px] px-2 py-1.5 rounded-md border ${
                    current
                      ? "border-orange-400/50 bg-orange-500/12"
                      : done
                        ? "border-emerald-400/25 bg-emerald-500/6"
                        : "border-white/8 bg-white/[0.02]"
                  }`}
                >
                  <span className="mt-0.5">
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : current ? (
                      <Play className="h-3.5 w-3.5 text-orange-300 sd-pulse" />
                    ) : (
                      <ListChecks className="h-3.5 w-3.5 text-white/25" />
                    )}
                  </span>
                  <div>
                    <div className={`font-semibold ${done ? "text-white/50" : "text-white/85"}`}>
                      STEP {i + 1} — {st.label}
                    </div>
                    <div className="text-[10px] text-white/40">{st.detail}</div>
                  </div>
                </li>
              );
            })}
          </ol>

          {!demo.running && (
            <div className="mt-2.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">
              ✓ SCENARIO COMPLETE — {scenario.title}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
