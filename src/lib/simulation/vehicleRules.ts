/**
 * Vehicle-specific rule engine. Rules are declarative so behaviour is not
 * hard-coded inside UI components.
 */

import type {
  RecommendedAction,
  SafetyStatus,
  VehicleType,
} from "../types";

export interface VehicleRules {
  requireHelmetToStart: boolean;
  alcoholStartPolicy: "BLOCK_START" | "ALLOW";
  alcoholMovingPolicy: RecommendedAction; // what happens when detected while moving
  drowsinessWarningAction: RecommendedAction;
  drowsinessCriticalAction: RecommendedAction;
  accidentAction: RecommendedAction;
  /** seconds between first warning and autonomous/control escalation */
  escalationSeconds: number;
  description: string[];
}

export const BIKE_RULES: VehicleRules = {
  requireHelmetToStart: true,
  alcoholStartPolicy: "BLOCK_START",
  alcoholMovingPolicy: "REDUCE_POWER",
  drowsinessWarningAction: "WARN",
  drowsinessCriticalAction: "CONTROLLED_STOP",
  accidentAction: "EMERGENCY_STOP",
  escalationSeconds: 3.0,
  description: ["Helmet + Alcohol + Driver Monitoring"],
};

export const CAR_RULES: VehicleRules = {
  requireHelmetToStart: false,
  alcoholStartPolicy: "BLOCK_START",
  alcoholMovingPolicy: "CONTROLLED_STOP",
  drowsinessWarningAction: "WARN",
  drowsinessCriticalAction: "CONTROLLED_STOP",
  accidentAction: "EMERGENCY_STOP",
  escalationSeconds: 3.0,
  description: ["Driver Monitoring + Alcohol + Safety Intervention"],
};

export const TRUCK_RULES: VehicleRules = {
  requireHelmetToStart: false,
  alcoholStartPolicy: "BLOCK_START",
  alcoholMovingPolicy: "AUTONOMOUS_STOP",
  drowsinessWarningAction: "WARN",
  drowsinessCriticalAction: "AUTONOMOUS_STOP",
  accidentAction: "EMERGENCY_STOP",
  escalationSeconds: 3.0,
  description: ["Driver Monitoring + Alcohol + Autonomous Safety Stop"],
};

export const VEHICLE_RULES: Record<VehicleType, VehicleRules> = {
  BIKE: BIKE_RULES,
  CAR: CAR_RULES,
  TRUCK: TRUCK_RULES,
};

export const VEHICLE_META: Record<
  VehicleType,
  { label: string; icon: string; accent: string; tagline: string }
> = {
  BIKE: {
    label: "BIKE",
    icon: "🏍️",
    accent: "emerald",
    tagline: "Helmet + Alcohol + Driver Monitoring",
  },
  CAR: {
    label: "CAR",
    icon: "🚗",
    accent: "sky",
    tagline: "Driver Monitoring + Alcohol + Safety Intervention",
  },
  TRUCK: {
    label: "TRUCK",
    icon: "🚛",
    accent: "orange",
    tagline: "Driver Monitoring + Alcohol + Autonomous Safety Stop",
  },
};

export function severityRank(s: SafetyStatus): number {
  switch (s) {
    case "SAFE":
      return 0;
    case "WARNING":
      return 1;
    case "CRITICAL":
      return 2;
    case "EMERGENCY":
      return 3;
  }
}
