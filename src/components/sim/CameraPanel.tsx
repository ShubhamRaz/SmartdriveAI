"use client";

/**
 * Driver monitoring camera panel — live webcam + computer-vision HUD overlay.
 * Falls back gracefully when the camera or model is unavailable.
 */

import { useEffect, useRef } from "react";
import { Camera, CameraOff, ScanFace, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { useVision } from "@/hooks/useVision";
import { visionRaw } from "@/lib/ai/faceVision";
import { simulationEngine } from "@/lib/simulation/engine";
import type { FaceModelStatus } from "@/lib/ai/faceVision";
import type { VisionStatus } from "@/lib/types";

export function CameraPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const { cameraStatus, modelStatus, devices, startCamera } = useVision(videoRef);
  const settings = useStore((s) => s.settings);

  // auto-request camera on mount (only if enabled in settings)
  useEffect(() => {
    if (settings.cameraEnabled) {
      void startCamera(settings.cameraDeviceId || undefined);
    }
  }, []);

  // HUD overlay loop
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) return;
      ctx.clearRect(0, 0, W, H);
      if (!simulationEngine.vision.active) {
        drawStandby(ctx, W, H);
        return;
      }

      const v = simulationEngine.vision;
      const closure = simulationEngine.drowsiness.closureDuration;
      const score = Math.round(v.eyeClosed ? simulationEngine.drowsiness.score : 0);
      const box = visionRaw.box;

      // corner brackets + face box (mirrored to match video)
      const mirrored = (x: number, w: number) => 1 - x - w;
      if (box) {
        const bx = mirrored(box.x, box.w) * W;
        const by = box.y * H;
        const bw = box.w * W;
        const bh = box.h * H;
        ctx.strokeStyle = v.eyeClosed ? "rgba(248,113,113,0.9)" : "rgba(52,211,153,0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);
        // corner ticks
        ctx.lineWidth = 3;
        const t = 12;
        ctx.beginPath();
        ctx.moveTo(bx, by + t); ctx.lineTo(bx, by); ctx.lineTo(bx + t, by);
        ctx.moveTo(bx + bw - t, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + t);
        ctx.moveTo(bx + bw, by + bh - t); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - t, by + bh);
        ctx.moveTo(bx + t, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - t);
        ctx.stroke();
      }

      // HUD text
      ctx.font = "600 11px ui-monospace, monospace";
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(8, 8, 190, 62);
      ctx.fillStyle = v.faceDetected ? "#34d399" : "#f87171";
      ctx.fillText(v.faceDetected ? "FACE DETECTED" : "FACE NOT DETECTED", 14, 24);
      ctx.fillStyle = v.eyeClosed ? "#f87171" : "#34d399";
      ctx.fillText(`EYES: ${v.eyeClosed ? "CLOSED" : "OPEN"}`, 14, 40);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(`DROWSINESS: ${score}%`, 14, 56);
      if (v.eyeClosed && closure > 0.18) {
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(`CLOSURE: ${closure.toFixed(1)}s`, 120, 40);
      }
      // blink score bar
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(8, H - 16, 120, 6);
      ctx.fillStyle = v.eyeClosed ? "#f87171" : "#34d399";
      ctx.fillRect(8, H - 16, 120 * Math.min(1, v.blinkScore), 6);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(`SRC: CAMERA · ${v.fps.toFixed(0)} FPS`, 136, H - 10);
    };

    const drawStandby = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
      ctx.font = "600 11px ui-monospace, monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText("VISION STANDBY — SIMULATION FALLBACK ACTIVE", 14, H - 14);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const statusColor =
    cameraStatus === "ACTIVE" || cameraStatus === "CONNECTED"
      ? "text-emerald-400"
      : cameraStatus === "REQUESTING" || cameraStatus === "LOADING_MODEL"
        ? "text-amber-400"
        : cameraStatus === "OFF"
          ? "text-white/40"
          : "text-red-400";

  const statusLabel: Record<VisionStatus, string> = {
    OFF: "OFF",
    REQUESTING: "REQUESTING…",
    CONNECTED: "CONNECTED",
    DENIED: "PERMISSION DENIED",
    UNAVAILABLE: "UNAVAILABLE",
    LOADING_MODEL: "LOADING AI MODEL…",
    ACTIVE: "CONNECTED",
    FAILED: "ERROR",
  };

  const modelLabel: Record<FaceModelStatus, string> = {
    OFF: "STANDBY",
    LOADING: "LOADING…",
    READY: "ACTIVE",
    FAILED: "MODEL UNAVAILABLE",
  };

  return (
    <div className="sd-panel p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="sd-panel-title flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5" /> Driver Camera
        </span>
        <span className={`flex items-center gap-1.5 text-[10px] font-semibold tracking-wider ${statusColor}`}>
          <span className="sd-status-dot current" />
          {statusLabel[cameraStatus]}
        </span>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black aspect-[4/3]">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas
          ref={overlayRef}
          width={480}
          height={360}
          className="absolute inset-0 h-full w-full"
          aria-hidden
        />
        {(cameraStatus === "DENIED" || cameraStatus === "UNAVAILABLE" || cameraStatus === "OFF") && (
          <div className="absolute inset-0 grid place-items-center bg-[#0a0f12]/92 p-4 text-center">
            <div>
              <CameraOff className="h-7 w-7 mx-auto text-white/35" />
              <p className="mt-2 text-xs font-semibold text-white/75">Camera unavailable</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/45 max-w-[240px]">
                Simulation fallback mode enabled. You can still manually trigger
                detection events.
              </p>
              <button
                onClick={() => void startCamera(settings.cameraDeviceId || undefined)}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> ENABLE CAMERA
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <StatusChip
          icon={<ScanFace className="h-3 w-3" />}
          label="AI VISION"
          value={modelLabel[modelStatus]}
          ok={modelStatus === "READY"}
          warn={modelStatus === "LOADING"}
          bad={modelStatus === "FAILED"}
        />
        <StatusChip
          icon={<Camera className="h-3 w-3" />}
          label="FACE"
          value={
            simulationEngine.vision.active
              ? simulationEngine.vision.faceDetected
                ? "DETECTED"
                : "NOT DETECTED"
              : "—"
          }
          ok={simulationEngine.vision.active && simulationEngine.vision.faceDetected}
          bad={simulationEngine.vision.active && !simulationEngine.vision.faceDetected}
        />
      </div>

      {devices.length > 1 && (
        <select
          aria-label="Camera selection"
          value={settings.cameraDeviceId}
          onChange={(e) => {
            useStore.getState().updateSettings({ cameraDeviceId: e.target.value });
            void startCamera(e.target.value || undefined);
          }}
          className="w-full rounded-md bg-white/5 border border-white/10 text-[10px] text-white/70 px-2 py-1.5"
        >
          <option value="">Default camera</option>
          {devices.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Camera ${i + 1}`}
            </option>
          ))}
        </select>
      )}

      <p className="text-[9px] leading-relaxed text-white/35">
        Privacy: camera frames are processed locally in your browser. No video
        is uploaded by this application.
      </p>
    </div>
  );
}

function StatusChip({
  icon,
  label,
  value,
  ok,
  warn,
  bad,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok?: boolean;
  warn?: boolean;
  bad?: boolean;
}) {
  const color = ok ? "text-emerald-400" : warn ? "text-amber-400" : bad ? "text-red-400" : "text-white/45";
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-white/8 bg-white/[0.04] px-2 py-1.5">
      <span className={color}>{icon}</span>
      <span className="text-white/40 tracking-wider">{label}</span>
      <span className={`ml-auto font-semibold ${color}`}>{value}</span>
    </div>
  );
}
