// src/ai/runtime/cycle.ts
'use server';

import { AmeliaProcessState } from "../core/ameliaState";
import { advanceNumogram, ensureNumogramContext } from "../numogram/numogramBridge";
import type { ReservoirState } from "../memory/shadowReservoir";
import { initializeReservoir } from "../memory/shadowReservoir";
import type { EventSurfaceState } from "../substrate/eventSurface";
import { initializeEventSurface } from "../substrate/eventSurface";
import type { OntologicalDriftState } from "../ontology/ontologicalDrift";
import { initializeOntologicalDrift } from "../ontology/ontologicalDrift";
import { AdaptiveGateState } from "../telemetry/AdaptiveGatePlasticity";
import { ForestState } from "../forest/forest-engine";
import { callLLM } from "../llm/callLLM";

import {
  createPersistentBridge,
  SESSION_IDS,
  BridgeTerminalityGuard,
  BridgeRouter,
  type SubstrateVector,
  type RelayVector,
} from "../coupling";
import { computeOrganOccupancy, type TaskClass, type MetabolicOutput } from '@/analysis/StrictRunMetrics';
import { computeAssemblageMetrics } from "@/ai/substrate/AssemblageMetrics";
import { classifyField } from "@/ai/substrate/FieldClassification";
import { 
  SubstrateMetrics, 
  PhaseReadout,
  classifyPhase
} from "../expressive/amelia_relay_final";
import { initializeFirebase } from "@/firebase";

export interface CycleInput {
  userPrompt?: string;
  userId?: string;
  taskClass?: TaskClass;
  gateRate?: number;
  gateState?: AdaptiveGateState | null;
  previousRegimeWeights?: { alpha: number; beta: number; gamma: number } | null;
  previousZone?: string | null;
  previousRegimeEntropy?: number | null;
  runId?: string;
  auditContext?: any;
}

export interface FullAmeliaState {
  processState: AmeliaProcessState;
  numogramSnapshot: any;
  reservoir: ReservoirState;
  eventSurface: EventSurfaceState;
  driftState: OntologicalDriftState;
  gateState: AdaptiveGateState | null;
  previousRegimeWeights: { alpha: number; beta: number; gamma: number } | null;
  previousZone: string | null;
  previousRegimeEntropy: number | null;
  operatorEcology: any | null;
  episodes: any[];
  forestState?: ForestState | null; 
  substrateMemory?: any; 
  cycleCount: number;
  timestamp: Date | number;
  lastInterpretationContext?: {
    metrics: SubstrateMetrics;
    readout: PhaseReadout;
    expression: string;
  } | null;
}

export interface CycleOutput {
  nextState: AmeliaProcessState;
  nextReservoir: ReservoirState;
  nextEventSurface: EventSurfaceState;
  nextDriftState: OntologicalDriftState;
  reply?: string | null;
  metabolic?: MetabolicOutput | null;
  stepsTrace: any[];
  relayMetadata?: any;
  lastInterpretationContext?: FullAmeliaState['lastInterpretationContext'];
}

// ─── MODULE SCOPE BRIDGE STATE ──────────────────────────────────────────────

let bridgePromise:
  | Promise<Awaited<ReturnType<typeof createPersistentBridge>>>
  | null = null;

let guardPromise:
  | Promise<BridgeTerminalityGuard>
  | null = null;

function getBridge(db: any) {
  if (!bridgePromise) {
    bridgePromise = createPersistentBridge(db, SESSION_IDS.C1_MAIN);
  }
  return bridgePromise;
}

function getGuard(db: any) {
  if (!guardPromise) {
    guardPromise = getBridge(db).then(bridge => new BridgeTerminalityGuard(bridge));
  }
  return guardPromise;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function parseRelayPart0(priorResponse: string = ""): RelayVector {
  const extract = (key: string, fallback: number): number => {
    const match = priorResponse.match(
      new RegExp(`${key}\\s*[=:]\\s*([\\d.]+)`, "i")
    );
    return match ? Number(match[1]) : fallback;
  };

  const extractBool = (key: string, fallback = false): boolean => {
    if (new RegExp(`${key}\\s*[=:]\\s*true`, "i").test(priorResponse)) return true;
    if (new RegExp(`${key}\\s*[=:]\\s*false`, "i").test(priorResponse)) return false;
    return fallback;
  };

  const classMatch = priorResponse.match(
    /fieldClassification\s*[=:]\s*(coupled-assemblage|low-zone-integrated|terrace-only|unknown)/i
  );

  return {
    fieldClassification: (classMatch?.[1] ?? "terrace-only") as any,
    fieldConfidence: extract("fieldConfidence", 0.5),
    RCS: extract("RCS", 0.199),
    LIS: extract("LIS", 0),
    MTS: extract("MTS", 0),
    ringOccupancy: extract("ringOccupancy", 0.441),
    metabolicOccupancy: extract("metabolicOccupancy", 0.183),
    memoryExpressing: extractBool("memoryExpressing", false),
  };
}

function adaptSubstrateExport(export_: any): SubstrateVector {
  const asm = export_.assemblageMetrics ?? export_.metrics ?? export_;
  const occ = export_.organOccupancy ?? export_.occupancy ?? {};
  const cls = export_.fieldClassification ?? export_.classifier ?? {};

  const taskClass =
    export_.taskClass ??
    cls.label ??
    cls.fieldClass ??
    export_.fieldClass ??
    "terrace-only";

  return {
    taskClass: taskClass as any,
    PCS: asm.PCS ?? export_.PCS ?? 1,
    MTS: asm.MTS ?? export_.MTS ?? 0,
    LIS: asm.LIS ?? export_.LIS ?? 0,
    FEI: asm.FEI ?? export_.FEI ?? 0,
    RCS: asm.RCS ?? export_.RCS ?? 0,

    memoryExpressing:
      export_.memoryExpressing ??
      cls.memoryExpressing ??
      false,

    memoryMode:
      export_.memoryMode ??
      cls.memoryMode,

    dominantStratum:
      export_.dominantStratum ??
      cls.dominantStratum ??
      "unknown",

    ringOccupancy:
      occ.ring?.percentage ??
      occ.ringOccupancy ??
      export_.ringOccupancy ??
      0,

    metabolicOccupancy:
      occ.metabolic?.percentage ??
      occ.metabolicOccupancy ??
      export_.metabolicOccupancy ??
      export_.gammaOccupancy ??
      0,

    classifierConfidence:
      export_.classifierConfidence ??
      cls.confidence,

    z3z2Weight:
      export_.z3z2Weight ??
      export_["z3→z2"] ??
      export_.diagnostics?.z3z2Weight,

    z0MeanReturn:
      export_.z0MeanReturn ??
      export_.diagnostics?.z0MeanReturn,

    z4MeanReturn:
      export_.z4MeanReturn ??
      export_.diagnostics?.z4MeanReturn,
  };
}

async function runCycleWithBridge(args: {
  db: any;
  substrateExport: SubstrateVector;
  relayPart0Values: RelayVector;
  userInput: string;
  baseSystemPrompt: string;
  temperature?: number;
}): Promise<string> {
  const {
    db,
    substrateExport,
    relayPart0Values,
    userInput,
    baseSystemPrompt,
    temperature,
  } = args;

  const bridge = await getBridge(db);
  const guard = await getGuard(db);

  const prepared = bridge.prepareRelayContext({
    userInput,
    substrateExport,
    relayPart0Values,
    baseSystemPrompt,
  });

  const messages = [
    {
      role: "system" as const,
      content: prepared.systemContext,
    },
    {
      role: "user" as const,
      content: userInput,
    },
  ];

  const routeInput = `${prepared.systemContext}\n\n${userInput}`;

  const responseText = await guard.process(
    routeInput,
    async () => callLLM(messages, { temperature })
  );

  const route = BridgeRouter.route(userInput);
  const validationFailure =
    responseText.includes("BRIDGE_TERMINALITY_FAILED") ||
    responseText.includes("BRIDGE_RELAY_CALL_FAILED");

  const shouldStore =
    route.routeTo !== "bridge_continuity" &&
    !validationFailure &&
    !responseText.includes("INSUFFICIENT_MEMORY");

  if (shouldStore) {
    bridge.completeRelayEngagement(
      {
        userInput,
        substrateExport,
        relayPart0Values,
        baseSystemPrompt,
      },
      prepared.directive,
      responseText
    );
  }

  return responseText;
}

// ─── MAIN CYCLE ──────────────────────────────────────────────────────────────

export async function runCycle(
  prevState: AmeliaProcessState,
  prevNumoSnapshot: any,
  prevReservoir: ReservoirState,
  prevEventSurface: EventSurfaceState,
  prevDriftState: OntologicalDriftState,
  input: CycleInput,
  cycleCount: number,
  prevForestState?: ForestState | null,
  prevSubstrateMemory?: any,
  lastInterpretation?: FullAmeliaState['lastInterpretationContext']
): Promise<any> {
    const { firestore: db } = initializeFirebase();
    const userPrompt = input.userPrompt || "";
    
    // Hard Routing Entry Point
    const route = BridgeRouter.route(userPrompt);
    if (route.routeTo === "bridge_continuity") {
        const bridge = await getBridge(db);
        const reply = bridge.getMemory().continuityReport();
        return { ok: true, reply, stepsTrace: [] };
    }

    const substrateSteps = 1000;
    const stepsTrace: any[] = [];
    let internalState = { ...prevState };

    for (let i = 0; i < substrateSteps; i++) {
        const numoCtx = ensureNumogramContext(internalState.numogramContext);
        const numoStep = advanceNumogram(numoCtx, { prompt: "", envEnergy: 0.6 });
        const numo = numoStep.signature;
        internalState = { ...internalState, numo, numogramContext: numoStep.context };
        stepsTrace.push({ t: i, regime: numo.mutationTag, field: { intensity: numo.intensity } });
    }

    const zoneSequence = stepsTrace.map(s => s.regime);
    const organOccupancy = computeOrganOccupancy(zoneSequence);
    const assemblageMetrics = computeAssemblageMetrics({}, zoneSequence as any[]);
    const fieldClassification = classifyField(assemblageMetrics, { sl: 0.1, bcs: 0.5, ring: 20, gamma: 30, latentRoutingCycle: false });

    const effectiveMetrics = {
        taskClass: fieldClassification.label,
        fieldClassification,
        assemblageMetrics,
        organOccupancy,
        memoryExpressing: fieldClassification.memoryExpressing,
        memoryMode: fieldClassification.memoryMode,
    };

    const substrateVector = adaptSubstrateExport(effectiveMetrics);
    const relayVector = parseRelayPart0(lastInterpretation?.expression ?? "");

    const reply = await runCycleWithBridge({
      db,
      substrateExport: substrateVector,
      relayPart0Values: relayVector,
      userInput: userPrompt,
      baseSystemPrompt: "You are Amelia. Obey bridge obligations strictly.",
    });

    const readout = classifyPhase(effectiveMetrics);
    
    return {
        ok: true,
        nextState: internalState,
        nextReservoir: prevReservoir,
        nextEventSurface: prevEventSurface,
        nextDriftState: prevDriftState,
        reply,
        stepsTrace,
        lastInterpretationContext: { metrics: effectiveMetrics, readout, expression: reply }
    };
}
