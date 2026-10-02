/**
 * Central safety engine.
 *
 * evaluateSafety() is a pure function: it inspects vehicle + driver + sensor
 * state and returns the severity, reason, recommended action and control mode.
 * The simulation engine consumes this decision and drives the state machine.
 */

import type {
  RecommendedAction,
  SafetyDecision,
  SafetyInput,
  SafetyStatus,
} from "../types";
import { VEHICLE_RULES } from "./vehicleRules";

const SAFE_DECISION: SafetyDecision = {
  severity: "SAFE",
  reason: "All safety monitors nominal",
  recommendedAction: "NONE",
  controlMode: "MANUAL",
  evidence: [],
  trigger: null,
};

export function evaluateSafety(input: SafetyInput): SafetyDecision {
  const rules = VEHICLE_RULES[input.vehicleType];
  const { helmet, alcohol, drowsiness, driver, accident, engineOn, moving } =
    input;

  // ---- 1. Accident has absolute priority ----
  if (accident.active) {
    return {
      severity: "EMERGENCY",
      reason: "Accident / impact detected",
      recommendedAction: rules.accidentAction,
      controlMode: "LOCKED",
      evidence: [
        `Impact simulated at ${accident.impactSpeed.toFixed(0)} km/h`,
        "Vehicle instability detected",
        "Manual control disabled by emergency protocol",
      ],
      trigger: "ACCIDENT",
    };
  }

  // ---- 2. Alcohol ----
  if (alcohol.detected) {
    const evidence = [
      `Alcohol sensor level ${alcohol.level.toFixed(0)} (threshold ${alcohol.threshold.toFixed(0)})`,
      `Source: ${alcohol.source}`,
    ];
    if (!engineOn) {
      return {
        severity: "CRITICAL",
        reason: "Alcohol detected — engine start blocked",
        recommendedAction: "BLOCK_START",
        controlMode: "LOCKED",
        evidence,
        trigger: "ALCOHOL",
      };
    }
    if (moving && !input.alcoholEscalated) {
      // grace period: driver warning issued first
      return {
        severity: "WARNING",
        reason: "Alcohol detected — driver warning issued",
        recommendedAction: "WARN",
        controlMode: "MANUAL",
        evidence,
        trigger: "ALCOHOL",
      };
    }
    if (moving) {
      return {
        severity: "CRITICAL",
        reason: "Alcohol confirmed — safety intervention engaged",
        recommendedAction: rules.alcoholMovingPolicy,
        controlMode:
          rules.alcoholMovingPolicy === "AUTONOMOUS_STOP" ? "AUTONOMOUS" : "LOCKED",
        evidence,
        trigger: "ALCOHOL",
      };
    }
    // engine on but stationary
    return {
      severity: "CRITICAL",
      reason: "Alcohol detected — vehicle hold",
      recommendedAction:
        rules.alcoholMovingPolicy === "REDUCE_POWER"
          ? "CONTROLLED_STOP"
          : rules.alcoholMovingPolicy,
      controlMode:
        rules.alcoholMovingPolicy === "AUTONOMOUS_STOP" ? "AUTONOMOUS" : "LOCKED",
      evidence,
      trigger: "ALCOHOL",
    };
  }

  // ---- 3. Helmet (bike, pre-start) ----
  if (rules.requireHelmetToStart && !engineOn && vehicleTypeSelected(input)) {
    if (helmet.state === "HELMET_NOT_DETECTED") {
      return {
        severity: "WARNING",
        reason: "Helmet not detected — engine start blocked",
        recommendedAction: "BLOCK_START",
        controlMode: "LOCKED",
        evidence: [
          "Helmet detection state: NOT DETECTED",
          `Source: ${helmet.source}`,
          "Bike interlock requires helmet before ignition",
        ],
        trigger: "HELMET",
      };
    }
  }

  // ---- 4. Drowsiness (temporal status computed upstream) ----
  if (drowsiness.level === "CRITICAL") {
    return {
      severity: "CRITICAL",
      reason: "Critical drowsiness — driver unresponsive",
      recommendedAction: rules.drowsinessCriticalAction,
      controlMode: rules.drowsinessCriticalAction === "AUTONOMOUS_STOP" ? "AUTONOMOUS" : "LOCKED",
      evidence: [
        `Eyes closed for ${drowsiness.closureDuration.toFixed(1)} s`,
        drowsiness.source === "CAMERA"
          ? "Detected by on-device camera vision"
          : "Injected by simulation trigger",
        "Driver did not recover after warning",
      ],
      trigger: "DROWSINESS",
    };
  }
  if (drowsiness.level === "WARNING") {
    return {
      severity: "WARNING",
      reason: "Drowsiness warning — prolonged eye closure",
      recommendedAction: rules.drowsinessWarningAction,
      controlMode: "MANUAL",
      evidence: [
        `Eyes closed for ${drowsiness.closureDuration.toFixed(1)} s`,
        drowsiness.source === "CAMERA"
          ? "Detected by on-device camera vision"
          : "Injected by simulation trigger",
      ],
      trigger: "DROWSINESS",
    };
  }

  // ---- 5. Driver presence ----
  if (
    input.driver.source === "CAMERA" &&
    !driver.faceDetected &&
    engineOn &&
    moving
  ) {
    return {
      severity: "WARNING",
      reason: "Driver face not detected by camera",
      recommendedAction: "WARN",
      controlMode: "MANUAL",
      evidence: [
        "No face visible in driver monitoring camera",
        "Vehicle still under manual control",
      ],
      trigger: "DRIVER_PRESENCE",
    };
  }

  return { ...SAFE_DECISION };
}

function vehicleTypeSelected(input: SafetyInput): boolean {
  return input.vehicleMode !== "IDLE" || true; // helmet gate applies whenever bike is selected
}

export function decisionFromStatus(status: SafetyStatus, reason: string): SafetyDecision {
  const action: RecommendedAction =
    status === "EMERGENCY"
      ? "EMERGENCY_STOP"
      : status === "CRITICAL"
        ? "CONTROLLED_STOP"
        : status === "WARNING"
          ? "WARN"
          : "NONE";
  return {
    severity: status,
    reason,
    recommendedAction: action,
    controlMode: status === "CRITICAL" || status === "EMERGENCY" ? "LOCKED" : "MANUAL",
    evidence: [],
    trigger: null,
  };
}
