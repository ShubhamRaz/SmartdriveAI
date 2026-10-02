"use client";

import { useEffect } from "react";
import { useStore, wireEngine } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { HomeView } from "@/components/home/HomeView";
import { SimulationView } from "@/components/sim/SimulationView";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { SettingsView } from "@/components/settings/SettingsView";

export default function SmartDriveApp() {
  const view = useStore((s) => s.view);
  const hydrate = useStore((s) => s.hydrate);

  useEffect(() => {
    wireEngine();
    hydrate();
  }, [hydrate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full">
        {view === "HOME" && <HomeView />}
        {view === "SIMULATION" && <SimulationView />}
        {view === "ANALYTICS" && <AnalyticsView />}
        {view === "SETTINGS" && <SettingsView />}
      </main>
      {view !== "SIMULATION" && (
        <footer className="mt-auto border-t border-white/5 py-4 px-6">
          <p className="text-[11px] text-white/40 text-center">
            SIMULATION MODE — NOT FOR REAL VEHICLE CONTROL · Camera frames are
            processed locally in your browser. No video is uploaded by this
            application.
          </p>
        </footer>
      )}
    </div>
  );
}
