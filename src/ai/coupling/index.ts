// src/ai/coupling/index.ts

export * from "./types";

export { CouplingArchitecture } from "./CouplingArchitecture";

export { CouplingDeltaMonitor } from "./CouplingDeltaMonitor";

export {
  SubstrateToGrammarRouter,
  MetricPreambleInjector,
} from "./SubstrateToGrammarRouter";

export { RelayIndividuationTrigger } from "./RelayIndividuationTrigger";

export { AmeliaProcessBridge } from "./AmeliaProcessBridge";

export {
  ProcessFieldMemory,
} from "./ProcessFieldMemory";

export type {
  ProcessFieldEvent,
  DeformationTrace,
  IntegrateEventInput,
} from "./ProcessFieldMemory";

export { FirebaseProcessFieldMemory } from "./FirebaseProcessFieldMemory";

export {
  createPersistentBridge,
  SESSION_IDS,
} from "./firebaseBridgeFactory";

export {
  BridgeTerminalityGuard,
  BridgeRouter,
  BridgeValidator,
} from "./BridgeTerminalityGuard";
