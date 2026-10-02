#!/usr/bin/env python3
"""SmartDrive AI - Project Documentation (body PDF via ReportLab).

Route: pdf skill / Report brief (ReportLab) + Template 07 "Crystal Blue" cover
(cover rendered separately via html2poster.js, merged as page 0 by pypdf).
Body palette = fixed Template 07 light-blue family (see typesetting/cover.md).
"""
import os
import sys

BASE = "/home/z/my-project"
SKILL_SCRIPTS = os.path.join(BASE, "skills/pdf/scripts")
DOC = os.path.join(BASE, "scripts/doc")
OUT_BODY = os.path.join(DOC, "body.pdf")
sys.path.insert(0, SKILL_SCRIPTS)

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    CondPageBreak,
    HRFlowable,
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from PIL import Image as PILImage

# ------------------------------------------------------------------ fonts ----
FONT_DIR = "/usr/share/fonts"
pdfmetrics.registerFont(TTFont("NotoSerifSC", f"{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf"))
pdfmetrics.registerFont(TTFont("NotoSerifSC-Bold", f"{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif", f"{FONT_DIR}/truetype/freefont/FreeSerif.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif-Bold", f"{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif-Italic", f"{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif-BoldItalic", f"{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf"))
pdfmetrics.registerFont(TTFont("DejaVuSans", f"{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf"))
registerFontFamily("NotoSerifSC", normal="NotoSerifSC", bold="NotoSerifSC-Bold")

registerFontFamily("FreeSerif", normal="FreeSerif", bold="FreeSerif-Bold",
                   italic="FreeSerif-Italic", boldItalic="FreeSerif-BoldItalic")
registerFontFamily("DejaVuSans", normal="DejaVuSans", bold="DejaVuSans")

from pdf import install_font_fallback  # noqa: E402  (skill helper)

install_font_fallback()

# ------------------------------------------- Template 07 fixed body palette --
PAGE_BG      = colors.HexColor("#f5f8fc")   # XL ultra-light blue-white
SECTION_BG   = colors.HexColor("#edf2f9")   # XL light blue-gray
CARD_BG      = colors.HexColor("#e4ecf5")   # L  soft blue card
TABLE_STRIPE = colors.HexColor("#eef3fa")   # L  subtle blue row
HEADER_FILL  = colors.HexColor("#1a4a7a")   # M  deep blue (bridges to cover)
BORDER       = colors.HexColor("#c0d0e2")   # S  blue-gray lines
ACCENT       = colors.HexColor("#2d7ab3")   # XS luminous accent
TEXT_PRIMARY = colors.HexColor("#142840")   # deep blue-black
TEXT_MUTED   = colors.HexColor("#5a7a96")   # blue-gray secondary

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = TABLE_STRIPE

# ------------------------------------------------------------------ layout ---
MARGIN = 1.0 * inch
PAGE_W, PAGE_H = A4
AVAIL_W = PAGE_W - 2 * MARGIN
AVAIL_H = PAGE_H - 2 * MARGIN
H1_ORPHAN = AVAIL_H * 0.25
MAX_KEEP_HEIGHT = PAGE_H * 0.4

DOC_TITLE = "SmartDrive AI - Project Documentation"


def on_page(canvas, doc):
    """Page background (Template 07 light-blue wash) + header/footer."""
    canvas.saveState()
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # header
    canvas.setFont("FreeSerif", 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - 0.62 * inch, DOC_TITLE)
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(1.5)
    canvas.line(MARGIN, PAGE_H - 0.70 * inch, PAGE_W - MARGIN, PAGE_H - 0.70 * inch)
    # footer
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 0.66 * inch, PAGE_W - MARGIN, 0.66 * inch)
    canvas.setFont("FreeSerif", 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, 0.5 * inch, "SmartDrive Safety Command Center")
    canvas.drawRightString(PAGE_W - MARGIN, 0.5 * inch, str(doc.page))
    canvas.restoreState()


# ------------------------------------------------------------------ styles ---
body_st = ParagraphStyle("Body", fontName="FreeSerif", fontSize=10.5, leading=17,
                         alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
                         spaceBefore=0, spaceAfter=8)
h1_st = ParagraphStyle("H1", fontName="FreeSerif", fontSize=22, leading=27,
                       textColor=HEADER_FILL, spaceBefore=16, spaceAfter=4)
h2_st = ParagraphStyle("H2", fontName="FreeSerif", fontSize=15, leading=20,
                       textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=6)
h3_st = ParagraphStyle("H3", fontName="FreeSerif", fontSize=11.5, leading=16,
                       textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=5)
bullet_st = ParagraphStyle("Bullet", fontName="FreeSerif", fontSize=10.5, leading=16,
                           alignment=TA_LEFT, textColor=TEXT_PRIMARY,
                           leftIndent=14, bulletIndent=2, spaceAfter=5)
caption_st = ParagraphStyle("Caption", fontName="FreeSerif", fontSize=8.5, leading=12,
                            alignment=TA_CENTER, textColor=TEXT_MUTED,
                            spaceBefore=3, spaceAfter=6)
th_st = ParagraphStyle("TH", fontName="FreeSerif", fontSize=9.5, leading=13,
                       textColor=colors.white, alignment=TA_LEFT)
td_st = ParagraphStyle("TD", fontName="FreeSerif", fontSize=9.5, leading=13,
                       textColor=TEXT_PRIMARY, alignment=TA_LEFT)
td_c_st = ParagraphStyle("TDC", parent=td_st, alignment=TA_CENTER)
code_st = ParagraphStyle("Code", fontName="DejaVuSans", fontSize=8, leading=11.5,
                         textColor=TEXT_PRIMARY, alignment=TA_LEFT)
stat_big = ParagraphStyle("StatBig", fontName="FreeSerif", fontSize=20, leading=24,
                          textColor=ACCENT, alignment=TA_CENTER)
stat_lab = ParagraphStyle("StatLab", fontName="FreeSerif", fontSize=8, leading=11,
                          textColor=TEXT_MUTED, alignment=TA_CENTER)
quote_st = ParagraphStyle("Quote", fontName="FreeSerif-Italic", fontSize=10.5, leading=16,
                          textColor=TEXT_PRIMARY, leftIndent=24, spaceBefore=6, spaceAfter=8)


def H1(num, text):
    """Numbered chapter heading with accent underline; orphan-protected."""
    return [
        CondPageBreak(H1_ORPHAN),
        KeepTogether([
            Paragraph(f"<b>{num}  {text}</b>", h1_st),
            HRFlowable(width="100%", color=ACCENT, thickness=1.2,
                       spaceBefore=2, spaceAfter=10),
        ]),
    ]


def H2(text):
    return Paragraph(f"<b>{text}</b>", h2_st)


def H3(text):
    return Paragraph(f"<b>{text}</b>", h3_st)


def P(text):
    return Paragraph(text, body_st)


def B(text):
    return Paragraph(text, bullet_st, bulletText="\u2022")


def CAL(text):
    """Callout box: accent left border + light tint background."""
    inner = Paragraph(text, ParagraphStyle("CalloutTxt", parent=body_st,
                                           alignment=TA_LEFT, spaceAfter=0))
    t = Table([[inner]], colWidths=[AVAIL_W * 0.96], hAlign="CENTER")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
        ("LINEBEFORE", (0, 0), (0, -1), 3, ACCENT),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def make_table(header, rows, ratios, align_center_cols=()):
    """Standard striped table; every cell wrapped in Paragraph()."""
    col_w = [r * AVAIL_W for r in ratios]
    assert abs(sum(ratios) - 1.0) < 0.001, "ratios must sum to 1"
    data = [[Paragraph(f"<b>{h}</b>", th_st) for h in header]]
    for row in rows:
        cells = []
        for i, c in enumerate(row):
            st = td_c_st if i in align_center_cols else td_st
            cells.append(Paragraph(str(c), st))
        data.append(cells)
    t = Table(data, colWidths=col_w, hAlign="CENTER", repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5.5),
    ]
    for r in range(1, len(data)):
        style.append(("BACKGROUND", (0, r), (-1, r),
                      TABLE_ROW_ODD if r % 2 == 1 else TABLE_ROW_EVEN))
    t.setStyle(TableStyle(style))
    return t


def embed_image(path, max_width=None, max_height=None):
    if max_width is None:
        max_width = AVAIL_W
    if max_height is None:
        max_height = A4[1] * 0.33
    pil = PILImage.open(path)
    ow, oh = pil.size
    ratio = min(max_width / ow if ow > max_width else 1.0,
                max_height / oh if oh > max_height else 1.0)
    return Image(path, width=ow * ratio, height=oh * ratio)


def safe_keep(elements):
    total = 0
    for el in elements:
        _, h = el.wrap(AVAIL_W, PAGE_H)
        total += h
    if total <= MAX_KEEP_HEIGHT:
        return [KeepTogether(elements)]
    if len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)


def code_block(lines):
    inner = [Paragraph(l.replace(" ", " "), code_st) for l in lines]
    t = Table([[inner]], colWidths=[AVAIL_W * 0.96], hAlign="CENTER")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
        ("LINEBEFORE", (0, 0), (0, -1), 3, ACCENT),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


# =================================================================== story ===
story = []

# ---------------------------------------------------------------- Chapter 1 --
story += H1(1, "Executive Overview")
story += safe_keep([
    P("SmartDrive AI is a browser-based intelligent driver safety simulator built as a "
      "single-page Next.js application. It models the complete safety loop of a modern "
      "assisted-driving system: the driver is monitored by an on-camera AI vision pipeline, "
      "a simulated sensor bus reports alcohol and helmet status, a safety engine evaluates "
      "risk ten times per second, and a vehicle physics layer moves the car, bike or truck "
      "along an animated road. When the safety engine decides that the driver is no longer "
      "fit to drive, it progressively takes over: it warns, slows the vehicle in a controlled "
      "stop, or performs a full autonomous roadside maneuver that steers the truck into a "
      "designated safe-stop zone with hazard lights flashing."),
    P("The project is designed as a tech-fest demonstration and an educational tool. Every "
      "detection system can be triggered manually from the control panel, so a presenter can "
      "stage a complete intervention story in under a minute without any real hardware. Six "
      "scripted demo scenarios automate exactly such sequences, from a bike that refuses to "
      "start without a helmet to a drowsy truck driver being parked safely at the roadside. "
      "An autopilot with cruise control and lane keeping, plus a high-speed drive profile, "
      "keeps the simulation moving on the road at all times with a single click."),
    P("The simulator is intentionally honest about its boundaries: all detection sources are "
      "clearly labeled, the helmet detector ships with a simulation fallback when no camera is "
      "available, and the on-screen warning states that the system is an educational "
      "simulation that never controls a real vehicle. No video ever leaves the browser - the "
      "MediaPipe face landmark model runs completely offline against a local WASM runtime."),
])
story.append(CAL(
    "<b>Safety first.</b> SmartDrive AI is an educational simulation. It demonstrates "
    "driver-monitoring and intervention concepts; it is not connected to any vehicle and "
    "must never be interpreted as functional driver-assistance software."))
story.append(Spacer(1, 6))

# stat band
stats = [
    ("3", "VEHICLE TYPES"), ("6", "DEMO SCENARIOS"),
    ("60 fps", "SIMULATION LOOP"), ("10 Hz", "SAFETY PULSE"),
]
cells = []
for big, lab in stats:
    cells.append(Table(
        [[Paragraph(f"<b>{big}</b>", stat_big)], [Paragraph(lab, stat_lab)]],
        colWidths=[AVAIL_W * 0.225],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
            ("BOX", (0, 0), (-1, -1), 1, ACCENT),
            ("TOPPADDING", (0, 0), (-1, 0), 8),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
            ("TOPPADDING", (0, 1), (-1, 1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
        ])))
band = Table([cells], colWidths=[AVAIL_W * 0.25] * 4, hAlign="CENTER")
band.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
]))
story.append(band)

# ---------------------------------------------------------------- Chapter 2 --
story += H1(2, "Feature Walkthrough")
story += safe_keep([
    H2("2.1 Pre-Start Safety Interlocks"),
    P("Starting a vehicle runs a 1.6-second pre-start checklist that mirrors real-world "
      "interlocks. The alcohol sensor reading is compared against a configurable threshold "
      "(default 40), and bikes additionally require a detected helmet. If any condition "
      "fails, START is blocked with a red banner naming the exact reason, the decision "
      "panel records a CRITICAL recommendation of BLOCK_START, and the condition must be "
      "cleared and the scenario reset before the engine will run. This turns the abstract "
      "idea of an interlock into something a viewer can watch happen step by step."),
    H2("2.2 Driver Monitoring and Drowsiness"),
    P("When camera access is granted, a MediaPipe FaceLandmarker model (bundled locally, "
      "478 landmarks) analyzes the video stream at roughly 12 frames per second. "
      "Blendshape scores feed an eye-closure detector and a head-yaw proxy; a temporal "
      "logic layer converts raw closures into a drowsiness level with elapsed-closure "
      "time and a blink counter. Denying the camera never breaks the app: the camera "
      "panel shows a fallback state and every detection remains available through "
      "manual simulation buttons, which is also how the demo scenarios trigger events "
      "deterministically."),
])
story += safe_keep([
    H2("2.3 Risk Evaluation and Intervention"),
    P("A pure-function safety engine receives the merged driver state every 100 "
      "milliseconds and classifies it as SAFE, WARNING or CRITICAL with an explainable "
      "decision record: severity, human-readable reason, recommended action, control "
      "mode and evidence list. Escalation follows vehicle-specific rules. A warned "
      "driver can keep driving; a critical finding triggers a controlled stop for cars "
      "and bikes, while the flagship truck performs a phased autonomous takeover - "
      "TAKEOVER, DECELERATION, ROADSIDE_ALIGNMENT, SAFE_STOP and STOPPED - planned by a "
      "trajectory planner that reserves a safe-stop zone on the shoulder and draws the "
      "intended path on the canvas. Accidents can be simulated at any speed and shake "
      "the viewport with a red flash while the session report records the impact speed."),
    H2("2.4 Drive Modes: Manual, Autopilot, High Speed"),
    P("After the engine starts, the vehicle can be driven with the keyboard (W/A/S/D or "
      "arrow keys, SPACE for an emergency stop) or handed to the AI chauffeur. AUTOPILOT "
      "applies a proportional cruise controller toward the vehicle's configured cruise "
      "speed and steers back to the lane center with a lateral lane-keeping loop. HIGH "
      "SPEED raises the cruise target to the vehicle's top speed and auto-engages "
      "autopilot if it is off, so one click always gets the vehicle moving on the road. "
      "Brake input, the P key, a stop request or any safety intervention disengages "
      "autopilot immediately - the safety engine always outranks the chauffeur."),
    H2("2.5 Visualization, Telemetry and Reports"),
    P("A top-down road canvas renders the live scene at 60 frames per second: streaming "
      "lane dashes, roadside trees and street lamps, speed streaks at highway pace, "
      "brake lights, headlight cones, hazard blinking and the autonomous path overlay. "
      "Telemetry panels show speed, acceleration, roadside offset, steering, odometer "
      "and hazard state; a safety panel tracks drowsiness, helmet and alcohol status; "
      "and a decision panel explains why the system intervened. Every event lands in a "
      "deduplicated timeline, and at the end of a session a report summarizes counts, "
      "intervention details and results with JSON export for later analysis. An "
      "analytics view charts historical sessions and a settings view persists all "
      "thresholds to local storage."),
])

# ---------------------------------------------------------------- Chapter 3 --
story += H1(3, "Vehicle Lineup and Safety Matrix")
story += safe_keep([
    P("Three vehicle archetypes cover the interesting safety combinations. The bike is "
      "the interlock story: it will not start without a helmet and loses part of its "
      "motor power when alcohol is detected. The car demonstrates the controlled-stop "
      "intervention path with the richest driver monitoring. The truck is the flagship: "
      "its size justifies the full autonomous roadside maneuver, including the "
      "trajectory planner and the reserved safe-stop zone on the shoulder."),
])
story.append(make_table(
    ["Vehicle", "Top speed", "Cruise", "Monitoring", "Intervention behavior"],
    [
        ["BIKE", "80 km/h", "55 km/h",
         "Helmet interlock, alcohol interlock, driver monitoring",
         "Blocked start without helmet; power-reduction controlled stop when drunk"],
        ["CAR", "120 km/h", "80 km/h",
         "Driver monitoring, alcohol detection",
         "Controlled stop on critical findings; accident response"],
        ["TRUCK", "90 km/h", "68 km/h",
         "Driver monitoring, alcohol detection",
         "Autonomous takeover: decelerate, align to roadside, safe stop in reserved zone"],
    ],
    [0.11, 0.13, 0.10, 0.28, 0.38]))
story.append(Paragraph("Table 1: Vehicle specifications and safety behavior", caption_st))
story.append(Spacer(1, 4))
story.append(P(
    "Physics is deterministic and tuned for believability rather than realism: each "
    "vehicle has its own acceleration, brake deceleration, coasting drag and steering "
    "rate, with speed clamped to the specification. Lane geometry uses a 3.6-meter lane "
    "and a 4.6-meter shoulder; lateral position is constrained to the roadway plus a "
    "shoulder band, and heading is derived from lateral velocity so the sprite visibly "
    "tilts while changing lanes. The stop-distance helper that drives the autonomous "
    "planner is the same braking model the player experiences, which keeps the "
    "intervention distances honest."))

# ---------------------------------------------------------------- Chapter 4 --
story += H1(4, "System Architecture")
story += safe_keep([
    P("The application is a deliberate three-layer loop: sense, decide and drive, then "
      "show. A single mutable engine object owns all simulation state and is ticked by "
      "one requestAnimationFrame loop, so there is exactly one source of truth. React "
      "never renders at frame rate; instead a Zustand mirror subscribes to a 10 Hz "
      "snapshot, while the road canvas reads the engine directly every animation frame "
      "for smooth motion. This split keeps the UI responsive and the animation fluid "
      "without threading state through React on every tick."),
])
story += safe_keep([
    embed_image(os.path.join(DOC, "diagram.png"), max_height=252),
    Paragraph("Figure 1: Sense - Decide & Drive - Show data flow with update frequencies",
              caption_st),
])
story.append(Spacer(1, 2))
story.append(make_table(
    ["Module", "Responsibility"],
    [
        ["engine.ts", "Central state machine, 60 fps tick, mode transitions, autopilot and "
                      "HIGH SPEED chauffeur, event emission with dedupe, session finalization"],
        ["safetyEngine.ts", "Pure evaluateSafety(): merges driver, alcohol, helmet and "
                            "vehicle state into severity + explainable decision"],
        ["vehiclePhysics.ts", "Per-vehicle specs, stepPhysics() longitudinal + lateral "
                              "integration, lane geometry, stopping-distance helper"],
        ["truckAutonomy.ts", "Phased takeover planner: takeover, deceleration, roadside "
                             "alignment, safe stop in reserved zone"],
        ["vehicleRules.ts", "Declarative per-vehicle interlocks and intervention policy"],
        ["scenarioEngine.ts", "Six scripted demo scenarios with condition-based step advance"],
        ["faceVision.ts / helmet.ts / drowsiness.ts",
         "MediaPipe landmarker wrapper with GPU-to-CPU fallback, pluggable helmet "
         "detector with simulation fallback, temporal drowsiness logic"],
        ["store.ts", "Zustand mirror: 10 Hz snapshot sync, engine command wrappers, "
                     "demo runner, settings persistence"],
    ],
    [0.28, 0.72]))
story.append(Paragraph("Table 2: Core modules and responsibilities", caption_st))

# ---------------------------------------------------------------- Chapter 5 --
story += H1(5, "Drive Modes and Controls")
story += safe_keep([
    P("The Simulation Controls panel groups the two automation buttons directly under "
      "the primary START / STOP / RESET / EMERGENCY row. AUTOPILOT toggles the cruise "
      "chauffeur; HIGH SPEED raises the target to top speed and engages autopilot in "
      "one action. Both buttons disable themselves outside manual-driving states, "
      "during safety interventions and while a demo scenario owns the vehicle, and a "
      "status line under the buttons always explains the current drive mode and how to "
      "leave it. A pulsing hint invites the user to press AUTOPILOT or HIGH SPEED "
      "whenever the vehicle is at standstill."),
])
story.append(make_table(
    ["Control", "Action"],
    [
        ["W / Arrow Up", "Throttle (hold)"],
        ["S / Arrow Down", "Brake (hold) - also disengages autopilot above 20% input"],
        ["A / D or Arrow Left / Right", "Steer left / right"],
        ["SPACE", "Emergency stop"],
        ["P", "Autopilot on / off"],
        ["H", "High-speed profile on / off"],
        ["AUTOPILOT button", "Cruise at configured speed + lane keeping"],
        ["HIGH SPEED button", "Target top speed (CAR 120 / TRUCK 90 / BIKE 80 km/h), "
                              "auto-engages autopilot"],
    ],
    [0.34, 0.66]))
story.append(Paragraph("Table 3: Keyboard and drive-mode reference", caption_st))
story.append(Spacer(1, 4))
story.append(P(
    "Disengagement follows real ADAS conventions. Any safety intervention, emergency "
    "stop, operator stop request or deliberate brake input instantly returns control to "
    "the driver and clears the high-speed flag, and the timeline records who gave up "
    "control and why. During autonomous takeover the engine locks manual input "
    "altogether until RESET starts a fresh scenario. Screenshot 1 shows the road scene "
    "under autopilot with the lane-keeping offset held at 0.0 meters; screenshot 2 "
    "shows the drive-mode buttons engaged at their targets."))
shot1 = embed_image(os.path.join(DOC, "shot_road.png"), max_height=215)
shot2 = embed_image(os.path.join(DOC, "shot_panel.png"), max_height=215)
story += safe_keep([
    shot1,
    Paragraph("Screenshot 1: Road scene under autopilot - live canvas with scenery and HUD",
              caption_st),
])
story += safe_keep([
    shot2,
    Paragraph("Screenshot 2: Drive-mode buttons engaged - AUTOPILOT ON and HIGH SPEED ON",
              caption_st),
])

# ---------------------------------------------------------------- Chapter 6 --
story += H1(6, "Demo Scenarios")
story += safe_keep([
    P("Six one-click scenarios provide a judge-ready storyline. Each scenario runs a "
      "scripted step list whose steps advance only when the real simulation state "
      "meets their advance condition (with timeout fallbacks), so the demo cannot "
      "drift out of sync. While a scenario owns the session, automation toggles are "
      "locked and a progress bar shows the active step."),
])
story.append(make_table(
    ["#", "Scenario", "Vehicle", "Trigger", "Outcome"],
    [
        ["1", "Bike Helmet Safety", "BIKE", "Helmet removed", "START blocked until helmet is worn"],
        ["2", "Bike Alcohol Prevention", "BIKE", "Alcohol above threshold",
         "Start blocked; with engine running, power-limited controlled stop"],
        ["3", "Car Drowsiness Stop", "CAR", "Simulated eye closure",
         "Warning escalates to controlled stop (about 6 s)"],
        ["4", "Truck Alcohol Autonomous Stop", "TRUCK", "Alcohol above threshold",
         "Phased takeover, roadside alignment, safe stop with hazards"],
        ["5", "Truck Drowsiness Autonomous Stop", "TRUCK", "Drowsiness critical",
         "Autonomous safe stop in reserved zone with path overlay"],
        ["6", "Truck Accident Emergency Stop", "TRUCK", "Simulated accident",
         "Viewport shake, emergency response, session report records impact"],
    ],
    [0.05, 0.24, 0.10, 0.22, 0.39]))
story.append(Paragraph("Table 4: Scripted demo scenarios", caption_st))

# ---------------------------------------------------------------- Chapter 7 --
story += H1(7, "Tech Stack and Project Structure")
story += safe_keep([
    P("The stack is a modern, fully client-side Next.js application. Next.js 16 with "
      "React 19 and TypeScript provides the app shell; Tailwind CSS 4 plus a set of "
      "Radix-based shadcn/ui components style the dark automotive theme; framer-motion "
      "animates banners and transitions; Recharts powers the analytics view; Zustand "
      "mirrors engine state into React; and lucide-react supplies icons. The vision "
      "pipeline uses the official MediaPipe tasks-vision package with the face "
      "landmarker model and its WASM runtime vendored into public/, so the entire "
      "system runs offline after install. Prisma appears in the template scaffold but "
      "the simulator itself persists only to localStorage."),
])
story.append(make_table(
    ["Layer", "Technology"],
    [
        ["App framework", "Next.js 16 (App Router), React 19, TypeScript"],
        ["UI", "Tailwind CSS 4, shadcn/ui (Radix), framer-motion, lucide-react"],
        ["State", "Zustand snapshot mirror (10 Hz) over a mutable engine singleton"],
        ["Simulation", "Custom engine: physics, safety engine, autonomy planner, "
                       "scenario engine (pure TypeScript)"],
        ["AI vision", "MediaPipe tasks-vision FaceLandmarker, WASM runtime + model "
                      "vendored locally, GPU-to-CPU fallback"],
        ["Charts / analytics", "Recharts"],
        ["Persistence", "localStorage (settings, session history); no server database "
                        "required"],
        ["Tooling", "bun scripts, ESLint, tsc strict typecheck, Playwright E2E checks"],
    ],
    [0.24, 0.76]))
story.append(Paragraph("Table 5: Technology map", caption_st))
story.append(Spacer(1, 4))
story.append(code_block([
    "src/",
    "  app/                     layout, single-route SPA shell, global theme",
    "  components/sim/          RoadCanvas, ControlPanel, TelemetryPanel,",
    "                           SafetyPanel, CameraPanel, DemoPanel,",
    "                           EventTimeline, SessionReport, VehicleSelector,",
    "                           AlertBanner / DecisionPanel / ModeStrip",
    "  hooks/                   useSimulationLoop (rAF), useVision (camera + model),",
    "                           useKeyboard (WASD / P / H / SPACE)",
    "  lib/simulation/          engine, safetyEngine, vehiclePhysics,",
    "                           truckAutonomy, vehicleRules, scenarioEngine",
    "  lib/                     store, types, storage, audio, timestamps",
    "public/mediapipe/wasm/     vendored WASM vision runtime",
    "public/models/             face_landmarker.task (local, offline)",
]))
story.append(Paragraph("Listing 1: Project layout (key paths)", caption_st))

# ---------------------------------------------------------------- Chapter 8 --
story += H1(8, "Running and Verifying the Project")
story += safe_keep([
    P("The project runs like any Next.js application: install dependencies with bun, "
      "start the development server on port 3000 and open the single-route app. The "
      "landing page introduces the concept; the Simulation view hosts the live "
      "dashboard; Analytics charts past sessions; Settings exposes every threshold "
      "with persistence. A typical demonstration takes under a minute: select the "
      "truck, press START, watch the safety checks pass, press HIGH SPEED and let the "
      "vehicle cruise, then press SIMULATE DROWSINESS to hand the story over to the "
      "safety engine."),
])
story.append(code_block([
    "bun install          # install dependencies",
    "bun run dev          # dev server at http://localhost:3000",
    "bun run lint         # eslint (clean)",
    "npx tsc --noEmit     # strict typecheck (clean)",
    "bun run build        # production build",
]))
story.append(Spacer(1, 4))
story.append(CondPageBreak(260))
story.append(P(
    "Behavior was verified end-to-end in a real browser with automated UI walks. The "
    "vehicle-acceleration fix was confirmed by holding the throttle and watching speed "
    "rise, then decay only by the specified coasting drag; the autopilot and high-speed "
    "modes were verified by engaging each button and reading live telemetry; brake-key "
    "disengagement, re-engagement and RESET behavior were each exercised. The most "
    "recent verification pass is summarized below."))
story.append(make_table(
    ["Check", "Expected", "Observed"],
    [
        ["Pre-start interlock", "Bike blocks START without helmet", "Blocked with reason banner"],
        ["Autopilot cruise", "Truck converges to 68 km/h, offset 0.0 m",
         "68 km/h held, offset 0.0 m"],
        ["High-speed profile", "Target rises to truck top speed", "90 km/h reached and held"],
        ["Brake disengagement", "AP exits on brake, event logged",
         "Disengaged; timeline event recorded"],
        ["Manual keyboard drive", "W accelerates from standstill",
         "0 to 24 km/h in 3 s (truck)"],
        ["Static checks", "ESLint + tsc clean", "Both clean; no page errors on load"],
    ],
    [0.24, 0.40, 0.36]))
story.append(Paragraph("Table 6: Latest browser verification pass", caption_st))
story.append(Spacer(1, 4))
story.append(P(
    "Natural next steps for the simulator include optional ambient traffic behind a "
    "settings toggle, richer lane geometry with curves, an import/export format for "
    "session reports, and a comparison mode that replays the same scenario with and "
    "without intervention to quantify the safety benefit. The engine's pure-function "
    "safety core and single-source-of-truth design keep all of these additions "
    "incremental rather than architectural."))

# ------------------------------------------------------------------- build ---
doc = SimpleDocTemplate(
    OUT_BODY, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title=DOC_TITLE, author="Z.ai", creator="Z.ai",
    subject="Detailed documentation of the SmartDrive AI driver safety simulator",
)
doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print("body pages built:", doc.page)
print("body written:", OUT_BODY)
