/**
 * SMARTDRIVE AI — Shared type definitions
 * Multi-Vehicle Intelligent Driver Monitoring, Risk Detection &
 * Autonomous Safety Intervention Simulator
 */

export type VehicleType = "BIKE" | "CAR" | "TRUCK";

export type VehicleMode =
  | "IDLE"
  | "SAFETY_CHECK"
  | "READY"
  | "MANUAL"
  | "WARNING"
  | "AUTONOMOUS"
  | "STOPPING"
  | "STOPPED"
  | "EMERGENCY";

export type SafetyStatus = "SAFE" | "WARNING" | "CRITICAL" | "EMERGENCY";

export type ControlMode = "MANUAL" | "AUTONOMOUS" | "LOCKED";

export type RecommendedAction =
  | "NONE"
  | "BLOCK_START"
  | "WARN"
  | "REDUCE_POWER"
  | "CONTROLLED_STOP"
  | "AUTONOMOUS_STOP"
  | "EMERGENCY_STOP";

export type TimelineEventType =
  | "INFO"
  | "WARNING"
  | "CRITICAL"
  | "AI"
  | "SAFE"
  | "ERROR";

export type EventSource =
  | "CAMERA"
  | "SIMULATION"
  | "SAFETY ENGINE"
  | "VEHICLE ENGINE"
  | "AI VISION"
  | "SYSTEM";

export interface TimelineEvent {
  id: string;
  ts: number;
  type: TimelineEventType;
  source: EventSource;
  message: string;
}

/* ------------------------------ AI / vision ------------------------------ */

export type VisionStatus =
  | "OFF"
  | "REQUESTING"
  | "CONNECTED"
  | "DENIED"
  | "UNAVAILABLE"
  | "LOADING_MODEL"
  | "ACTIVE"
  | "FAILED";

export interface VisionFrameState {
  faceDetected: boolean;
  eyeClosed: boolean;
  blinkScore: number; // 0..1 blendshape based, real model output
  headYaw: number; // radians, real model output (0 = centered)
  fps: number;
}

export type DrowsinessLevel = "NORMAL" | "BLINK" | "WARNING" | "CRITICAL";

export type DetectionSource = "CAMERA" | "SIMULATION" | "NONE" | "SENSOR SIM";

export interface DrowsinessState {
  level: DrowsinessLevel;
  eyeClosed: boolean;
  closureDuration: number; // seconds
  score: number; // 0..100 derived from measured closure time
  source: DetectionSource;
  blinkCount: number;
}

export type HelmetStateValue =
  | "HELMET_DETECTED"
  | "HELMET_NOT_DETECTED"
  | "UNKNOWN";

export interface HelmetState {
  state: HelmetStateValue;
  source: DetectionSource;
}

export interface AlcoholState {
  level: number; // 0..100 simulated sensor value
  threshold: number;
  detected: boolean;
  source: DetectionSource;
}

export interface DriverState {
  faceDetected: boolean;
  present: boolean; // merged camera/simulated presence
  attention: number; // 0..100
  source: DetectionSource;
}

/* ------------------------------ Vehicle sim ------------------------------ */

export interface VehicleKinematics {
  speed: number; // m/s
  position: number; // meters along the road (odometer axis)
  lateral: number; // meters, 0 = travel lane center, positive = toward roadside
  steering: number; // -1..1
  throttle: number; // 0..1
  brake: number; // 0..1
  odometer: number; // total meters traveled
  headingDeg: number; // visual heading (yaw) for sprites
}

export type AutonomyPhase =
  | "NONE"
  | "TAKEOVER"
  | "DECELERATION"
  | "ROADSIDE_ALIGNMENT"
  | "SAFE_STOP"
  | "STOPPED";

export interface SafeStopZone {
  position: number;
  lateral: number;
  active: boolean;
}

export interface AccidentState {
  active: boolean;
  at: number | null;
  impactSpeed: number;
}

/* ------------------------------ Safety engine ----------------------------- */

export interface SafetyDecision {
  severity: SafetyStatus;
  reason: string;
  recommendedAction: RecommendedAction;
  controlMode: ControlMode;
  evidence: string[];
  trigger: string | null;
}

export interface SafetyInput {
  vehicleType: VehicleType;
  vehicleMode: VehicleMode;
  helmet: HelmetState;
  alcohol: AlcoholState;
  alcoholEscalated: boolean; // grace period elapsed → escalation to policy action
  drowsiness: DrowsinessState;
  driver: DriverState;
  accident: AccidentState;
  engineOn: boolean;
  moving: boolean;
}

/* ------------------------------- Settings -------------------------------- */

export interface AppSettings {
  /* camera */
  cameraEnabled: boolean;
  cameraDeviceId: string;
  driverPresenceDetection: boolean;
  /* drowsiness */
  drowsinessEnabled: boolean;
  eyeClosureThreshold: number; // blink blendshape threshold 0..1
  warningDuration: number; // seconds of closure before warning
  criticalDuration: number; // seconds of closure before critical
  faceAbsenceTimeout: number; // seconds before "driver absent"
  /* alcohol */
  alcoholThreshold: number; // 0..100
  /* simulation */
  cruiseSpeed: Record<VehicleType, number>; // km/h target for demo/quick start
  accelerationScale: number; // 0.5..1.5
  interventionDelay: number; // seconds between warning and takeover
  roadsideTarget: number; // meters lateral for roadside stop
  /* display */
  compactDashboard: boolean;
  /* audio */
  audioEnabled: boolean;
}

/* ------------------------------- Session --------------------------------- */

export interface SessionRecord {
  id: string;
  vehicle: VehicleType;
  startedAt: number;
  durationSec: number;
  result: "SAFE_STOP" | "EMERGENCY_STOP" | "MANUAL_STOP" | "INCOMPLETE";
  intervention: string | null;
  interventionTimeSec: number | null;
  reason: string | null;
  eventCounts: {
    info: number;
    warning: number;
    critical: number;
    ai: number;
  };
  counts: {
    drowsiness: number;
    alcohol: number;
    accident: number;
    interventions: number;
    safeStops: number;
  };
}

/* ------------------------------ Demo mode -------------------------------- */

export interface DemoStep {
  label: string;
  detail: string;
  maxMs: number;
  run?: () => void;
  advance?: () => boolean; // condition to advance early
}

export interface DemoScenario {
  id: string;
  title: string;
  vehicle: VehicleType;
  description: string;
  steps: DemoStep[];
}
