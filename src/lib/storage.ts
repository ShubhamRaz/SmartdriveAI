import type { AppSettings, TimelineEvent, SessionRecord } from "./types";

const SETTINGS_KEY = "smartdrive_settings";
const EVENTS_KEY = "smartdrive_events";
const SESSIONS_KEY = "smartdrive_sessions";

export const DEFAULT_SETTINGS: AppSettings = {
  cameraEnabled: true,
  cameraDeviceId: "",
  driverPresenceDetection: true,
  drowsinessEnabled: true,
  eyeClosureThreshold: 0.55,
  warningDuration: 2.0,
  criticalDuration: 3.5,
  faceAbsenceTimeout: 3.0,
  alcoholThreshold: 40,
  cruiseSpeed: { BIKE: 55, CAR: 80, TRUCK: 68 },
  accelerationScale: 1.0,
  interventionDelay: 3.0,
  roadsideTarget: 4.2,
  compactDashboard: false,
  audioEnabled: true,
};

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — non fatal */
  }
}

export function loadSettings(): AppSettings {
  const stored = readJSON<Partial<AppSettings>>(SETTINGS_KEY, {});
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    cruiseSpeed: {
      ...DEFAULT_SETTINGS.cruiseSpeed,
      ...(stored.cruiseSpeed ?? {}),
    },
  };
}

export function saveSettings(s: AppSettings) {
  writeJSON(SETTINGS_KEY, s);
}

export function loadEvents(): TimelineEvent[] {
  return readJSON<TimelineEvent[]>(EVENTS_KEY, []);
}

export function saveEvents(events: TimelineEvent[]) {
  // keep the most recent 500 events
  writeJSON(EVENTS_KEY, events.slice(-500));
}

export function loadSessions(): SessionRecord[] {
  return readJSON<SessionRecord[]>(SESSIONS_KEY, []);
}

export function saveSessions(sessions: SessionRecord[]) {
  writeJSON(SESSIONS_KEY, sessions.slice(-50));
}

export function resetStoredData() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SETTINGS_KEY);
    window.localStorage.removeItem(EVENTS_KEY);
    window.localStorage.removeItem(SESSIONS_KEY);
  } catch {
    /* ignore */
  }
}
