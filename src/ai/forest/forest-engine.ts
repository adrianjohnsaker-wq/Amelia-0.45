// forest-engine.ts

import {
  CellState,
  ForestState,
  SimulationParams,
  StepMetrics,
  DevelopmentLog,
} from "./types";
import { createGridTopology, topologyMeanDegree } from "./spatial-topology";
import { initializeField, updateField } from "./field-update";
import { updateOperators } from "./operator-metabolism";
import { updateCells } from "./cell-update";
import { computeStepMetrics } from "./results-metrics";
import {
  initializeConductanceMemory,
  updateConductanceMemory,
} from "./adaptive-conductance";
import { performAngiogenesis } from "./angiogenesis";
import { initializeOrganState, runOrganogenesis } from "./organogenesis";
import { runCognitiveHomeostasis } from "./cognitive-homeostasis";

export type ForestEngineConfig = {
  width: number;
  height: number;
  steps: number;
  diagonal?: boolean;
  wrap?: boolean;
  params?: Partial<SimulationParams>;
  initialState?: ForestState | null; // ADDED for longitudinal runs
};

function defaultParams(): SimulationParams {
  return {
    initialEnergy: 1.0,
    basalDecay: 0.06,
    operatorEmissionRate: 1.4,
    operatorDecayRate: 0.08,
    diffusionRate: 0.32,
    retentionRate: 0.45,
    saturationLimit: 4.0,
    stressFromOverload: 0.18,
    zoneThresholds: {
      plastic: 0.28,
      metastable: 0.55,
      critical: 0.92,
      decay: 1.0,
    },
    conductance: {
      coherenceGain: 0.55,
      stressBarrierGain: 0.45,
      zoneAffinityGain: 0.35,
      mutationTurbulenceGain: 0.25,
      memoryReinforcementGain: 0.60,
      reinforcementDecay: 0.08,
      reinforcementLearningRate: 0.12,
      minConductance: 0.03,
      maxConductance: 4.0,
    },
    angiogenesis: {
      growthThreshold: 0.8,
      pruneThreshold: 0.05,
      reinforcementRate: 0.4,
      decayRate: 0.03,
      pruneProbability: 0.15,
      sproutProbability: 0.08,
      maxEdgeWeight: 6,
      minEdgeWeight: 0.02,
      longRangeSproutDistance: 3
    },
    organogenesis: {
      emergenceThreshold: 0.6,
      mergeSimilarity: 0.7,
      decayRate: 0.05,
      reinforcementRate: 0.08,
      spreadProbability: 0.12,
      maxOrgans: 12
    },
    homeostasis: {
      balanceStrength: 0.08,
      regulationRate: 0.06,
      stressMitigation: 0.07,
      mutationSuppression: 0.05,
      activationDamping: 0.06
    }
  };
}

function emptyLog(): DevelopmentLog {
  return {
    angiogenesis: {
      edgesReinforced: 0,
      edgesPruned: 0,
      sproutsCreated: 0
    },
    organogenesis: {
      organsBorn: 0,
      organsMerged: 0,
      organsRemoved: 0,
      cellsJoinedOrgans: 0
    }
  };
}

function makeInitialCells(ids: string[], initialEnergy: number): CellState[] {
  return ids.map(id => ({
    id,
    energy: initialEnergy,
    activation: Math.random() * 0.15,
    stress: Math.random() * 0.08,
    coherence: 0.2 + Math.random() * 0.15,
    zone: "quiescent",
    operatorProductionBias: {
      attention: 1 + Math.random() * 0.4,
      inference: 1 + Math.random() * 0.4,
      memory: 1 + Math.random() * 0.4,
      mutation: 0.7 + Math.random() * 0.6,
      stabilizer: 0.8 + Math.random() * 0.5,
    },
    localField: {
      attention: 0,
      inference: 0,
      memory: 0,
      mutation: 0,
      stabilizer: 0,
    },
  }));
}

export function runForestSimulation(config: ForestEngineConfig): {
  finalState: ForestState;
  metrics: StepMetrics[];
} {
  const defaults = defaultParams();
  const params: SimulationParams = {
    ...defaults,
    ...(config.params ?? {}),
    zoneThresholds: {
      ...defaults.zoneThresholds,
      ...(config.params?.zoneThresholds ?? {}),
    },
    conductance: {
      ...defaults.conductance,
      ...(config.params?.conductance ?? {}),
    },
    angiogenesis: {
      ...defaults.angiogenesis,
      ...(config.params?.angiogenesis ?? {}),
    },
    organogenesis: {
      ...defaults.organogenesis,
      ...(config.params?.organogenesis ?? {}),
    },
    homeostasis: {
      ...defaults.homeostasis,
      ...(config.params?.homeostasis ?? {}),
    }
  };

  let state: ForestState;
  let topology = config.initialState?.topology;

  if (config.initialState) {
    state = { ...config.initialState };
    if (!topology) {
      topology = createGridTopology({
        width: config.width,
        height: config.height,
        diagonal: config.diagonal ?? false,
        wrap: config.wrap ?? false,
        defaultWeight: 1.0,
      });
      state.topology = topology;
    }
  } else {
    topology = createGridTopology({
      width: config.width,
      height: config.height,
      diagonal: config.diagonal ?? false,
      wrap: config.wrap ?? false,
      defaultWeight: 1.0,
    });

    const cellIds = topology.nodes.map(n => n.id);
    const cells = makeInitialCells(cellIds, params.initialEnergy);

    state = {
      tick: 0,
      cells,
      operators: [],
      field: initializeField(cellIds),
      vascular: {
        conductanceMemory: initializeConductanceMemory(topology, 0),
        edgeFlux: {},
        edgeConductance: {},
      },
      organ: initializeOrganState(cellIds),
      developmentLog: emptyLog(),
      topology: topology,
    };
  }

  const metrics: StepMetrics[] = [];

  for (let step = 0; step < config.steps; step++) {
    state.developmentLog = emptyLog();

    const operators = updateOperators(state.operators, state.cells, params);

    const provisionalState: ForestState = {
      ...state,
      operators,
    };

    const diffusionResult = updateField(provisionalState, topology!, params);

    const vascularMemory = updateConductanceMemory(
      state.vascular.conductanceMemory,
      diffusionResult.edgeFlux,
      topology!,
      provisionalState,
      params.conductance
    );

    const fieldState: ForestState = {
      ...provisionalState,
      field: diffusionResult.field,
      vascular: {
        conductanceMemory: vascularMemory,
        edgeFlux: diffusionResult.edgeFlux,
        edgeConductance: diffusionResult.edgeConductance,
      },
    };

    const nextCells = updateCells(state.cells, fieldState, params);

    state = {
      tick: state.tick + 1,
      cells: nextCells,
      operators,
      field: diffusionResult.field,
      vascular: {
        conductanceMemory: vascularMemory,
        edgeFlux: diffusionResult.edgeFlux,
        edgeConductance: diffusionResult.edgeConductance,
      },
      organ: state.organ,
      developmentLog: state.developmentLog,
      topology: topology!,
    };

    topology = performAngiogenesis(
      topology!,
      state,
      params.angiogenesis,
      state.developmentLog
    );
    state.topology = topology;

    state.organ = runOrganogenesis(
      topology,
      state,
      state.organ,
      params.organogenesis,
      state.developmentLog
    );

    state = runCognitiveHomeostasis(
      state,
      state.organ,
      params.homeostasis
    );

    metrics.push(computeStepMetrics(state));
  }

  return {
    finalState: state,
    metrics,
  };
}