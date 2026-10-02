"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { fmtClock } from "@/lib/timestamps";
import { ScrollText } from "lucide-react";
import type { TimelineEventType } from "@/lib/types";

const TYPE_STYLE: Record<TimelineEventType, { color: string; label: string }> = {
  INFO: { color: "text-sky-300/90", label: "INFO" },
  WARNING: { color: "text-amber-300", label: "WARNING" },
  CRITICAL: { color: "text-red-300", label: "CRITICAL" },
  AI: { color: "text-orange-300", label: "AI" },
  SAFE: { color: "text-emerald-300", label: "SAFE" },
  ERROR: { color: "text-red-400", label: "ERROR" },
};

export function EventTimeline() {
  const events = useStore((s) => s.events);
  const scrollRef = useRef<HTMLDivElement>(null);

  // autoscroll to the newest event
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events]);

  return (
    <div className="sd-panel p-4 flex flex-col min-h-0">
      <div className="flex items-center justify-between">
        <span className="sd-panel-title flex items-center gap-1.5">
          <ScrollText className="h-3.5 w-3.5" /> Event Timeline
        </span>
        <span className="text-[10px] text-white/30 sd-mono">
          {events.length} events
        </span>
      </div>

      <div
        ref={scrollRef}
        className="mt-2.5 flex-1 min-h-[140px] max-h-[220px] overflow-y-auto sd-scroll pr-1"
        aria-live="polite"
        aria-label="Simulation event timeline"
      >
        {events.length === 0 ? (
          <p className="text-xs text-white/30 py-6 text-center">
            Events will appear here as the simulation runs.
          </p>
        ) : (
          <ul className="space-y-1">
            {events.map((e) => {
              const st = TYPE_STYLE[e.type];
              return (
                <li
                  key={e.id}
                  className="flex items-baseline gap-2 text-[11px] leading-relaxed px-2 py-1 rounded-md hover:bg-white/[0.04]"
                >
                  <span className="text-white/30 sd-mono shrink-0">
                    {fmtClock(e.ts)}
                  </span>
                  <span
                    className={`font-bold shrink-0 w-[62px] sd-mono ${st.color}`}
                  >
                    [{st.label}]
                  </span>
                  <span className="text-white/25 shrink-0 hidden sm:inline w-[92px] text-[10px]">
                    {e.source}
                  </span>
                  <span className="text-white/80">{e.message}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
