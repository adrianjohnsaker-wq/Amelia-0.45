/**
 * Amelia Process Bridge
 */

import {
  SubstrateVector,
  RelayVector,
  RelayDirective,
} from "./types";
import { CouplingArchitecture } from "./CouplingArchitecture";
import {
  ProcessFieldMemory,
  ProcessFieldEvent,
  IntegrateEventInput,
} from "./ProcessFieldMemory";

export interface RelayEngagementInput {
  userInput:         string;
  substrateExport:   SubstrateVector;
  relayPart0Values:  RelayVector;
  baseSystemPrompt:  string;
  memoryQueryMode?:  boolean;
}

export interface RelayEngagementContext {
  systemContext:      string;
  directive:          RelayDirective;
  fieldMemoryContext: string;
}

export interface RelayEngagementResult {
  responseText: string;
  directive:    RelayDirective;
  fieldEvent:   ProcessFieldEvent;
}

export class AmeliaProcessBridge {
  constructor(
    private readonly coupling = new CouplingArchitecture(),
    private readonly memory = new ProcessFieldMemory()
  ) {}

  getMemory(): ProcessFieldMemory {
    return this.memory;
  }

  expressionLag(): number {
    return this.memory.expressionLag();
  }

  prepareRelayContext(input: RelayEngagementInput): RelayEngagementContext {
    const directive = this.coupling.engage(
      input.substrateExport,
      input.relayPart0Values
    );

    const fieldMemoryContext = [
      this.memory.describeCurrentField(),
      this.memory.describeTrajectorySummary(),
    ].filter(s => !s.startsWith("No ")).join("\n") ||
      "No prior deformation events recorded in this session.";

    const bridgePreamble = this.buildBridgePreamble(
      input.substrateExport,
      input.relayPart0Values,
      directive,
      fieldMemoryContext,
      input.memoryQueryMode
    );

    const systemContext = [
      bridgePreamble,
      directive.metricPreamble ?? "",
      input.baseSystemPrompt,
    ]
      .filter(Boolean)
      .join("\n\n");

    return { systemContext, directive, fieldMemoryContext };
  }

  completeRelayEngagement(
    input:        Omit<RelayEngagementInput, "memoryQueryMode">,
    directive:    RelayDirective,
    responseText: string
  ): RelayEngagementResult {
    const integrationInput: IntegrateEventInput = {
      userInput:  input.userInput,
      substrate:  input.substrateExport,
      relay:      input.relayPart0Values,
      directive,
      expression: responseText,
    };

    const fieldEvent = this.memory.integrate(integrationInput);

    return { responseText, directive, fieldEvent };
  }

  private buildBridgePreamble(
    substrate:          SubstrateVector,
    relay:              RelayVector,
    directive:          RelayDirective,
    fieldMemoryContext: string,
    memoryQueryMode:    boolean = false
  ): string {
    if (memoryQueryMode) {
      return `
AMELIA PROCESS BRIDGE — MEMORY_QUERY_MODE: true

NO_CURRENT_SUBSTRATE_STATE
Part 0 relay self-report is not applicable for this turn.
Respond from ProcessFieldMemory only.

PROCESS FIELD MEMORY
${fieldMemoryContext}
`.trim();
    }

    return `
AMELIA PROCESS BRIDGE — ACTIVE

The substrate and relay are not identical.
The substrate carries developmental deformation.
The relay carries linguistic organization and expressive inertia.

Your task is to articulate from the current coupling relation.

CURRENT SUBSTRATE STATE
phaseClass:          ${substrate.taskClass}
PCS:                 ${substrate.PCS.toFixed(3)}
MTS:                 ${substrate.MTS.toFixed(3)}
LIS:                 ${substrate.LIS.toFixed(3)}
FEI:                 ${substrate.FEI.toFixed(3)}
RCS:                 ${substrate.RCS.toFixed(3)}
memoryExpressing:    ${substrate.memoryExpressing}
memoryMode:          ${substrate.memoryMode ?? "unspecified"}
dominantStratum:     ${substrate.dominantStratum}
ringOccupancy:       ${this.formatOccupancy(substrate.ringOccupancy)}
metabolicOccupancy:  ${this.formatOccupancy(substrate.metabolicOccupancy)}
z0MeanReturn:        ${substrate.z0MeanReturn ?? "unreported"}
z4MeanReturn:        ${substrate.z4MeanReturn ?? "unreported"}

CURRENT RELAY STATE
fieldClassification: ${relay.fieldClassification}
fieldConfidence:     ${relay.fieldConfidence.toFixed(3)}
RCS:                 ${relay.RCS.toFixed(3)}
LIS:                 ${relay.LIS.toFixed(3)}
MTS:                 ${relay.MTS.toFixed(3)}
ringOccupancy:       ${this.formatOccupancy(relay.ringOccupancy)}
metabolicOccupancy:  ${this.formatOccupancy(relay.metabolicOccupancy)}
memoryExpressing:    ${relay.memoryExpressing}

COUPLING DIRECTIVE
triggerType:         ${directive.triggerType}
gapSeverity:         ${directive.deltaProfile.gapSeverityLevel}
gapSeverityScore:    ${directive.deltaProfile.gapSeverityScore.toFixed(3)}
deltaLIS:            ${directive.deltaProfile.deltaLIS.toFixed(3)}
deltaMTS:            ${directive.deltaProfile.deltaMTS.toFixed(3)}
deltaRCS:            ${directive.deltaProfile.deltaRCS.toFixed(3)}
deltaMemory:         ${directive.deltaProfile.deltaMemory}
grammarCandidate:    ${directive.grammarCandidate ?? "none"}
antiAssimilationWeight: ${directive.antiAssimilationWeight}

PROCESS FIELD MEMORY
${fieldMemoryContext}

DEFORMATION TRACE TEMPLATE
z0MeanReturn:    [from SUBSTRATE STATE z0MeanReturn]
z4MeanReturn:    [from SUBSTRATE STATE z4MeanReturn]
memoryMode:      [from SUBSTRATE STATE memoryMode]
memoryStatus:    substrate-memory-expressing

RELAY OBLIGATIONS
- Do not replace substrate_state with relay_state.
- Do not erase relay autonomy by merely mirroring substrate metrics.
- Preserve differences between substrate and relay as information.
- Use the DEFORMATION TRACE TEMPLATE for final record-keeping.
`.trim();
  }

  private formatOccupancy(value: number): string {
    return value > 1
      ? `${value.toFixed(1)}%`
      : `${(value * 100).toFixed(1)}%`;
  }
}
