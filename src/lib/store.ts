/**
 * Zustand store — UI mirror of the simulation engine + app shell state.
 *
 * The engine runs at 60 fps; this store receives a snapshot sync at ~10 Hz
 * (see useSimulationLoop) so React panels stay cheap while the canvas stays
 * butter-smooth.
 */

import { create } from "zustand";
import type {
  AppSettings,
  DemoScenario,
  SessionRecord,
  TimelineEvent,
  VehicleType,
} from "./types";
import { simulationEngine, type EngineSnapshot } from "./simulation/engine";
import {
  DEFAULT_SETTINGS,
  loadEvents,
  loadSessions,
  loadSettings,
  saveEvents,
  saveSessions,
  saveSettings,
  resetStoredData,
} from "./storage";
import { setAudioMuted, unlockAudio } from "./audio";
import { scenarioById, type DemoApi } from "./simulation/scenarioEngine";
import { setSimulatedHelmetWorn } from "./ai/helmet";

export type ViewName = "HOME" | "SIMULATION" | "ANALYTICS" | "SETTINGS";

interface DemoState {
  active: boolean;
  scenarioId: string | null;
  stepIndex: number;
  stepStartedAt: number;
  running: boolean;
  completedAt: number | null;
}

interface StoreState {
  hydrated: boolean;
  view: ViewName;
  snap: EngineSnapshot;
  events: TimelineEvent[];
  sessions: SessionRecord[];
  settings: AppSettings;
  report: SessionRecord | null;
  reportOpen: boolean;
  demo: DemoState;

  hydrate: () => void;
  setView: (v: ViewName) => void;
  sync: () => void;
  pushEvent: (e: TimelineEvent) => void;
  clearEvents: () => void;

  selectVehicle: (t: VehicleType) => void;
  start: () => void;
  stop: () => void;
  reset: () => void;
  emergencyStop: () => void;
  simulateAccident: () => void;
  triggerAlcohol: (on: boolean) => void;
  setAlcoholLevel: (v: number) => void;
  triggerDrowsiness: (on: boolean) => void;
  setHelmet: (worn: boolean) => void;
  enableAutoThrottle: (on: boolean) => void;

  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
  clearAllData: () => void;

  dismissReport: () => void;
  showReport: (r: SessionRecord) => void;
  exportReport: () => void;

  startDemo: (id: string) => void;
  cancelDemo: () => void;
  demoTick: (now: number) => void;
}

const initialSnap = () => simulationEngine.snapshot();

export const useStore = create<StoreState>((set, get) => ({
  hydrated: false,
  view: "HOME",
  snap: initialSnap(),
  events: [],
  sessions: [],
  settings: DEFAULT_SETTINGS,
  report: null,
  reportOpen: false,
  demo: {
    active: false,
    scenarioId: null,
    stepIndex: 0,
    stepStartedAt: 0,
    running: false,
    completedAt: null,
  },

  hydrate: () => {
    if (get().hydrated) return;
    const settings = loadSettings();
    simulationEngine.settings = settings;
    simulationEngine.alcohol.threshold = settings.alcoholThreshold;
    setAudioMuted(!settings.audioEnabled);
    set({
      hydrated: true,
      settings,
      sessions: loadSessions(),
      events: loadEvents().slice(-120),
    });
  },

  setView: (v) => set({ view: v }),

  sync: () => set({ snap: simulationEngine.snapshot() }),

  pushEvent: (e) => {
    const events = [...get().events, e].slice(-400);
    set({ events });
    saveEvents(events);
  },

  clearEvents: () => {
    set({ events: [] });
    saveEvents([]);
  },

  selectVehicle: (t) => {
    simulationEngine.selectVehicle(t);
    set({ snap: simulationEngine.snapshot() });
  },

  start: () => {
    unlockAudio();
    simulationEngine.start();
    set({ snap: simulationEngine.snapshot() });
  },

  stop: () => {
    simulationEngine.requestManualStop();
  },

  reset: () => {
    simulationEngine.reset(true);
    set({
      snap: simulationEngine.snapshot(),
      report: null,
      reportOpen: false,
      demo: {
        active: false,
        scenarioId: null,
        stepIndex: 0,
        stepStartedAt: 0,
        running: false,
        completedAt: null,
      },
    });
  },

  emergencyStop: () => {
    simulationEngine.emergencyStop();
  },

  simulateAccident: () => {
    simulationEngine.simulateAccident();
  },

  triggerAlcohol: (on) => {
    simulationEngine.triggerAlcohol(on);
  },

  setAlcoholLevel: (v) => {
    simulationEngine.setAlcoholLevel(v);
  },

  triggerDrowsiness: (on) => {
    simulationEngine.triggerDrowsiness(on);
  },

  setHelmet: (worn) => {
    setSimulatedHelmetWorn(worn);
    simulationEngine.setHelmetWorn(worn);
  },

  enableAutoThrottle: (on) => {
    simulationEngine.demoAutoThrottle = on;
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    simulationEngine.settings = settings;
    simulationEngine.alcohol.threshold = settings.alcoholThreshold;
    setAudioMuted(!settings.audioEnabled);
    saveSettings(settings);
    set({ settings });
  },

  resetSettings: () => {
    const settings = { ...DEFAULT_SETTINGS, cruiseSpeed: { ...DEFAULT_SETTINGS.cruiseSpeed } };
    simulationEngine.settings = settings;
    simulationEngine.alcohol.threshold = settings.alcoholThreshold;
    setAudioMuted(!settings.audioEnabled);
    saveSettings(settings);
    set({ settings });
  },

  clearAllData: () => {
    resetStoredData();
    set({ events: [], sessions: [] });
  },

  dismissReport: () => set({ reportOpen: false }),

  showReport: (r) => set({ report: r, reportOpen: true }),

  exportReport: () => {
    const r = get().report;
    if (!r) return;
    try {
      const blob = new Blob([JSON.stringify(r, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smartdrive-report-${r.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* non-fatal */
    }
  },

  /* ------------------------------ demo mode ------------------------------ */

  startDemo: (id) => {
    const scenario = scenarioById(id);
    if (!scenario) return;
    unlockAudio();
    simulationEngine.reset(false);
    simulationEngine.demoAutoThrottle = false;
    set({
      view: "SIMULATION",
      demo: {
        active: true,
        scenarioId: id,
        stepIndex: 0,
        stepStartedAt: performance.now(),
        running: true,
        completedAt: null,
      },
      report: null,
      reportOpen: false,
      snap: simulationEngine.snapshot(),
    });
    const first = scenario.steps[0];
    first?.run?.(demoApi);
  },

  cancelDemo: () => {
    simulationEngine.demoAutoThrottle = false;
    simulationEngine.triggerDrowsiness(false);
    simulationEngine.triggerAlcohol(false);
    set({
      demo: {
        active: false,
        scenarioId: null,
        stepIndex: 0,
        stepStartedAt: 0,
        running: false,
        completedAt: null,
      },
    });
  },

  demoTick: (now) => {
    const { demo } = get();
    if (!demo.active || !demo.running) return;
    const scenario = demo.scenarioId ? scenarioById(demo.scenarioId) : null;
    if (!scenario) return;
    const step = scenario.steps[demo.stepIndex];
    if (!step) return;

    const elapsed = now - demo.stepStartedAt;
    let advance = false;
    try {
      advance = step.advance ? step.advance(demoApi) : false;
    } catch {
      advance = false;
    }
    if (!advance && elapsed < step.maxMs) return;

    const nextIndex = demo.stepIndex + 1;
    if (nextIndex >= scenario.steps.length) {
      set({
        demo: { ...demo, running: false, completedAt: now, stepIndex: scenario.steps.length - 1 },
      });
      return;
    }
    const next = scenario.steps[nextIndex];
    set({
      demo: { ...demo, stepIndex: nextIndex, stepStartedAt: now },
    });
    try {
      next?.run?.(demoApi);
    } catch {
      /* demo robustness: a failed step never breaks the runner */
    }
  },
}));

/* ------------------------------- demo api -------------------------------- */

export const demoApi: DemoApi = {
  selectVehicle: (t) => useStore.getState().selectVehicle(t),
  start: () => useStore.getState().start(),
  stop: () => useStore.getState().stop(),
  // demo-safe reset: clears the scenario but preserves demo runner state
  reset: () => {
    simulationEngine.reset(true);
    useStore.setState({
      snap: simulationEngine.snapshot(),
      report: null,
      reportOpen: false,
    });
  },
  enableAutoThrottle: (on) => useStore.getState().enableAutoThrottle(on),
  triggerAlcohol: (on) => useStore.getState().triggerAlcohol(on),
  triggerDrowsiness: (on) => useStore.getState().triggerDrowsiness(on),
  simulateAccident: () => useStore.getState().simulateAccident(),
  setHelmet: (worn) => useStore.getState().setHelmet(worn),
  mode: () => simulationEngine.mode,
  isMoving: () => simulationEngine.kin.speed > 0.5,
  isStopped: () =>
    simulationEngine.mode === "STOPPED" ||
    (simulationEngine.mode === "STOPPING" && simulationEngine.kin.speed < 0.3),
  isReady: () => simulationEngine.mode === "READY",
  isBlocked: () => simulationEngine.startBlockedReason !== null,
  isAutonomous: () => simulationEngine.mode === "AUTONOMOUS",
  isSafeStopPhase: () =>
    simulationEngine.autonomy.phase === "SAFE_STOP" ||
    simulationEngine.autonomy.phase === "STOPPED",
  speedKmh: () => simulationEngine.kin.speed * 3.6,
};

/* --------------------------- engine wiring -------------------------------- */

let wired = false;
export function wireEngine() {
  if (wired) return;
  wired = true;
  simulationEngine.listener = {
    onEvent: (e) => useStore.getState().pushEvent(e),
    onAudio: () => {
      /* audio is fired directly by the engine for lower latency */
    },
    onSessionEnd: (r) => {
      const sessions = [...useStore.getState().sessions, r].slice(-50);
      saveSessions(sessions);
      useStore.setState({ sessions, report: r, reportOpen: true });
    },
  };
}

export type { DemoScenario };
