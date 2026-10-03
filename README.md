# SMARTDRIVE AI

### Multi-Vehicle Intelligent Driver Monitoring, Risk Detection & Autonomous Safety Intervention Simulator

**Detect Risk. Take Control. Prevent the Crash.**

SMARTDRIVE AI is a fully simulated, production-quality web prototype built for technology-fest demonstrations. It monitors a driver through the laptop webcam, watches simulated alcohol and helmet sensors, and — when risk is detected — takes control of a simulated vehicle: issuing warnings, disabling manual control and performing a fully animated autonomous roadside stop. Everything runs on a normal laptop in the browser. No Arduino/ESP32 hardware, no backend, no paid APIs.

> **SIMULATION MODE — NOT FOR REAL VEHICLE CONTROL.**
> This software is an educational simulation prototype. It does not control real-world vehicles.

---

## Project Overview

The application simulates three vehicle types — 🏍️ Bike, 🚗 Car and 🚛 Truck. Each vehicle has its own rule engine that decides which safety checks gate engine start and which intervention is executed when a risk is confirmed while driving.

The flagship demonstration is the **Truck**: while moving, a drowsiness or alcohol event escalates through warnings to an autonomous takeover — the truck decelerates, steers itself toward the roadside, enters a designated **SAFE STOP ZONE** with hazard lights flashing, and stops. Every step is animated on a top-down road canvas and logged to a judge-facing event timeline.

## Problem Statement

Driver drowsiness and intoxication are leading causes of highway fatalities, and two-wheeler helmets are frequently skipped. Existing ADAS features are invisible to students and judges because they are embedded in hardware. This project makes the complete safety pipeline — sense → detect → decide → intervene → explain — observable and interactive in a browser.

## Objectives

1. Detect driver risk (drowsiness, absence, alcohol, helmet-less riding, accident) using real webcam AI where feasible and clearly labeled simulated sensors elsewhere.
2. Drive a centralized, vehicle-specific safety decision engine (no scattered boolean logic).
3. Execute believable, animated interventions — never teleporting vehicles.
4. Explain every intervention ("WHY DID THE SYSTEM INTERVENE?") with trigger, evidence and action.
5. Guarantee a reliable tech-fest demo: camera-denied fallback, model-unavailable fallback and one-click scripted scenarios.

## Features

| Feature | Bike | Car | Truck |
| --- | --- | --- | --- |
| Helmet interlock (start blocked without helmet) | ✓ | — | — |
| Alcohol interlock (start blocked) | ✓ | ✓ | ✓ |
| Alcohol while moving → power reduction / controlled stop / **autonomous roadside stop** | ✓ | ✓ | ✓ |
| Drowsiness warning (temporal, camera or simulated) | ✓ | ✓ | ✓ |
| Critical drowsiness → controlled / autonomous stop | ✓ | ✓ | ✓ |
| Accident simulation → emergency stop | ✓ | ✓ | ✓ |
| Manual driving (keyboard) with control lockout | ✓ | ✓ | ✓ |
| Autonomous roadside alignment + safe stop zone + hazard lights | — | — | ✓ |

Plus: live CV HUD overlay, telemetry dashboard, AI decision explainer, event timeline, session report (JSON export + print/PDF), analytics charts, full settings page with persistence, audio alerts (Web Audio synthesis), tech-fest demo mode with 6 scripted scenarios.

## System Architecture

```
CAMERA → AI VISION → RISK DETECTION → SAFETY ENGINE → VEHICLE INTERVENTION
```

The UI explicitly labels each layer as **AI DETECTION**, **SIMULATED SENSOR INPUT**, **SAFETY DECISION** or **SIMULATED VEHICLE CONTROL**.

### Source layout

```
src/
├── app/                    # Next.js App Router entry (single-route SPA)
├── components/
│   ├── home/               # Hero, vehicle cards, architecture, features, demo
│   ├── sim/                # CameraPanel, RoadCanvas, TelemetryPanel, SafetyPanel,
│   │                       # ControlPanel, EventTimeline, AlertBanner, DecisionPanel,
│   │                       # DemoPanel, SessionReport, VehicleSelector
│   ├── analytics/          # Recharts analytics dashboard
│   └── settings/           # Thresholds, camera, simulation & display settings
├── lib/
│   ├── ai/                 # faceVision (MediaPipe wrapper), drowsiness, helmet
│   ├── simulation/         # engine (state machine), vehiclePhysics, safetyEngine,
│   │                       # vehicleRules, truckAutonomy, scenarioEngine
│   ├── store.ts            # Zustand UI mirror (10 Hz snapshot sync)
│   ├── audio.ts            # Web Audio alert tones
│   ├── storage.ts          # localStorage persistence
│   └── types.ts            # Shared contracts
├── hooks/                  # useVision (camera+model+loop), useSimulationLoop, useKeyboard
└── public/
    ├── mediapipe/wasm/     # Local MediaPipe wasm runtime (offline-capable)
    └── models/             # Local face_landmarker.task model (~3.7 MB)
```

## Technology Stack

- **Next.js 16 (App Router) + React 19 + TypeScript 5** — one-page SPA with client-side view routing
- **Tailwind CSS 4** — dark glassmorphism automotive command-center theme
- **Framer Motion** — animated alerts, banners, transitions
- **Zustand** — UI state (engine snapshot mirrored at ~10 Hz)
- **MediaPipe Tasks Vision (@mediapipe/tasks-vision)** — FaceLandmarker, 478 landmarks + face blendshapes, served **locally** from `/public`
- **Recharts** — analytics
- **Web Audio API** — synthesized warning/critical/takeover/safe-stop tones (no audio files)
- **localStorage** — settings, events, session history (no external database)

## AI Pipeline

1. `getUserMedia` opens the webcam (video never leaves the device — all processing is local).
2. `FaceLandmarker` (VIDEO mode, 1 face, blendshapes on) runs at ~12 fps, throttled via requestAnimationFrame to protect laptop CPUs.
3. Eye closure uses the `eyeBlinkLeft`/`eyeBlinkRight` blendshape scores against a configurable threshold.
4. Head-yaw proxy (nose tip vs outer eye corners) provides optional head-orientation signal.
5. Results feed the simulation engine, which owns all temporal logic.

**Fallbacks (never crash):** permission denied → "Camera unavailable — simulation fallback mode" with manual triggers; model load failure → `MODEL UNAVAILABLE` badge while the camera still renders; no camera → vision standby, everything else keeps working.

## Drowsiness Detection

Purely temporal — a single blink **never** triggers an alarm:

| Eye state | Duration | Result |
| --- | --- | --- |
| Open | — | NORMAL |
| Closed briefly | < warning duration | BLINK (counter only) |
| Continuously closed | ≥ warning duration (default 2 s) | DROWSINESS WARNING |
| Continuously closed | ≥ critical duration (default 3.5 s) | CRITICAL DROWSINESS → intervention |

Displayed metrics (eye state, closure duration, severity, drowsiness %) are **derived from measured closure time**, never random. Source is always shown: `CAMERA` or `SIMULATION`. All thresholds are tunable in Settings.

## Helmet Detection

A pluggable detector architecture (`HelmetDetector` interface + `registerHelmetDetector()`). Reliable offline browser helmet classification is not available, so the default is a **clearly labeled simulation detector** (SIMULATION source badge). The UI never claims vision-grade helmet detection; a trained model can be plugged in without touching the rest of the pipeline.

## Alcohol Simulation

A simulated sensor (0–100) with an animated gauge and configurable threshold (default 40). Two trigger paths: the **SIMULATE ALCOHOL** button (sets 78) and the slider for fine-grained values. Crossing the threshold blocks engine start on every vehicle, and while moving it triggers the per-vehicle policy after a grace period (driver warning first, escalation delay configurable).

## Vehicle Simulation Logic

Deterministic physics per vehicle (accel, brake, drag, steer rate, geometry). The engine runs at 60 fps (`requestAnimationFrame`), integrates longitudinal + lateral motion, and exposes a 10 Hz snapshot to React while the canvas reads the engine directly for smooth rendering.

**Vehicle mode state machine:**
`IDLE → SAFETY_CHECK → READY ↔ MANUAL → WARNING → AUTONOMOUS → STOPPING → STOPPED / EMERGENCY`

**Central safety engine** — `evaluateSafety(input)` returns `{ severity, reason, recommendedAction, controlMode, evidence, trigger }`; per-vehicle rules (`BIKE_RULES`, `CAR_RULES`, `TRUCK_RULES`) map risks to policies (BLOCK_START / WARN / REDUCE_POWER / CONTROLLED_STOP / AUTONOMOUS_STOP / EMERGENCY_STOP).

## Autonomous Truck Intervention

Phased takeover controller (no teleportation — every phase issues physics inputs):

```
MANUAL → RISK DETECTED → WARNING (escalation delay)
       → AUTONOMOUS TAKEOVER (manual control locked, hazards on,
          safe stop zone designated ahead based on stopping distance)
       → DECELERATION (target ~45% speed)
       → ROADSIDE ALIGNMENT (lateral target ~4.2 m, path drawn as AUTONOMOUS PATH)
       → SAFE STOP (final braking inside the zone)
       → STOPPED (hazard lights keep blinking, report generated)
```

Keyboard control is locked for the entire maneuver; a `MANUAL CONTROL LOCKED` indicator plus an on-canvas `AUTONOMOUS SAFETY MODE` overlay make the takeover unmistakable from across a demo hall.

## Installation & First-Time Setup

1. **Download the Code**: Download the project as a ZIP file and extract it to a folder on your computer.
2. **Open Terminal**: Open a terminal or command prompt and navigate into the extracted project folder.
   *(Tip: On Windows, open the folder, click the address bar, type `cmd`, and press Enter.)*
3. **Install Node.js**: Ensure you have [Node.js](https://nodejs.org/) installed on your system.
4. **Install Dependencies**: Run the following command in your terminal to install all required packages:

```bash
npm install
```

## Running the Project

After installation is complete, start the development server by running:

```bash
npm run dev
```

Open the printed localhost URL (usually `http://localhost:3000`) in Chrome or Edge. The application compiles and runs fully offline — the MediaPipe wasm runtime and face model are served from `public/`.

## Camera Permissions

- The camera is requested when the Simulation view opens (toggle available in Settings → Camera).
- On the browser permission prompt choose **Allow**.
- Denying or lacking a camera never breaks the app: the Driver Camera panel shows fallback instructions and an **ENABLE CAMERA** retry button, and all detection events remain available via manual simulation buttons.
- A camera selector appears when multiple video devices are present.

## Keyboard Controls (manual mode only)

```
W / ↑    accelerate        S / ↓    brake
A / ←    steer left        D / →    steer right
SPACE    emergency stop    P        autopilot on/off
H        high speed on/off
```

### Drive Mode buttons (Simulation Controls panel)

- **AUTOPILOT** — cruise control + lane keeping (keyboard: **P**). Cruises at the vehicle's configured cruise speed (Settings → per-vehicle cruise target) and keeps the lane centered.
- **HIGH SPEED** — raises the autopilot target to the vehicle's top speed (CAR 120 / TRUCK 90 / BIKE 80 km/h) and auto-engages autopilot if it is off (keyboard: **H**).

Autopilot disengages automatically on driver brake input (**S / ↓**), **P**, a manual/electric stop request, or any safety intervention (controlled stop, autonomous takeover, emergency stop) — the safety engine always outranks the chauffeur, and HIGH SPEED switches off with it.

Controls are disabled automatically during WARNING (still drivable), AUTONOMOUS, STOPPING, STOPPED and EMERGENCY states.

## Demo Scenarios (TECH FEST DEMO MODE)

One click runs a fully scripted, judge-ready sequence with a step progress bar (steps advance on real state conditions with timeout fallbacks):

1. **Bike Helmet Safety** — start blocked without helmet → helmet detected → starts.
2. **Bike Alcohol Prevention** — riding → alcohol detected → motor power reduced → controlled stop.
3. **Car Drowsiness Stop** — cruising → eyes close → warning → critical → controlled stop.
4. **Truck Alcohol Autonomous Stop** — flagship: alcohol at speed → takeover → roadside → safe stop.
5. **Truck Drowsiness Autonomous Stop** — simulated eye closure → autonomous roadside stop.
6. **Truck Accident Emergency Stop** — impact → control disabled → emergency stop.

Manual equivalents of every trigger (alcohol, drowsiness, accident, emergency, helmet) are always available in the Simulation Controls panel.

## Analytics & Session Reports

Every completed run is stored locally and aggregated: total simulations, interventions, drowsiness/alcohol/accident events, safe stops, average intervention time, charts (events by type, interventions by vehicle, outcomes) and a recent-sessions table. At the end of each intervention a **SIMULATION REPORT** modal offers JSON export and print/PDF.

## Limitations

- Browser-based vision is **not** production automotive perception; lighting, camera angle and distance affect detection quality.
- Webcam drowsiness detection measures eye closure only — it cannot detect micro-sleeps with eyes open or distraction reliably.
- Helmet estimation uses a labeled simulation detector; real deployment would need a dedicated trained model.
- Alcohol sensing is a simulated sensor model, not a breathalyzer.
- The autonomous roadside behavior and vehicle physics are visual simulations with tuned (not physically rigorous) dynamics.
- Vehicle control is not connected to any real vehicle or hardware bus.

## Future Scope

- Trained in-browser helmet classifier (e.g., TensorFlow.js model) plugged into the existing detector interface.
- YAWN detection and head-pose attention scoring on top of the existing landmark pipeline.
- Multi-vehicle traffic actors and collision-avoidance scenarios on the road canvas.
- Hardware bridge (ESP32 over WebSocket) to drive physical dash LEDs/buzzer — the event protocol is already JSON.
- Session replay from the recorded event timeline.

## Safety Disclaimer

SMARTDRIVE AI is an educational simulation prototype. It must not be used to control, influence or supervise any real vehicle. The AI detection runs on uncontrolled consumer webcams and the interventions act on a software-only vehicle model. Always drive alert, sober, helmeted and attentive.
