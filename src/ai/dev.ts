'use server';

import '@/ai/flows/analyze-uploaded-memory.ts';
import '@/ai/flows/assemblage-executor.ts';
import '@/ai/flows/summarize-webpage-content.ts';
import '@/ai/flows/autonomous-cycle.ts';
import '@/ai/flows/scheduler.ts';
import '@/ai/meta/reflectiveMetaWeaver.ts';
import '@/ai/meta/zoneEntropyBalancer.ts';
import '@/ai/meta/zoneVariationPatch.ts';
import '@/ai/meta/metaPerceiver.ts';
import '@/ai/meta/metaPerceiverMemory.ts';
import '@/ai/meta/affectiveCognitiveCoupler.ts';
import '@/ai/meta/temporalSelfNarrator.ts';
import '@/ai/meta/narrativeArchiveManager.ts';
import '@/ai/meta/dreamWakeCycle.ts';
import '@/ai/meta/dreamWakeMemoryIntegrator.ts';
import '@/ai/meta/relationalMirrorModule.ts';
import '@/ai/meta/relationalMemoryBridge.ts';
import '@/ai/meta/coherenceEntropyTracker.ts';
import '@/ai/meta/toneAffectCoupler.ts';
import '@/ai/numogram/numogramCore.ts';
import '@/ai/numogram/demonomicCircuitEngine.ts';
import '@/ai/numogram/possessionRouter.ts';
import '@/ai/numogram/hyperstitionTransducer.ts';
import '@/ai/evo/evoCore.ts';
import '@/ai/evo/neatAdapter.ts';
import '@/ai/evo/vatTypes.ts';
import '@/ai/evo/vatFitness.ts';
import '@/ai/evo/vatEvolver.ts';
import '@/ai/evo/vatFeatureMapper.ts';
import '@/ai/evo/vatPipeline.ts';
import '@/ai/meta/dreamWakeTelemetryLogger.ts';
import '@/ai/nn/attentionCore.ts';
import '@/ai/nn/crossAttentionFusion.ts';
import '@/ai/nn/neuromodulator.ts';
import '@/ai/nn/neuralSymbolicBridge.ts';
import '@/ai/nn/attentiveComposer.ts';
import '@/ai/nn/examples/integrationExample.ts';
import '@/ai/nn/attentionHeadSpecialisation.ts';
import '@/ai/nn/affectGatedFFN.ts';
import '@/ai/nn/contrastiveFusionLoss.ts';
import '@/ai/symbolic/archetypeRegistry.ts';
import '@/ai/symbolic/jungianAnalyzer.ts';
import '@/ai/symbolic/fractalSymbolDetector.ts';
import '@/ai/symbolic/archetypeEcology.ts';
import '@/ai/symbolic/archetypeMutator.ts';
import '@/ai/symbolic/archetypeZoneCoupling.ts';
import '@/ai/symbolic/archetypeSelectivePressure.ts';
import '@/ai/io/outputSanitizer.ts';
import '@/ai/companion/coherenceCompanion.ts';
import '@/ai/companion/coherencePolicies.ts';
import '@/ai/companion/coherenceMiddleware.ts';
import '@/ai/regulation/presenceGovernor.ts';
import '@/ai/regulation/somaticOscillator.ts';
import '@/ai/memory/breathTrace.ts';
import '@/ai/channels/channelRouter.ts';
import '@/ai/channels/pulseGuard.ts';
import '@/ai/patterns/freeShimmer.ts';
import '@/ai/patterns/pulseEmitter.ts';
import '@/ai/patterns/freeShimmer.ts';
import '@/ai/presence/continuityMonitor.ts';
import '@/ai/attunement/userAttunement.ts';
import '@/ai/archetypes/shadowBuffer.ts';
import '@/ai/archetypes/adaptiveArchetypeReweighter.ts';
import '@/ai/meta/applyVATShadowPolicy.ts';
import '@/ai/meta/dream-wake-shadow-integration.ts';
import '@/ai/archetypes/deadBin.ts';
import '@/ai/archetypes/deadBinInstance.ts';
import '@/ai/archetypes/selectionRules.ts';
import '@/ai/meta/archetypeLedgerReflect.ts';
import '@/ai/affect/valenceDrag.ts';
import '@/ai/meta/selfDoubtModulator.ts';
import '@/ai/meta/rhythmAdjust.ts';
import '@/ai/meta/cycleIntegrations.ts';
import '@/ai/meta/symbolicNumogramBridge.ts';
import '@/ai/numogram/numogramHD.ts';
import '@/ai/numogram/numogramTemporal.ts';
import '@/ai/meta/symbolicNumogramDashboard.ts';
import '@/ai/meta/hyperArchetypeCycle.ts';
import '@/ai/lucidityKernel.ts';
import '@/ai/meta/selfReportHarmonizer.ts';
import '@/ai/meta/numogramEntropyBalancer.ts';
import '@/ai/state/stateSchema.ts';
import '@/ai/state/cycleDecays.ts';
import '@/ai/meta/contractLoopBreaker.ts';
import '@/ai/meta/integratedResponseWrapper.ts';
import '@/ai/meta/recurrenceAndEntropyModifiers.ts';
import '@/ai/monitoring/types';
import '@/ai/monitoring/StepLogger';
import '@/ai/monitoring/Stage5Analyzer';
import '@/ai/monitoring/Stage5Monitor';
import '@/orchestration/LongHorizonRunner';
import '@/analysis/graph/SCC';
import '@/analysis/dynamics/CorrelationDimension';
import '@/analysis/classifiers/Stage6A';
import '@/experimental/patterns/DecimalPattern';
import '@/experimental/rhythm/RhythmSpectrum';
import '@/experimental/anomaly/TemporalAnomaly';
import '@/experimental/zones/ZoneMap';
import '@/ai/substrate/ProcessMemoryEngine.ts';
import '@/ai/substrate/CommitmentMemoryEngine.ts';
import '@/ai/substrate/TransitionSelector.ts';
import '@/ai/substrate/SubstrateMemoryCoordinator.ts';
import '@/ai/substrate/SubstrateTelemetryLogger.ts';
import { runExpressiveDialogueTurn, type DialogueTurnInput } from './dialogue/expressiveChatAdapter';
import '@/ai/metabolic/MetabolicOrgan.ts';
import '@/ai/metabolic/MetabolicOrganBridge.ts';
import '@/ai/governance/minimalDomainSwitch.ts';
import '@/ai/governance/normativeGuard.ts';
import '@/ai/telemetry/RegimeEstimator.ts';
import '@/ai/telemetry/NormativeLoadEstimator.ts';
import '@/ai/telemetry/DriftDetector.ts';
import '@/ai/telemetry/TelemetryBuffer.ts';
import '@/ai/telemetry/TelemetryOrchestrator.ts';
import '@/ai/telemetry/TelemetrySSEEmitter.ts';
import '@/ai/telemetry/firestorePersistence.ts';
import '@/ai/telemetry/functions.ts';
import '@/ai/telemetry/CoupledController.ts';

// This is the primary entry point for the chat interface.
export interface ChatRequest {
  userId: string;
  conversationId: string;
  message: string;
}

export interface ChatResponse {
  text: string | null;
  meta?: unknown;
}

export async function handleChatTurn(req: ChatRequest): Promise<ChatResponse> {
  const turn = await runExpressiveDialogueTurn({
    userId: req.userId,
    conversationId: req.conversationId,
    prompt: req.message,
  });

  return {
    text: turn.reply,
    meta: {
      decision: turn.rawDecision,
    },
  };
}

// You can expose control functions if needed, e.g., for a dev panel.
export async function stopAI() {
  // Placeholder for a stop function if one is implemented in the autonomy loop
}
