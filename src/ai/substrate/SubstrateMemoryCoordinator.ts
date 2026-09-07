// src/ai/substrate/SubstrateMemoryCoordinator.ts
// Unified PM1 + PM2.1 + RA integration with Firebase Persistence.

import {
  CommitmentMemoryEngine,
  ZoneId,
  UnfinishedState,
  ProcessTrace
} from "./CommitmentMemoryEngine";
import { RetentionAsymmetryEngine, type RetentionTelemetry } from "./RetentionAsymmetryEngine";
import { TransitionSelector, TransitionScoreMap } from "./TransitionSelector";
import { ProcessMemoryEngine } from "./ProcessMemoryEngine";
import { SubstrateSession, PersistenceLoadResult, PersistenceSaveResult } from "./SubstrateStatePersistence";
import { initializeFirebase } from "@/firebase";

export interface PM1LikeTrace {
  step: number;
  currentZone: ZoneId;
  phaseDirection?: string;
  exitDistribution?: Partial<Record<ZoneId, number>>;
  entropy?: number;
  selfLoopDepth?: number;
  gammaOccupancy?: number;
  btl?: number;
  confidence?: number;
}

export interface CoordinatorStepInput {
  runId: string;
  step: number;
  currentZone: ZoneId;
  transitionScores: TransitionScoreMap;
  recentPM1Traces: PM1LikeTrace[];
  observedSelfLoopDepth: number;
}

export interface CoordinatorStepOutput {
  nextZone: ZoneId;
  selectionTelemetry: ReturnType<TransitionSelector["lastTelemetry"]>;
  commitmentTelemetry: any;
  retentionTelemetry: RetentionTelemetry[];
}

export class SubstrateMemoryCoordinator {
  public processMemoryEngine: ProcessMemoryEngine;
  private commitmentMemoryEngine: CommitmentMemoryEngine;
  private retentionAsymmetryEngine: RetentionAsymmetryEngine;
  private transitionSelector: TransitionSelector;
  private session: SubstrateSession | null = null;

  constructor(userId?: string) {
    this.processMemoryEngine = new ProcessMemoryEngine();
    this.commitmentMemoryEngine = new CommitmentMemoryEngine();
    this.retentionAsymmetryEngine = new RetentionAsymmetryEngine();
    this.transitionSelector = new TransitionSelector(
      this.commitmentMemoryEngine,
      this.retentionAsymmetryEngine
    );

    if (userId) {
      const { firestore } = initializeFirebase();
      this.session = new SubstrateSession(firestore, `user_${userId}`, {
        processMemory: this.processMemoryEngine,
        commitmentMemory: this.commitmentMemoryEngine,
        retentionAsymmetry: this.retentionAsymmetryEngine,
      });
    }
  }

  public async restore(): Promise<PersistenceLoadResult | null> {
    if (!this.session) return null;
    return this.session.restore();
  }

  public async checkpoint(currentSl?: number): Promise<PersistenceSaveResult | null> {
    if (!this.session) return null;
    return this.session.checkpoint(currentSl);
  }

  public step(input: CoordinatorStepInput): CoordinatorStepOutput {
    this.maybeSaveUnfinishedState(input);

    const processKey = this.makeProcessKey(input.runId, input.currentZone);

    const nextZone = this.transitionSelector.selectNextZone(
      processKey,
      input.currentZone,
      input.step,
      input.transitionScores,
      input.observedSelfLoopDepth
    );

    const unfinished = this.commitmentMemoryEngine.getUnfinishedState(processKey);

    return {
      nextZone,
      selectionTelemetry: this.transitionSelector.lastTelemetry,
      commitmentTelemetry: unfinished ? { ...unfinished } : null,
      retentionTelemetry: this.retentionAsymmetryEngine.getLastTelemetry()
    };
  }

  public exportRuntimeSnapshot(): any {
    return {
      processMemory: this.processMemoryEngine.exportSnapshot(),
      commitmentMemory: this.commitmentMemoryEngine.exportSnapshot(),
      retention: this.retentionAsymmetryEngine.exportSnapshot()
    };
  }

  public importRuntimeSnapshot(snapshot: any): void {
    if (snapshot) {
      if (snapshot.processMemory) this.processMemoryEngine.importSnapshot(snapshot.processMemory);
      if (snapshot.commitmentMemory) this.commitmentMemoryEngine.importSnapshot(snapshot.commitmentMemory);
      if (snapshot.retention) this.retentionAsymmetryEngine.importSnapshot(snapshot.retention);
    }
  }

  private maybeSaveUnfinishedState(input: CoordinatorStepInput): void {
    const traces = input.recentPM1Traces.slice(-4);
    if (traces.length === 0) return;

    const latest = traces[traces.length - 1];
    const phase = latest.phaseDirection ?? "";

    if (!(phase === "pre_lock" || phase === "near_lock")) return;

    const state: UnfinishedState = {
      runId: input.runId,
      sourceZone: input.currentZone,
      candidateExit: this.inferCandidateExit(latest.exitDistribution ?? {}),
      confidence: latest.confidence ?? 0.5,
      savedAtStep: input.step,
      traces: traces.map((t): ProcessTrace => ({
        step: t.step,
        currentZone: t.currentZone,
        exitDistribution: t.exitDistribution,
        entropy: t.entropy,
        selfLoopDepth: t.selfLoopDepth,
        gammaOccupancy: t.gammaOccupancy,
        btl: t.btl
      }))
    };

    const key = this.makeProcessKey(input.runId, input.currentZone);
    this.commitmentMemoryEngine.saveUnfinishedState(key, state);
  }

  private makeProcessKey(runId: string, zone: ZoneId): string {
    return `${runId}:${zone}`;
  }

  private inferCandidateExit(dist: Partial<Record<ZoneId, number>>): ZoneId | null {
    const entries = Object.entries(dist) as [ZoneId, number][];
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - (a[1] || 0));
    return entries[0][0] as ZoneId;
  }
}
