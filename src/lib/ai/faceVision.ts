/**
 * MediaPipe Face Landmarker wrapper.
 *
 * The wasm runtime and the face_landmarker.task model are served locally from
 * /public so the whole AI pipeline runs offline in the browser. No video or
 * imagery ever leaves the device.
 */

import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { FaceReading } from "./visionTypes";

export type FaceModelStatus = "OFF" | "LOADING" | "READY" | "FAILED";

let landmarker: FaceLandmarker | null = null;
let loadPromise: Promise<FaceLandmarker> | null = null;

const WASM_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/models/face_landmarker.task";

export function getFaceLandmarker(): FaceLandmarker | null {
  return landmarker;
}

export function getLoadPromise(): Promise<FaceLandmarker> | null {
  return loadPromise;
}

export async function loadFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarker) return landmarker;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM_PATH);
    const opts = (delegate: "GPU" | "CPU") => ({
      baseOptions: { modelAssetPath: MODEL_PATH, delegate },
      runningMode: "VIDEO" as const,
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });
    try {
      landmarker = await vision.FaceLandmarker.createFromOptions(fileset, opts("GPU"));
      return landmarker;
    } catch {
      // GPU delegate unavailable — fall back to CPU
      landmarker = await vision.FaceLandmarker.createFromOptions(fileset, opts("CPU"));
      return landmarker;
    }
  })();

  loadPromise.catch(() => {
    loadPromise = null;
  });
  return loadPromise;
}

export function releaseFaceLandmarker() {
  try {
    landmarker?.close();
  } catch {
    /* ignore */
  }
  landmarker = null;
  loadPromise = null;
}

/* ------------------------------ detection -------------------------------- */

interface BlendshapeLike {
  categoryName: string;
  score: number;
}

export function readFace(
  landmarker: FaceLandmarker,
  video: HTMLVideoElement,
  tsMs: number,
  eyeThreshold = 0.55,
): FaceReading {
  const res = landmarker.detectForVideo(video, tsMs);
  const lm = res.faceLandmarks?.[0];

  if (!lm || lm.length === 0) {
    visionRaw.landmarks = null;
    visionRaw.box = null;
    visionRaw.ts = tsMs;
    return {
      faceDetected: false,
      eyeClosed: false,
      blinkScore: 0,
      headYaw: 0,
      box: null,
    };
  }

  // eye blink blendshapes (MediaPipe names: eyeBlinkLeft / eyeBlinkRight)
  let blinkScore = 0;
  const shapes = (res.faceBlendshapes?.[0]?.categories ?? []) as BlendshapeLike[];
  let l = 0;
  let r = 0;
  for (const c of shapes) {
    if (c.categoryName === "eyeBlinkLeft") l = c.score;
    else if (c.categoryName === "eyeBlinkRight") r = c.score;
  }
  blinkScore = (l + r) / 2;

  // head-yaw proxy: nose tip (1) offset relative to outer eye corners (33, 263)
  const nose = lm[1];
  const left = lm[33];
  const right = lm[263];
  const midX = (left.x + right.x) / 2;
  const eyeDist = Math.max(1e-4, Math.abs(right.x - left.x));
  const headYaw = Math.max(-1, Math.min(1, ((nose.x - midX) / eyeDist) * 2));

  // bounding box
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const p of lm) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const box = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  visionRaw.landmarks = lm;
  visionRaw.box = box;
  visionRaw.ts = tsMs;

  return {
    faceDetected: true,
    eyeClosed: blinkScore >= eyeThreshold,
    blinkScore,
    headYaw,
    box,
  };
}

/* --------- live raw frame state consumed by the camera HUD overlay -------- */

export const visionRaw: {
  landmarks: NormalizedLandmark[] | null;
  box: FaceReading["box"];
  ts: number;
} = {
  landmarks: null,
  box: null,
  ts: 0,
};
