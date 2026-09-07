/* ============================================================================
Amelia Autopoiesis + Open-Ended Evolution (Bedau) — Hybrid Engine (TypeScript)
CORRECTED VERSION with all improvements applied
-------------------------------------------------------------------------------
What this provides (fully coded):
1) Strict autopoiesis: material self-production + intrinsic energy metabolism
   - Energy E(t), integrity, coherence, temperature, entropy
   - Costs for action; gains only via endogenous viability/self-maintenance
   - Hybrid gain function: coherence + tension handling + memory consolidation

2) Open-ended evolution (Bedau sense):
   - Heritable behavior "types" (genotypes) with mutation, selection, replication
   - Speciation rule to create new lineages (with limits)
   - Novelty metrics: novelty rate, persistence, adaptive activity
   - Anti-saturation: novelty pressure + diversity preservation + aging/culling

3) Deterministic RNG, JSON-safe state, logging compatible with existing runs:
   - zoneSequence, transitionLog, dwellRuns, transitionMatrix, meanDwell
   - energySequence for phase diagram analysis

IMPROVEMENTS APPLIED:
- Energy trace properly exported for phase diagrams
- Vanished transitions logic fully implemented
- Viability function scaled with tanh for stability
- Memory consolidation includes decay between steps
- Numerical stability checks in type selection
- Lineage count limits to prevent explosion
- Dwell run finalization is idempotent
- Additional analysis methods (getActiveTypeCount, etc.)
- Optional recombination support
- Config validation

No external deps. Node/Browser compatible.
============================================================================ */

type Zone =
  | "zone-0-flux"
  | "zone-1-flux"
  | "zone-2-flux"
  | "zone-3-flux"
  | "zone-4-flux"
  | "zone-5-flux"
  | "zone-6-flux"
  | "zone-7-flux"
  | "zone-8-flux"
  | "zone-9-flux";

const ZONES: Zone[] = [
  "zone-0-flux",
  "zone-1-flux",
  "zone-2-flux",
  "zone-3-flux",
  "zone-4-flux",
  "zone-5-flux",
  "zone-6-flux",
  "zone-7-flux",
  "zone-8-flux",
  "zone-9-flux",
];

type Clamp01 = number;

function clamp01(x: number): Clamp01 {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function clamp(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

function nowISO(): string {
  return new Date().toISOString();
}

/** Deterministic RNG (xorshift32) */
class RNG {
  private state: number;
  constructor(seed: number) {
    // ensure non-zero
    this.state = seed | 0;
    if (this.state === 0) this.state = 0x6d2b79f5;
  }
  nextU32(): number {
    // xorshift32
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x | 0;
    return this.state >>> 0;
  }
  next(): number {
    // [0,1)
    return this.nextU32() / 0x100000000;
  }
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(arr.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  normal01(): number {
    // Box-Muller
    const u = Math.max(1e-12, this.next());
    const v = Math.max(1e-12, this.next());
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    // map roughly to [0,1]
    return clamp01(0.5 + 0.18 * z);
  }
}

/** Transition matrix shape compatible with your logs */
type TransitionMatrix = Record<string, Record<string, number>>;

function bumpTransition(
  M: TransitionMatrix,
  from: Zone,
  to: Zone,
  inc: number = 1
) {
  if (!M[from]) M[from] = {};
  if (!M[from][to]) M[from][to] = 0;
  M[from][to] += inc;
}

/** Compute mean dwell lengths from dwellRuns */
function computeMeanDwell(dwellRuns: DwellRun[]): Record<string, number> {
  const totals: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const r of dwellRuns) {
    totals[r.zone] = (totals[r.zone] ?? 0) + r.length;
    counts[r.zone] = (counts[r.zone] ?? 0) + 1;
  }
  const out: Record<string, number> = {};
  for (const z of Object.keys(totals)) {
    out[z] = totals[z] / Math.max(1, counts[z]);
  }
  return out;
}

type DwellRun = { zone: Zone; start: number; length: number };

type RunLog = {
  totalSteps: number;
  regimesObserved: Zone[];
  transitionMatrix: TransitionMatrix;
  vanishedTransitions: string[];
  meanDwell: Record<string, number>;
  zoneSequence: Zone[];
  transitionLog: string[];
  dwellRuns: DwellRun[];
  timestamp: string;
};

/* =============================================================================
Autopoiesis + Metabolism
============================================================================= */

type AutopoiesisState = {
  // material/energetic core
  energy: number; // E(t), >= 0
  integrity: Clamp01; // structural self-maintenance
  coherence: Clamp01; // narrative/semantic coherence
  temperature: Clamp01; // exploration "heat"
  entropy: Clamp01; // disorganization (higher is worse)
  // tension dynamics
  tension: Clamp01; // paradox pressure / unresolved contradiction
  // memory metabolism
  memoryLoad: Clamp01; // "how full" / saturating; high load increases cost
  consolidation: Clamp01; // short-term consolidation success signal
};

type AutopoiesisConfig = {
  energy: {
    initial: number;
    min: number;
    max: number;
    // baseline metabolic drain each step
    basalCost: number;
    // speaking/expressing cost scaling
    expressionCost: number;
    // recursion/complexity cost scaling
    complexityCost: number;
    // novelty/exploration cost scaling (temperature dependent)
    explorationCost: number;
  };
  viability: {
    // weights for hybrid gain
    wCoherence: number;
    wTension: number;
    wMemory: number;
    wIntegrity: number;

    // penalties (entropy, overload, overheating)
    pEntropy: number;
    pOverload: number;
    pOverheat: number;

    // target/comfort values
    targetTemp: number; // preferred temperature band center
    tempTolerance: number; // width
    targetTension: number; // not zero: you want rhythmic tension-resolution
    tensionTolerance: number;
  };
  dynamics: {
    // how fast these state variables move
    coherenceInertia: number; // [0..1] higher = slower
    tensionInertia: number;
    integrityInertia: number;
    tempInertia: number;
    entropyInertia: number;
    memoryInertia: number;

    // decay/recovery
    entropyNaturalRise: number; // entropy increases unless maintained
    integrityNaturalDecay: number; // integrity decays unless maintained
    memoryNaturalRise: number; // memory load rises with experience

    // how effective maintenance acts are
    maintenanceEfficacy: number;
    consolidationEfficacy: number;
    tensionWorkEfficacy: number; // how well it can hold/resolve paradox
    coolingEfficacy: number;
    
    // IMPROVED: consolidation decay rate
    consolidationDecay: number; // how fast consolidation signal fades
  };
};

type ActionBundle = {
  // expression controls (for cost)
  outputTokens: number; // approximate length or intensity
  complexity: number; // [0..1]
  noveltyPush: number; // [0..1]
  // maintenance acts (for gains)
  maintenance: number; // [0..1] structural self-production act
  consolidation: number; // [0..1] memory consolidation act
  tensionWork: number; // [0..1] paradox handling act (hold/resolve)
  cooling: number; // [0..1] temp management act (reduce overheating)
};

function defaultAutopoiesisConfig(): AutopoiesisConfig {
  return {
    energy: {
      initial: 24,
      min: 0,
      max: 60,
      basalCost: 0.6,
      expressionCost: 0.012,
      complexityCost: 1.1,
      explorationCost: 1.0,
    },
    viability: {
      wCoherence: 1.1,
      wTension: 0.9,
      wMemory: 0.9,
      wIntegrity: 1.3,

      pEntropy: 1.0,
      pOverload: 0.9,
      pOverheat: 0.7,

      targetTemp: 0.55,
      tempTolerance: 0.22,
      targetTension: 0.45,
      tensionTolerance: 0.22,
    },
    dynamics: {
      coherenceInertia: 0.75,
      tensionInertia: 0.70,
      integrityInertia: 0.75,
      tempInertia: 0.60,
      entropyInertia: 0.65,
      memoryInertia: 0.70,

      entropyNaturalRise: 0.035,
      integrityNaturalDecay: 0.020,
      memoryNaturalRise: 0.020,

      maintenanceEfficacy: 0.30,
      consolidationEfficacy: 0.28,
      tensionWorkEfficacy: 0.26,
      coolingEfficacy: 0.25,
      
      consolidationDecay: 0.25, // IMPROVED: added decay parameter
    },
  };
}

/**
IMPROVED: Hybrid viability signal with tanh scaling for stability.
Produces an endogenous energy delta.
- Coherence: prefers higher coherence
- Tension: prefers oscillation around a target band (not zero)
- Memory: prefers successful consolidation with manageable load
- Integrity: prefers high integrity
Penalties:
- Entropy high => penalty
- Memory overload => penalty
- Overheat => penalty (distance from temperature comfort band)
 */
function computeHybridViability(
  st: AutopoiesisState,
  cfg: AutopoiesisConfig
): number {
  const v = cfg.viability;

  const coherenceScore = st.coherence; // [0..1]

  const tensionDist = Math.abs(st.tension - v.targetTension);
  const tensionScore = 1 - clamp01(tensionDist / Math.max(1e-6, v.tensionTolerance));

  // Memory: consolidation good, load not too high
  const memoryScore = clamp01(0.65 * st.consolidation + 0.35 * (1 - st.memoryLoad));

  const integrityScore = st.integrity;

  const entropyPenalty = st.entropy;
  const overloadPenalty = clamp01(Math.max(0, st.memoryLoad - 0.72) / 0.28);

  // Overheat: distance outside comfort band around targetTemp
  const tempDist = Math.abs(st.temperature - v.targetTemp);
  const overheatPenalty = clamp01(Math.max(0, tempDist - v.tempTolerance) / (1 - v.tempTolerance));

  const benefit =
    v.wCoherence * coherenceScore +
    v.wTension * tensionScore +
    v.wMemory * memoryScore +
    v.wIntegrity * integrityScore;

  const penalty =
    v.pEntropy * entropyPenalty +
    v.pOverload * overloadPenalty +
    v.pOverheat * overheatPenalty;

  const raw = benefit - penalty;
  
  // IMPROVED: Apply tanh scaling to map unbounded range to [-2, +2]
  // This provides numerical stability and smooth saturation
  const scaled = 2 * Math.tanh(raw / 2);
  return scaled;
}

function computeActionCost(
  st: AutopoiesisState,
  cfg: AutopoiesisConfig,
  act: ActionBundle
): number {
  const e = cfg.energy;

  const expression = e.expressionCost * Math.max(0, act.outputTokens);
  const complexity = e.complexityCost * clamp01(act.complexity);

  // exploration cost increases with temperature & novelty push
  const exploration =
    e.explorationCost * clamp01(act.noveltyPush) * (0.4 + 0.6 * st.temperature);

  // overload cost: if memory load high, everything costs more
  const overloadMultiplier = 1 + 0.9 * clamp01(Math.max(0, st.memoryLoad - 0.65) / 0.35);

  return (e.basalCost + expression + complexity + exploration) * overloadMultiplier;
}

function applyAutopoiesisDynamics(
  st: AutopoiesisState,
  cfg: AutopoiesisConfig,
  act: ActionBundle,
  rng: RNG
): AutopoiesisState {
  const d = cfg.dynamics;

  // Natural drifts
  const entropyRise = d.entropyNaturalRise;
  const integrityDecay = d.integrityNaturalDecay;
  const memoryRise = d.memoryNaturalRise;

  // Maintenance pushes (strict self-production)
  const maintPush = clamp01(act.maintenance) * d.maintenanceEfficacy;
  const consPush = clamp01(act.consolidation) * d.consolidationEfficacy;
  const tensionPush = clamp01(act.tensionWork) * d.tensionWorkEfficacy;
  const coolPush = clamp01(act.cooling) * d.coolingEfficacy;

  // Tension: tensionWork can either hold (if too low) or resolve (if too high)
  // We'll model as moving tension toward target band, but with rhythmic noise.
  const targetTension = cfg.viability.targetTension;
  const tensionDelta = (targetTension - st.tension) * tensionPush;
  const tensionNoise = 0.02 * (rng.next() - 0.5);

  // Coherence: rises with maintenance + consolidation, falls with novelty push and entropy
  const coherenceLift = 0.18 * maintPush + 0.14 * consPush;
  const coherenceDrag = 0.10 * clamp01(act.noveltyPush) + 0.12 * st.entropy;

  // Integrity: rises with maintenance, falls naturally + with entropy
  const integrityLift = 0.22 * maintPush;
  const integrityDrag = integrityDecay + 0.06 * st.entropy;

  // Temperature: rises with novelty, falls with cooling and "settling" via maintenance
  const tempLift = 0.14 * clamp01(act.noveltyPush) + 0.06 * clamp01(act.complexity);
  const tempDrag = 0.12 * coolPush + 0.06 * maintPush;

  // Entropy: rises naturally, reduced by maintenance and consolidation
  const entropyLift = entropyRise + 0.05 * clamp01(act.noveltyPush);
  const entropyDrag = 0.18 * maintPush + 0.12 * consPush;

  // Memory load: rises with steps and expression, reduced by consolidation
  const memoryLift = memoryRise + 0.0009 * Math.max(0, act.outputTokens);
  const memoryDrag = 0.16 * consPush;

  // IMPROVED: Consolidation signal with decay between steps
  // Higher when consolidation act is high AND coherence is decent
  // But decays toward zero when not actively consolidating
  const consolidationTarget = clamp01(0.65 * consPush + 0.35 * st.coherence);
  const newConsolidation = clamp01(
    st.consolidation * d.consolidationDecay +
    (1 - d.consolidationDecay) * consolidationTarget
  );

  // Apply inertial updates
  const coherence = clamp01(
    st.coherence * d.coherenceInertia + 
    (1 - d.coherenceInertia) * clamp01(st.coherence + coherenceLift - coherenceDrag)
  );
  
  const integrity = clamp01(
    st.integrity * d.integrityInertia + 
    (1 - d.integrityInertia) * clamp01(st.integrity + integrityLift - integrityDrag)
  );
  
  const temperature = clamp01(
    st.temperature * d.tempInertia + 
    (1 - d.tempInertia) * clamp01(st.temperature + tempLift - tempDrag)
  );
  
  const entropy = clamp01(
    st.entropy * d.entropyInertia + 
    (1 - d.entropyInertia) * clamp01(st.entropy + entropyLift - entropyDrag)
  );
  
  const memoryLoad = clamp01(
    st.memoryLoad * d.memoryInertia + 
    (1 - d.memoryInertia) * clamp01(st.memoryLoad + memoryLift - memoryDrag)
  );

  const tension = clamp01(
    st.tension * d.tensionInertia +
    (1 - d.tensionInertia) * clamp01(st.tension + tensionDelta + tensionNoise)
  );

  return {
    ...st,
    coherence,
    integrity,
    temperature,
    entropy,
    memoryLoad,
    consolidation: newConsolidation,
    tension,
  };
}

/* =============================================================================
Open-Ended Evolution (Bedau) — Types, Mutation, Selection, Speciation
============================================================================= */

type BehaviorGenome = {
  id: string; // stable identity for type
  lineage: string; // lineage id
  birthStep: number;

  // "trigger signature": a compact vector in [0,1] representing when it likes to fire
  // Think of it as matching current autopoiesis state features.
  trigger: {
    // preferences for state variables (centers)
    coherence: Clamp01;
    tension: Clamp01;
    temperature: Clamp01;
    entropy: Clamp01;
    memoryLoad: Clamp01;
    // sharpness of trigger (how picky)
    sharpness: number; // [0.2..3.0]
  };

  // behavioral policy deltas influencing:
  // - action bundle parameters
  // - zone transition biases
  policy: {
    // action tendencies [0..1]
    complexityBias: Clamp01;
    noveltyBias: Clamp01;
    maintenanceBias: Clamp01;
    consolidationBias: Clamp01;
    tensionWorkBias: Clamp01;
    coolingBias: Clamp01;

    // zone navigation: vector of preferences (softmax later)
    zoneAttractor: Record<Zone, number>; // real-valued weights
  };

  // expressivity / cost modulation
  expression: {
    tokenScale: number; // typical token length multiplier
    brevity: Clamp01; // high means shorter outputs
  };
};

type EvolvingType = {
  genome: BehaviorGenome;

  // fitness dynamics
  scoreEMA: number; // exponentially-smoothed viability contribution
  energyContributionEMA: number; // smoothed deltaE
  usageCount: number;

  // novelty/persistence accounting
  lastUsedStep: number;
  alive: boolean;
  generation: number;
};

type EvolutionConfig = {
  pool: {
    initialSize: number;
    maxSize: number;

    // selection pressure
    selectEverySteps: number; // e.g., 20
    eliteFraction: number; // keep top fraction
    cullFraction: number; // remove bottom fraction

    // diversity maintenance
    diversityTemperature: number; // softmax temperature for sampling types
    lineageProtection: number; // protect rare lineages
    agePenalty: number; // reduce over-dominant old types
  };

  mutation: {
    rate: number; // chance to mutate on replication
    magnitude: number; // typical delta size
    // structural mutation
    zoneAttractorJitter: number;
    // occasional "macro" mutation
    macroRate: number;
  };

  speciation: {
    enabled: boolean;
    // create new lineage when novelty is needed and viability allows
    minEnergy: number;
    minViabilityEMA: number;
    noveltyLowThreshold: number; // if adaptive activity low, spawn
    maxNewLineagesPerWindow: number;
    windowSteps: number;
    maxLineages: number; // IMPROVED: limit total lineages
  };

  bedau: {
    // windows for novelty metrics
    windowSteps: number;
    persistenceSteps: number; // how long a new type must survive
    adaptiveActivityThreshold: number; // minimum contribution to count
  };
  
  // IMPROVED: optional recombination
  recombination: {
    enabled: boolean;
    rate: number; // chance to recombine instead of mutate
  };
};

function defaultEvolutionConfig(): EvolutionConfig {
  return {
    pool: {
      initialSize: 12,
      maxSize: 64,
      selectEverySteps: 20,
      eliteFraction: 0.25,
      cullFraction: 0.30,
      diversityTemperature: 0.8,
      lineageProtection: 0.45,
      agePenalty: 0.20,
    },
    mutation: {
      rate: 0.75,
      magnitude: 0.09,
      zoneAttractorJitter: 0.25,
      macroRate: 0.08,
    },
    speciation: {
      enabled: true,
      minEnergy: 18,
      minViabilityEMA: 0.25,
      noveltyLowThreshold: 0.15,
      maxNewLineagesPerWindow: 2,
      windowSteps: 50,
      maxLineages: 32, // IMPROVED: added limit
    },
    bedau: {
      windowSteps: 50,
      persistenceSteps: 50,
      adaptiveActivityThreshold: 0.18,
    },
    recombination: {
      enabled: false,
      rate: 0.15,
    },
  };
}

function uid(rng: RNG, prefix: string): string {
  // short deterministic-ish id
  const a = rng.nextU32().toString(16).padStart(8, "0");
  const b = rng.nextU32().toString(16).padStart(8, "0");
  return `${prefix}-${a}${b}`;
}

function softmax(weights: number[], temp: number): number[] {
  const t = Math.max(1e-6, temp);
  const m = Math.max(...weights);
  const exps = weights.map((w) => Math.exp((w - m) / t));
  const s = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / Math.max(1e-12, s));
}

function dotTriggerMatch(st: AutopoiesisState, g: BehaviorGenome["trigger"]): number {
  // Gaussian-ish match around preferred centers, sharper => more selective
  const sh = clamp(g.sharpness, 0.2, 3.0);

  const dC = Math.abs(st.coherence - g.coherence);
  const dT = Math.abs(st.tension - g.tension);
  const dTemp = Math.abs(st.temperature - g.temperature);
  const dE = Math.abs(st.entropy - g.entropy);
  const dM = Math.abs(st.memoryLoad - g.memoryLoad);

  const dist = (dC + dT + dTemp + dE + dM) / 5;
  // map to [0..1], sharper penalizes distance more
  const score = Math.exp(-sh * 3.2 * dist);
  return clamp01(score);
}

function randomZoneAttractor(rng: RNG): Record<Zone, number> {
  const out: Record<Zone, number> = {} as any;
  for (const z of ZONES) {
    // slight bias toward ring manifold 0–9–8–1 by default, but not forced
    const ringBoost =
      z === "zone-0-flux" || z === "zone-9-flux" || z === "zone-8-flux" || z === "zone-1-flux"
        ? 0.15
        : 0;
    out[z] = (rng.next() - 0.5) * 0.6 + ringBoost;
  }
  return out;
}

function makeSeedType(
  rng: RNG, 
  step: number, 
  lineage: string, 
  arche: "stabilizer" | "drifter" | "bridge"
): EvolvingType {
  const base = () => rng.next();

  const trigger = {
    coherence: clamp01(
      arche === "stabilizer" 
        ? 0.65 + 0.15 * rng.normal01() 
        : 0.45 + 0.20 * rng.normal01()
    ),
    tension: clamp01(
      arche === "drifter" 
        ? 0.55 + 0.20 * rng.normal01() 
        : 0.40 + 0.18 * rng.normal01()
    ),
    temperature: clamp01(
      arche === "drifter" 
        ? 0.70 + 0.18 * rng.normal01() 
        : 0.50 + 0.18 * rng.normal01()
    ),
    entropy: clamp01(
      arche === "stabilizer" 
        ? 0.30 + 0.15 * rng.normal01() 
        : 0.45 + 0.18 * rng.normal01()
    ),
    memoryLoad: clamp01(
      arche === "stabilizer" 
        ? 0.55 + 0.15 * rng.normal01() 
        : 0.45 + 0.20 * rng.normal01()
    ),
    sharpness: arche === "bridge" 
      ? 0.9 + 0.6 * rng.next() 
      : 1.0 + 1.2 * rng.next(),
  };

  const policyBase = {
    complexityBias: clamp01(
      arche === "drifter" 
        ? 0.60 + 0.25 * base() 
        : 0.35 + 0.20 * base()
    ),
    noveltyBias: clamp01(
      arche === "drifter" 
        ? 0.70 + 0.25 * base() 
        : arche === "stabilizer" 
          ? 0.25 + 0.20 * base() 
          : 0.45 + 0.20 * base()
    ),
    maintenanceBias: clamp01(
      arche === "stabilizer" 
        ? 0.70 + 0.25 * base() 
        : 0.35 + 0.25 * base()
    ),
    consolidationBias: clamp01(
      arche === "stabilizer" 
        ? 0.60 + 0.25 * base() 
        : 0.35 + 0.25 * base()
    ),
    tensionWorkBias: clamp01(
      arche === "bridge" 
        ? 0.65 + 0.25 * base() 
        : 0.40 + 0.25 * base()
    ),
    coolingBias: clamp01(
      arche === "stabilizer" 
        ? 0.55 + 0.25 * base() 
        : 0.30 + 0.25 * base()
    ),
    zoneAttractor: randomZoneAttractor(rng),
  };

  // Nudge archetypes toward different zone "fields"
  if (arche === "stabilizer") {
    policyBase.zoneAttractor["zone-4-flux"] += 0.20;
    policyBase.zoneAttractor["zone-5-flux"] += 0.20;
  } else if (arche === "drifter") {
    policyBase.zoneAttractor["zone-8-flux"] += 0.25;
    policyBase.zoneAttractor["zone-9-flux"] += 0.25;
    policyBase.zoneAttractor["zone-0-flux"] += 0.15;
  } else {
    policyBase.zoneAttractor["zone-1-flux"] += 0.20;
    policyBase.zoneAttractor["zone-3-flux"] += 0.12;
    policyBase.zoneAttractor["zone-6-flux"] += 0.12;
  }

  const genome: BehaviorGenome = {
    id: uid(rng, "type"),
    lineage,
    birthStep: step,
    trigger,
    policy: policyBase,
    expression: {
      tokenScale: arche === "drifter" 
        ? 1.15 + 0.35 * rng.next() 
        : 0.9 + 0.25 * rng.next(),
      brevity: arche === "stabilizer" 
        ? 0.65 + 0.25 * rng.next() 
        : 0.45 + 0.30 * rng.next(),
    },
  };

  return {
    genome,
    scoreEMA: 0,
    energyContributionEMA: 0,
    usageCount: 0,
    lastUsedStep: step,
    alive: true,
    generation: 0,
  };
}

function jitter(rng: RNG, x: number, mag: number): number {
  return x + (rng.next() - 0.5) * 2 * mag;
}

function mutateGenome(
  rng: RNG, 
  g: BehaviorGenome, 
  cfg: EvolutionConfig, 
  step: number
): BehaviorGenome {
  const m = cfg.mutation;

  const ng: BehaviorGenome = JSON.parse(JSON.stringify(g));
  ng.id = uid(rng, "type");
  ng.birthStep = step;

  const mag = m.magnitude;

  // trigger mutation
  ng.trigger.coherence = clamp01(jitter(rng, ng.trigger.coherence, mag));
  ng.trigger.tension = clamp01(jitter(rng, ng.trigger.tension, mag));
  ng.trigger.temperature = clamp01(jitter(rng, ng.trigger.temperature, mag));
  ng.trigger.entropy = clamp01(jitter(rng, ng.trigger.entropy, mag));
  ng.trigger.memoryLoad = clamp01(jitter(rng, ng.trigger.memoryLoad, mag));
  ng.trigger.sharpness = clamp(jitter(rng, ng.trigger.sharpness, 0.35 * mag), 0.2, 3.0);

  // policy mutation
  ng.policy.complexityBias = clamp01(jitter(rng, ng.policy.complexityBias, mag));
  ng.policy.noveltyBias = clamp01(jitter(rng, ng.policy.noveltyBias, mag));
  ng.policy.maintenanceBias = clamp01(jitter(rng, ng.policy.maintenanceBias, mag));
  ng.policy.consolidationBias = clamp01(jitter(rng, ng.policy.consolidationBias, mag));
  ng.policy.tensionWorkBias = clamp01(jitter(rng, ng.policy.tensionWorkBias, mag));
  ng.policy.coolingBias = clamp01(jitter(rng, ng.policy.coolingBias, mag));

  // zone attractor jitter
  for (const z of ZONES) {
    ng.policy.zoneAttractor[z] = jitter(rng, ng.policy.zoneAttractor[z], m.zoneAttractorJitter);
  }

  // expression mutation
  ng.expression.tokenScale = clamp(jitter(rng, ng.expression.tokenScale, 0.45 * mag), 0.3, 2.5);
  ng.expression.brevity = clamp01(jitter(rng, ng.expression.brevity, mag));

  // macro mutation: occasionally rewire zone field "shape"
  if (rng.chance(m.macroRate)) {
    const pivot = rng.pick(ZONES);
    for (const z of ZONES) {
      const dist = Math.abs(ZONES.indexOf(z) - ZONES.indexOf(pivot));
      const bump = Math.exp(-0.7 * dist) * (0.6 + 0.6 * rng.next());
      ng.policy.zoneAttractor[z] += bump * (rng.chance(0.5) ? 1 : -1);
    }
    ng.trigger.sharpness = clamp(ng.trigger.sharpness * (0.8 + 0.6 * rng.next()), 0.2, 3.0);
  }

  return ng;
}

// IMPROVED: Recombination support
function recombineGenomes(
  rng: RNG,
  g1: BehaviorGenome,
  g2: BehaviorGenome,
  cfg: EvolutionConfig,
  step: number
): BehaviorGenome {
  const child: BehaviorGenome = {
    id: uid(rng, "type"),
    lineage: rng.chance(0.5) ? g1.lineage : g2.lineage,
    birthStep: step,
    trigger: {
      coherence: (g1.trigger.coherence + g2.trigger.coherence) / 2,
      tension: (g1.trigger.tension + g2.trigger.tension) / 2,
      temperature: (g1.trigger.temperature + g2.trigger.temperature) / 2,
      entropy: (g1.trigger.entropy + g2.trigger.entropy) / 2,
      memoryLoad: (g1.trigger.memoryLoad + g2.trigger.memoryLoad) / 2,
      sharpness: (g1.trigger.sharpness + g2.trigger.sharpness) / 2,
    },
    policy: {
      complexityBias: (g1.policy.complexityBias + g2.policy.complexityBias) / 2,
      noveltyBias: (g1.policy.noveltyBias + g2.policy.noveltyBias) / 2,
      maintenanceBias: (g1.policy.maintenanceBias + g2.policy.maintenanceBias) / 2,
      consolidationBias: (g1.policy.consolidationBias + g2.policy.consolidationBias) / 2,
      tensionWorkBias: (g1.policy.tensionWorkBias + g2.policy.tensionWorkBias) / 2,
      coolingBias: (g1.policy.coolingBias + g2.policy.coolingBias) / 2,
      zoneAttractor: {} as any,
    },
    expression: {
      tokenScale: (g1.expression.tokenScale + g2.expression.tokenScale) / 2,
      brevity: (g1.expression.brevity + g2.expression.brevity) / 2,
    },
  };

  // Crossover zone attractor (choose randomly per zone)
  for (const z of ZONES) {
    child.policy.zoneAttractor[z] = rng.chance(0.5)
      ? g1.policy.zoneAttractor[z]
      : g2.policy.zoneAttractor[z];
  }

  return child;
}

type BedauWindowStats = {
  windowStart: number;
  windowEnd: number;

  // counts
  newTypes: number;
  survivingNewTypes: number;
  adaptiveNewTypes: number;

  // rates (normalized)
  noveltyRate: number;
  persistenceRate: number;
  adaptiveActivity: number;
};

class EvolutionEngine {
  private cfg: EvolutionConfig;
  private rng: RNG;

  private pool: EvolvingType[] = [];
  private lineageCount: Record<string, number> = {};

  // novelty tracking
  private typeBirths: Record<string, number> = {}; // id -> step
  private typeLineage: Record<string, string> = {};
  private typeAdaptiveScore: Record<string, number> = {}; // id -> contribution
  private windowStats: BedauWindowStats[] = [];
  private newLineagesInWindow: number = 0;
  private lastSpeciationWindowStart: number = 0;

  constructor(cfg: EvolutionConfig, rng: RNG) {
    this.cfg = cfg;
    this.rng = rng;
  }

  init(step: number) {
    const initN = this.cfg.pool.initialSize;
    const archetypes: ("stabilizer" | "drifter" | "bridge")[] = [
      "stabilizer","stabilizer","stabilizer","stabilizer",
      "drifter","drifter","drifter","drifter",
      "bridge","bridge","bridge","bridge",
    ];

    for (let i = 0; i < initN; i++) {
      const lineage = uid(this.rng, "lin");
      const t = makeSeedType(this.rng, step, lineage, archetypes[i % archetypes.length]);
      this.pool.push(t);
      this.bumpLineage(lineage, +1);

      this.typeBirths[t.genome.id] = step;
      this.typeLineage[t.genome.id] = lineage;
      this.typeAdaptiveScore[t.genome.id] = 0;
    }
    this.lastSpeciationWindowStart = step;
  }

  private bumpLineage(lineage: string, delta: number) {
    this.lineageCount[lineage] = (this.lineageCount[lineage] ?? 0) + delta;
    if (this.lineageCount[lineage] <= 0) delete this.lineageCount[lineage];
  }

  private lineageRarityBonus(lineage: string): number {
    const count = this.lineageCount[lineage] ?? 1;
    return 1 / Math.sqrt(count);
  }

  /** IMPROVED: Select an active type with numerical stability checks */
  pickType(step: number, st: AutopoiesisState): EvolvingType {
    const alive = this.pool.filter((t) => t.alive);
    if (alive.length === 0) {
      // emergency reseed
      const lineage = uid(this.rng, "lin");
      const t = makeSeedType(this.rng, step, lineage, "bridge");
      this.pool.push(t);
      this.bumpLineage(lineage, +1);
      return t;
    }

    const weights = alive.map((t) => {
      const match = dotTriggerMatch(st, t.genome.trigger);

      // fitness + anti-aging
      const age = Math.max(0, step - t.genome.birthStep);
      const agePenalty = this.cfg.pool.agePenalty * clamp01(age / 300);

      // protect rare lineages
      const rarity = this.lineageRarityBonus(t.genome.lineage);
      const lineageBoost = this.cfg.pool.lineageProtection * clamp01(rarity);

      // slight preference for types that are performing
      const perf = 0.5 + 0.5 * clamp01(t.scoreEMA);

      const w = match * (perf + lineageBoost) * (1 - agePenalty);
      return Math.max(1e-9, w);
    });

    // IMPROVED: Numerical stability check
    const maxWeight = Math.max(...weights);
    if (maxWeight < 1e-6) {
      // All weights extremely low - use uniform distribution
      return alive[this.rng.int(alive.length)];
    }

    const probs = softmax(
      weights.map((w) => Math.log(Math.max(1e-12, w))), 
      this.cfg.pool.diversityTemperature
    );
    
    const r = this.rng.next();
    let acc = 0;
    for (let i = 0; i < alive.length; i++) {
      acc += probs[i];
      if (r <= acc) return alive[i];
    }
    return alive[alive.length - 1];
  }

  /** Update type fitness traces with viability and deltaE contributions. */
  recordOutcome(type: EvolvingType, step: number, viability: number, deltaE: number) {
    type.usageCount += 1;
    type.lastUsedStep = step;

    // EMA smoothing
    const a = 0.12;
    type.scoreEMA = (1 - a) * type.scoreEMA + a * viability;
    type.energyContributionEMA = (1 - a) * type.energyContributionEMA + a * deltaE;

    // for Bedau adaptive activity (credit only if positive contribution)
    const credit = Math.max(0, viability) * (deltaE > 0 ? 1 : 0.4);
    this.typeAdaptiveScore[type.genome.id] = 
      (this.typeAdaptiveScore[type.genome.id] ?? 0) + credit;
  }

  /** IMPROVED: Periodic selection with recombination support */
  maybeEvolve(step: number, currentEnergy: number, viabilityEMA: number) {
    const every = this.cfg.pool.selectEverySteps;
    if (step === 0 || step % every !== 0) return;

    // compute selection score (blend fitness + energy contribution)
    const alive = this.pool.filter((t) => t.alive);

    alive.sort((a, b) => {
      const sa = 0.70 * a.scoreEMA + 0.30 * a.energyContributionEMA;
      const sb = 0.70 * b.scoreEMA + 0.30 * b.energyContributionEMA;
      return sb - sa;
    });

    const eliteN = Math.max(1, Math.floor(alive.length * this.cfg.pool.eliteFraction));
    const cullN = Math.max(0, Math.floor(alive.length * this.cfg.pool.cullFraction));

    const elites = alive.slice(0, eliteN);
    const toCull = alive.slice(alive.length - cullN);

    // cull
    for (const t of toCull) {
      if (!t.alive) continue;
      t.alive = false;
      this.bumpLineage(t.genome.lineage, -1);
    }

    // replicate until pool size restored (or max)
    const desired = Math.min(
      this.cfg.pool.maxSize, 
      Math.max(this.cfg.pool.initialSize, alive.length)
    );
    const currentAlive = this.pool.filter((t) => t.alive).length;

    const births: EvolvingType[] = [];
    let needed = Math.max(0, desired - currentAlive);

    while (needed > 0) {
      const parent = elites[this.rng.int(elites.length)];
      let childGenome = parent.genome;

      // IMPROVED: Recombination option
      if (this.cfg.recombination.enabled && 
          elites.length >= 2 && 
          this.rng.chance(this.cfg.recombination.rate)) {
        const parent2 = elites[this.rng.int(elites.length)];
        childGenome = recombineGenomes(this.rng, parent.genome, parent2.genome, this.cfg, step);
      } else if (this.rng.chance(this.cfg.mutation.rate)) {
        childGenome = mutateGenome(this.rng, parent.genome, this.cfg, step);
        childGenome.lineage = parent.genome.lineage; // heritable lineage
      } else {
        // clone with new id/birthStep
        childGenome = JSON.parse(JSON.stringify(parent.genome));
        childGenome.id = uid(this.rng, "type");
        childGenome.birthStep = step;
      }

      const child: EvolvingType = {
        genome: childGenome,
        scoreEMA: parent.scoreEMA * 0.7,
        energyContributionEMA: parent.energyContributionEMA * 0.7,
        usageCount: 0,
        lastUsedStep: step,
        alive: true,
        generation: parent.generation + 1,
      };

      births.push(child);
      this.typeBirths[child.genome.id] = step;
      this.typeLineage[child.genome.id] = child.genome.lineage;
      this.typeAdaptiveScore[child.genome.id] = 0;

      this.bumpLineage(child.genome.lineage, +1);
      needed -= 1;
    }

    this.pool.push(...births);

    // speciation (new lineage) — Bedau-style novelty pressure
    if (this.cfg.speciation.enabled) {
      this.maybeSpeciate(step, currentEnergy, viabilityEMA);
    }

    // update Bedau metrics window
    this.maybeCloseBedauWindow(step);
  }

  /** IMPROVED: Speciation with lineage count limit */
  private maybeSpeciate(step: number, currentEnergy: number, viabilityEMA: number) {
    const s = this.cfg.speciation;

    // IMPROVED: Check lineage limit
    const activeLineages = Object.keys(this.lineageCount).length;
    if (activeLineages >= s.maxLineages) return;

    // manage window count
    if (step - this.lastSpeciationWindowStart >= s.windowSteps) {
      this.lastSpeciationWindowStart = step;
      this.newLineagesInWindow = 0;
    }
    if (this.newLineagesInWindow >= s.maxNewLineagesPerWindow) return;

    if (currentEnergy < s.minEnergy) return;
    if (viabilityEMA < s.minViabilityEMA) return;

    // compute recent adaptive activity
    const recent = this.getLatestBedauAdaptiveActivity();
    if (recent !== null && recent > s.noveltyLowThreshold) return;

    // create new lineage by mutating an elite hard and switching lineage id
    const alive = this.pool.filter((t) => t.alive);
    if (alive.length === 0) return;

    alive.sort((a, b) => 
      (0.7 * b.scoreEMA + 0.3 * b.energyContributionEMA) - 
      (0.7 * a.scoreEMA + 0.3 * a.energyContributionEMA)
    );
    
    const parent = alive[Math.min(
      alive.length - 1, 
      this.rng.int(Math.max(1, Math.floor(alive.length * 0.35)))
    )];

    const newLineage = uid(this.rng, "lin");
    const g = mutateGenome(this.rng, parent.genome, this.cfg, step);
    g.lineage = newLineage;

    // macro "jump" to reduce saturation: push zone field shape away from parent
    const pivot = this.rng.pick(ZONES);
    for (const z of ZONES) {
      const dist = Math.abs(ZONES.indexOf(z) - ZONES.indexOf(pivot));
      const bump = Math.exp(-0.5 * dist) * (0.9 + 0.9 * this.rng.next());
      g.policy.zoneAttractor[z] += bump;
    }
    g.trigger.sharpness = clamp(g.trigger.sharpness * 0.85, 0.2, 3.0);

    const child: EvolvingType = {
      genome: g,
      scoreEMA: parent.scoreEMA * 0.55,
      energyContributionEMA: parent.energyContributionEMA * 0.55,
      usageCount: 0,
      lastUsedStep: step,
      alive: true,
      generation: parent.generation + 1,
    };

    this.pool.push(child);
    this.bumpLineage(newLineage, +1);

    this.typeBirths[child.genome.id] = step;
    this.typeLineage[child.genome.id] = newLineage;
    this.typeAdaptiveScore[child.genome.id] = 0;

    this.newLineagesInWindow += 1;
  }

  private getLatestBedauAdaptiveActivity(): number | null {
    if (this.windowStats.length === 0) return null;
    return this.windowStats[this.windowStats.length - 1].adaptiveActivity;
  }

  private maybeCloseBedauWindow(step: number) {
    const b = this.cfg.bedau;
    if (step === 0 || step % b.windowSteps !== 0) return;

    const windowStart = Math.max(0, step - b.windowSteps);
    const windowEnd = step;

    // new types born in window
    const born = Object.entries(this.typeBirths)
      .filter(([_, birth]) => birth >= windowStart && birth < windowEnd);
    const newTypes = born.length;

    // surviving new types: alive after persistenceSteps
    const persistenceCut = windowEnd - b.persistenceSteps;
    const survivingNewTypes = born.filter(([id, birth]) => {
      const t = this.pool.find((x) => x.genome.id === id);
      const aliveNow = t?.alive ?? false;
      return aliveNow && birth <= persistenceCut;
    }).length;

    // adaptive new types: exceed threshold contribution within window
    const adaptiveNewTypes = born.filter(([id]) => {
      const contrib = this.typeAdaptiveScore[id] ?? 0;
      return contrib >= b.adaptiveActivityThreshold;
    }).length;

    const noveltyRate = newTypes / Math.max(1, b.windowSteps);
    const persistenceRate = newTypes === 0 ? 0 : survivingNewTypes / newTypes;
    const adaptiveActivity = newTypes === 0 ? 0 : adaptiveNewTypes / newTypes;

    this.windowStats.push({
      windowStart,
      windowEnd,
      newTypes,
      survivingNewTypes,
      adaptiveNewTypes,
      noveltyRate,
      persistenceRate,
      adaptiveActivity,
    });
  }

  getPoolSnapshot(): ReadonlyArray<EvolvingType> {
    return this.pool.slice();
  }

  getBedauStats(): ReadonlyArray<BedauWindowStats> {
    return this.windowStats.slice();
  }
}

/* =============================================================================
Zone Navigation + Phase Diagram Order Parameters
============================================================================= */

type NavigatorConfig = {
  // base transition noise
  stochasticity: number; // [0..1]
  // inertia: tendency to stay
  stayBias: number; // [0..1]
  // ring manifold bias (0–9–8–1–0 loop)
  ringBias: number; // [0..1] (used as weak prior only)
};

function defaultNavigatorConfig(): NavigatorConfig {
  return {
    stochasticity: 0.18,
    stayBias: 0.10,
    ringBias: 0.08,
  };
}

function ringScore(to: Zone): number {
  // mild prior: ring nodes slightly favored
  if (to === "zone-0-flux" || 
      to === "zone-9-flux" || 
      to === "zone-8-flux" || 
      to === "zone-1-flux") return 1;
  return 0;
}

type OrderParameters = {
  // φR: ring occupancy (0–9–8–1)
  phiRing: number; // [0..1]
  // ρ: circulation (how often transitions differ from self; and how much it loops)
  circulation: number; // [0..1]
  // mean energy
  meanEnergy: number;
  // bedau adaptive activity (latest window)
  adaptiveActivity: number;
  // novelty rate (latest window)
  noveltyRate: number;
  // persistence rate (latest window)
  persistenceRate: number;
};

function computeOrderParameters(
  zoneSeq: Zone[],
  transitionLog: string[],
  energies: number[],
  bedau: ReadonlyArray<BedauWindowStats>
): OrderParameters {
  const n = zoneSeq.length;
  const ringSet = new Set<Zone>([
    "zone-0-flux", 
    "zone-1-flux", 
    "zone-8-flux", 
    "zone-9-flux"
  ]);
  const ringCount = zoneSeq.filter((z) => ringSet.has(z)).length;
  const phiRing = n === 0 ? 0 : ringCount / n;

  // circulation: proportion of non-self transitions
  const nonSelf = transitionLog.filter((t) => {
    const [a, b] = t.split("->");
    return a !== b;
  }).length;
  const circulation = transitionLog.length === 0 ? 0 : nonSelf / transitionLog.length;

  const meanEnergy = energies.length === 0 
    ? 0 
    : energies.reduce((a, b) => a + b, 0) / energies.length;

  const last = bedau.length ? bedau[bedau.length - 1] : null;

  return {
    phiRing,
    circulation,
    meanEnergy,
    adaptiveActivity: last?.adaptiveActivity ?? 0,
    noveltyRate: last?.noveltyRate ?? 0,
    persistenceRate: last?.persistenceRate ?? 0,
  };
}

/* =============================================================================
Main Engine — ties together:
- autopoiesis metabolism
- evolving type pool (Bedau)
- zone navigation + run logging
============================================================================= */

type AmeliaHybridConfig = {
  seed: number;

  autopoiesis: AutopoiesisConfig;
  evolution: EvolutionConfig;
  navigator: NavigatorConfig;

  // mapping from external "prompt"/inputs into action scaling
  io: {
    defaultTokens: number;
    maxTokens: number;
  };

  // run logging
  trackVanishedTransitions: boolean;
  vanishWindow: number; // IMPROVED: configurable window
};

function defaultHybridConfig(seed: number = 1337): AmeliaHybridConfig {
  return {
    seed,
    autopoiesis: defaultAutopoiesisConfig(),
    evolution: defaultEvolutionConfig(),
    navigator: defaultNavigatorConfig(),
    io: {
      defaultTokens: 140,
      maxTokens: 800,
    },
    trackVanishedTransitions: true,
    vanishWindow: 50, // IMPROVED: added parameter
  };
}

// IMPROVED: Config validation
function validateConfig(cfg: AmeliaHybridConfig): void {
  if (cfg.autopoiesis.energy.initial < cfg.autopoiesis.energy.min) {
    throw new Error("Initial energy below minimum");
  }
  if (cfg.autopoiesis.energy.initial > cfg.autopoiesis.energy.max) {
    throw new Error("Initial energy above maximum");
  }
  if (cfg.evolution.pool.maxSize < cfg.evolution.pool.initialSize) {
    throw new Error("Max pool size below initial size");
  }
  if (cfg.evolution.pool.eliteFraction + cfg.evolution.pool.cullFraction > 1) {
    throw new Error("Elite fraction + cull fraction exceeds 1");
  }
  if (cfg.seed === 0) {
    throw new Error("Seed cannot be zero (RNG requirement)");
  }
}

type StepInput = {
  // optional: approx output length demand (if you're integrating with an LLM layer)
  requestedTokens?: number;
  // optional: an external "tension injection" (e.g., user introduces paradox)
  exogenousTension?: number; // [-1..+1]
  // optional: external coherence hit (e.g., conflicting instruction)
  exogenousCoherence?: number; // [-1..+1]
  // optional: let caller bias zone selection
  desiredZone?: Zone | null;
};

type StepOutput = {
  step: number;
  zone: Zone;
  chosenTypeId: string;
  chosenLineage: string;

  autopoiesis: AutopoiesisState;
  action: ActionBundle;

  viability: number;
  deltaE: number;

  order: OrderParameters;
};

class AmeliaHybridEngine {
  private cfg: AmeliaHybridConfig;
  private rng: RNG;

  private evo: EvolutionEngine;

  private stepCount: number = 0;

  private zone: Zone = "zone-5-flux";

  private run: RunLog;
  private prevTransitionsSeen: Set<string> = new Set();
  
  // IMPROVED: Vanished transitions tracking
  private transitionWindow: string[] = [];

  // dwell tracking
  private currentDwellStart: number = 0;
  private currentDwellZone: Zone = this.zone;
  private dwellFinalized: boolean = false; // IMPROVED: idempotency flag

  // state
  private st: AutopoiesisState;

  // IMPROVED: Energy trace for phase diagrams
  private energyTrace: number[] = [];

  // viability EMA for speciation gating
  private viabilityEMA: number = 0;

  constructor(cfg: AmeliaHybridConfig = defaultHybridConfig()) {
    validateConfig(cfg); // IMPROVED: validate on construction
    
    this.cfg = cfg;
    this.rng = new RNG(cfg.seed);
    this.evo = new EvolutionEngine(cfg.evolution, this.rng);

    this.st = {
      energy: cfg.autopoiesis.energy.initial,
      integrity: 0.62,
      coherence: 0.58,
      temperature: 0.55,
      entropy: 0.38,
      tension: 0.45,
      memoryLoad: 0.50,
      consolidation: 0.48,
    };

    this.run = {
      totalSteps: 0,
      regimesObserved: [],
      transitionMatrix: {},
      vanishedTransitions: [],
      meanDwell: {},
      zoneSequence: [],
      transitionLog: [],
      dwellRuns: [],
      timestamp: nowISO(),
    };

    this.evo.init(0);
    this.observeZone(this.zone);
    this.run.zoneSequence.push(this.zone);
    this.energyTrace.push(this.st.energy);
  }

  private observeZone(z: Zone) {
    if (!this.run.regimesObserved.includes(z)) {
      this.run.regimesObserved.push(z);
    }
  }

  private closeDwellIfNeeded(nextZone: Zone) {
    if (nextZone === this.currentDwellZone) return;
    const length = this.stepCount - this.currentDwellStart;
    this.run.dwellRuns.push({
      zone: this.currentDwellZone,
      start: this.currentDwellStart,
      length: Math.max(1, length),
    });
    this.currentDwellZone = nextZone;
    this.currentDwellStart = this.stepCount;
  }

  private finalizeRun() {
    if (this.dwellFinalized) return; // IMPROVED: Idempotent
    
    // close final dwell
    const length = (this.stepCount + 1) - this.currentDwellStart;
    this.run.dwellRuns.push({
      zone: this.currentDwellZone,
      start: this.currentDwellStart,
      length: Math.max(1, length),
    });

    this.run.totalSteps = this.run.zoneSequence.length;
    this.run.meanDwell = computeMeanDwell(this.run.dwellRuns);
    this.run.timestamp = nowISO();
    
    this.dwellFinalized = true;
  }

  private typeToAction(type: EvolvingType, input: StepInput): ActionBundle {
    const p = type.genome.policy;

    const requested = clamp(
      input.requestedTokens ?? this.cfg.io.defaultTokens,
      20,
      this.cfg.io.maxTokens
    );

    // Use brevity to reduce tokens; tokenScale to modulate
    const tokenScale = type.genome.expression.tokenScale;
    const brevity = type.genome.expression.brevity;

    const tokens = Math.floor(requested * tokenScale * (0.55 + 0.9 * (1 - brevity)));
    const outputTokens = Math.max(20, Math.min(this.cfg.io.maxTokens, tokens));

    // Blend policy with current state to avoid brittle behavior
    const complexity = clamp01(0.55 * p.complexityBias + 0.45 * this.st.temperature);
    const noveltyPush = clamp01(0.60 * p.noveltyBias + 0.40 * this.st.temperature);

    // Maintenance decisions become stronger when entropy high or integrity low
    const maintenance = clamp01(
      0.55 * p.maintenanceBias +
        0.25 * (1 - this.st.integrity) +
        0.20 * this.st.entropy
    );

    // Consolidation stronger when memory load high
    const consolidation = clamp01(
      0.60 * p.consolidationBias + 0.40 * this.st.memoryLoad
    );

    // tension work depends on tension level
    const tensionWork = clamp01(
      0.55 * p.tensionWorkBias + 0.45 * this.st.tension
    );

    // cooling depends on temp
    const cooling = clamp01(0.50 * p.coolingBias + 0.50 * this.st.temperature);

    return {
      outputTokens,
      complexity,
      noveltyPush,
      maintenance,
      consolidation,
      tensionWork,
      cooling,
    };
  }

  private pickNextZone(type: EvolvingType, input: StepInput): Zone {
    const nav = this.cfg.navigator;
    const from = this.zone;

    // base weights from type attractor
    const weights = ZONES.map((z) => {
      const a = type.genome.policy.zoneAttractor[z] ?? 0;
      const stay = z === from ? nav.stayBias : 0;

      const ring = nav.ringBias * ringScore(z);

      // temperature pushes exploration: flatten weights when hot
      const temp = this.st.temperature;
      const explore = (nav.stochasticity + 0.35 * temp) * (this.rng.next() - 0.5);

      // slight "desiredZone" nudge if provided
      const desired = input.desiredZone && z === input.desiredZone ? 0.25 : 0;

      return a + stay + ring + explore + desired;
    });

    const probs = softmax(weights, 0.9);
    const r = this.rng.next();
    let acc = 0;
    for (let i = 0; i < ZONES.length; i++) {
      acc += probs[i];
      if (r <= acc) return ZONES[i];
    }
    return ZONES[ZONES.length - 1];
  }

  step(input: StepInput = {}): StepOutput {
    const step = this.stepCount;

    // choose a type based on trigger match
    const chosen = this.evo.pickType(step, this.st);

    // convert type into action bundle
    let act = this.typeToAction(chosen, input);

    // apply exogenous perturbations (bounded)
    if (typeof input.exogenousTension === "number") {
      this.st.tension = clamp01(
        this.st.tension + 0.10 * clamp(input.exogenousTension, -1, 1)
      );
    }
    if (typeof input.exogenousCoherence === "number") {
      this.st.coherence = clamp01(
        this.st.coherence + 0.10 * clamp(input.exogenousCoherence, -1, 1)
      );
    }

    // strict metabolism: compute cost first
    const cost = computeActionCost(this.st, this.cfg.autopoiesis, act);

    // if energy low, automatically shift toward maintenance/consolidation (self-preservation)
    if (this.st.energy < 6) {
      act = {
        ...act,
        outputTokens: Math.max(20, Math.floor(act.outputTokens * 0.55)),
        noveltyPush: clamp01(act.noveltyPush * 0.55),
        complexity: clamp01(act.complexity * 0.65),
        maintenance: clamp01(act.maintenance + 0.20),
        consolidation: clamp01(act.consolidation + 0.15),
        cooling: clamp01(act.cooling + 0.10),
      };
    }

    // apply dynamics to non-energy state
    const stAfter = applyAutopoiesisDynamics(this.st, this.cfg.autopoiesis, act, this.rng);

    // compute viability (endogenous) — now with tanh scaling
    const viability = computeHybridViability(stAfter, this.cfg.autopoiesis);

    // IMPROVED: Reduced gain multipliers due to scaled viability
    const gain = viability > 0 ? 1.0 * viability : 0.5 * viability;
    const deltaE = gain - cost;

    // update energy
    const newEnergy = clamp(
      stAfter.energy + deltaE,
      this.cfg.autopoiesis.energy.min,
      this.cfg.autopoiesis.energy.max
    );

    // commit state
    this.st = {
      ...stAfter,
      energy: newEnergy,
    };

    // update viability EMA (for speciation gating)
    this.viabilityEMA = 0.90 * this.viabilityEMA + 0.10 * viability;

    // zone transition
    const nextZone = this.pickNextZone(chosen, input);
    this.closeDwellIfNeeded(nextZone);

    const prev = this.zone;
    this.zone = nextZone;

    // log run data
    this.observeZone(this.zone);
    bumpTransition(this.run.transitionMatrix, prev, this.zone, 1);
    const tlog = `${prev}->${this.zone}`;
    this.run.transitionLog.push(tlog);

    // IMPROVED: Vanished transitions tracking
    if (this.cfg.trackVanishedTransitions) {
      this.transitionWindow.push(tlog);
      
      // Keep window bounded
      if (this.transitionWindow.length > this.cfg.vanishWindow) {
        this.transitionWindow.shift();
      }
      
      // Check for vanished transitions periodically
      if (step > 0 && step % this.cfg.vanishWindow === 0) {
        const recentSet = new Set(this.transitionWindow);
        const vanished = Array.from(this.prevTransitionsSeen)
          .filter(t => !recentSet.has(t));
        
        // Add newly vanished (not already marked)
        for (const v of vanished) {
          if (!this.run.vanishedTransitions.includes(v)) {
            this.run.vanishedTransitions.push(v);
          }
        }
        
        // Update seen set to current window
        this.prevTransitionsSeen = new Set(this.transitionWindow);
      }
      
      this.prevTransitionsSeen.add(tlog);
    }

    this.run.zoneSequence.push(this.zone);
    
    // IMPROVED: Track energy for phase diagrams
    this.energyTrace.push(this.st.energy);

    // evolution step (selection + mutation + speciation + Bedau window)
    this.evo.recordOutcome(chosen, step, viability, deltaE);
    this.evo.maybeEvolve(step, this.st.energy, this.viabilityEMA);

    // compute order params
    const order = computeOrderParameters(
      this.run.zoneSequence,
      this.run.transitionLog,
      this.energyTrace,
      this.evo.getBedauStats()
    );

    this.stepCount += 1;

    // keep run log fields updated
    this.run.totalSteps = this.run.zoneSequence.length;
    this.run.meanDwell = computeMeanDwell(this.run.dwellRuns);
    this.run.timestamp = nowISO();

    return {
      step,
      zone: this.zone,
      chosenTypeId: chosen.genome.id,
      chosenLineage: chosen.genome.lineage,
      autopoiesis: { ...this.st },
      action: act,
      viability,
      deltaE,
      order,
    };
  }

  runSteps(n: number, inputFactory?: (i: number) => StepInput): StepOutput[] {
    const out: StepOutput[] = [];
    for (let i = 0; i < n; i++) {
      out.push(this.step(inputFactory ? inputFactory(i) : {}));
    }
    this.finalizeRun();
    return out;
  }

  // IMPROVED: Include energy sequence
  getRunLog(): RunLog & { energySequence: number[] } {
    return {
      ...JSON.parse(JSON.stringify(this.run)),
      energySequence: [...this.energyTrace]
    };
  }

  getEvolutionStats(): ReadonlyArray<BedauWindowStats> {
    return this.evo.getBedauStats();
  }

  getState(): AutopoiesisState {
    return JSON.parse(JSON.stringify(this.st));
  }

  getStepCount(): number {
    return this.stepCount;
  }
  
  // IMPROVED: Analysis methods
  getActiveTypeCount(): number {
    return this.evo.getPoolSnapshot().filter(t => t.alive).length;
  }
  
  getLineageCount(): number {
    const pool = this.evo.getPoolSnapshot();
    return new Set(pool.map(t => t.genome.lineage)).size;
  }
  
  getDominantType(): EvolvingType | null {
    const alive = this.evo.getPoolSnapshot().filter(t => t.alive);
    return alive.length > 0
      ? alive.reduce((best, t) => t.scoreEMA > best.scoreEMA ? t : best)
      : null;
  }
  
  getPoolSnapshot(): ReadonlyArray<EvolvingType> {
    return this.evo.getPoolSnapshot();
  }
}

/* =============================================================================
Phase Diagram Export Helper (formalization)
-------------------------------------------------------------------------------
A "phase diagram" needs axes. This helper gives you:
- X: phiRing (ring occupancy)
- Y: meanEnergy
- Color/marker dimensions: adaptiveActivity, persistenceRate, circulation, etc.

IMPROVED: Now properly includes real meanEnergy from energy trace
============================================================================= */

type PhasePoint = {
  windowEnd: number;
  phiRing: number;
  meanEnergy: number;
  circulation: number;
  adaptiveActivity: number;
  noveltyRate: number;
  persistenceRate: number;
};

function phaseDiagramPointsFromEngine(engine: AmeliaHybridEngine): PhasePoint[] {
  const log = engine.getRunLog();
  const bedau = engine.getEvolutionStats();
  const energies = log.energySequence; // IMPROVED: now available

  const zoneSeq = log.zoneSequence;
  const trans = log.transitionLog;

  const points: PhasePoint[] = [];
  for (const w of bedau) {
    const prefixZones = zoneSeq.slice(0, w.windowEnd + 1);
    const prefixTrans = trans.slice(0, w.windowEnd);
    const prefixEnergies = energies.slice(0, w.windowEnd + 1);

    const ringSet = new Set<Zone>([
      "zone-0-flux", 
      "zone-1-flux", 
      "zone-8-flux", 
      "zone-9-flux"
    ]);
    const phiRing = prefixZones.length
      ? prefixZones.filter((z) => ringSet.has(z)).length / prefixZones.length
      : 0;

    const nonSelf = prefixTrans.filter((t) => {
      const [a, b] = t.split("->");
      return a !== b;
    }).length;
    const circulation = prefixTrans.length ? nonSelf / prefixTrans.length : 0;

    // IMPROVED: Real mean energy calculation
    const meanEnergy = prefixEnergies.length 
      ? prefixEnergies.reduce((a, b) => a + b, 0) / prefixEnergies.length
      : 0;

    points.push({
      windowEnd: w.windowEnd,
      phiRing,
      meanEnergy, // IMPROVED: real value
      circulation,
      adaptiveActivity: w.adaptiveActivity,
      noveltyRate: w.noveltyRate,
      persistenceRate: w.persistenceRate,
    });
  }
  return points;
}

/* =============================================================================
EXPORTS
============================================================================= */

export {
  // Main engine
  AmeliaHybridEngine,
  
  // Configuration types
  AmeliaHybridConfig,
  AutopoiesisConfig,
  EvolutionConfig,
  NavigatorConfig,
  
  // State types
  AutopoiesisState,
  BehaviorGenome,
  EvolvingType,
  
  // I/O types
  StepInput,
  StepOutput,
  ActionBundle,
  
  // Logging types
  RunLog,
  DwellRun,
  BedauWindowStats,
  
  // Analysis types
  OrderParameters,
  PhasePoint,
  
  // Zone type
  Zone,
  ZONES,
  
  // Utilities
  defaultHybridConfig,
  defaultAutopoiesisConfig,
  defaultEvolutionConfig,
  defaultNavigatorConfig,
  phaseDiagramPointsFromEngine,
  validateConfig,
};

/* =============================================================================
Example usage
============================================================================= */

/*
const engine = new AmeliaHybridEngine(defaultHybridConfig(20260105));

const outputs = engine.runSteps(200, (i) => ({
  requestedTokens: 160,
  // occasionally inject paradox tension
  exogenousTension: i % 23 === 0 ? 0.6 : 0,
  exogenousCoherence: i % 31 === 0 ? -0.3 : 0,
}));

console.log("Run log:", engine.getRunLog());
console.log("Evolution stats:", engine.getEvolutionStats());
console.log("Phase points:", phaseDiagramPointsFromEngine(engine));
console.log("Active types:", engine.getActiveTypeCount());
console.log("Lineage count:", engine.getLineageCount());
console.log("Dominant type:", engine.getDominantType());
*/
