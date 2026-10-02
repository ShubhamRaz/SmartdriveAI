"use client";

/**
 * DriveControls — on-screen steering + pedals (touch & mouse).
 *
 * Lets the vehicle be driven without a physical keyboard: hold GAS to
 * accelerate, BRAKE to slow down, ◀ / ▶ to steer. Supports simultaneous
 * multi-touch (steer while on the gas) via per-pointer tracking, and never
 * leaves a pedal stuck: pointerup / pointercancel / window blur all release.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { simulationEngine } from "@/lib/simulation/engine";
import { Bot, ChevronLeft, ChevronRight, Keyboard, Lock, Play } from "lucide-react";

type Ctrl = "gas" | "brake" | "left" | "right";

export function DriveControls() {
  const snap = useStore((s) => s.snap);
  const demoActive = useStore((s) => s.demo.active);
  const cruise = useStore((s) => s.settings.cruiseSpeed[s.snap.vehicleType]);
  const [held, setHeld] = useState<Set<Ctrl>>(() => new Set());

  /** logic mirror of `held` — read only inside handlers, never during render */
  const heldRef = useRef<Set<Ctrl>>(new Set());
  const pointerMap = useRef<Map<number, Ctrl>>(new Map());

  const manual =
    !snap.controlLocked &&
    (snap.mode === "READY" || snap.mode === "MANUAL" || snap.mode === "WARNING");
  const engineOff = snap.mode === "IDLE" || snap.mode === "SAFETY_CHECK";
  const atStandstill = snap.speedKmh < 1;
  const apAvailable = manual && !demoActive;

  const commit = useCallback((next: Set<Ctrl>) => {
    heldRef.current = next;
    setHeld(next);
    simulationEngine.setPadInput(
      next.has("gas") ? 1 : 0,
      next.has("brake") ? 1 : 0,
      (next.has("right") ? 1 : 0) - (next.has("left") ? 1 : 0),
    );
  }, []);

  const press = useCallback(
    (c: Ctrl) => {
      if (heldRef.current.has(c)) return;
      commit(new Set([...heldRef.current, c]));
    },
    [commit],
  );

  const release = useCallback(
    (c: Ctrl) => {
      if (!heldRef.current.has(c)) return;
      const next = new Set(heldRef.current);
      next.delete(c);
      commit(next);
    },
    [commit],
  );

  const releaseAll = useCallback(() => {
    if (!heldRef.current.size) return;
    commit(new Set());
  }, [commit]);

  /* safety net: any pointer up / cancel / blur releases that pointer */
  useEffect(() => {
    const onPointerEnd = (e: PointerEvent) => {
      const c = pointerMap.current.get(e.pointerId);
      if (c === undefined) return;
      pointerMap.current.delete(e.pointerId);
      release(c);
    };
    const onBlur = () => {
      pointerMap.current.clear();
      releaseAll();
    };
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("blur", onBlur);
      pointerMap.current.clear();
      releaseAll();
    };
  }, [release, releaseAll]);

  const onDown = (c: Ctrl) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!manual) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture unsupported — window listeners still release */
    }
    pointerMap.current.set(e.pointerId, c);
    press(c);
  };

  const baseBtn =
    "select-none touch-none [-webkit-touch-callout:none] flex flex-col items-center justify-center gap-0.5 h-16 sm:h-[4.5rem] rounded-xl border font-bold tracking-widest text-xs transition-colors duration-75 active:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed";

  return (
    <div className="sd-panel p-4">
      <div className="flex items-center justify-between">
        <span className="sd-panel-title">Drive Controls</span>
        <span className="hidden sm:flex items-center gap-1 text-[9px] text-white/30 tracking-wider">
          <Keyboard className="h-3 w-3" /> or hold W / ↑
        </span>
      </div>

      {/* autopilot toggle */}
      <button
        onClick={() => simulationEngine.toggleAutopilot()}
        disabled={!apAvailable}
        aria-pressed={snap.autopilot}
        className={`mt-3 flex w-full select-none items-center justify-center gap-2 rounded-xl border h-11 text-xs font-bold tracking-widest transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
          snap.autopilot
            ? "bg-cyan-400/25 border-cyan-300/60 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.35)]"
            : "bg-white/6 hover:bg-white/12 border-white/12 text-white/75"
        }`}
      >
        <Bot className="h-4 w-4" />
        {snap.autopilot ? "AUTOPILOT — ENGAGED" : "AUTOPILOT — OFF"}
        <span className="text-[9px] font-semibold text-white/40">
          {snap.autopilot ? "P to disengage" : "P or click to engage"}
        </span>
      </button>

      {/* steering + pedals */}
      <div className="mt-2 flex items-stretch gap-2">
        <button
          aria-label="Steer left"
          disabled={!manual}
          onPointerDown={onDown("left")}
          onContextMenu={(e) => e.preventDefault()}
          className={`${baseBtn} flex-1 ${
            held.has("left")
              ? "bg-white/25 border-white/40 text-white"
              : "bg-white/8 hover:bg-white/14 border-white/12 text-white/80"
          }`}
        >
          <ChevronLeft className="h-6 w-6" />
          <span className="text-[9px] text-white/40">LEFT</span>
        </button>

        <button
          aria-label="Steer right"
          disabled={!manual}
          onPointerDown={onDown("right")}
          onContextMenu={(e) => e.preventDefault()}
          className={`${baseBtn} flex-1 ${
            held.has("right")
              ? "bg-white/25 border-white/40 text-white"
              : "bg-white/8 hover:bg-white/14 border-white/12 text-white/80"
          }`}
        >
          <ChevronRight className="h-6 w-6" />
          <span className="text-[9px] text-white/40">RIGHT</span>
        </button>

        <button
          aria-label="Brake (hold)"
          disabled={!manual}
          onPointerDown={onDown("brake")}
          onContextMenu={(e) => e.preventDefault()}
          className={`${baseBtn} flex-[1.2] ${
            held.has("brake")
              ? "bg-rose-500/45 border-rose-300/60 text-rose-50 shadow-[0_0_18px_rgba(244,63,94,0.35)]"
              : "bg-rose-500/12 hover:bg-rose-500/22 border-rose-400/30 text-rose-200"
          }`}
        >
          <span className="text-sm">BRAKE</span>
          <span className="text-[9px] text-white/40">S / ↓</span>
        </button>

        <button
          aria-label="Accelerate (hold)"
          disabled={!manual}
          onPointerDown={onDown("gas")}
          onContextMenu={(e) => e.preventDefault()}
          className={`${baseBtn} flex-[1.6] ${
            held.has("gas")
              ? "bg-emerald-400/45 border-emerald-300/60 text-emerald-50 shadow-[0_0_22px_rgba(52,211,153,0.45)]"
              : "bg-emerald-500/18 hover:bg-emerald-500/28 border-emerald-400/35 text-emerald-200"
          }`}
        >
          <span className="text-sm">GAS</span>
          <span className="text-[9px] text-white/40">W / ↑</span>
        </button>
      </div>

      {/* status / guidance line */}
      <div className="mt-2.5 min-h-[20px]">
        {!manual && engineOff && (
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 tracking-wide">
            <Play className="h-3 w-3" />
            Press START — after safety checks pass, hold GAS to move.
            {snap.vehicleType === "BIKE" &&
              snap.helmet.state !== "HELMET_DETECTED" &&
              " (Bike needs HELMET: ON)"}
          </div>
        )}
        {!manual && !engineOff && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-200/70 tracking-wide">
            <Lock className="h-3 w-3" />
            Manual controls locked — AI / safety system in charge. Press RESET to
            drive again.
          </div>
        )}
        {manual && snap.autopilot && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-300 tracking-wide">
            <Bot className="h-3 w-3" />
            AUTOPILOT DRIVING — cruise {cruise} km/h + lane keeping · brake, P or
            STOP to disengage
          </div>
        )}
        {manual && !snap.autopilot && atStandstill && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 tracking-wide sd-pulse">
            <Play className="h-3 w-3 fill-current" />
            HOLD GAS (or W / ↑) to accelerate — vehicle is at 0 km/h.
          </div>
        )}
        {manual && !snap.autopilot && !atStandstill && (
          <div className="text-[10px] text-white/35 tracking-wide">
            Manual driving — hold pedals above or use W / S / A / D keys · P
            autopilot · SPACE emergency stop
          </div>
        )}
      </div>
    </div>
  );
}
