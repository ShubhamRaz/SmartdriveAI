/**
 * TECH FEST DEMO MODE — prebuilt scenarios.
 *
 * Each scenario is a scripted list of steps. A step can perform an action and
 * optionally define an advance() condition polled by the demo runner; a step
 * always times out after maxMs so the demo can never get stuck.
 */

import type { DemoScenario, VehicleMode } from "../types";

export interface DemoApi {
  selectVehicle: (t: "BIKE" | "CAR" | "TRUCK") => void;
  start: () => void;
  stop: () => void;
  reset: () => void;
  enableAutoThrottle: (on: boolean) => void;
  triggerAlcohol: (on: boolean) => void;
  triggerDrowsiness: (on: boolean) => void;
  simulateAccident: () => void;
  setHelmet: (worn: boolean) => void;
  mode: () => VehicleMode;
  isMoving: () => boolean;
  isStopped: () => boolean;
  isReady: () => boolean;
  isBlocked: () => boolean;
  isAutonomous: () => boolean;
  isSafeStopPhase: () => boolean;
  speedKmh: () => number;
}

const moving = (api: DemoApi) => api.isMoving();
const ready = (api: DemoApi) => api.isReady();
const blocked = (api: DemoApi) => api.isBlocked();
const stopped = (api: DemoApi) => api.isStopped();
const autonomous = (api: DemoApi) => api.isAutonomous();
const safeStopPhase = (api: DemoApi) => api.isSafeStopPhase();

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "bike-helmet",
    title: "Bike Helmet Safety",
    vehicle: "BIKE",
    description:
      "Ignition interlock: the bike refuses to start without a helmet, then starts once the helmet is detected.",
    steps: [
      {
        label: "Select BIKE",
        detail: "Helmet + alcohol monitoring enabled",
        maxMs: 1000,
        run: (api) => {
          api.reset();
          api.selectVehicle("BIKE");
        },
      },
      {
        label: "Attempt start — no helmet",
        detail: "Helmet detector reports HELMET_NOT_DETECTED",
        maxMs: 3200,
        run: (api) => api.start(),
        advance: blocked,
      },
      {
        label: "START BLOCKED — ignition interlock",
        detail: "Safety engine refuses ignition",
        maxMs: 2600,
      },
      {
        label: "Simulate helmet detected",
        detail: "Simulated helmet detector reports HELMET_DETECTED",
        maxMs: 1200,
        run: (api) => api.setHelmet(true),
      },
      {
        label: "Restart — run safety checks",
        detail: "Helmet OK, alcohol 0",
        maxMs: 3600,
        run: (api) => api.start(),
        advance: ready,
      },
      {
        label: "Bike ready — interlock satisfied",
        detail: "Rider may accelerate",
        maxMs: 2600,
      },
      {
        label: "Scenario complete",
        detail: "Helmet interlock demonstrated",
        maxMs: 800,
        run: (api) => api.enableAutoThrottle(false),
      },
    ],
  },
  {
    id: "bike-alcohol",
    title: "Bike Alcohol Prevention",
    vehicle: "BIKE",
    description:
      "Alcohol detected while riding: warning → motor power reduced → bike comes to a controlled stop.",
    steps: [
      {
        label: "Select BIKE + helmet on",
        detail: "Prepare a compliant rider",
        maxMs: 900,
        run: (api) => {
          api.reset();
          api.selectVehicle("BIKE");
          api.setHelmet(true);
        },
      },
      {
        label: "Start engine",
        detail: "Safety checks pass",
        maxMs: 3600,
        run: (api) => api.start(),
        advance: ready,
      },
      {
        label: "Accelerate",
        detail: "Riding at city speed",
        maxMs: 6500,
        run: (api) => api.enableAutoThrottle(true),
        advance: moving,
      },
      {
        label: "Trigger alcohol sensor",
        detail: "Sensor level rises above threshold",
        maxMs: 4200,
        run: (api) => api.triggerAlcohol(true),
      },
      {
        label: "Driver warning issued",
        detail: "Escalation timer running",
        maxMs: 3600,
      },
      {
        label: "Motor power reduced → bike stops",
        detail: "Controlled shutdown engaged",
        maxMs: 14000,
        advance: stopped,
      },
      {
        label: "Scenario complete",
        detail: "Alcohol interlock demonstrated",
        maxMs: 900,
        run: (api) => api.enableAutoThrottle(false),
      },
    ],
  },
  {
    id: "car-drowsiness",
    title: "Car Drowsiness Stop",
    vehicle: "CAR",
    description:
      "Driver eyes close: drowsiness warning → critical drowsiness → controlled emergency stop.",
    steps: [
      {
        label: "Select CAR",
        detail: "Driver camera monitoring enabled",
        maxMs: 900,
        run: (api) => {
          api.reset();
          api.selectVehicle("CAR");
        },
      },
      {
        label: "Start engine",
        detail: "Safety checks pass",
        maxMs: 3600,
        run: (api) => api.start(),
        advance: ready,
      },
      {
        label: "Accelerate to highway speed",
        detail: "Cruise ~80 km/h",
        maxMs: 8000,
        run: (api) => api.enableAutoThrottle(true),
        advance: moving,
      },
      {
        label: "Simulate driver drowsiness",
        detail: "Eyes closed — closure timer running",
        maxMs: 1200,
        run: (api) => api.triggerDrowsiness(true),
      },
      {
        label: "Drowsiness warning",
        detail: "Prolonged eye closure detected",
        maxMs: 3200,
      },
      {
        label: "Critical drowsiness → controlled stop",
        detail: "Driver unresponsive — system brakes",
        maxMs: 15000,
        advance: stopped,
      },
      {
        label: "Scenario complete",
        detail: "Drowsiness intervention demonstrated",
        maxMs: 900,
        run: (api) => {
          api.triggerDrowsiness(false);
          api.enableAutoThrottle(false);
        },
      },
    ],
  },
  {
    id: "truck-alcohol",
    title: "Truck Alcohol Autonomous Stop",
    vehicle: "TRUCK",
    description:
      "Flagship scenario: alcohol detected at speed → autonomous takeover → roadside alignment → safe stop zone.",
    steps: [
      {
        label: "Select TRUCK",
        detail: "Autonomous safety stop armed",
        maxMs: 900,
        run: (api) => {
          api.reset();
          api.selectVehicle("TRUCK");
        },
      },
      {
        label: "Start engine",
        detail: "Safety checks pass",
        maxMs: 3600,
        run: (api) => api.start(),
        advance: ready,
      },
      {
        label: "Accelerate to highway speed",
        detail: "Loaded truck cruising",
        maxMs: 9000,
        run: (api) => api.enableAutoThrottle(true),
        advance: moving,
      },
      {
        label: "Trigger alcohol sensor",
        detail: "Sensor level 78 — threshold exceeded",
        maxMs: 1200,
        run: (api) => api.triggerAlcohol(true),
      },
      {
        label: "Driver warning issued",
        detail: "Escalation timer running",
        maxMs: 3600,
      },
      {
        label: "AUTONOMOUS TAKEOVER",
        detail: "Manual control disabled",
        maxMs: 5000,
        advance: autonomous,
      },
      {
        label: "Deceleration + roadside alignment",
        detail: "Trajectory toward safe stop zone",
        maxMs: 11000,
        advance: safeStopPhase,
      },
      {
        label: "Entering safe stop zone",
        detail: "Final braking",
        maxMs: 9000,
        advance: stopped,
      },
      {
        label: "Vehicle stopped safely",
        detail: "Hazard lights active — report generated",
        maxMs: 1200,
        run: (api) => api.enableAutoThrottle(false),
      },
    ],
  },
  {
    id: "truck-drowsiness",
    title: "Truck Drowsiness Autonomous Stop",
    vehicle: "TRUCK",
    description:
      "Driver closes eyes at speed: warning → critical drowsiness → autonomous roadside safe stop.",
    steps: [
      {
        label: "Select TRUCK",
        detail: "Driver camera monitoring enabled",
        maxMs: 900,
        run: (api) => {
          api.reset();
          api.selectVehicle("TRUCK");
        },
      },
      {
        label: "Start engine",
        detail: "Safety checks pass",
        maxMs: 3600,
        run: (api) => api.start(),
        advance: ready,
      },
      {
        label: "Accelerate to highway speed",
        detail: "Cruise ~68 km/h",
        maxMs: 9000,
        run: (api) => api.enableAutoThrottle(true),
        advance: moving,
      },
      {
        label: "Simulate driver drowsiness",
        detail: "Eyes closed — closure timer running",
        maxMs: 1200,
        run: (api) => api.triggerDrowsiness(true),
      },
      {
        label: "Drowsiness warning",
        detail: "Prolonged eye closure detected",
        maxMs: 3200,
      },
      {
        label: "Critical drowsiness → AUTONOMOUS TAKEOVER",
        detail: "Driver unresponsive",
        maxMs: 6000,
        advance: autonomous,
      },
      {
        label: "Deceleration + roadside alignment",
        detail: "Trajectory toward safe stop zone",
        maxMs: 11000,
        advance: safeStopPhase,
      },
      {
        label: "Entering safe stop zone",
        detail: "Final braking",
        maxMs: 9000,
        advance: stopped,
      },
      {
        label: "Vehicle stopped safely",
        detail: "Hazard lights active — report generated",
        maxMs: 1200,
        run: (api) => {
          api.triggerDrowsiness(false);
          api.enableAutoThrottle(false);
        },
      },
    ],
  },
  {
    id: "truck-accident",
    title: "Truck Accident Emergency Stop",
    vehicle: "TRUCK",
    description:
      "Impact detected: control disabled, vehicle stopped immediately, emergency event logged.",
    steps: [
      {
        label: "Select TRUCK",
        detail: "Emergency protocols armed",
        maxMs: 900,
        run: (api) => {
          api.reset();
          api.selectVehicle("TRUCK");
        },
      },
      {
        label: "Start engine",
        detail: "Safety checks pass",
        maxMs: 3600,
        run: (api) => api.start(),
        advance: ready,
      },
      {
        label: "Accelerate",
        detail: "Building speed",
        maxMs: 8000,
        run: (api) => api.enableAutoThrottle(true),
        advance: moving,
      },
      {
        label: "Simulate accident impact",
        detail: "Impact detected — emergency protocol",
        maxMs: 1200,
        run: (api) => api.simulateAccident(),
      },
      {
        label: "Vehicle control disabled → stopping",
        detail: "Emergency stop in progress",
        maxMs: 12000,
        advance: stopped,
      },
      {
        label: "Scenario complete",
        detail: "Accident response demonstrated",
        maxMs: 900,
        run: (api) => api.enableAutoThrottle(false),
      },
    ],
  },
];

export function scenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}
