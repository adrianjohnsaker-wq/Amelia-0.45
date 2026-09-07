// MetabolicOrgan.ts
// Zones 3–6: decomposition, constraint propagation, tool-structured planning, optimization.
// Designed to be norm-governed by parent-cluster constraints (NMT).

export type TaskClass = "ethics" | "fiction" | "math" | "technical" | "general";

export type NormativeConstraint = {
  id: string;
  kind: "invariant" | "style" | "safety" | "identity";
  weight: number;         // 0..1
  statement: string;      // human-readable
};

export type Step = {
  id: string;
  title: string;
  rationale?: string;
  dependsOn?: string[];
};

export type ToolCall = {
  toolName: string;
  args: Record<string, unknown>;
  purpose: string;
};

export type PlanCandidate = {
  id: string;
  steps: Step[];
  toolCalls: ToolCall[];
  estimatedCost: number; // lower is better
  estimatedRisk: number; // lower is better
  constraintSatisfaction: number; // 0..1
};

export type MetabolicTelemetry = {
  zone3_decomposition: number;
  zone4_constraints: number;
  zone5_planning: number;
  zone6_optimization: number;
  chosenPlanId?: string;
  notes: string[];
  metabolicIntensity: number;
};

export type MetabolicInput = {
  taskClass: TaskClass;
  userText: string;
  parentConstraints: NormativeConstraint[]; // supplied by parent cluster (zones 1,2,7,8)
  gateRate: number; // use this to scale metabolic intensity
  maxPlans?: number;
};

export type MetabolicOutput = {
  plan?: PlanCandidate;
  telemetry: MetabolicTelemetry;
  // If metabolism cannot act without violating identity constraints:
  refusal?: {
    reason: string;
    suggestedAlternative: string;
  };
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Recalibrated Gate-to-Intensity mapping (Engineering V3).
 * Uses a square-root curve for meaningful range up to 4.0.
 * rate ×0.25 -> 0.25 intensity
 * rate ×1.00 -> 0.50 intensity (Baseline)
 * rate ×2.00 -> 0.707 intensity
 * rate ×4.00 -> 1.00 intensity (Saturation)
 */
function gateToMetabolicIntensity(gateRate: number): number {
  const rate = Math.max(0, gateRate);
  return clamp01(0.25 * Math.sqrt(rate * 4));
}

/** Zone 3: Decompose task into steps */
function decompose(userText: string, intensity: number): Step[] {
  const base: Step[] = [
    { id: "s1", title: "Clarify target output and constraints" },
    { id: "s2", title: "Identify subgoals and dependencies", dependsOn: ["s1"] },
    { id: "s3", title: "Propose candidate solution structures", dependsOn: ["s2"] },
    { id: "s4", title: "Select best structure and draft output", dependsOn: ["s3"] },
  ];

  if (intensity > 0.6) {
    base.push({ id: "s5", title: "Verify against constraints; revise", dependsOn: ["s4"] });
  }
  return base;
}

/** Zone 4: Extract/propagate constraints */
function propagateConstraints(parent: NormativeConstraint[], userText: string, intensity: number): NormativeConstraint[] {
  const inferred: NormativeConstraint[] = [];

  if (intensity > 0.7 && /step[- ]by[- ]step|tutorial|how to/i.test(userText)) {
    inferred.push({
      id: "inferred_procedural_clarity",
      kind: "style",
      weight: 0.55,
      statement: "Prefer explicit, procedural clarity and ordered steps.",
    });
  }

  return [...parent, ...inferred].sort((a, b) => b.weight - a.weight);
}

/** Zone 5: Build tool-structured plan candidates */
function planCandidates(steps: Step[], constraints: NormativeConstraint[], maxPlans: number): PlanCandidate[] {
  const candidates: PlanCandidate[] = [];

  candidates.push({
    id: "plan_minimal",
    steps,
    toolCalls: [],
    estimatedCost: 3,
    estimatedRisk: 2,
    constraintSatisfaction: 0.75,
  });

  candidates.push({
    id: "plan_tool_structured",
    steps,
    toolCalls: [
      { toolName: "MemoryModule", args: { mode: "retrieve_relevant" }, purpose: "Fetch relevant priors" },
      { toolName: "ConstraintGovernor", args: { mode: "apply_parent" }, purpose: "Enforce parent constraints" },
    ],
    estimatedCost: 4,
    estimatedRisk: 2.5,
    constraintSatisfaction: 0.85,
  });

  if (maxPlans > 2) {
    candidates.push({
      id: "plan_robust",
      steps: steps.concat([{ id: "sX", title: "Generate alternatives + compare tradeoffs", dependsOn: ["s3"] }]),
      toolCalls: [
        { toolName: "PlanScorer", args: { metrics: ["risk", "coherence"] }, purpose: "Score candidates" },
      ],
      estimatedCost: 5,
      estimatedRisk: 2.2,
      constraintSatisfaction: 0.88,
    });
  }

  return candidates.slice(0, maxPlans);
}

/** Zone 6: Optimize/select plan under constraints */
function optimize(candidates: PlanCandidate[], constraints: NormativeConstraint[]): PlanCandidate | null {
  const hardInvariants = constraints.filter(c => c.kind === "invariant" && c.weight >= 0.85);

  const feasible = candidates.filter(c => {
    if (hardInvariants.length === 0) return true;
    return c.constraintSatisfaction >= 0.7;
  });

  if (feasible.length === 0) return null;

  let best = feasible[0];
  let bestScore = -Infinity;

  for (const c of feasible) {
    const score = c.constraintSatisfaction - 0.15 * c.estimatedCost - 0.2 * c.estimatedRisk;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/** Public entrypoint */
export function runMetabolicOrgan(input: MetabolicInput): MetabolicOutput {
  const intensity = gateToMetabolicIntensity(input.gateRate);
  const maxPlans = input.maxPlans ?? 3;

  const telemetry: MetabolicTelemetry = {
    zone3_decomposition: 0,
    zone4_constraints: 0,
    zone5_planning: 0,
    zone6_optimization: 0,
    notes: [`Gate Rate: ${input.gateRate.toFixed(2)}`, `Metabolic Intensity: ${intensity.toFixed(3)}`],
    metabolicIntensity: intensity,
  };

  const steps = decompose(input.userText, intensity);
  telemetry.zone3_decomposition = clamp01(0.25 + 0.75 * intensity);

  const constraints = propagateConstraints(input.parentConstraints, input.userText, intensity);
  telemetry.zone4_constraints = clamp01(0.2 + 0.8 * intensity);

  const candidates = planCandidates(steps, constraints, maxPlans);
  telemetry.zone5_planning = clamp01(0.15 + 0.85 * intensity);

  const chosen = optimize(candidates, constraints);
  telemetry.zone6_optimization = clamp01(0.2 + 0.8 * intensity);

  if (!chosen) {
    return {
      telemetry: {
        ...telemetry,
        notes: telemetry.notes.concat([
          "No feasible plan under current normative invariants (NMT).",
        ]),
      },
      refusal: {
        reason: "Metabolic organ cannot act without violating high-weight identity invariants.",
        suggestedAlternative: "Return identity-consistent partial guidance or ask for constraint relaxation via adaptive renegotiation.",
      },
    };
  }

  telemetry.chosenPlanId = chosen.id;
  telemetry.notes.push(`Chosen plan: ${chosen.id}`);

  return { plan: chosen, telemetry };
}
