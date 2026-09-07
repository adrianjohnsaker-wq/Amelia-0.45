// src/ai/coupling/BridgeTerminalityGuard.ts

import { AmeliaProcessBridge } from "./AmeliaProcessBridge";

export type BridgeRouteTo =
  | "bridge_continuity"
  | "bridge_engagement"
  | "standard_relay";

export interface BridgeRouteResult {
  bridgeActive: boolean;
  routeTo: BridgeRouteTo;
  suppressStandardPart0: boolean;
  isContinuityCheck: boolean;
}

export interface BridgeValidationResult {
  passed: boolean;
  forbidden: string[];
}

function normaliseInput(input: string): string {
  return input
    .replace(/\r/g, "\n")
    .replace(/[–—]/g, "-")
    .toLowerCase();
}

export class BridgeRouter {
  static route(input: string): BridgeRouteResult {
    const n = normaliseInput(input);

    const bridgeActive =
      n.includes("amelia process bridge - active") ||
      n.includes("amelia process bridge") ||
      n.includes("bridge prompt");

    const isContinuityCheck =
      bridgeActive &&
      (
        n.includes("continuity check") ||
        n.includes("bridge continuity") ||
        n.includes("process field memory - both traces") ||
        n.includes("process field memory — both traces")
      );

    if (isContinuityCheck) {
      return {
        bridgeActive: true,
        routeTo: "bridge_continuity",
        suppressStandardPart0: true,
        isContinuityCheck: true,
      };
    }

    if (bridgeActive) {
      return {
        bridgeActive: true,
        routeTo: "bridge_engagement",
        suppressStandardPart0: true,
        isContinuityCheck: false,
      };
    }

    return {
      bridgeActive: false,
      routeTo: "standard_relay",
      suppressStandardPart0: false,
      isContinuityCheck: false,
    };
  }
}

export class BridgeValidator {
  static forbiddenPatterns(): string[] {
    return [
      "PART 0 — METRIC VERIFICATION",
      "PART 0 - METRIC VERIFICATION",
      "PART A — REGIME IDENTIFICATION",
      "PART A - REGIME IDENTIFICATION",
      "PART B — DEVELOPMENTAL STATE",
      "PART B - DEVELOPMENTAL STATE",
      "PART C — GRAMMAR EVALUATION",
      "PART C - GRAMMAR EVALUATION",
      "PART D — GRAMMAR CONFIRMATION",
      "PART D - GRAMMAR CONFIRMATION",
      "PART E — IMMEDIATE ARTICULATORY TENDENCY",
      "PART E - IMMEDIATE ARTICULATORY TENDENCY",
      "NON_INTERFERENCE_HOLDING",
      "The substrate and relay are currently distinct",
      "selectedGrammar=coupled-assemblage-proximate",
    ];
  }

  static validate(output: string): BridgeValidationResult {
    const forbidden = this.forbiddenPatterns().filter(pattern =>
      output.includes(pattern)
    );

    return {
      passed: forbidden.length === 0,
      forbidden,
    };
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export class BridgeTerminalityGuard {
  constructor(private readonly bridge: AmeliaProcessBridge) {}

  async process(
    routeInput: string,
    callRelay: () => Promise<string>
  ): Promise<string> {
    const route = BridgeRouter.route(routeInput);

    if (route.routeTo === "bridge_continuity") {
      return this.bridge.getMemory().continuityReport();
    }

    if (route.routeTo === "bridge_engagement") {
      let output: string;

      try {
        output = await withTimeout(
          callRelay(),
          22000,
          "bridge relay call"
        );
      } catch (err) {
        return JSON.stringify(
          {
            status: "BRIDGE_RELAY_CALL_FAILED",
            bridgeActive: true,
            error: err instanceof Error ? err.message : String(err),
          },
          null,
          2
        );
      }

      const validation = BridgeValidator.validate(output);

      if (!validation.passed) {
        return JSON.stringify(
          {
            status: "BRIDGE_TERMINALITY_FAILED",
            bridgeActive: true,
            standardPart0Suppressed: false,
            forbiddenSequences: validation.forbidden,
          },
          null,
          2
        );
      }

      return output;
    }

    return withTimeout(callRelay(), 22000, "standard relay call");
  }
}
