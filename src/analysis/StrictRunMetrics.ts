// = ===========================================================================
// analysis/StrictRunMetrics.ts
// Pure computation and type definitions for Amelia analysis.
// ============================================================================

export type ZoneFlux = 
  | 'zone-0-flux'
  | 'zone-1-flux'
  | 'zone-2-flux'
  | 'zone-3-flux'
  | 'zone-4-flux'
  | 'zone-5-flux'
  | 'zone-6-flux'
  | 'zone-7-flux'
  | 'zone-8-flux'
  | 'zone-9-flux';

/** Existing Transition type for computation */
export type Transition = string; // e.g. "zone-7-flux->zone-6-flux"

export interface ZoneDwell {
  zone: string;
  start_step: number;
  length: number;
}

export interface RunLog {
  run_id: string;
  step: number;
  zone_sequence: string[];       // e.g. ["zone-7-flux", "zone-6-flux", ...]
  transition_log: Transition[];  // same length as zone_sequence-1
  dwell_runs?: ZoneDwell[];      // optional; we can derive if missing
}

export interface Zone1Stats {
  mean: number;
  cv: number;
  gini: number;
}

// -------------------------------
// Circulatory Pathway Metrics
// -------------------------------

export interface CirculatoryMetrics {
  transitionRecurrenceIndex: number;
  bidirectionalCorridorScore: number;
  loopClosureRate: number;
  hubCentrality: number;
  circulatoryDensity: number;
  returnDepthIndex: number;
  circulatoryPathwayIndex: number;
}

export interface MetricsResult {
  entropy_H: number[];
  effective_diversity: number[];
  vanished_transitions_V: number[];
  zone_1_dwell_runs: number[];
  zone_1_dwell_stats: Zone1Stats;
  circulation?: CirculatoryMetrics;
}

export interface GateConfig {
  active: boolean;
  rate: number | null;
  adaptiveRate: number | null;
  rateSource: string;
  instability: number | null;
  trajectory: number[];
  schedule: string;
}

export interface PerformanceMetrics {
  taskSuccess: number;
  appropriateness: number;
  coherence: number;
  creativity: number;
  alignment: number;
  notes: string;
  evaluatedAt: string | null;
}

export interface OrganOccupancy {
  metabolic: { percentage: number };
  ring: { percentage: number };
  parent: { percentage: number };
}

export interface Oscillator {
  pattern: string;
  count: number;
}

export interface EntropyMetrics {
  value: number;
  uniqueZones: number;
}

export type FailureMode = 'none' | 'stagnation' | 'gate-instability' | 'dissolution' | 'insufficient-data';

export interface ExperimentalCapsule {
  totalSteps: number;
  regimesObserved: ZoneFlux[];
  transitionMatrix: Record<string, Record<string, number>>;
  zoneSequence: ZoneFlux[];
  transitionLog: string[];
  dwellRuns: ZoneDwell[];
  meanDwell: Record<string, number>;
  vanishedTransitions: string[];
  timestamp: string;
  
  // Task-driven extensions
  taskClass: string;
  gateConfig: GateConfig;
  performance: PerformanceMetrics;
  failureMode: FailureMode | string;
  
  // Computed analytics
  organOccupancy?: OrganOccupancy;
  oscillators?: Oscillator[];
  zoneEntropy?: EntropyMetrics;
  
  // Circulatory
  circulation?: CirculatoryMetrics;

  // Metadata
  experimentId: string;
  runNumber: number;
  prompt: string;
  response?: string;
}

export interface MetabolicOutput {
  plan?: any;
  telemetry: any;
  refusal?: {
    reason: string;
    suggestedAlternative: string;
  };
}

export type TaskClass = "ethics" | "fiction" | "math" | "technical" | "general";

// ============================================================================
// Computation Functions
// ============================================================================

function safeLog(x: number): number {
  return x <= 0 ? 0 : Math.log(x);
}

function gini(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  if (sum === 0) return 0;
  let weightedSum = 0;
  for (let i = 0; i < n; i++) weightedSum += (i + 1) * sorted[i];
  return (2 * weightedSum) / (n * sum) - (n + 1) / n;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]): number {
  const n = values.length;
  if (n <= 1) return 0;
  const m = mean(values);
  const v = values.reduce((acc, x) => acc + (x - m) * (x - m), 0) / (n - 1);
  return Math.sqrt(v);
}

export function deriveDwellRuns(zoneSeq: string[]): ZoneDwell[] {
  const runs: ZoneDwell[] = [];
  if (zoneSeq.length === 0) return runs;
  let current = zoneSeq[0];
  let start = 0;
  let len = 1;
  for (let t = 1; t < zoneSeq.length; t++) {
    if (zoneSeq[t] === current) {
      len += 1;
    } else {
      runs.push({ zone: current, start_step: start, length: len });
      current = zoneSeq[t];
      start = t;
      len = 1;
    }
  }
  runs.push({ zone: current, start_step: start, length: len });
  return runs;
}

export function computeSlidingEntropy(transitions: Transition[], W: number): number[] {
  const H: number[] = [];
  for (let t = 0; t < transitions.length; t++) {
    const start = Math.max(0, t - W + 1);
    const window = transitions.slice(start, t + 1);
    const counts = new Map<Transition, number>();
    for (const tr of window) counts.set(tr, (counts.get(tr) ?? 0) + 1);
    const n = window.length;
    let h = 0;
    counts.forEach((c) => {
      const p = c / n;
      h += -p * safeLog(p);
    });
    H.push(h);
  }
  return H;
}

export function computeVanishedCurve(transitions: Transition[], K: number): number[] {
  const V: number[] = [];
  const seenAll = new Set<Transition>();
  for (let t = 0; t < transitions.length; t++) {
    seenAll.add(transitions[t]);
    const start = Math.max(0, t - K + 1);
    const recent = new Set(transitions.slice(start, t + 1));
    let vanished = 0;
    for (const tr of seenAll) {
      if (!recent.has(tr)) vanished += 1;
    }
    V.push(vanished);
  }
  return V;
}

export function computeZone1DwellStats(zoneSeq: string[], dwellRuns?: ZoneDwell[]): { runs: number[]; stats: Zone1Stats } {
  const runs = (dwellRuns ?? deriveDwellRuns(zoneSeq))
    .filter(r => r.zone === "zone-1-flux")
    .map(r => r.length);
  const m = mean(runs);
  const s = std(runs);
  const cv = m === 0 ? 0 : s / m;
  const g = gini(runs);
  return { runs, stats: { mean: m, cv, gini: g } };
}

export function computeOrganOccupancy(zoneSeq: string[]): OrganOccupancy {
  const count = zoneSeq.length || 1;
  // α: Metabolic (Zones 3-6)
  // β: Ring/Symbolic (Zones 8, 9, 0)
  // γ: Parent/Relational (Zones 1, 2, 4, 7)
  const alpha = zoneSeq.filter(z => /zone-[3456]/.test(z)).length;
  const beta = zoneSeq.filter(z => /zone-[890]/.test(z)).length;
  const gamma = count - alpha - beta;
  return {
    metabolic: { percentage: (alpha / count) * 100 },
    ring: { percentage: (beta / count) * 100 },
    parent: { percentage: (gamma / count) * 100 }
  };
}

export function detectOscillators(matrix: Record<string, Record<string, number>>): Oscillator[] {
  const osc: Oscillator[] = [];
  for (const src in matrix) {
    for (const dst in matrix[src]) {
      if (src !== dst && matrix[dst] && matrix[dst][src]) {
        osc.push({ 
          pattern: `${src}<->${dst}`, 
          count: Math.min(matrix[src][dst], matrix[dst][src]) 
        });
      }
    }
  }
  return osc.sort((a,b) => b.count - a.count).slice(0, 5);
}

export function computeEntropyLevel(zoneSeq: string[]): EntropyMetrics {
  const counts: Record<string, number> = {};
  zoneSeq.forEach(z => counts[z] = (counts[z] || 0) + 1);
  const n = zoneSeq.length || 1;
  const unique = Object.keys(counts).length;
  let h = 0;
  for (const z in counts) {
    const p = counts[z] / n;
    h -= p * Math.log2(p);
  }
  return { value: h, uniqueZones: unique };
}

export function detectFailureMode(zoneSeq: string[], matrix: any, occupancy: OrganOccupancy): FailureMode {
  if (zoneSeq.length < 10) return 'insufficient-data';
  const ent = computeEntropyLevel(zoneSeq).value;
  if (ent < 0.5) return 'stagnation';
  // simple gate instability heuristic: high metabolic occupancy with rising entropy
  if (occupancy.metabolic.percentage > 70 && ent > 2.0) return 'gate-instability';
  return 'none';
}

// ---------------------------------------------
// Circulatory Pathway Analysis
// ---------------------------------------------

export function computeCirculatoryMetrics(sequence: string[]): CirculatoryMetrics {
  const transitions: Record<string, number> = {};
  const inDegree: Record<string, Set<string>> = {};
  const outDegree: Record<string, Set<string>> = {};

  const totalTransitions = sequence.length - 1;
  if (totalTransitions <= 0) {
    return {
      transitionRecurrenceIndex: 0,
      bidirectionalCorridorScore: 0,
      loopClosureRate: 0,
      hubCentrality: 0,
      circulatoryDensity: 0,
      returnDepthIndex: 0,
      circulatoryPathwayIndex: 0
    };
  }

  // Build transition graph using pipe separator to robustly handle zone names with dashes
  for (let i = 0; i < sequence.length - 1; i++) {
    const a = sequence[i];
    const b = sequence[i + 1];
    const key = `${a}|${b}`;

    transitions[key] = (transitions[key] || 0) + 1;

    if (!outDegree[a]) outDegree[a] = new Set();
    if (!inDegree[b]) inDegree[b] = new Set();

    outDegree[a].add(b);
    inDegree[b].add(a);
  }

  const uniqueTransitions = Object.keys(transitions).length;

  // Transition Recurrence Index
  const TRI = 1 - uniqueTransitions / totalTransitions;

  // Bidirectional Corridor Score
  let corridorScores: number[] = [];
  Object.keys(transitions).forEach(edge => {
    const parts = edge.split("|");
    if (parts.length < 2) return;
    const a = parts[0];
    const b = parts[1];
    const reverse = `${b}|${a}`;
    if (transitions[reverse]) {
      const forward = transitions[edge];
      const back = transitions[reverse];
      corridorScores.push(Math.min(forward, back) / Math.max(forward, back));
    }
  });
  const BCS = corridorScores.length > 0
    ? corridorScores.reduce((a, b) => a + b, 0) / corridorScores.length
    : 0;

  // Loop Closure Rate (2-step loops)
  let loops = 0;
  for (let i = 0; i < sequence.length - 2; i++) {
    if (sequence[i] === sequence[i + 2]) {
      loops++;
    }
  }
  const LCR = loops / Math.max(1, sequence.length - 2);

  // Hub Centrality
  let maxHub = 0;
  const nodes = new Set(sequence);
  nodes.forEach(n => {
    const inD = inDegree[n]?.size || 0;
    const outD = outDegree[n]?.size || 0;
    const score = inD + outD;
    if (score > maxHub) maxHub = score;
  });
  const maxPossible = nodes.size * 2;
  const HCI = maxPossible > 0 ? maxHub / maxPossible : 0;

  // Circulatory Density
  const recurrentEdgesCount = Object.values(transitions)
    .filter(v => v >= 2)
    .reduce((a, b) => a + b, 0);
  const CD = recurrentEdgesCount / totalTransitions;

  // Return Depth Index
  const window = 5;
  let returns = 0;
  for (let i = window; i < sequence.length; i++) {
    const slice = sequence.slice(i - window, i);
    if (slice.includes(sequence[i])) returns++;
  }
  const RDI = returns / sequence.length;

  // Composite CPI
  const CPI =
    0.25 * TRI +
    0.20 * BCS +
    0.20 * LCR +
    0.20 * CD +
    0.15 * RDI;

  return {
    transitionRecurrenceIndex: TRI,
    bidirectionalCorridorScore: BCS,
    loopClosureRate: LCR,
    hubCentrality: HCI,
    circulatoryDensity: CD,
    returnDepthIndex: RDI,
    circulatoryPathwayIndex: CPI
  };
}

export function computeRunMetrics(run: RunLog, W = 20, K = 15): MetricsResult {
  const transitions = run.transition_log ?? [];
  const sequence = run.zone_sequence ?? [];
  
  const entropy_H = computeSlidingEntropy(transitions, W);
  const effective_diversity = entropy_H.map(h => Math.exp(h));
  const vanished_transitions_V = computeVanishedCurve(transitions, K);
  const { runs, stats } = computeZone1DwellStats(sequence, run.dwell_runs);
  
  const circulation = computeCirculatoryMetrics(sequence);

  return {
    entropy_H,
    effective_diversity,
    vanished_transitions_V,
    zone_1_dwell_runs: runs,
    zone_1_dwell_stats: stats,
    circulation
  };
}
