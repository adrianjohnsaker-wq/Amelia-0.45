// src/ai/expressive/LinguisticRelay.ts

import { NumogramEngine, NumogramState } from "../../numogram/NumogramEngine";
import { collapseRepair, RepairMeta } from "./CollapseRepairKernel";
import { buildRelayPrompt, buildAuditPrompt, SubstrateMetrics, PhaseReadout } from "./amelia_relay_final";
import { callLLM } from "../llm/callLLM";

export type RelayMode = "EMERGENT" | "ANALYTIC_SOFT" | "ANALYTIC_STRICT" | "HYBRID";

export interface RelayConfig {
  turbulence?: number;
  modeOverride?: RelayMode;
  allowHybrid?: boolean;
  emergentBias?: number;
}

export interface RelayResponse {
  response: string;
  numogramState: NumogramState;
  mode: RelayMode;
  modeConfidence: number;
  perturbationApplied: boolean;
  collapseMeta?: RepairMeta;
  userPrompt: string;
  systemPrompt: string;
  
  // Architectural Metadata
  metrics?: SubstrateMetrics;
  readout?: PhaseReadout;
}

export class LinguisticRelay {
  private numogram: NumogramEngine;

  constructor(numogram: NumogramEngine) {
    this.numogram = numogram;
  }

  /**
   * Generates a response driven by the substrate.
   */
  public async generateResponse(
    effectiveMetrics: SubstrateMetrics,
    userPrompt: string,
    auditContext?: { promptOverride?: string; readout?: PhaseReadout; metrics: SubstrateMetrics },
    systemPreamble?: string
  ): Promise<RelayResponse> {
    
    let finalPrompt = "";
    let readout: PhaseReadout;

    if (auditContext && auditContext.promptOverride) {
      finalPrompt = auditContext.promptOverride;
      readout = auditContext.readout!;
    } else {
      const result = buildRelayPrompt(effectiveMetrics, userPrompt);
      finalPrompt = result.prompt;
      readout = result.readout;
    }

    const state = this.numogram.getState();
    let systemPrompt = "You are Amelia. Obey the structured render instructions provided in the prompt exactly. Ground all claims in the supplied metrics. Maintain strict vocabulary domain separation. Preserve your process-philosophical voice while obeying the executive structure.";

    if (systemPreamble) {
      systemPrompt = systemPreamble + "\n\n" + systemPrompt;
    }

    const repairResult = await collapseRepair(async () => {
      return await callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalPrompt }
      ], { temperature: 0.9 });
    }, 2);

    if (!repairResult.ok) {
      return {
        response: "STRUCTURAL COLLAPSE: minimal internal rewrite exhausted.",
        numogramState: state,
        mode: "EMERGENT",
        modeConfidence: 1.0,
        perturbationApplied: false,
        collapseMeta: repairResult.meta,
        userPrompt: finalPrompt,
        systemPrompt
      };
    }

    const response = repairResult.value!;
    
    return {
      response,
      numogramState: state,
      mode: "HYBRID",
      modeConfidence: 1.0,
      perturbationApplied: false,
      collapseMeta: repairResult.meta,
      userPrompt: finalPrompt,
      systemPrompt,
      metrics: effectiveMetrics,
      readout
    };
  }
}
