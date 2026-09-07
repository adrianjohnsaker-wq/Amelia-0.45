// src/analysis/stage6/exportStage6Capsule.ts
import { StepLog } from "./Stage6Observer";
import { 
  ZoneFlux, 
  ZoneDwell, 
  ExperimentalCapsule,
  computeOrganOccupancy,
  detectOscillators,
  computeEntropyLevel,
  detectFailureMode,
  computeCirculatoryMetrics
} from "../StrictRunMetrics";
import { computeRegimeWeights, analyzeOutputMetrics } from "@/ai/telemetry/RegimeWeights";
import { detectPragmaticMode } from "@/ai/telemetry/Phase2Controller";
import { NormativeLoadEstimator } from "@/ai/telemetry/NormativeLoadEstimator";
import { computeAssemblageMetrics, ZoneId } from "@/ai/substrate/AssemblageMetrics";
import { classifyField, SubstrateSnapshot } from "@/ai/substrate/FieldClassification";

function calculateEnhancedMetrics(
  zoneHistory: string[]
): {
  zoneSequence: ZoneFlux[];
  transitionLog: string[];
  dwellRuns: ZoneDwell[];
} {
  const zoneSequence = [...zoneHistory] as ZoneFlux[];
  const transitionLog: string[] = [];
  for (let i = 0; i < zoneHistory.length - 1; i++) {
    transitionLog.push(`${zoneHistory[i]}->${zoneHistory[i + 1]}`);
  }

  const dwellRuns: ZoneDwell[] = [];
  if (zoneHistory.length > 0) {
    let currentZone = zoneHistory[0];
    let runStart = 0;
    let runLength = 1;

    for (let i = 1; i < zoneHistory.length; i++) {
      if (zoneHistory[i] === currentZone) {
        runLength++;
      } else {
        dwellRuns.push({
          zone: currentZone as any,
          start_step: runStart,
          length: runLength
        });
        currentZone = zoneHistory[i];
        runStart = i;
        runLength = 1;
      }
    }
    dwellRuns.push({
      zone: currentZone as any,
      start_step: runStart,
      length: runLength
    });
  }

  return { zoneSequence, transitionLog, dwellRuns };
}

export function exportStage6Capsule(logs: StepLog[]): any | null {
  if (!logs.length) return null;

  const zoneHistory = logs.map(log => log.regime);

  const transitions: Record<string, Record<string, number>> = {};
  for (let i = 1; i < logs.length; i++) {
    const a = logs[i - 1].regime;
    const b = logs[i].regime;
    transitions[a] ??= {};
    transitions[a][b] = (transitions[a][b] || 0) + 1;
  }

  const dwell: Record<string, number[]> = {};
  if (logs.length > 0) {
    let current = logs[0].regime;
    let count = 1;
  
    for (let i = 1; i < logs.length; i++) {
      if (logs[i].regime === current) {
        count++;
      } else {
        dwell[current] ??= [];
        dwell[current].push(count);
        current = logs[i].regime;
        count = 1;
      }
    }
    dwell[current] ??= [];
    dwell[current].push(count);
  }

  const vanished: string[] = [];
  const allPairs = new Set<string>();
  Object.entries(transitions).forEach(([a, row]) =>
    Object.keys(row).forEach(b => allPairs.add(`${a}->${b}`))
  );

  allPairs.forEach(pair => {
    let seenLate = false;
    for (let i = Math.floor(logs.length * 0.75); i < logs.length; i++) {
      if (logs[i-1] && logs[i] && `${logs[i - 1].regime}->${logs[i].regime}` === pair) {
        seenLate = true;
        break;
      }
    }
    if (!seenLate) vanished.push(pair);
  });
  
  const meanDwell = Object.fromEntries(
    Object.entries(dwell).map(([r, xs]) => [
      r,
      xs.reduce((a, b) => a + b, 0) / xs.length,
    ])
  );

  const enhanced = calculateEnhancedMetrics(zoneHistory);
  const organOccupancy = computeOrganOccupancy(zoneHistory);

  const lastLog = logs[logs.length - 1];
  const responseText = lastLog?.output || '';
  const promptText = [...logs].reverse().find(l => l.input)?.input || '';

  const outputMetrics = analyzeOutputMetrics(responseText);

  const gateData = (lastLog as any).gateConfig ?? null;
  const gateConfig = {
    active: gateData?.active === true,
    rate: gateData?.rate ?? gateData?.currentRate ?? null,
    adaptiveRate: gateData?.adaptiveRate ?? null,
    rateSource: gateData?.rateSource ?? (gateData ? "adaptive" : "unknown"),
    instability: gateData?.instability ?? gateData?.lastInstability ?? null,
    trajectory: gateData?.trajectory ?? gateData?.rateHistory ?? [],
    schedule: gateData?.schedule ?? "constant"
  };

  const runtimeRegime = (lastLog as any).regimeWeights;
  const regimeWeights = runtimeRegime || computeRegimeWeights(
    enhanced.dwellRuns.map(d => ({ zone: d.zone, length: d.length })),
    organOccupancy,
    detectPragmaticMode(promptText),
    new NormativeLoadEstimator().estimate(promptText),
    responseText
  );

  organOccupancy.metabolic.percentage = regimeWeights.alpha * 100;
  organOccupancy.ring.percentage = regimeWeights.beta * 100;
  organOccupancy.parent.percentage = regimeWeights.gamma * 100;

  const circulation = computeCirculatoryMetrics(zoneHistory);
  const assemblageMetrics = computeAssemblageMetrics(transitions as any, zoneHistory as any[]);

  // DETECT LATENT ROUTING
  const latentRoutingCycle = !!(transitions["zone-0-flux"] && transitions["zone-0-flux"]["zone-2-flux"]);

  const substrateSnapshot: SubstrateSnapshot = {
    sl: (lastLog as any).field?.runMeanSl || 0.1, // Fallback if not recorded
    bcs: circulation.bidirectionalCorridorScore,
    ring: organOccupancy.ring.percentage,
    gamma: organOccupancy.metabolic.percentage,
    latentRoutingCycle
  };

  const fieldClassification = classifyField(assemblageMetrics, substrateSnapshot);

  const capsule: any = {
    totalSteps: logs.length,
    regimesObserved: Object.keys(dwell) as ZoneFlux[],
    transitionMatrix: transitions,
    zoneSequence: enhanced.zoneSequence,
    transitionLog: enhanced.transitionLog,
    dwellRuns: enhanced.dwellRuns,
    meanDwell: meanDwell,
    vanishedTransitions: vanished,
    timestamp: new Date().toISOString(),
    
    regimeScores: outputMetrics.scores,
    regimeWeightsSoftmax: outputMetrics.weights,
    regimeEntropy: outputMetrics.entropy, 

    regimeWeights,
    pragmaticMode: (lastLog as any).pragmaticMode || detectPragmaticMode(promptText),
    targetRegime: null,
    couplingError: 0,

    taskClass: fieldClassification.label, // Replace unclassified with field label
    gateConfig,
    
    fieldClassification,
    organOccupancy,
    oscillators: detectOscillators(transitions),
    zoneEntropy: computeEntropyLevel(zoneHistory),
    circulation,
    assemblageMetrics,
    
    experimentId: `EXPORT-${Date.now()}`,
    runNumber: 1,
    prompt: promptText,
    response: responseText,
    failureMode: detectFailureMode(zoneHistory, transitions, organOccupancy)
  };

  return capsule;
}
