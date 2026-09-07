// src/ai/forest/types.ts
import { SpatialTopology } from "./spatial-topology";

export type RegimeZone =
  | "quiescent"
  | "plastic"
  | "metastable"
  | "critical"
  | "decay";

export type OperatorClass =
  | "attention"
  | "inference"
  | "memory"
  | "mutation"
  | "stabilizer";

export type Operator = {
  id: string;
  type: OperatorClass;
  strength: number;
  age: number;
  halfLife: number;
  sourceCellId: string;
  localBias?: number;
};

export type CellState = {
  id: string;
  energy: number;
  activation: number;
  stress: number;
  coherence: number;
  zone: RegimeZone;
  operatorProductionBias: Partial<Record<OperatorClass, number>>;
  localField: Record<OperatorClass, number>;
};

export type GlobalFieldState = {
  concentrations: Record<string, Record<OperatorClass, number>>;
  gradients: Record<string, number>;
  flux: Record<string, number>;
};

export type VascularState = {
  conductanceMemory: Record<string, number>;
  edgeFlux: Record<string, number>;
  edgeConductance: Record<string, number>;
};

export type OrganType =
  | "inference_cortex"
  | "memory_basin"
  | "mutation_storm"
  | "stabilizing_cluster";

export type Organ = {
  id: string;
  type: OrganType;
  cells: string[]; // UPDATED from Set<string> for JSON serialization
  center: string;
  stability: number;
  age: number;
};

export type OrganState = {
  organs: Record<string, Organ>;
  cellToOrgan: Record<string, string | null>;
};

export type DevelopmentLog = {
  angiogenesis: {
    edgesReinforced: number;
    edgesPruned: number;
    sproutsCreated: number;
  };
  organogenesis: {
    organsBorn: number;
    organsMerged: number;
    organsRemoved: number;
    cellsJoinedOrgans: number;
  };
};

export type ForestState = {
  tick: number;
  cells: CellState[];
  operators: Operator[];
  field: GlobalFieldState;
  vascular: VascularState;
  organ: OrganState;
  developmentLog: DevelopmentLog;
  topology: SpatialTopology; // ADDED for persistence
};

export type AngiogenesisParams = {
  growthThreshold: number;
  pruneThreshold: number;
  reinforcementRate: number;
  decayRate: number;
  pruneProbability: number;
  sproutProbability: number;
  maxEdgeWeight: number;
  minEdgeWeight: number;
  longRangeSproutDistance: number;
};

export type OrganogenesisParams = {
  emergenceThreshold: number;
  mergeSimilarity: number;
  decayRate: number;
  reinforcementRate: number;
  spreadProbability: number;
  maxOrgans: number;
};

export type HomeostasisParams = {
  balanceStrength: number;
  regulationRate: number;
  stressMitigation: number;
  mutationSuppression: number;
  activationDamping: number;
};

export type SimulationParams = {
  initialEnergy: number;
  basalDecay: number;
  operatorEmissionRate: number;
  operatorDecayRate: number;
  diffusionRate: number;
  retentionRate: number;
  saturationLimit: number;
  stressFromOverload: number;
  zoneThresholds: {
    plastic: number;
    metastable: number;
    critical: number;
    decay: number;
  };
  conductance: {
    coherenceGain: number;
    stressBarrierGain: number;
    zoneAffinityGain: number;
    mutationTurbulenceGain: number;
    memoryReinforcementGain: number;
    reinforcementDecay: number;
    reinforcementLearningRate: number;
    minConductance: number;
    maxConductance: number;
  };
  angiogenesis: AngiogenesisParams;
  organogenesis: OrganogenesisParams;
  homeostasis: HomeostasisParams;
};

export type StepMetrics = {
  tick: number;
  meanActivation: number;
  meanStress: number;
  meanCoherence: number;
  meanEnergy: number;
  zoneDistribution: Record<RegimeZone, number>;
  totalOperators: number;
  fieldVariance: number;
  meanGradient: number;
  meanFlux: number;
  pathwayConcentration: number;
  meanConductance: number;
  conductanceVariance: number;
  vascularDominance: number;
  organCount: number;
  maxOrganSize: number;
};