/**
 * SMARTDRIVE AI — central simulation engine (mutable singleton, game-loop owned).
 *
 * The engine owns all simulation state. React subscribes to a 10 Hz snapshot
 * mirror (Zustand) while the road canvas reads the engine directly every
 * animation frame for smooth 60 fps rendering.
 *
 * SAFETY: this is an educational simulation. It never controls a real vehicle.
 */

import type {
  AlcoholState,
  AppSettings,
  AutonomyPhase,
  ControlMode,
  DetectionSource,
  DrowsinessState,
  DriverState,
  HelmetState,
  SafetyDecision,
  SafetyStatus,
  SessionRecord,
  TimelineEvent,
  VehicleMode,
  VehicleType,
  VisionFrameState,
  AccidentState,
} from "../types";
import { makeEventId, makeSessionId } from "../timestamps";
import { playCue, type AudioCue } from "../audio";
import {
  VEHICLE_SPECS,
  stepPhysics,
} from "./vehiclePhysics";
import { VEHICLE_RULES } from "./vehicleRules";
import { evaluateSafety } from "./safetyEngine";
import {
  autonomyTick,
  createAutonomyState,
  planTakeover,
  type AutonomyState,
} from "./truckAutonomy";

export interface EngineSnapshot {
  vehicleType: VehicleType;
  mode: VehicleMode;
  safetyStatus: SafetyStatus;
  controlMode: ControlMode;
  decision: SafetyDecision;
  engineOn: boolean;
  moving: boolean;
  autopilot: boolean;
  highSpeed: boolean;
  stoppedByIntervention: boolean;
  speedKmh: number;
  accelMs2: number;
  steer: number;
  throttle: number;
  brake: number;
  odometerM: number;
  lateral: number;
  headingDeg: number;
  hazardsOn: boolean;
  controlLocked: boolean;
  startBlockedReason: string | null;
  powerLimited: boolean;
  autonomyPhase: AutonomyPhase;
  stopZoneActive: boolean;
  stopZonePos: number;
  helmet: HelmetState;
  alcohol: AlcoholState;
  drowsiness: DrowsinessState;
  driver: DriverState;
  accident: AccidentState;
  vision: {
    active: boolean;
    modelStatus: string;
    faceDetected: boolean;
    eyeClosed: boolean;
    blinkScore: number;
    headYaw: number;
    fps: number;
  };
  sessionStartedAt: number | null;
  lastAccel: number;
  accidentWobble: number;
  bikeMotorLimited: boolean;
}

type Listener = {
  onEvent: (e: TimelineEvent) => void;
  onAudio: (cue: AudioCue) => void;
  onSessionEnd: (r: SessionRecord) => void;
};

const STOP_SPEED_EPS = 0.25;

export class SimulationEngine {
  /* ------------------------------- config ------------------------------- */
  vehicleType: VehicleType = "TRUCK";
  settings: AppSettings;

  /* ------------------------------- state -------------------------------- */
  mode: VehicleMode = "IDLE";
  safetyStatus: SafetyStatus = "SAFE";
  controlMode: ControlMode = "MANUAL";
  decision: SafetyDecision = {
    severity: "SAFE",
    reason: "Standby",
    recommendedAction: "NONE",
    controlMode: "MANUAL",
    evidence: [],
    trigger: null,
  };
  engineOn = false;
  startBlockedReason: string | null = null;
  controlLocked = false;
  stoppedByIntervention = false;
  bikeMotorLimited = false;
  powerLimit = 1;
  hazardsOn = false;
  demoAutoThrottle = false;
  autopilot = false;
  highSpeed = false;

  kin = {
    speed: 0,
    position: 0,
    lateral: 0,
    odometer: 0,
    steering: 0,
    throttle: 0,
    brake: 0,
    headingDeg: 0,
    accel: 0,
  };

  helmet: HelmetState = { state: "HELMET_NOT_DETECTED", source: "SIMULATION" };
  alcohol: AlcoholState = {
    level: 0,
    threshold: 40,
    detected: false,
    source: "SENSOR SIM",
  };
  drowsiness: DrowsinessState = {
    level: "NORMAL",
    eyeClosed: false,
    closureDuration: 0,
    score: 0,
    source: "NONE",
    blinkCount: 0,
  };
  driver: DriverState = {
    faceDetected: false,
    present: false,
    attention: 100,
    source: "NONE",
  };
  accident: AccidentState = { active: false, at: null, impactSpeed: 0 };

  autonomy: AutonomyState = createAutonomyState();

  /** live vision pipeline state (written by the camera hook) */
  vision: VisionFrameState & { active: boolean; modelStatus: string } = {
    active: false,
    modelStatus: "OFF",
    faceDetected: false,
    eyeClosed: false,
    blinkScore: 0,
    headYaw: 0,
    fps: 0,
  };

  simDrowsiness = false;

  /* ----------------------------- timers --------------------------------- */
  private safetyCheckTimer = 0;
  private helmetCheckAnnounced = false;
  private alcoholAt: number | null = null;
  private drowsinessWarnAnnounced = false;
  private criticalAnnounced = false;
  private lastWarnBeep = 0;
  private lastEventAt = new Map<string, number>();
  private prevSeverity: SafetyStatus = "SAFE";
  private prevAutonomyPhase: AutonomyPhase = "NONE";
  private takeoverPlanned = false;
  private faceAbsentSince: number | null = null;
  private faceAbsentAnnounced = false;
  private manualStopRequested = false;
  private clock = 0;

  sessionStartedAt: number | null = null;
  sessionCounts = { drowsiness: 0, alcohol: 0, accident: 0, interventions: 0, safeStops: 0 };
  private firstCriticalAt: number | null = null;
  private sessionEventTally = { info: 0, warning: 0, critical: 0, ai: 0 };
  private sessionIntervention: string | null = null;
  private sessionReason: string | null = null;
  private sessionResult: SessionRecord["result"] | null = null;

  listener: Listener | null = null;

  constructor(settings: AppSettings) {
    this.settings = settings;
    this.alcohol.threshold = settings.alcoholThreshold;
  }

  /* ============================== API ================================== */

  selectVehicle(t: VehicleType) {
    this.vehicleType = t;
    this.reset(false);
    this.emit("INFO", "SYSTEM", `${t} vehicle profile loaded`);
  }

  start() {
    if (this.mode !== "IDLE" && this.mode !== "STOPPED") return;
    if (this.stoppedByIntervention) {
      this.emit(
        "WARNING",
        "SAFETY ENGINE",
        "Vehicle locked after safety intervention — RESET required",
      );
      playCue("BLOCKED");
      return;
    }
    if (this.mode === "STOPPED") {
      // starting from a clean manual stop
      this.mode = "IDLE";
    }
    this.mode = "SAFETY_CHECK";
    this.safetyCheckTimer = 0;
    this.helmetCheckAnnounced = false;
    this.startBlockedReason = null;
    this.autopilot = false;
    this.highSpeed = false;
    this.emit("INFO", "SAFETY ENGINE", "Pre-start safety checks running…");
    playCue("START");
  }

  requestManualStop() {
    if (this.mode === "IDLE" || this.mode === "SAFETY_CHECK") return;
    this.manualStopRequested = true;
    this.emit("INFO", "VEHICLE ENGINE", "Manual stop requested");
  }

  /**
   * Toggle autopilot (AI chauffeur): cruises at the vehicle's configured
   * cruise speed and keeps the lane. Any safety intervention, brake input or
   * manual stop disengages it. Keyboard: P.
   */
  toggleAutopilot() {
    if (this.controlLocked || this.demoAutoThrottle) return;
    if (
      this.mode !== "READY" &&
      this.mode !== "MANUAL" &&
      this.mode !== "WARNING"
    )
      return;
    this.autopilot = !this.autopilot;
    if (this.autopilot) {
      this.emit(
        "AI",
        "VEHICLE ENGINE",
        `AUTOPILOT engaged — cruising at ${
          this.highSpeed ? this.maxSpeedKmh() : this.settings.cruiseSpeed[this.vehicleType]
        } km/h with lane keeping`,
      );
      playCue("TAKEOVER");
    } else {
      this.highSpeed = false;
      this.emit("INFO", "VEHICLE ENGINE", "Autopilot disengaged — manual control restored");
    }
  }

  /** km/h ceiling used by HIGH SPEED mode (= vehicle top speed) */
  maxSpeedKmh(): number {
    return Math.round(VEHICLE_SPECS[this.vehicleType].maxSpeed * 3.6);
  }

  /**
   * HIGH SPEED profile: raises the autopilot cruise target to the vehicle's
   * top speed. Engaging it auto-engages autopilot, so one click starts driving.
   * Keyboard: H.
   */
  toggleHighSpeed() {
    if (this.controlLocked || this.demoAutoThrottle) return;
    if (
      this.mode !== "READY" &&
      this.mode !== "MANUAL" &&
      this.mode !== "WARNING"
    )
      return;
    this.highSpeed = !this.highSpeed;
    if (this.highSpeed) {
      if (!this.autopilot) {
        this.autopilot = true;
        this.emit(
          "AI",
          "VEHICLE ENGINE",
          `AUTOPILOT engaged — HIGH SPEED ${this.maxSpeedKmh()} km/h with lane keeping`,
        );
      } else {
        this.emit(
          "AI",
          "VEHICLE ENGINE",
          `HIGH SPEED engaged — autopilot target raised to ${this.maxSpeedKmh()} km/h`,
        );
      }
      playCue("TAKEOVER");
    } else {
      this.emit(
        "INFO",
        "VEHICLE ENGINE",
        `High speed off — autopilot cruising at ${this.settings.cruiseSpeed[this.vehicleType]} km/h`,
      );
    }
  }

  private disengageAutopilot(reason: string) {
    if (!this.autopilot) return;
    this.autopilot = false;
    this.highSpeed = false;
    this.emit("INFO", "SAFETY ENGINE", `Autopilot disengaged — ${reason}`);
  }

  emergencyStop() {
    if (
      this.mode === "IDLE" ||
      this.mode === "SAFETY_CHECK" ||
      this.mode === "STOPPED"
    )
      return;
    this.emit("CRITICAL", "SAFETY ENGINE", "EMERGENCY STOP engaged by operator");
    this.accident.active = false;
    this.enterEmergency("Emergency stop engaged");
  }

  simulateAccident() {
    if (this.accident.active) return;
    this.accident = {
      active: true,
      at: this.clock,
      impactSpeed: this.kin.speed * 3.6,
    };
    this.sessionCounts.accident += 1;
    this.emit(
      "CRITICAL",
      "SIMULATION",
      `Accident simulated — impact at ${(this.kin.speed * 3.6).toFixed(0)} km/h`,
    );
    playCue("ACCIDENT");
  }

  setHelmetWorn(worn: boolean) {
    if (this.vehicleType !== "BIKE") return;
    this.helmet = {
      state: worn ? "HELMET_DETECTED" : "HELMET_NOT_DETECTED",
      source: "SIMULATION",
    };
    this.emit(
      worn ? "INFO" : "WARNING",
      "SIMULATION",
      worn
        ? "Helmet detected (simulated detector)"
        : "Helmet removed — ignition interlock engaged",
    );
  }

  triggerAlcohol(on: boolean) {
    if (on) {
      this.alcohol.level = Math.max(this.alcohol.level, 78);
      this.alcohol.detected = true;
      this.alcohol.source = "SENSOR SIM";
      this.alcoholAt = this.clock;
      this.sessionCounts.alcohol += 1;
      this.emit(
        "CRITICAL",
        "SIMULATION",
        `Alcohol sensor triggered — level ${this.alcohol.level} (threshold ${this.alcohol.threshold})`,
      );
      playCue("WARNING");
    } else {
      this.alcohol.level = 0;
      this.alcohol.detected = false;
      this.alcoholAt = null;
      this.emit("INFO", "SIMULATION", "Alcohol sensor cleared");
    }
  }

  setAlcoholLevel(v: number) {
    this.alcohol.level = v;
    const detected = v > this.alcohol.threshold;
    if (detected && !this.alcohol.detected) {
      this.alcohol.detected = true;
      this.alcoholAt = this.clock;
      this.sessionCounts.alcohol += 1;
      this.emit(
        "CRITICAL",
        "SIMULATION",
        `Alcohol sensor above threshold — level ${v} (threshold ${this.alcohol.threshold})`,
      );
      playCue("WARNING");
    } else if (!detected && this.alcohol.detected) {
      this.alcohol.detected = false;
      this.alcoholAt = null;
      this.emit("INFO", "SIMULATION", "Alcohol sensor below threshold");
    }
  }

  triggerDrowsiness(on: boolean) {
    this.simDrowsiness = on;
    if (on) {
      this.sessionCounts.drowsiness += 1;
      this.emit("WARNING", "SIMULATION", "Drowsiness simulation enabled — eyes closed");
    } else {
      this.emit("INFO", "SIMULATION", "Drowsiness simulation disabled");
    }
  }

  reset(announce = true) {
    this.mode = "IDLE";
    this.safetyStatus = "SAFE";
    this.controlMode = "MANUAL";
    this.decision = {
      severity: "SAFE",
      reason: "Standby",
      recommendedAction: "NONE",
      controlMode: "MANUAL",
      evidence: [],
      trigger: null,
    };
    this.engineOn = false;
    this.startBlockedReason = null;
    this.controlLocked = false;
    this.stoppedByIntervention = false;
    this.bikeMotorLimited = false;
    this.powerLimit = 1;
    this.hazardsOn = false;
    this.autopilot = false;
    this.highSpeed = false;
    this.kin = {
      speed: 0,
      position: 0,
      lateral: 0,
      odometer: 0,
      steering: 0,
      throttle: 0,
      brake: 0,
      headingDeg: 0,
      accel: 0,
    };
    this.helmet = { state: "HELMET_NOT_DETECTED", source: "SIMULATION" };
    this.alcohol = {
      level: 0,
      threshold: this.settings.alcoholThreshold,
      detected: false,
      source: "SENSOR SIM",
    };
    this.drowsiness = {
      level: "NORMAL",
      eyeClosed: false,
      closureDuration: 0,
      score: 0,
      source: this.drowsiness.source,
      blinkCount: 0,
    };
    this.simDrowsiness = false;
    this.accident = { active: false, at: null, impactSpeed: 0 };
    this.autonomy = createAutonomyState();
    this.alcoholAt = null;
    this.drowsinessWarnAnnounced = false;
    this.criticalAnnounced = false;
    this.takeoverPlanned = false;
    this.manualStopRequested = false;
    this.prevSeverity = "SAFE";
    this.prevAutonomyPhase = "NONE";
    this.firstCriticalAt = null;
    this.sessionStartedAt = null;
    this.sessionCounts = { drowsiness: 0, alcohol: 0, accident: 0, interventions: 0, safeStops: 0 };
    this.sessionEventTally = { info: 0, warning: 0, critical: 0, ai: 0 };
    this.sessionIntervention = null;
    this.sessionReason = null;
    this.sessionResult = null;
    if (announce) this.emit("INFO", "SYSTEM", "Scenario reset — system nominal");
  }

  /* ============================ main loop ============================== */

  tick(rawDt: number) {
    const dt = Math.min(rawDt, 0.05);
    this.clock += dt;
    const s = this.settings;

    // ---------- vision merge ----------
    this.updateDriverAndDrowsiness(dt, s);

    // ---------- mode machine ----------
    switch (this.mode) {
      case "SAFETY_CHECK":
        this.tickSafetyCheck(dt);
        break;
      case "READY":
      case "MANUAL":
      case "WARNING":
        if (this.autopilot) {
          this.tickAutopilot(dt);
        } else {
          this.tickDriving(dt, s);
        }
        break;
      case "AUTONOMOUS":
        this.tickAutonomous(dt);
        break;
      case "STOPPING":
        this.tickStopping(dt);
        break;
      case "EMERGENCY":
        this.tickEmergency(dt);
        break;
      case "STOPPED":
        this.kin.throttle = 0;
        this.kin.brake = 0;
        this.kin.steering = 0;
        break;
      case "IDLE":
        break;
    }

    // ---------- safety evaluation (10 Hz) ----------
    this.safetyPulse(dt, s);
  }

  /* --------------------------- sub-routines ----------------------------- */

  private tickSafetyCheck(dt: number) {
    this.safetyCheckTimer += dt;
    if (!this.helmetCheckAnnounced && this.safetyCheckTimer > 0.5) {
      this.helmetCheckAnnounced = true;
      if (VEHICLE_RULES[this.vehicleType].requireHelmetToStart) {
        this.emit(
          this.helmet.state === "HELMET_DETECTED" ? "INFO" : "WARNING",
          "AI VISION",
          this.helmet.state === "HELMET_DETECTED"
            ? "Helmet detected (simulated detector)"
            : "Helmet NOT detected",
        );
      }
      this.emit(
        this.alcohol.detected ? "CRITICAL" : "INFO",
        "AI VISION",
        this.alcohol.detected
          ? `Alcohol sensor reading ${this.alcohol.level} — above threshold`
          : "Alcohol sensor reading 0 — within safe range",
      );
    }
    if (this.safetyCheckTimer >= 1.6) {
      // finalize checks
      const blockedHelmet =
        VEHICLE_RULES[this.vehicleType].requireHelmetToStart &&
        this.helmet.state !== "HELMET_DETECTED";
      const blockedAlcohol = this.alcohol.detected;
      if (blockedHelmet || blockedAlcohol) {
        this.mode = "IDLE";
        this.engineOn = false;
        this.startBlockedReason = blockedHelmet
          ? "HELMET NOT DETECTED"
          : "ALCOHOL DETECTED";
        this.emit(
          "CRITICAL",
          "SAFETY ENGINE",
          `START BLOCKED — ${this.startBlockedReason}`,
        );
        this.safetyStatus = "CRITICAL";
        this.decision = {
          severity: "CRITICAL",
          reason: blockedHelmet
            ? "Helmet interlock: no helmet detected"
            : "Alcohol interlock: sensor above threshold",
          recommendedAction: "BLOCK_START",
          controlMode: "LOCKED",
          evidence: [],
          trigger: blockedHelmet ? "HELMET" : "ALCOHOL",
        };
        this.sessionEventTally.critical += 1;
        this.prevSeverity = "CRITICAL";
        playCue("BLOCKED");
      } else {
        this.mode = "READY";
        this.engineOn = true;
        this.hazardsOn = false;
        this.sessionStartedAt = Date.now();
        this.emit("SAFE", "SAFETY ENGINE", "Safety checks passed");
        this.emit("INFO", "VEHICLE ENGINE", "Engine started — manual control available");
      }
    }
  }

  private tickDriving(dt: number, s: AppSettings) {
    // manual / warning driving: keyboard channel (demo mode auto-throttles)
    let throttle = this.kin.throttle;
    const brake = this.kin.brake;
    const steer = this.kin.steering;

    if (this.demoAutoThrottle) {
      const cruise = (s.cruiseSpeed[this.vehicleType] / 3.6) * 0.92;
      throttle = this.kin.speed < cruise ? 1 : 0.05;
    }

    const res = stepPhysics(
      this.kin.speed,
      this.kin.position,
      this.kin.lateral,
      this.kin.odometer,
      VEHICLE_SPECS[this.vehicleType],
      { throttle, brake, steer, powerLimit: this.powerLimit },
      dt,
      null,
    );
    this.applyPhysics(res);

    // mode semantics
    if (this.decision.severity === "WARNING") {
      this.mode = "WARNING";
    } else {
      this.mode = this.kin.speed > 0.5 ? "MANUAL" : "READY";
    }

    if (this.manualStopRequested) {
      this.manualStopRequested = false;
      this.beginControlledStop("MANUAL_STOP");
    }
  }

  /** autopilot chauffeur: cruise control + lane keeping toward lane center */
  private tickAutopilot(dt: number) {
    // driver brake input disengages autopilot (same convention as real ADAS)
    if (this.kin.brake > 0.2) {
      this.disengageAutopilot("driver brake input");
      this.tickDriving(dt, this.settings);
      return;
    }

    const cruise = this.highSpeed
      ? VEHICLE_SPECS[this.vehicleType].maxSpeed
      : this.settings.cruiseSpeed[this.vehicleType] / 3.6;
    const err = cruise - this.kin.speed;
    const throttle = err > 0.3 ? Math.min(1, 0.25 + err * 0.6) : err < -0.6 ? 0 : 0.08;
    const res = stepPhysics(
      this.kin.speed,
      this.kin.position,
      this.kin.lateral,
      this.kin.odometer,
      VEHICLE_SPECS[this.vehicleType],
      { throttle, brake: 0, steer: 0, powerLimit: this.powerLimit },
      dt,
      0, // lane keeping: steer back to lane center
    );
    this.applyPhysics(res);

    // mode semantics
    this.mode =
      this.decision.severity === "WARNING"
        ? "WARNING"
        : this.kin.speed > 0.5
          ? "MANUAL"
          : "READY";

    if (this.manualStopRequested) {
      this.manualStopRequested = false;
      this.disengageAutopilot("operator stop request");
      this.beginControlledStop("MANUAL_STOP");
    }
  }

  private tickAutonomous(dt: number) {
    const { cmd, done, phaseChanged } = autonomyTick(
      this.autonomy,
      this.kin.speed,
      this.kin.lateral,
      this.kin.position,
      VEHICLE_SPECS[this.vehicleType],
      dt,
    );
    if (phaseChanged) this.onAutonomyPhase(phaseChanged);

    const res = stepPhysics(
      this.kin.speed,
      this.kin.position,
      this.kin.lateral,
      this.kin.odometer,
      VEHICLE_SPECS[this.vehicleType],
      {
        throttle: cmd.throttle,
        brake: cmd.brake,
        steer: 0,
        powerLimit: 1,
      },
      dt,
      cmd.lateralTarget,
    );
    this.applyPhysics(res);

    if (done) {
      this.finalizeStop("SAFE_STOP");
    }
  }

  private tickStopping(dt: number) {
    const res = stepPhysics(
      this.kin.speed,
      this.kin.position,
      this.kin.lateral,
      this.kin.odometer,
      VEHICLE_SPECS[this.vehicleType],
      { throttle: 0, brake: this.pendingBrake, steer: 0, powerLimit: 1 },
      dt,
      this.pendingLateralTarget,
    );
    this.applyPhysics(res);
    if (this.kin.speed <= STOP_SPEED_EPS) {
      this.kin.speed = 0;
      this.finalizeStop(this.pendingStopResult);
    }
  }

  private tickEmergency(dt: number) {
    const res = stepPhysics(
      this.kin.speed,
      this.kin.position,
      this.kin.lateral,
      this.kin.odometer,
      VEHICLE_SPECS[this.vehicleType],
      { throttle: 0, brake: 1, steer: 0, powerLimit: 1 },
      dt,
      null,
    );
    this.applyPhysics(res);
    if (this.kin.speed <= STOP_SPEED_EPS) {
      this.kin.speed = 0;
      this.finalizeStop("EMERGENCY_STOP");
    }
  }

  private pendingStopResult: SessionRecord["result"] = "SAFE_STOP";
  private pendingLateralTarget: number | null = null;
  private pendingBrake = 0.55;

  private beginControlledStop(
    result: SessionRecord["result"],
    lateralTarget: number | null = null,
    brake = 0.55,
  ) {
    if (this.mode === "STOPPING" || this.mode === "STOPPED") return;
    this.pendingStopResult = result;
    this.pendingLateralTarget = lateralTarget;
    this.pendingBrake = brake;
    this.mode = "STOPPING";
    this.hazardsOn = true;
    this.controlLocked = true;
    this.disengageAutopilot("safety intervention");
    if (!this.sessionReason) {
      this.sessionReason =
        this.decision.trigger === null
          ? "Operator requested stop"
          : this.decision.reason;
    }
    this.emit("AI", "SAFETY ENGINE", "Controlled stop engaged — manual control disabled");
  }

  private enterEmergency(reason: string) {
    this.mode = "EMERGENCY";
    this.controlLocked = true;
    this.hazardsOn = true;
    this.disengageAutopilot("emergency stop");
    this.safetyStatus = "EMERGENCY";
    this.sessionReason = reason;
    this.decision = {
      severity: "EMERGENCY",
      reason,
      recommendedAction: "EMERGENCY_STOP",
      controlMode: "LOCKED",
      evidence: [],
      trigger: "EMERGENCY",
    };
  }

  private onAutonomyPhase(phase: AutonomyPhase) {
    if (phase === "DECELERATION") {
      this.emit("AI", "SAFETY ENGINE", "Autonomous safety mode active — reducing speed");
    } else if (phase === "ROADSIDE_ALIGNMENT") {
      this.emit("AI", "SAFETY ENGINE", "Roadside alignment — trajectory selected");
    } else if (phase === "SAFE_STOP") {
      this.emit("AI", "SAFETY ENGINE", "Safe stopping zone reached — final braking");
    }
  }

  private finalizeStop(result: SessionRecord["result"]) {
    this.mode = "STOPPED";
    this.kin.speed = 0;
    this.hazardsOn = true;
    this.controlLocked = true;
    if (result === "EMERGENCY_STOP") {
      this.safetyStatus = "EMERGENCY";
      this.emit("CRITICAL", "VEHICLE ENGINE", "Vehicle stopped — EMERGENCY");
    } else {
      this.safetyStatus = "SAFE";
      this.emit("SAFE", "VEHICLE ENGINE", "Vehicle stopped safely in designated zone");
      playCue("SAFE_STOP");
    }
    if (result === "SAFE_STOP") this.sessionCounts.safeStops += 1;
    this.stoppedByIntervention = true;
    this.emitFinalReport(result);
  }

  /* ------------------------------ vision -------------------------------- */

  private updateDriverAndDrowsiness(dt: number, s: AppSettings) {
    const visionActive = this.vision.active;
    const source: DetectionSource = this.simDrowsiness
      ? "SIMULATION"
      : visionActive
        ? "CAMERA"
        : "NONE";

    const eyeClosed =
      this.simDrowsiness || (visionActive && s.drowsinessEnabled && this.vision.eyeClosed);

    // temporal eye-closure accumulator
    if (eyeClosed) {
      this.drowsiness.closureDuration += dt;
      this.drowsiness.eyeClosed = true;
      this.drowsiness.source = source;
      const warn = Math.max(0.6, s.warningDuration);
      const crit = Math.max(warn + 0.4, s.criticalDuration);
      this.drowsiness.level =
        this.drowsiness.closureDuration >= crit
          ? "CRITICAL"
          : this.drowsiness.closureDuration >= warn
            ? "WARNING"
            : this.drowsiness.closureDuration > 0.18
              ? "BLINK"
              : "NORMAL";
      this.drowsiness.score = Math.min(
        100,
        (this.drowsiness.closureDuration / crit) * 100,
      );
      if (this.drowsiness.level === "WARNING" && !this.drowsinessWarnAnnounced) {
        this.drowsinessWarnAnnounced = true;
        this.emit(
          "WARNING",
          source === "CAMERA" ? "AI VISION" : "SIMULATION",
          `Drowsiness warning — eyes closed ${this.drowsiness.closureDuration.toFixed(1)} s`,
        );
        playCue("WARNING");
      }
      if (this.drowsiness.level === "CRITICAL" && !this.criticalAnnounced) {
        this.criticalAnnounced = true;
        this.emit(
          "CRITICAL",
          source === "CAMERA" ? "AI VISION" : "SIMULATION",
          `Critical drowsiness — eyes closed ${this.drowsiness.closureDuration.toFixed(1)} s, driver unresponsive`,
        );
        playCue("CRITICAL");
      }
    } else {
      if (this.drowsiness.closureDuration > 0.18) {
        this.drowsiness.blinkCount += 1;
      }
      const wasWarning =
        this.drowsiness.level === "WARNING" || this.drowsiness.level === "CRITICAL";
      if (wasWarning) {
        this.emit("INFO", "SYSTEM", "Driver alertness restored — drowsiness cleared");
      }
      this.drowsiness.closureDuration = 0;
      this.drowsiness.eyeClosed = false;
      this.drowsiness.level = "NORMAL";
      this.drowsiness.score = Math.max(0, this.drowsiness.score - dt * 60);
      this.drowsinessWarnAnnounced = false;
      this.criticalAnnounced = false;
      if (this.simDrowsiness) {
        // sim toggle on but treated as open (shouldn't happen) — keep closed flag
        this.drowsiness.eyeClosed = true;
      }
    }
    this.drowsiness.source = this.simDrowsiness
      ? "SIMULATION"
      : visionActive
        ? "CAMERA"
        : "NONE";

    // driver presence
    if (visionActive && s.driverPresenceDetection) {
      this.driver.faceDetected = this.vision.faceDetected;
      this.driver.source = "CAMERA";
      if (!this.vision.faceDetected) {
        if (this.faceAbsentSince === null) this.faceAbsentSince = this.clock;
        if (
          !this.faceAbsentAnnounced &&
          this.clock - this.faceAbsentSince > s.faceAbsenceTimeout
        ) {
          this.faceAbsentAnnounced = true;
          this.emit("WARNING", "AI VISION", "Driver face not detected by camera");
        }
      } else {
        if (this.faceAbsentAnnounced) {
          this.emit("INFO", "AI VISION", "Driver face re-detected");
        }
        this.faceAbsentSince = null;
        this.faceAbsentAnnounced = false;
      }
    } else {
      this.driver.faceDetected = true;
      this.driver.source = "NONE";
      this.faceAbsentSince = null;
      this.faceAbsentAnnounced = false;
    }
    this.driver.present =
      this.driver.source !== "CAMERA" || this.driver.faceDetected;
    const attentionTarget =
      this.drowsiness.level === "CRITICAL"
        ? 12
        : this.drowsiness.level === "WARNING"
          ? 45
          : this.drowsiness.level === "BLINK"
            ? 88
            : !this.driver.present
              ? 55
              : 97;
    this.driver.attention +=
      (attentionTarget - this.driver.attention) * Math.min(1, dt * 3);
  }

  private alcoholEscalated(): boolean {
    if (this.alcoholAt === null) return false;
    return this.clock - this.alcoholAt >= this.settings.interventionDelay;
  }

  /* --------------------------- safety pulse ------------------------------ */

  private safetyAccum = 0;

  private safetyPulse(dt: number, s: AppSettings) {
    this.safetyAccum += dt;
    if (this.safetyAccum < 0.1) return;
    this.safetyAccum = 0;

    const input = {
      vehicleType: this.vehicleType,
      vehicleMode: this.mode,
      helmet: this.helmet,
      alcohol: this.alcohol,
      alcoholEscalated: this.alcoholEscalated(),
      drowsiness: this.drowsiness,
      driver: this.driver,
      accident: this.accident,
      engineOn: this.engineOn,
      moving: this.kin.speed > 0.5,
    };
    const decision = evaluateSafety(input);
    this.decision = decision;

    // severity transitions → events + audio
    if (decision.severity !== this.prevSeverity) {
      this.onSeverityChange(this.prevSeverity, decision.severity, decision);
      this.prevSeverity = decision.severity;
    }

    // periodic warning beeps while in warning
    if (
      decision.severity === "WARNING" &&
      this.mode !== "IDLE" &&
      this.clock - this.lastWarnBeep > 2.2
    ) {
      this.lastWarnBeep = this.clock;
      playCue("WARNING");
    }

    // apply decision actions to the state machine
    // EMERGENCY applies from any active mode (including autonomous)
    if (
      decision.recommendedAction === "EMERGENCY_STOP" &&
      this.mode !== "IDLE" &&
      this.mode !== "SAFETY_CHECK" &&
      this.mode !== "STOPPED"
    ) {
      this.sessionCounts.interventions += 1;
      this.sessionIntervention = "Emergency stop";
      this.enterEmergency("Accident / impact detected");
      return;
    }

    if (this.mode === "READY" || this.mode === "MANUAL" || this.mode === "WARNING") {
      switch (decision.recommendedAction) {
        case "WARN":
          this.controlLocked = false;
          this.safetyStatus = "WARNING";
          break;
        case "REDUCE_POWER": {
          // bike: motor power reduced → glide to a controlled stop
          this.safetyStatus = "CRITICAL";
          this.sessionCounts.interventions += 1;
          this.sessionIntervention = "Motor power reduction + controlled stop";
          this.bikeMotorLimited = true;
          this.powerLimit = 0.25;
          this.emit(
            "WARNING",
            "SAFETY ENGINE",
            "Motor power reduced — controlled shutdown",
          );
          if (this.kin.speed > 0.2) {
            this.beginControlledStop("SAFE_STOP", null, 0.35);
          } else {
            this.finalizeStop("SAFE_STOP");
          }
          break;
        }
        case "CONTROLLED_STOP":
          this.safetyStatus = "CRITICAL";
          this.sessionCounts.interventions += 1;
          this.sessionIntervention = "Controlled safety stop";
          this.beginControlledStop("SAFE_STOP");
          break;
        case "AUTONOMOUS_STOP":
          this.safetyStatus = "CRITICAL";
          this.beginAutonomousStop(s);
          break;
        case "BLOCK_START":
          // engine running but interlock demands hold (e.g., alcohol while idle)
          this.safetyStatus = "CRITICAL";
          if (this.engineOn) {
            this.beginControlledStop("SAFE_STOP");
          }
          break;
        default:
          this.safetyStatus = "SAFE";
      }
    } else if (
      this.mode === "IDLE" &&
      decision.recommendedAction === "BLOCK_START" &&
      decision.trigger === "HELMET"
    ) {
      // keep the interlock visible on the dashboard
      this.safetyStatus = "WARNING";
      this.startBlockedReason = this.startBlockedReason ?? "HELMET NOT DETECTED";
    }
  }

  private beginAutonomousStop(s: AppSettings) {
    if (this.mode === "AUTONOMOUS") return;
    this.sessionCounts.interventions += 1;
    this.sessionIntervention = "Autonomous roadside safety stop";
    this.mode = "AUTONOMOUS";
    this.controlLocked = true;
    this.hazardsOn = true;
    this.disengageAutopilot("autonomous safety takeover");
    this.firstCriticalAt ??= Date.now();
    if (!this.takeoverPlanned) {
      this.takeoverPlanned = true;
      this.sessionReason = this.decision.reason;
      planTakeover(
        this.autonomy,
        this.kin.speed,
        this.kin.position,
        this.kin.lateral,
        VEHICLE_SPECS[this.vehicleType],
        s.roadsideTarget,
      );
      this.emit(
        "AI",
        "SAFETY ENGINE",
        "AUTONOMOUS TAKEOVER — manual control disabled",
      );
      this.emit(
        "AI",
        "VEHICLE ENGINE",
        `Safe stop zone designated at +${Math.round(this.autonomy.stopZone.position - this.kin.position)} m`,
      );
      playCue("TAKEOVER");
    }
  }

  private onSeverityChange(
    prev: SafetyStatus,
    next: SafetyStatus,
    decision: SafetyDecision,
  ) {
    if (next === "CRITICAL" || next === "EMERGENCY") {
      this.firstCriticalAt ??= Date.now();
      this.sessionEventTally.critical += 1;
      if (decision.trigger === "DROWSINESS") {
        this.sessionCounts.interventions += 0; // counted at action application
      }
    } else if (next === "WARNING") {
      this.sessionEventTally.warning += 1;
    }
    this.emit(
      next === "SAFE"
        ? "SAFE"
        : next === "WARNING"
          ? "WARNING"
          : "CRITICAL",
      "SAFETY ENGINE",
      decision.reason,
    );
  }

  /* ------------------------------ physics -------------------------------- */

  private applyPhysics(res: {
    speed: number;
    position: number;
    lateral: number;
    odometer: number;
    headingDeg: number;
  }) {
    this.kin.accel = (res.speed - this.kin.speed) / 0.016;
    this.kin.speed = res.speed;
    this.kin.position = res.position;
    this.kin.lateral = res.lateral;
    this.kin.odometer = res.odometer;
    this.kin.headingDeg = res.headingDeg;
  }

  /* ------------------------------- events -------------------------------- */

  emit(type: TimelineEvent["type"], source: TimelineEvent["source"], message: string) {
    // dedupe identical messages within 1.5 s
    const key = `${type}:${message}`;
    const last = this.lastEventAt.get(key) ?? -10;
    if (this.clock - last < 1.5) return;
    this.lastEventAt.set(key, this.clock);

    if (type === "INFO") this.sessionEventTally.info += 1;
    if (type === "WARNING") this.sessionEventTally.warning += 1;
    if (type === "CRITICAL") this.sessionEventTally.critical += 1;
    if (type === "AI") this.sessionEventTally.ai += 1;

    const e: TimelineEvent = {
      id: makeEventId(),
      ts: Date.now(),
      type,
      source,
      message,
    };
    this.listener?.onEvent(e);
  }

  private emitFinalReport(result: SessionRecord["result"]) {
    const durationSec = this.sessionStartedAt
      ? (Date.now() - this.sessionStartedAt) / 1000
      : 0;
    const interventionTimeSec =
      this.firstCriticalAt && this.sessionStartedAt
        ? (Date.now() - this.firstCriticalAt) / 1000
        : null;
    const record: SessionRecord = {
      id: makeSessionId(),
      vehicle: this.vehicleType,
      startedAt: this.sessionStartedAt ?? Date.now(),
      durationSec,
      result,
      intervention: this.sessionIntervention,
      interventionTimeSec,
      reason:
        this.sessionReason ??
        (this.decision.trigger
          ? this.decision.reason
          : result === "MANUAL_STOP"
            ? "Operator requested stop"
            : "Routine stop"),
      eventCounts: { ...this.sessionEventTally },
      counts: { ...this.sessionCounts },
    };
    this.sessionResult = result;
    this.listener?.onSessionEnd(record);
  }

  /* ------------------------------ snapshot ------------------------------- */

  snapshot(): EngineSnapshot {
    return {
      vehicleType: this.vehicleType,
      mode: this.mode,
      safetyStatus: this.safetyStatus,
      controlMode:
        this.mode === "AUTONOMOUS"
          ? "AUTONOMOUS"
          : this.controlLocked
            ? "LOCKED"
            : this.autopilot
              ? "AUTOPILOT"
              : "MANUAL",
      decision: this.decision,
      engineOn: this.engineOn,
      moving: this.kin.speed > 0.5,
      autopilot: this.autopilot,
      highSpeed: this.highSpeed,
      stoppedByIntervention: this.stoppedByIntervention,
      speedKmh: this.kin.speed * 3.6,
      accelMs2: this.kin.accel,
      steer: this.kin.steering,
      throttle: this.kin.throttle,
      brake: this.kin.brake,
      odometerM: this.kin.odometer,
      lateral: this.kin.lateral,
      headingDeg: this.kin.headingDeg,
      hazardsOn: this.hazardsOn,
      controlLocked: this.controlLocked || this.mode === "AUTONOMOUS" || this.mode === "STOPPING" || this.mode === "STOPPED" || this.mode === "EMERGENCY",
      startBlockedReason: this.startBlockedReason,
      powerLimited: this.bikeMotorLimited,
      autonomyPhase: this.autonomy.phase,
      stopZoneActive: this.autonomy.stopZone.active,
      stopZonePos: this.autonomy.stopZone.position,
      helmet: this.helmet,
      alcohol: this.alcohol,
      drowsiness: this.drowsiness,
      driver: this.driver,
      accident: this.accident,
      vision: {
        active: this.vision.active,
        modelStatus: this.vision.modelStatus,
        faceDetected: this.vision.faceDetected,
        eyeClosed: this.vision.eyeClosed,
        blinkScore: this.vision.blinkScore,
        headYaw: this.vision.headYaw,
        fps: this.vision.fps,
      },
      sessionStartedAt: this.sessionStartedAt,
      lastAccel: this.kin.accel,
      accidentWobble:
        this.accident.active && this.accident.at !== null
          ? Math.max(0, 1 - (this.clock - this.accident.at) / 2)
          : 0,
      bikeMotorLimited: this.bikeMotorLimited,
    };
  }

  /* --------------------------- keyboard input ---------------------------- */

  setInput(throttleDelta: number, brakeDelta: number, steer: number) {
    if (this.controlLocked) return;
    if (this.mode !== "MANUAL" && this.mode !== "READY" && this.mode !== "WARNING") return;
    this.kin.throttle = Math.max(0, Math.min(1, this.kin.throttle + throttleDelta));
    this.kin.brake = Math.max(0, Math.min(1, this.kin.brake + brakeDelta));
    this.kin.steering = steer;
  }

  setSteer(steer: number) {
    if (this.controlLocked) return;
    if (this.mode !== "MANUAL" && this.mode !== "READY" && this.mode !== "WARNING") return;
    this.kin.steering = steer;
  }

  setThrottle(v: number) {
    if (this.controlLocked) return;
    if (this.mode !== "MANUAL" && this.mode !== "READY" && this.mode !== "WARNING") return;
    this.kin.throttle = v;
  }

  setBrake(v: number) {
    if (this.controlLocked) return;
    this.kin.brake = v;
  }

}

/* --------------------------------------------------------------------------
 * Singleton engine instance. loadSettings() safely returns defaults during
 * SSR; the client re-hydrates persisted settings when the store boots.
 * ------------------------------------------------------------------------ */

import { loadSettings } from "../storage";

export const simulationEngine = new SimulationEngine(loadSettings());
