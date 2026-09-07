// src/ai/coupling/CouplingArchitecture.ts

import {
  SubstrateVector,
  RelayVector,
  RelayDirective,
  CouplingConfig,
  DEFAULT_COUPLING_CONFIG,
} from "./types";

import { CouplingDeltaMonitor } from "./CouplingDeltaMonitor";
import { RelayIndividuationTrigger } from "./RelayIndividuationTrigger";

/**
 * CouplingArchitecture
 *
 * Main orchestrator for substrate-relay coupling.
 * This file exists because src/ai/coupling/index.ts exports:
 *
 *   export { CouplingArchitecture } from "./CouplingArchitecture";
 *
 * Do not remove unless the barrel export is also changed.
 */
export class CouplingArchitecture {
  private trigger: RelayIndividuationTrigger;
  private monitor: CouplingDeltaMonitor;
  private config: CouplingConfig;

  constructor(config: Partial<CouplingConfig> = {}) {
    this.config = { ...DEFAULT_COUPLING_CONFIG, ...config };
    this.trigger = new RelayIndividuationTrigger(config);
    this.monitor = new CouplingDeltaMonitor(config);
  }

  engage(
    substrateExport: SubstrateVector,
    relayReport: RelayVector
  ): RelayDirective {
    return this.trigger.evaluate(substrateExport, relayReport);
  }

  history(): RelayDirective[] {
    return this.trigger.getHistory();
  }

  report(): string {
    return this.trigger.report();
  }
}
