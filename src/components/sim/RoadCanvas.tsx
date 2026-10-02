"use client";

/**
 * Top-down road simulation canvas.
 *
 * Reads the simulation engine directly every animation frame (no React
 * re-renders) for a smooth, believable vehicle animation. The whole scene
 * streams past the camera so motion is unmistakable at any speed:
 *   - animated center lane dashes (scroll with world position)
 *   - roadside lamp posts + trees (parallax scenery)
 *   - speed streaks at highway pace, brake lights under deceleration
 *   - AUTOPILOT / HIGH SPEED HUD chip while automation drives
 * Single-vehicle road by design: no ambient traffic around the player.
 */

import { useEffect, useRef } from "react";
import { simulationEngine } from "@/lib/simulation/engine";
import { ROAD_GEOMETRY, VEHICLE_SPECS } from "@/lib/simulation/vehiclePhysics";

/** deterministic pseudo-random from an index (stable scenery per frame) */
function hash01(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function RoadCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let W = 0;
    let H = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (W === 0 || H === 0) return;

      const eng = simulationEngine;
      const pxm = Math.max(7, Math.min(W / 78, H / 17));
      const viewM = W / pxm;
      const camX = eng.kin.position - viewM * 0.3; // vehicle sits 30% from left
      const cy = H * 0.4;
      const w2s = (wx: number, wy: number): [number, number] => [
        (wx - camX) * pxm,
        cy + wy * pxm,
      ];

      const wobble = eng.snapshot().accidentWobble;
      ctx.save();
      if (wobble > 0) {
        ctx.translate(
          (Math.random() - 0.5) * 10 * wobble,
          (Math.random() - 0.5) * 8 * wobble,
        );
      }

      // ---------------- terrain ----------------
      const terrainGrad = ctx.createLinearGradient(0, 0, 0, H);
      terrainGrad.addColorStop(0, "#0b1210");
      terrainGrad.addColorStop(1, "#0a0f0d");
      ctx.fillStyle = terrainGrad;
      ctx.fillRect(-40, -40, W + 80, H + 80);

      // roadside trees (upper side, stable per index)
      const treeSpacing = 21;
      const treeStart = Math.floor((camX - 6) / treeSpacing) * treeSpacing;
      for (let x = treeStart; x < camX + viewM + 10; x += treeSpacing) {
        const r = 0.9 + hash01(x / treeSpacing) * 0.8;
        const [sx, sy] = w2s(x + hash01(x * 0.7) * 6, ROAD_GEOMETRY.roadTop - 2.6);
        ctx.fillStyle = "rgba(38,66,45,0.85)";
        ctx.beginPath();
        ctx.arc(sx, sy, r * pxm, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(52,88,58,0.9)";
        ctx.beginPath();
        ctx.arc(sx - r * pxm * 0.25, sy - r * pxm * 0.25, r * pxm * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      // street lamps (upper verge): pole + warm head + light pool
      const lampSpacing = 34;
      const lampStart = Math.floor((camX - 6) / lampSpacing) * lampSpacing;
      for (let x = lampStart; x < camX + viewM + 10; x += lampSpacing) {
        const [sx, syBase] = w2s(x, ROAD_GEOMETRY.roadTop - 0.7);
        const poleTop = syBase - 2.6 * pxm;
        ctx.strokeStyle = "rgba(148,163,184,0.55)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sx, syBase);
        ctx.lineTo(sx, poleTop);
        ctx.stroke();
        // light pool on the road edge
        const pool = ctx.createRadialGradient(sx, syBase + 6, 2, sx, syBase + 6, pxm * 3.4);
        pool.addColorStop(0, "rgba(253,224,71,0.10)");
        pool.addColorStop(1, "rgba(253,224,71,0)");
        ctx.fillStyle = pool;
        ctx.fillRect(sx - pxm * 3.4, syBase - pxm * 2.4, pxm * 6.8, pxm * 6);
        ctx.fillStyle = "rgba(253,230,138,0.95)";
        ctx.beginPath();
        ctx.arc(sx, poleTop, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // roadside reflector posts (lower verge)
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      const postStart = Math.floor(camX / 14) * 14;
      for (let x = postStart; x < camX + viewM + 14; x += 14) {
        const [sx, syTop] = w2s(x, ROAD_GEOMETRY.roadBottom + 5.2);
        const [, syBot] = w2s(x, ROAD_GEOMETRY.roadBottom + 4.6);
        ctx.fillRect(sx - 1.2, syTop, 2.4, syBot - syTop);
      }

      // ---------------- shoulder ----------------
      const [shL, shT] = w2s(camX, ROAD_GEOMETRY.roadBottom);
      const [, shB] = w2s(camX, ROAD_GEOMETRY.roadBottom + ROAD_GEOMETRY.shoulderWidth);
      ctx.fillStyle = "#141a18";
      ctx.fillRect(0, shT, W, shB - shT);
      // hatching
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, shT, W, shB - shT);
      ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 2;
      for (let i = -30; i < W / 26 + 30; i++) {
        const hx = i * 26 - (camX * pxm) % 26;
        ctx.beginPath();
        ctx.moveTo(hx, shB);
        ctx.lineTo(hx + (shB - shT), shT);
        ctx.stroke();
      }
      ctx.restore();

      // ---------------- asphalt ----------------
      const rdT = cy + ROAD_GEOMETRY.roadTop * pxm;
      const rdB = cy + ROAD_GEOMETRY.roadBottom * pxm;
      const asphalt = ctx.createLinearGradient(0, rdT, 0, rdB);
      asphalt.addColorStop(0, "#1c2226");
      asphalt.addColorStop(0.5, "#232a2f");
      asphalt.addColorStop(1, "#1c2226");
      ctx.fillStyle = asphalt;
      ctx.fillRect(0, rdT, W, rdB - rdT);

      // edge lines
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.lineWidth = 2;
      for (const edge of [ROAD_GEOMETRY.roadTop + 0.15, ROAD_GEOMETRY.roadBottom - 0.15]) {
        const [, ey] = w2s(camX, edge);
        ctx.beginPath();
        ctx.moveTo(0, ey);
        ctx.lineTo(W, ey);
        ctx.stroke();
      }

      // center dashed line — dash phase tied to world position so it streams past
      ctx.strokeStyle = "rgba(250, 204, 21, 0.55)";
      ctx.lineWidth = 2.4;
      ctx.setLineDash([pxm * 2.2, pxm * 2.2]);
      ctx.lineDashOffset = (camX * pxm) % (pxm * 4.4);
      const [, cym] = w2s(camX, 0);
      ctx.beginPath();
      ctx.moveTo(0, cym);
      ctx.lineTo(W, cym);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      // ---------------- speed streaks (highway motion cue) ----------------
      const kmhNow = eng.kin.speed * 3.6;
      if (kmhNow > 28) {
        const alpha = Math.min(0.22, (kmhNow - 28) / 320);
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1.5;
        const gap = 88;
        const len = Math.min(170, kmhNow * 1.15);
        const off = (camX * pxm * 1.45) % gap;
        for (const sy of [rdT - 16, rdB + 24, rdT - 42, rdB + 52]) {
          for (let sx = -off - len; sx < W + len; sx += gap) {
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - len, sy);
            ctx.stroke();
          }
        }
      }

      // ---------------- safe stop zone ----------------
      const zone = eng.autonomy.stopZone;
      if (zone.active) {
        const zx0 = zone.position - 17;
        const zx1 = zone.position + 7;
        const [ax, ay] = w2s(zx0, ROAD_GEOMETRY.roadBottom + 0.5);
        const [bx, by] = w2s(zx1, ROAD_GEOMETRY.roadBottom + ROAD_GEOMETRY.shoulderWidth - 0.5);
        const blinkOn = (now / 600) % 1 < 0.6;
        ctx.save();
        ctx.fillStyle = blinkOn ? "rgba(251,191,36,0.16)" : "rgba(251,191,36,0.08)";
        ctx.fillRect(ax, ay, bx - ax, by - ay);
        ctx.strokeStyle = "rgba(251,191,36,0.9)";
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.strokeRect(ax, ay, bx - ax, by - ay);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(251,191,36,0.95)";
        ctx.font = "600 10px ui-monospace, monospace";
        ctx.fillText("SAFE STOP ZONE", ax + 6, ay + 14);
        ctx.restore();
      }

      // ---------------- autonomous path ----------------
      if (eng.mode === "AUTONOMOUS" && eng.autonomy.path.length > 1 && eng.autonomy.stopZone.active) {
        ctx.save();
        ctx.strokeStyle = "rgba(249,115,22,0.85)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([9, 7]);
        ctx.beginPath();
        eng.autonomy.path.forEach((p, i) => {
          const [sx, sy] = w2s(p.x, p.y);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        const lastP = eng.autonomy.path[eng.autonomy.path.length - 1];
        const [tx, ty] = w2s(lastP.x, lastP.y);
        ctx.fillStyle = "rgba(249,115,22,0.9)";
        ctx.beginPath();
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "600 10px ui-monospace, monospace";
        ctx.fillText("AUTONOMOUS PATH", tx - 108, ty - 10);
        ctx.restore();
      }

      // ---------------- vehicle ----------------
      const spec = VEHICLE_SPECS[eng.vehicleType];
      const [vx, vy] = w2s(eng.kin.position, eng.kin.lateral);
      const L = spec.length * pxm;
      const Wd = Math.max(6, spec.width * pxm);
      const blinkHazard = eng.hazardsOn && (now / 450) % 1 < 0.55;
      const heading = (eng.kin.headingDeg * Math.PI) / 180;
      const braking = eng.engineOn && (eng.kin.brake > 0.05 || eng.kin.accel < -0.45);

      ctx.save();
      ctx.translate(vx, vy);
      ctx.rotate(heading);

      // headlight cone
      if (eng.engineOn) {
        ctx.save();
        const cone = ctx.createLinearGradient(L / 2, 0, L / 2 + pxm * 9, 0);
        cone.addColorStop(0, "rgba(255,244,200,0.20)");
        cone.addColorStop(1, "rgba(255,244,200,0)");
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(L / 2, -Wd / 2);
        ctx.lineTo(L / 2 + pxm * 9, -Wd * 1.4);
        ctx.lineTo(L / 2 + pxm * 9, Wd * 1.4);
        ctx.lineTo(L / 2, Wd / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (eng.vehicleType === "TRUCK") {
        // trailer
        ctx.fillStyle = "#cbd5d8";
        roundRect(ctx, -L / 2, -Wd / 2, L * 0.68, Wd, 3);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        roundRect(ctx, -L / 2 + 4, -Wd / 2 + 3, L * 0.68 - 8, Wd - 6, 2);
        ctx.fill();
        // cab
        ctx.fillStyle = "#f97316";
        roundRect(ctx, L * 0.22, -Wd / 2, L * 0.28, Wd, 3);
        ctx.fill();
        ctx.fillStyle = "rgba(15,23,42,0.9)";
        roundRect(ctx, L * 0.42, -Wd / 2 + 2.5, L * 0.06, Wd - 5, 1.5);
        ctx.fill();
      } else if (eng.vehicleType === "CAR") {
        ctx.fillStyle = "#e2e8f0";
        roundRect(ctx, -L / 2, -Wd / 2, L, Wd, Wd * 0.4);
        ctx.fill();
        ctx.fillStyle = "rgba(15,23,42,0.85)";
        roundRect(ctx, -L * 0.16, -Wd / 2 + 2.5, L * 0.34, Wd - 5, 3);
        ctx.fill();
      } else {
        // bike
        ctx.fillStyle = "#94a3b8";
        roundRect(ctx, -L / 2, -Wd / 4, L, Wd / 2, 3);
        ctx.fill();
        const helmetOk = eng.helmet.state === "HELMET_DETECTED";
        ctx.fillStyle = helmetOk ? "#34d399" : "#f87171";
        ctx.beginPath();
        ctx.arc(-L * 0.05, 0, Wd * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // brake lights
      if (braking) {
        for (const by of [-Wd / 3, Wd / 3]) {
          ctx.fillStyle = "rgba(248,113,113,0.35)";
          ctx.beginPath();
          ctx.arc(-L / 2 + 1, by, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(-L / 2 + 1, by, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // hazard lights
      if (blinkHazard) {
        ctx.fillStyle = "#fbbf24";
        const corners: [number, number][] = [
          [-L / 2 + 2, -Wd / 2],
          [-L / 2 + 2, Wd / 2],
          [L / 2 - 2, -Wd / 2],
          [L / 2 - 2, Wd / 2],
        ];
        for (const [hx, hy] of corners) {
          ctx.beginPath();
          ctx.arc(hx, hy, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // headlight dots
      if (eng.engineOn) {
        ctx.fillStyle = "rgba(255,250,220,0.95)";
        ctx.beginPath();
        ctx.arc(L / 2 - 1.5, -Wd / 3, 2, 0, Math.PI * 2);
        ctx.arc(L / 2 - 1.5, Wd / 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ---------------- HUD ----------------
      ctx.font = "600 11px ui-monospace, monospace";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(`${kmhNow.toFixed(0)} km/h`, 14, 22);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText(`ODO ${eng.kin.odometer.toFixed(0)} m`, 14, 38);

      // autopilot / high speed chip
      if (eng.autopilot && !eng.controlLocked) {
        const cruiseKmh = eng.highSpeed
          ? Math.round(spec.maxSpeed * 3.6)
          : eng.settings.cruiseSpeed[eng.vehicleType];
        const pulse = (now / 700) % 1 < 0.7;
        const label = eng.highSpeed
          ? `AUTOPILOT · HIGH SPEED ${cruiseKmh} km/h`
          : `AUTOPILOT · CRUISE ${cruiseKmh} km/h`;
        ctx.font = "700 12px ui-monospace, monospace";
        ctx.fillStyle = eng.highSpeed
          ? pulse
            ? "rgba(252,211,77,0.95)"
            : "rgba(252,211,77,0.55)"
          : pulse
            ? "rgba(34,211,238,0.95)"
            : "rgba(34,211,238,0.55)";
        ctx.fillText(label, W / 2 - label.length * 3.4, 24);
      }

      if (eng.mode === "AUTONOMOUS") {
        ctx.fillStyle = "rgba(249,115,22,0.95)";
        ctx.font = "700 15px ui-monospace, monospace";
        const pulse = (now / 700) % 1 < 0.65;
        if (pulse) ctx.fillText("AUTONOMOUS SAFETY MODE", W / 2 - 110, 44);
        if (zone.active) {
          const dist = Math.max(0, zone.position - eng.kin.position);
          ctx.font = "600 11px ui-monospace, monospace";
          ctx.fillStyle = "rgba(251,191,36,0.9)";
          ctx.fillText(`STOP ZONE: ${dist.toFixed(0)} m`, W / 2 - 46, 60);
        }
      } else if (eng.controlLocked && eng.mode !== "IDLE") {
        ctx.fillStyle = "rgba(248,113,113,0.85)";
        ctx.font = "600 11px ui-monospace, monospace";
        ctx.fillText("MANUAL CONTROL LOCKED", 14, 56);
      }

      // accident flash
      if (wobble > 0) {
        ctx.fillStyle = `rgba(239,68,68,${0.30 * wobble})`;
        ctx.fillRect(-40, -40, W + 80, H + 80);
      }

      ctx.restore();
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-[300px] sm:h-[360px] lg:h-[420px] overflow-hidden rounded-xl border border-white/10 bg-[#0a0f0d]"
    >
      <canvas ref={canvasRef} className="block" aria-label="Top-down vehicle simulation view" />
      <div className="absolute top-2 right-2.5 text-[9px] tracking-[0.2em] uppercase text-white/35 pointer-events-none">
        SIMULATED VEHICLE CONTROL
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
