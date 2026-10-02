"use client";

import { useStore } from "@/lib/store";
import { ShieldAlert, Home, Activity, Settings2, BarChart3, Volume2, VolumeX } from "lucide-react";
import type { ViewName } from "@/lib/store";

const NAV: { id: ViewName; label: string; icon: React.ReactNode }[] = [
  { id: "HOME", label: "Home", icon: <Home className="h-4 w-4" /> },
  { id: "SIMULATION", label: "Simulation", icon: <Activity className="h-4 w-4" /> },
  { id: "ANALYTICS", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "SETTINGS", label: "Settings", icon: <Settings2 className="h-4 w-4" /> },
];

export function Navbar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const audioEnabled = useStore((s) => s.settings.audioEnabled);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#070a10]/85 backdrop-blur-xl">
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 h-14 flex items-center gap-4">
        <button
          onClick={() => setView("HOME")}
          className="flex items-center gap-2.5 group"
          aria-label="SMARTDRIVE AI home"
        >
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 group-hover:bg-orange-500/25 transition-colors">
            <ShieldAlert className="h-4.5 w-4.5" />
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="font-bold tracking-wide text-sm text-white">
              SMARTDRIVE <span className="text-orange-400">AI</span>
            </span>
            <span className="text-[9px] tracking-[0.22em] text-white/40 uppercase">
              Safety Command Center
            </span>
          </span>
        </button>

        <nav className="ml-4 flex items-center gap-1" aria-label="Main navigation">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              aria-current={view === n.id ? "page" : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                view === n.id
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-white/55 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {n.icon}
              <span className="hidden sm:inline">{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => updateSettings({ audioEnabled: !audioEnabled })}
            aria-label={audioEnabled ? "Mute alerts" : "Unmute alerts"}
            title={audioEnabled ? "Mute alert tones" : "Unmute alert tones"}
            className="grid place-items-center h-8 w-8 rounded-lg text-white/60 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/10 transition-colors"
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <span className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 text-[10px] font-semibold tracking-widest uppercase">
            <span className="sd-status-dot sd-pulse text-amber-400" aria-hidden />
            Simulation
          </span>
        </div>
      </div>
    </header>
  );
}
