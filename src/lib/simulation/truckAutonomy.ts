/**
 * Truck autonomous safety mode — phased takeover controller.
 *
 * MANUAL → RISK DETECTED → WARNING → CRITICAL → AUTONOMOUS TAKEOVER
 *        → DECELERATION → ROADSIDE ALIGNMENT → SAFE STOP
 *
 * The vehicle is never teleported: every phase issues control inputs that
 * the physics integrator applies over time, so the manoeuvre is visibly
 * animated on the road canvas.
 */

import type { AutonomyPhase, SafeStopZone, VehicleType } from "../types";
import { ROAD_GEOMETRY, stoppingDistance, type VehicleSpec } from "./vehiclePhysics";

export interface AutonomyState {
  phase: AutonomyPhase;
  phaseElapsed: number; // seconds in current phase
  stopZone: SafeStopZone;
  targetLateral: number;
  targetSpeed: number; // m/s ceiling commanded during takeover
  path: { x: number; y: number }[]; // planned trajectory (world coords)
}

export interface AutonomyCommand {
  throttle: number;
  brake: number;
  lateralTarget: number | null;
}

export function createAutonomyState(): AutonomyState {
  return {
    phase: "NONE",
    phaseElapsed: 0,
    stopZone: { position: 0, lateral: ROAD_GEOMETRY.shoulderCenter, active: false },
    targetLateral: ROAD_GEOMETRY.shoulderCenter,
    targetSpeed: 0,
    path: [],
  };
}

/** Activate autonomous mode: compute the safe stop zone ahead of the truck. */
export function planTakeover(
  state: AutonomyState,
  speed: number,
  position: number,
  lateral: number,
  spec: VehicleSpec,
  roadsideTarget: number,
) {
  const comfortDecel = Math.max(1.6, spec.brakeDecel * 0.62);
  const need = stoppingDistance(speed, comfortDecel);
  const zonePos = position + Math.max(need * 1.55, 42);
  state.stopZone = {
    position: zonePos,
    lateral: roadsideTarget,
    active: true,
  };
  state.targetLateral = roadsideTarget;
  state.phase = "TAKEOVER";
  state.phaseElapsed = 0;
  state.targetSpeed = speed;
  state.path = buildPath(position, lateral, zonePos, roadsideTarget);
  return state;
}

function buildPath(
  fromPos: number,
  fromLat: number,
  zonePos: number,
  zoneLat: number,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // ease-out lateral transition, eased longitudinal speed profile
    const x = fromPos + (zonePos - fromPos) * (1 - Math.pow(1 - t, 1.35));
    const y = fromLat + (zoneLat - fromLat) * Math.pow(t, 0.8);
    pts.push({ x, y });
  }
  return pts;
}

/**
 * Per-tick autonomous controller. Returns the control command for physics
 * and advances the phase state machine.
 */
export function autonomyTick(
  state: AutonomyState,
  speed: number,
  lateral: number,
  position: number,
  spec: VehicleSpec,
  dt: number,
): { cmd: AutonomyCommand; done: boolean; phaseChanged: AutonomyPhase | null } {
  state.phaseElapsed += dt;
  const phaseChanged: AutonomyPhase[] = [];

  const cmd: AutonomyCommand = { throttle: 0, brake: 0, lateralTarget: null };
  let done = false;

  switch (state.phase) {
    case "TAKEOVER": {
      // brief announcement phase: hold speed briefly, then hand to deceleration
      cmd.throttle = 0.15;
      cmd.brake = 0;
      if (state.phaseElapsed >= 1.2) {
        state.phase = "DECELERATION";
        state.phaseElapsed = 0;
        state.targetSpeed = spec.maxSpeed * 0.45;
        phaseChanged.push("DECELERATION");
      }
      break;
    }
    case "DECELERATION": {
      cmd.throttle = 0;
      cmd.brake = speed > state.targetSpeed ? 0.35 : 0;
      cmd.lateralTarget = null; // stay in lane while slowing
      if (state.phaseElapsed >= 2.6 || speed <= state.targetSpeed) {
        state.phase = "ROADSIDE_ALIGNMENT";
        state.phaseElapsed = 0;
        phaseChanged.push("ROADSIDE_ALIGNMENT");
      }
      break;
    }
    case "ROADSIDE_ALIGNMENT": {
      cmd.throttle = 0;
      cmd.brake = 0.22;
      cmd.lateralTarget = state.targetLateral;
      const aligned = Math.abs(lateral - state.targetLateral) < 0.12;
      if (aligned && state.phaseElapsed >= 1.2) {
        state.phase = "SAFE_STOP";
        state.phaseElapsed = 0;
        phaseChanged.push("SAFE_STOP");
      }
      if (position >= state.stopZone.position - 2) {
        state.phase = "SAFE_STOP";
        state.phaseElapsed = 0;
        phaseChanged.push("SAFE_STOP");
      }
      break;
    }
    case "SAFE_STOP": {
      cmd.throttle = 0;
      cmd.brake = speed > 0.2 ? 0.6 : 0;
      cmd.lateralTarget = state.targetLateral;
      if (speed <= 0.25) {
        state.phase = "STOPPED";
        state.phaseElapsed = 0;
        phaseChanged.push("STOPPED");
        done = true;
      }
      break;
    }
    default:
      done = true;
  }

  return { cmd, done, phaseChanged: phaseChanged[0] ?? null };
}

/** Whether the vehicle type supports the full roadside autonomous maneuver. */
export function supportsRoadsideStop(t: VehicleType): boolean {
  return t === "TRUCK";
}
