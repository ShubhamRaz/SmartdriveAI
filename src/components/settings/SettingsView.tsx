"use client";

import { useStore } from "@/lib/store";
import { Camera, Eye, Wine, Cpu, LayoutDashboard } from "lucide-react";
import type { VehicleType } from "@/lib/types";

const VEHICLES: VehicleType[] = ["BIKE", "CAR", "TRUCK"];

export function SettingsView() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetSettings = useStore((s) => s.resetSettings);

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">Settings</h1>
          <p className="text-xs text-white/45 mt-0.5">
            All thresholds are applied live and persisted in localStorage.
          </p>
        </div>
        <button
          onClick={resetSettings}
          className="px-3 py-1.5 rounded-lg border border-white/12 bg-white/6 text-white/80 text-xs font-semibold hover:bg-white/12"
        >
          RESET DEFAULTS
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* camera */}
        <Section icon={<Camera className="h-3.5 w-3.5" />} title="Camera">
          <Toggle
            label="Enable camera on simulation start"
            desc="When off, the app stays in simulation fallback mode"
            checked={settings.cameraEnabled}
            onChange={(v) => updateSettings({ cameraEnabled: v })}
          />
          <Toggle
            label="Driver presence detection"
            desc="Warn when the driver's face is not visible"
            checked={settings.driverPresenceDetection}
            onChange={(v) => updateSettings({ driverPresenceDetection: v })}
          />
        </Section>

        {/* drowsiness */}
        <Section icon={<Eye className="h-3.5 w-3.5" />} title="Drowsiness detection">
          <Toggle
            label="Camera drowsiness detection"
            desc="Real eye-closure analysis from the webcam"
            checked={settings.drowsinessEnabled}
            onChange={(v) => updateSettings({ drowsinessEnabled: v })}
          />
          <Slider
            label="Warning duration"
            unit="s"
            min={0.8}
            max={5}
            step={0.1}
            value={settings.warningDuration}
            onChange={(v) => updateSettings({ warningDuration: v })}
          />
          <Slider
            label="Critical duration"
            unit="s"
            min={1.5}
            max={8}
            step={0.1}
            value={settings.criticalDuration}
            onChange={(v) => updateSettings({ criticalDuration: v })}
          />
          <Slider
            label="Eye closure sensitivity"
            unit=""
            min={0.3}
            max={0.8}
            step={0.05}
            value={settings.eyeClosureThreshold}
            onChange={(v) => updateSettings({ eyeClosureThreshold: v })}
            hint="Blendshape score above which eyes count as closed (lower = more sensitive)"
          />
          <Slider
            label="Face absence timeout"
            unit="s"
            min={1}
            max={8}
            step={0.5}
            value={settings.faceAbsenceTimeout}
            onChange={(v) => updateSettings({ faceAbsenceTimeout: v })}
          />
        </Section>

        {/* alcohol */}
        <Section icon={<Wine className="h-3.5 w-3.5" />} title="Alcohol sensor">
          <Slider
            label="Detection threshold"
            unit=""
            min={10}
            max={90}
            step={5}
            value={settings.alcoholThreshold}
            onChange={(v) => updateSettings({ alcoholThreshold: v })}
            hint="Sensor level above this value is treated as alcohol detected"
          />
        </Section>

        {/* simulation */}
        <Section icon={<Cpu className="h-3.5 w-3.5" />} title="Simulation">
          {VEHICLES.map((v) => (
            <Slider
              key={v}
              label={`${v} cruise speed`}
              unit="km/h"
              min={20}
              max={v === "BIKE" ? 80 : v === "CAR" ? 120 : 90}
              step={2}
              value={settings.cruiseSpeed[v]}
              onChange={(cruise) =>
                updateSettings({
                  cruiseSpeed: { ...settings.cruiseSpeed, [v]: cruise },
                })
              }
              hint="Used by Tech Fest Demo Mode's auto-throttle"
            />
          ))}
          <Slider
            label="Intervention delay"
            unit="s"
            min={1}
            max={8}
            step={0.5}
            value={settings.interventionDelay}
            onChange={(v) => updateSettings({ interventionDelay: v })}
            hint="Time between the first warning and the autonomous takeover"
          />
          <Slider
            label="Roadside stop offset"
            unit="m"
            min={3}
            max={6.5}
            step={0.1}
            value={settings.roadsideTarget}
            onChange={(v) => updateSettings({ roadsideTarget: v })}
            hint="Lateral target for the autonomous roadside maneuver"
          />
        </Section>

        {/* display */}
        <Section icon={<LayoutDashboard className="h-3.5 w-3.5" />} title="Display & audio">
          <Toggle
            label="Compact dashboard"
            desc="Tighter spacing for small screens"
            checked={settings.compactDashboard}
            onChange={(v) => updateSettings({ compactDashboard: v })}
          />
          <Toggle
            label="Audio alert tones"
            desc="Web Audio warning beeps, takeover alert and safe-stop chime"
            checked={settings.audioEnabled}
            onChange={(v) => updateSettings({ audioEnabled: v })}
          />
        </Section>
      </div>

      <p className="mt-6 text-[11px] text-white/35 leading-relaxed">
        These parameters tune the simulation and detection behaviour only. The
        system is an educational prototype — browser-based vision is not
        production automotive perception, and no real vehicle is controlled.
      </p>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sd-panel p-4">
      <span className="sd-panel-title flex items-center gap-1.5">
        {icon}
        {title}
      </span>
      <div className="mt-3 space-y-3.5">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-orange-500" : "bg-white/12"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
      <span>
        <span className="block text-xs font-semibold text-white/85 group-hover:text-white">
          {label}
        </span>
        {desc && <span className="block text-[10px] text-white/40 mt-0.5">{desc}</span>}
      </span>
    </label>
  );
}

function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  hint,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-white/85">{label}</span>
        <span className="sd-mono text-white/60">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit && ` ${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-orange-400"
      />
      {hint && <p className="text-[10px] text-white/35 mt-0.5">{hint}</p>}
    </div>
  );
}
