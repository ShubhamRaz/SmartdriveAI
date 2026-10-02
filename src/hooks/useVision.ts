"use client";

/**
 * Camera + AI vision pipeline hook.
 *
 * - Requests webcam access (graceful fallback on denial/unavailability)
 * - Loads the local MediaPipe FaceLandmarker (wasm + model served from /public)
 * - Runs detection at ~12 fps (throttled) and writes results into the engine
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { VisionStatus } from "@/lib/types";
import {
  getFaceLandmarker,
  loadFaceLandmarker,
  readFace,
  type FaceModelStatus,
} from "@/lib/ai/faceVision";
import { simulationEngine } from "@/lib/simulation/engine";
import { useStore } from "@/lib/store";

export function useVision(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [cameraStatus, setCameraStatus] = useState<VisionStatus>("OFF");
  const [modelStatus, setModelStatus] = useState<FaceModelStatus>("OFF");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectRef = useRef(0);
  const fpsRef = useRef(0);
  const lastFrameRef = useRef(0);
  const mountedRef = useRef(true);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    simulationEngine.vision.active = false;
    simulationEngine.vision.modelStatus = "OFF";
    if (mountedRef.current) {
      setCameraStatus("OFF");
      setModelStatus("OFF");
    }
  }, [stopLoop, videoRef]);

  /** detection loop — throttled to ~12 fps to protect laptop CPUs */
  const startLoop = useCallback(() => {
    stopLoop();
    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      if (now - lastDetectRef.current < 80) return;

      const dtms = now - lastFrameRef.current;
      lastFrameRef.current = now;
      lastDetectRef.current = now;

      const landmarker = getFaceLandmarker();
      if (!landmarker) return;

      try {
        const threshold = simulationEngine.settings.eyeClosureThreshold;
        const reading = readFace(landmarker, video, now, threshold);
        const fps =
          fpsRef.current === 0 ? 1000 / Math.max(1, dtms) : fpsRef.current * 0.85 + (1000 / Math.max(1, dtms)) * 0.15;
        fpsRef.current = fps;

        const v = simulationEngine.vision;
        v.active = true;
        v.modelStatus = "ACTIVE";
        v.faceDetected = reading.faceDetected;
        v.eyeClosed = reading.eyeClosed;
        v.blinkScore = reading.blinkScore;
        v.headYaw = reading.headYaw;
        v.fps = fps;
      } catch {
        /* a failed frame must never crash the loop */
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [stopLoop, videoRef]);

  const loadModel = useCallback(async () => {
    setModelStatus("LOADING");
    simulationEngine.vision.modelStatus = "LOADING";
    try {
      await loadFaceLandmarker();
      if (!mountedRef.current) return;
      setModelStatus("READY");
      simulationEngine.vision.modelStatus = "READY";
      return true;
    } catch {
      if (!mountedRef.current) return false;
      setModelStatus("FAILED");
      simulationEngine.vision.modelStatus = "FAILED";
      return false;
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      if (mountedRef.current) {
        setDevices(list.filter((d) => d.kind === "videoinput"));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("UNAVAILABLE");
        return;
      }
      setCameraStatus("REQUESTING");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCameraStatus("CONNECTED");
        void refreshDevices();

        const ok = await loadModel();
        if (ok && mountedRef.current) {
          setCameraStatus("ACTIVE");
          startLoop();
        } else if (mountedRef.current) {
          // camera works, model failed → explicit fallback, still no crash
          setCameraStatus("CONNECTED");
        }
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setCameraStatus("DENIED");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setCameraStatus("UNAVAILABLE");
        } else {
          setCameraStatus("UNAVAILABLE");
        }
      }
    },
    [loadModel, refreshDevices, startLoop, videoRef],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  return {
    cameraStatus,
    modelStatus,
    devices,
    startCamera,
    stopCamera,
  };
}
