"use client";

import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { DEMO_SCENARIOS } from "@/lib/simulation/scenarioEngine";
import { VEHICLE_META } from "@/lib/simulation/vehicleRules";
import type { VehicleType } from "@/lib/types";
import {
  Camera,
  ScanFace,
  ShieldAlert,
  Car,
  Play,
  AlertTriangle,
  Eye,
  Wine,
  HardHat,
  CarFront,
  Truck,
  Cpu,
  Gauge,
} from "lucide-react";

const PIPELINE = [
  { label: "CAMERA", icon: <Camera className="h-4 w-4" /> },
  { label: "AI VISION", icon: <ScanFace className="h-4 w-4" /> },
  { label: "RISK DETECTION", icon: <AlertTriangle className="h-4 w-4" /> },
  { label: "SAFETY ENGINE", icon: <ShieldAlert className="h-4 w-4" /> },
  { label: "VEHICLE INTERVENTION", icon: <Car className="h-4 w-4" /> },
];

const FEATURES = [
  {
    icon: <HardHat className="h-4 w-4" />,
    title: "Helmet Detection",
    body: "Bike ignition interlock with a pluggable detector architecture and a clearly labeled simulation fallback so the demo always runs.",
  },
  {
    icon: <Wine className="h-4 w-4" />,
    title: "Alcohol Detection",
    body: "Simulated alcohol sensor (0–100) with configurable threshold, animated gauge and per-vehicle interlock or intervention policies.",
  },
  {
    icon: <Eye className="h-4 w-4" />,
    title: "Drowsiness Detection",
    body: "Real on-device webcam eye-closure analysis using MediaPipe face landmarks. Temporal logic — a single blink never triggers an alarm.",
  },
  {
    icon: <CarFront className="h-4 w-4" />,
    title: "Accident Detection",
    body: "Impact simulation triggers instability, hazard lights and an immediate emergency-stop protocol on every vehicle type.",
  },
  {
    icon: <Gauge className="h-4 w-4" />,
    title: "Autonomous Safety Intervention",
    body: "The truck performs a fully animated takeover: deceleration, roadside alignment, safe-stop-zone entry and hazard beacon.",
  },
  {
    icon: <Truck className="h-4 w-4" />,
    title: "Multi-Vehicle Support",
    body: "Bike, Car and Truck profiles with distinct rule engines, physics characteristics and intervention strategies.",
  },
];

const VEHICLE_FEATURES: Record<VehicleType, { label: string; items: string[] }> = {
  BIKE: {
    label: "BIKE",
    items: ["Helmet interlock", "Alcohol interlock", "Driver monitoring", "Power-reduction stop"],
  },
  CAR: {
    label: "CAR",
    items: ["Driver monitoring", "Alcohol detection", "Controlled stop", "Accident response"],
  },
  TRUCK: {
    label: "TRUCK",
    items: ["Driver monitoring", "Alcohol detection", "Autonomous roadside stop", "Safe stop zone"],
  },
};

export function HomeView() {
  const setView = useStore((s) => s.setView);
  const selectVehicle = useStore((s) => s.selectVehicle);
  const startDemo = useStore((s) => s.startDemo);

  const launch = (t: VehicleType) => {
    selectVehicle(t);
    setView("SIMULATION");
  };

  return (
    <div className="mx-auto max-w-[1800px] px-4 sm:px-6 pb-10">
      {/* ------------------------------ HERO ------------------------------ */}
      <section className="relative overflow-hidden rounded-2xl border border-white/8 sd-grid-bg mt-6">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-teal-500/10" />
        <div className="relative px-6 py-14 sm:px-12 sm:py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-400/30 bg-orange-400/10 text-orange-300 text-[11px] font-semibold tracking-[0.2em] uppercase mb-6">
              <span className="sd-status-dot sd-pulse text-orange-400" aria-hidden />
              AI Automotive Safety Research Prototype
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
              SMARTDRIVE <span className="text-orange-400">AI</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-white/60 max-w-2xl mx-auto">
              Multi-Vehicle Intelligent Driver Safety Simulator — driver
              monitoring, risk detection and autonomous safety intervention,
              running entirely in your browser.
            </p>
            <p className="mt-3 text-sm font-semibold tracking-[0.28em] uppercase text-teal-300/80">
              Detect Risk · Take Control · Prevent the Crash
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => launch("TRUCK")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-bold text-sm tracking-wide shadow-lg shadow-orange-500/25 transition-colors"
              >
                <Play className="h-4 w-4 fill-black" />
                START SIMULATION
              </button>
              <button
                onClick={() => setView("SIMULATION")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-colors"
              >
                <Cpu className="h-4 w-4 text-teal-300" />
                Open Command Center
              </button>
            </div>
            <p className="mt-5 text-[11px] text-white/40 flex items-center justify-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              This software is an educational simulation prototype. It does not
              control real-world vehicles.
            </p>
          </motion.div>
        </div>
      </section>

      {/* -------------------------- VEHICLE CARDS ------------------------- */}
      <section className="mt-8" aria-label="Vehicle selection">
        <h2 className="sd-panel-title mb-3">Select a vehicle</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(VEHICLE_META) as VehicleType[]).map((t, i) => {
            const meta = VEHICLE_META[t];
            const feats = VEHICLE_FEATURES[t];
            const featured = t === "TRUCK";
            return (
              <motion.button
                key={t}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.4 }}
                onClick={() => launch(t)}
                className={`group text-left rounded-2xl border p-5 transition-all hover:-translate-y-0.5 ${
                  featured
                    ? "border-orange-400/40 bg-orange-500/8 hover:bg-orange-500/12 shadow-lg shadow-orange-500/10"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-4xl" aria-hidden>
                    {meta.icon}
                  </span>
                  {featured && (
                    <span className="text-[9px] font-bold tracking-[0.18em] uppercase px-2 py-1 rounded-md bg-orange-400/20 text-orange-300 border border-orange-400/30">
                      Flagship
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-lg font-bold text-white tracking-wide">
                  {meta.label}
                </h3>
                <p className="text-xs text-white/50 mt-1">{meta.tagline}</p>
                <ul className="mt-4 space-y-1.5">
                  {feats.items.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-white/65">
                      <span className="sd-status-dot text-emerald-400 scale-75" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 text-xs font-semibold text-orange-300 group-hover:text-orange-200">
                  START SIMULATION →
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ------------------------- SYSTEM PIPELINE ------------------------ */}
      <section className="mt-10" aria-label="System architecture">
        <h2 className="sd-panel-title mb-3">System architecture</h2>
        <div className="sd-panel p-5">
          <div className="flex flex-wrap items-stretch gap-2">
            {PIPELINE.map((p, i) => (
              <div key={p.label} className="flex items-center gap-2">
                <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                  <span className="text-teal-300">{p.icon}</span>
                  <span className="text-xs font-semibold tracking-wider text-white/80">
                    {p.label}
                  </span>
                </div>
                {i < PIPELINE.length - 1 && (
                  <span className="text-white/25 font-bold" aria-hidden>
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-white/40">
            AI DETECTION · SIMULATED SENSOR INPUT · SAFETY DECISION · SIMULATED
            VEHICLE CONTROL — every panel in the command center is labeled with
            which layer it represents.
          </p>
        </div>
      </section>

      {/* ---------------------------- FEATURES ---------------------------- */}
      <section className="mt-10" aria-label="Features">
        <h2 className="sd-panel-title mb-3">Capabilities</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="sd-panel p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid place-items-center h-8 w-8 rounded-lg bg-teal-400/12 border border-teal-300/25 text-teal-300">
                  {f.icon}
                </span>
                <h3 className="text-sm font-bold text-white">{f.title}</h3>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-white/50">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------- DEMO MODE --------------------------- */}
      <section className="mt-10" aria-label="Tech fest demo mode">
        <div className="flex items-center justify-between mb-3">
          <h2 className="sd-panel-title">Tech Fest Demo Mode</h2>
          <span className="text-[10px] text-white/35 uppercase tracking-widest">
            One click · fully automated · judge ready
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_SCENARIOS.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 * i }}
              onClick={() => startDemo(s.id)}
              className="sd-panel p-4 text-left hover:border-orange-400/40 hover:bg-orange-500/8 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/40">
                  Scenario {i + 1} · {VEHICLE_META[s.vehicle].icon}{" "}
                  {VEHICLE_META[s.vehicle].label}
                </span>
                <Play className="h-3.5 w-3.5 text-orange-400 opacity-60 group-hover:opacity-100" />
              </div>
              <h3 className="mt-2 text-sm font-bold text-white">{s.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                {s.description}
              </p>
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}
