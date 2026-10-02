/**
 * Vehicle physics — deterministic, stable, tuned for a believable visual
 * simulation rather than real-world dynamics.
 *
 * Units:
 *   speed    m/s
 *   position meters along the road
 *   lateral  meters from travel lane center (positive = toward roadside)
 */

export interface VehicleSpec {
  maxSpeed: number; // m/s
  accel: number; // m/s^2 at full throttle
  brakeDecel: number; // m/s^2 at full brake
  dragDecel: number; // m/s^2 coasting friction
  steerRate: number; // lateral m/s at full steering input
  length: number; // meters (sprite)
  width: number; // meters (sprite)
}

export const VEHICLE_SPECS: Record<
  "BIKE" | "CAR" | "TRUCK",
  VehicleSpec
> = {
  BIKE: {
    maxSpeed: 80 / 3.6,
    accel: 5.5,
    brakeDecel: 6.0,
    dragDecel: 0.6,
    steerRate: 3.2,
    length: 2.1,
    width: 0.9,
  },
  CAR: {
    maxSpeed: 120 / 3.6,
    accel: 4.4,
    brakeDecel: 5.2,
    dragDecel: 0.5,
    steerRate: 2.4,
    length: 4.6,
    width: 1.9,
  },
  TRUCK: {
    maxSpeed: 90 / 3.6,
    accel: 2.6,
    brakeDecel: 3.6,
    dragDecel: 0.35,
    steerRate: 1.5,
    length: 12.5,
    width: 2.55,
  },
};

/** Lane geometry (meters). Travel lane center is lateral = 0. */
export const ROAD_GEOMETRY = {
  laneWidth: 3.6,
  shoulderWidth: 4.6, // roadside strip beyond right road edge
  roadHalf: 3.6, // from center to right edge; left lane mirrors
  shoulderCenter: 3.6 + 2.3, // default roadside stop lateral
  roadTop: -3.6,
  roadBottom: 3.6,
};

export interface PhysicsInput {
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1..1 (positive = toward roadside / right)
  powerLimit: number; // 0..1 multiplier on acceleration (bike alcohol limiter)
}

export interface PhysicsStepResult {
  speed: number;
  position: number;
  lateral: number;
  odometer: number;
  headingDeg: number;
}

export function stepPhysics(
  speed: number,
  position: number,
  lateral: number,
  odometer: number,
  spec: VehicleSpec,
  input: PhysicsInput,
  dt: number,
  lateralTarget: number | null, // when set, lateral is steered automatically
): PhysicsStepResult {
  // ---- longitudinal ----
  const maxAccel = spec.accel * input.powerLimit;
  const accel = input.throttle * maxAccel;
  const decel = input.brake * spec.brakeDecel + spec.dragDecel;
  let s = speed + (accel - decel) * dt;
  if (s < 0) s = 0;
  s = Math.min(s, spec.maxSpeed);

  const pos = position + s * dt;
  const odo = odometer + s * dt;

  // ---- lateral ----
  let lat = lateral;
  let heading = 0;
  if (lateralTarget !== null) {
    const diff = lateralTarget - lat;
    const maxStep = spec.steerRate * dt;
    const step = Math.max(
      -maxStep,
      Math.min(maxStep, diff * 1.6 * dt + Math.sign(diff) * 0.12 * dt),
    );
    lat = Math.abs(diff) < 0.02 ? lateralTarget : lat + step;
    heading = Math.atan2(step * 60, Math.max(s, 2)) * (180 / Math.PI);
    heading = Math.max(-30, Math.min(30, heading));
  } else {
    const maxStep = spec.steerRate * dt;
    lat = lat + input.steer * maxStep;
    // constrain to roadway + shoulder band
    const minLat = -3.0;
    const maxLat = 6.4;
    lat = Math.max(minLat, Math.min(maxLat, lat));
    heading = input.steer * 12 * Math.min(1, s / 8);
  }

  return {
    speed: s,
    position: pos,
    lateral: lat,
    odometer: odo,
    headingDeg: heading,
  };
}

/** Distance needed to stop from v at decel a (meters). */
export function stoppingDistance(v: number, a: number): number {
  if (a <= 0.01) return 0;
  return (v * v) / (2 * a);
}
