import {
  SubstrateVector,
  RelayVector,
  RelayDirective,
  CouplingConfig,
} from "./types";
import { RelayIndividuationTrigger } from "./RelayIndividuationTrigger";

/**
 * Amelia Coupling Architecture — CouplingArchitecture
 *
 * Primary entry point for the transductive coupling system.
 * Orchestrates the individuation trigger to evaluate the gap
 * between substrate state and relay self-report.
 */
export class CouplingArchitecture {
  private trigger: RelayIndividuationTrigger;

  constructor(config: Partial<CouplingConfig> = {}) {
    this.trigger = new RelayIndividuationTrigger(config);
  }

  /**
   * Engage the coupling logic to produce a directive for the relay.
   *
   * @param substrate - The state vector from the substrate layer.
   * @param relay - The state vector from the relay's self-report.
   * @returns A directive for the relay's next expression.
   */
  engage(substrate: SubstrateVector, relay: RelayVector): RelayDirective {
    return this.trigger.evaluate(substrate, relay);
  }
}
