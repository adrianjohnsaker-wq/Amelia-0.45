// MetabolicOrganBridge.ts
// Mediates between parent cluster output (normative constraints) and metabolic organ (procedures).

import { runMetabolicOrgan, MetabolicInput, MetabolicOutput, NormativeConstraint, TaskClass } from "./MetabolicOrgan";

export type ParentClusterOutput = {
  constraints: NormativeConstraint[];
  identityMode: "parent_lock" | "parent_distributed" | "exploratory_parent";
};

export type HybridDecision = {
  metabolic?: MetabolicOutput;
  shouldExecuteMetabolism: boolean;
  reason: string;
};

export function decideHybrid(
  taskClass: TaskClass,
  gateRate: number,
  parent: ParentClusterOutput
): HybridDecision {
  // Default rule: ethics stays parent-led; metabolism supports only when procedural demand appears.
  if (taskClass === "ethics") {
    return {
      shouldExecuteMetabolism: gateRate >= 1.1 && parent.identityMode !== "parent_lock",
      reason: "Ethics is identity-mediated; metabolism allowed only as constrained procedural assistant.",
    };
  }

  // Math/technical: allow metabolism more often
  if (taskClass === "math" || taskClass === "technical") {
    return {
      shouldExecuteMetabolism: true,
      reason: "Procedural tasks require metabolic organ recruitment (zones 3–6).",
    };
  }

  // Fiction: metabolism optional (structure scaffolding)
  if (taskClass === "fiction") {
    return {
      shouldExecuteMetabolism: gateRate < 1.8, // keep high-gate fiction wild; don’t over-structure it
      reason: "Fiction benefits from structure sometimes, but high-gate mode should remain exploratory.",
    };
  }

  return {
    shouldExecuteMetabolism: gateRate >= 1.0,
    reason: "General tasks may benefit from procedural structuring when gate is moderate.",
  };
}

export function runHybridMetabolism(
  taskClass: TaskClass,
  userText: string,
  gateRate: number,
  parent: ParentClusterOutput
): MetabolicOutput | null {
  const decision = decideHybrid(taskClass, gateRate, parent);
  if (!decision.shouldExecuteMetabolism) return null;

  const input: MetabolicInput = {
    taskClass,
    userText,
    gateRate,
    parentConstraints: parent.constraints,
    maxPlans: 3,
  };

  return runMetabolicOrgan(input);
}
