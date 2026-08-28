import type { ComponentType } from "react";

import { BrakingDistanceTrackScene } from "@/features/game/components/diagrams/scenes/BrakingDistanceTrackScene";
import { BuoyancyFloatingCubeScene } from "@/features/game/components/diagrams/scenes/BuoyancyFloatingCubeScene";
import { FreeFallWellScene } from "@/features/game/components/diagrams/scenes/FreeFallWellScene";
import { HydraulicPressScene } from "@/features/game/components/diagrams/scenes/HydraulicPressScene";
import { HydrostaticColumnScene } from "@/features/game/components/diagrams/scenes/HydrostaticColumnScene";
import { IceMeltingBeakerScene } from "@/features/game/components/diagrams/scenes/IceMeltingBeakerScene";
import { InclineNormalForceScene } from "@/features/game/components/diagrams/scenes/InclineNormalForceScene";
import { OhmLawCircuitScene } from "@/features/game/components/diagrams/scenes/OhmLawCircuitScene";
import { ParallelResistorsCircuitScene } from "@/features/game/components/diagrams/scenes/ParallelResistorsCircuitScene";
import { PendulumEnergyExchangeScene } from "@/features/game/components/diagrams/scenes/PendulumEnergyExchangeScene";
import { PowerApplianceCircuitScene } from "@/features/game/components/diagrams/scenes/PowerApplianceCircuitScene";
import { PressureBoxOnGroundScene } from "@/features/game/components/diagrams/scenes/PressureBoxOnGroundScene";
import { SkaterKineticEnergyScene } from "@/features/game/components/diagrams/scenes/SkaterKineticEnergyScene";
import { ThermalMixingCalorimeterScene } from "@/features/game/components/diagrams/scenes/ThermalMixingCalorimeterScene";
import { UniformMotionRailScene } from "@/features/game/components/diagrams/scenes/UniformMotionRailScene";
import { WaterHeatingBeakerScene } from "@/features/game/components/diagrams/scenes/WaterHeatingBeakerScene";
import { WeightCrateBenchScene } from "@/features/game/components/diagrams/scenes/WeightCrateBenchScene";
import { WinchLiftPowerScene } from "@/features/game/components/diagrams/scenes/WinchLiftPowerScene";

/** Props reçues par toute scène de schéma : les grandeurs de l'énoncé. */
export interface DiagramSceneProps {
  params: Readonly<Record<string, number | string>>;
}

/**
 * Registre des schémas 3D, indexé par le `diagram.kind` des questions.
 * Les scènes sont importées statiquement : elles ne pèsent que quelques
 * primitives et partagent déjà le runtime three.js du jeu.
 */
export const DIAGRAM_SCENES: Readonly<
  Record<string, ComponentType<DiagramSceneProps>>
> = {
  // Pression
  "pressure-box-on-ground": PressureBoxOnGroundScene,
  "hydrostatic-column": HydrostaticColumnScene,
  "hydraulic-press": HydraulicPressScene,
  // Chaleur
  "water-heating-beaker": WaterHeatingBeakerScene,
  "thermal-mixing-calorimeter": ThermalMixingCalorimeterScene,
  "ice-melting-beaker": IceMeltingBeakerScene,
  // Énergie
  "skater-kinetic-energy": SkaterKineticEnergyScene,
  "winch-lift-power": WinchLiftPowerScene,
  "pendulum-energy-exchange": PendulumEnergyExchangeScene,
  // Électricité
  "ohm-law-circuit": OhmLawCircuitScene,
  "power-appliance-circuit": PowerApplianceCircuitScene,
  "parallel-resistors-circuit": ParallelResistorsCircuitScene,
  // Forces
  "weight-crate-bench": WeightCrateBenchScene,
  "incline-normal-force": InclineNormalForceScene,
  "buoyancy-floating-cube": BuoyancyFloatingCubeScene,
  // Cinématique
  "uniform-motion-rail": UniformMotionRailScene,
  "free-fall-well": FreeFallWellScene,
  "braking-distance-track": BrakingDistanceTrackScene,
};
