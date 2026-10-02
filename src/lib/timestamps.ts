/** Time helpers shared across the safety engine, timeline and reports. */

export function fmtClock(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function fmtSeconds(sec: number | null): string {
  if (sec === null || Number.isNaN(sec)) return "—";
  return `${sec.toFixed(1)} sec`;
}

let eventCounter = 0;
export function makeEventId(): string {
  eventCounter += 1;
  return `evt_${Date.now().toString(36)}_${eventCounter}`;
}

let sessionCounter = 0;
export function makeSessionId(): string {
  sessionCounter += 1;
  return `ses_${Date.now().toString(36)}_${sessionCounter}`;
}
