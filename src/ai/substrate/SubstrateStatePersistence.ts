// src/ai/substrate/SubstrateStatePersistence.ts
// Firebase disk persistence for the full substrate memory stack.

import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import type { ProcessMemoryEngine } from "./ProcessMemoryEngine";
import type { CommitmentMemoryEngine } from "./CommitmentMemoryEngine";
import type { RetentionAsymmetryEngine } from "./RetentionAsymmetryEngine";

export type PersistenceOutcome =
  | "loaded"
  | "loaded_with_decay"
  | "not_found"
  | "expired"
  | "error";

export interface PersistenceLoadResult {
  outcome: PersistenceOutcome;
  pm1Loaded: boolean;
  pm2Loaded: boolean;
  raLoaded: boolean;
  ageMs: number | null;
  decayApplied: number | null;
  errorMessage?: string;
}

export interface PersistenceSaveResult {
  saved: boolean;
  pm1Written: boolean;
  pm2Written: boolean;
  raWritten: boolean;
  skippedReason?: string;
  errorMessage?: string;
}

export interface PersistenceMeta {
  instanceKey: string;
  savedAt: number;
  sessionId: string;
  pm1HasUnfinished: boolean;
  pm2HasActive: boolean;
  raFloorWasActive: boolean;
  slAtSave: number | null;
}

export interface SubstrateStatePersistenceConfig {
  maxAgeMs: number;
  decayPerMs: number;
  minDecayThreshold: number;
  saveOnlyIfWorthPreserving: boolean;
  maxTracesToPersist: number;
  maxSnapshotsToPersist: number;
}

const DEFAULT_CONFIG: SubstrateStatePersistenceConfig = {
  maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  decayPerMs: 0.00000015,            // Conservative decay over time (approx 0.5 per 12 hours)
  minDecayThreshold: 0.08,
  saveOnlyIfWorthPreserving: true,
  // RESEARCH UPLIFT: Persisting more history to Firestore for cross-run stability
  maxTracesToPersist: 128,
  maxSnapshotsToPersist: 32,
};

function safeNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class SubstrateStatePersistence {
  private readonly config: SubstrateStatePersistenceConfig;
  private readonly sessionId: string;

  constructor(
    private readonly db: Firestore,
    private readonly instanceKey: string,
    config?: Partial<SubstrateStatePersistenceConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };
    this.sessionId = generateSessionId();
  }

  public async save(
    pm1: ProcessMemoryEngine,
    pm2: CommitmentMemoryEngine,
    ra: RetentionAsymmetryEngine,
    currentSl?: number
  ): Promise<PersistenceSaveResult> {
    try {
      const pm1Snapshot = pm1.exportSnapshot();
      const pm2Snapshot = pm2.exportSnapshot();
      const raSnapshot = ra.exportSnapshot();

      const pm1HasUnfinished = Boolean(pm1Snapshot.unfinished?.active);
      const pm2HasActive = Boolean(pm2Snapshot.current?.active);
      const raFloorWasActive = Object.values(raSnapshot.zoneStates || {}).some(
        (s: any) => s.retentionFloorActive
      );

      if (this.config.saveOnlyIfWorthPreserving) {
        const worthSaving =
          pm1HasUnfinished ||
          pm2HasActive ||
          raFloorWasActive ||
          safeNumber(currentSl) > 0.25;

        if (!worthSaving) {
          return {
            saved: false,
            pm1Written: false,
            pm2Written: false,
            raWritten: false,
            skippedReason: "No active memory state and sl below preservation threshold",
          };
        }
      }

      const now = Date.now();
      const meta: PersistenceMeta = {
        instanceKey: this.instanceKey,
        savedAt: now,
        sessionId: this.sessionId,
        pm1HasUnfinished,
        pm2HasActive,
        raFloorWasActive,
        slAtSave: currentSl ?? null,
      };

      const trimmedPm1 = {
        ...pm1Snapshot,
        traces: (pm1Snapshot.traces || []).slice(-this.config.maxTracesToPersist),
      };

      const trimmedPm2 = {
        ...pm2Snapshot,
        snapshots: (pm2Snapshot.snapshots || []).slice(-this.config.maxSnapshotsToPersist),
      };

      const basePath = `substrate/${this.instanceKey}`;

      await Promise.all([
        setDoc(doc(this.db, `${basePath}/meta`), {
          ...meta,
          savedAt: serverTimestamp(),
          savedAtMs: now,
        }),
        setDoc(doc(this.db, `${basePath}/pm1`), {
          snapshot: JSON.stringify(trimmedPm1),
          savedAtMs: now,
        }),
        setDoc(doc(this.db, `${basePath}/pm2`), {
          snapshot: JSON.stringify(trimmedPm2),
          savedAtMs: now,
        }),
        setDoc(doc(this.db, `${basePath}/ra`), {
          snapshot: JSON.stringify(raSnapshot),
          savedAtMs: now,
        }),
      ]);

      return { saved: true, pm1Written: true, pm2Written: true, raWritten: true };
    } catch (err) {
      console.error("SubstrateStatePersistence save() error:", err);
      return { saved: false, pm1Written: false, pm2Written: false, raWritten: false, errorMessage: String(err) };
    }
  }

  public async load(
    pm1: ProcessMemoryEngine,
    pm2: CommitmentMemoryEngine,
    ra: RetentionAsymmetryEngine
  ): Promise<PersistenceLoadResult> {
    try {
      const basePath = `substrate/${this.instanceKey}`;
      const metaDoc = await getDoc(doc(this.db, `${basePath}/meta`));

      if (!metaDoc.exists()) {
        return { outcome: "not_found", pm1Loaded: false, pm2Loaded: false, raLoaded: false, ageMs: null, decayApplied: null };
      }

      const metaData = metaDoc.data() as PersistenceMeta & { savedAtMs: number };
      const savedAtMs = safeNumber(metaData.savedAtMs, 0);
      const now = Date.now();
      const ageMs = now - savedAtMs;

      if (ageMs > this.config.maxAgeMs) {
        return { outcome: "expired", pm1Loaded: false, pm2Loaded: false, raLoaded: false, ageMs, decayApplied: null };
      }

      const rawDecay = Math.pow(1 - this.config.decayPerMs, ageMs);
      const decayApplied = clamp(rawDecay, 0, 1);

      if (decayApplied < this.config.minDecayThreshold) {
        return { outcome: "expired", pm1Loaded: false, pm2Loaded: false, raLoaded: false, ageMs, decayApplied };
      }

      const [pm1Doc, pm2Doc, raDoc] = await Promise.all([
        getDoc(doc(this.db, `${basePath}/pm1`)),
        getDoc(doc(this.db, `${basePath}/pm2`)),
        getDoc(doc(this.db, `${basePath}/ra`)),
      ]);

      let pm1Loaded = false;
      let pm2Loaded = false;
      let raLoaded = false;

      if (pm1Doc.exists()) {
        try {
          const raw = JSON.parse((pm1Doc.data() as any).snapshot);
          pm1.importSnapshot(this.applyDecayToPm1Snapshot(raw, decayApplied));
          pm1Loaded = true;
        } catch (e) {
          console.error("Failed to load PM1 snapshot:", e);
        }
      }

      if (pm2Doc.exists()) {
        try {
          const raw = JSON.parse((pm2Doc.data() as any).snapshot);
          pm2.importSnapshot(this.applyDecayToPm2Snapshot(raw, decayApplied));
          pm2Loaded = true;
        } catch (e) {
          console.error("Failed to load PM2 snapshot:", e);
        }
      }

      if (raDoc.exists()) {
        try {
          const raw = JSON.parse((raDoc.data() as any).snapshot);
          ra.importSnapshot(this.applyDecayToRaSnapshot(raw, decayApplied));
          raLoaded = true;
        } catch (e) {
          console.error("Failed to load RA snapshot:", e);
        }
      }

      return { outcome: decayApplied < 1.0 ? "loaded_with_decay" : "loaded", pm1Loaded, pm2Loaded, raLoaded, ageMs, decayApplied };
    } catch (err) {
      console.error("SubstrateStatePersistence load() error:", err);
      return { outcome: "error", pm1Loaded: false, pm2Loaded: false, raLoaded: false, ageMs: null, decayApplied: null, errorMessage: String(err) };
    }
  }

  public async clear(): Promise<void> {
    const basePath = `substrate/${this.instanceKey}`;
    await Promise.all([
      deleteDoc(doc(this.db, `${basePath}/meta`)),
      deleteDoc(doc(this.db, `${basePath}/pm1`)),
      deleteDoc(doc(this.db, `${basePath}/pm2`)),
      deleteDoc(doc(this.db, `${basePath}/ra`)),
    ]);
  }

  private applyDecayToPm1Snapshot(snapshot: any, decay: number): any {
    if (!snapshot) return snapshot;
    const result = JSON.parse(JSON.stringify(snapshot));
    if (result.unfinished && result.unfinished.active) {
      result.unfinished.decay = clamp(safeNumber(result.unfinished.decay, 1) * decay, 0, 1);
      result.unfinished.completionPressure = clamp(safeNumber(result.unfinished.completionPressure, 0) * decay, 0, 1);
      if (result.unfinished.decay < 0.08) result.unfinished.active = false;
    }
    if (Array.isArray(result.traces)) {
      result.traces = result.traces.map((trace: any) => ({
        ...trace,
        selfLoopDepthTrend: safeNumber(trace.selfLoopDepthTrend) * decay,
        gammaTrend: safeNumber(trace.gammaTrend) * decay,
        ringTrend: safeNumber(trace.ringTrend) * decay,
        btlTrend: safeNumber(trace.btlTrend) * decay,
      }));
    }
    return result;
  }

  private applyDecayToPm2Snapshot(snapshot: any, decay: number): any {
    if (!snapshot) return snapshot;
    const result = JSON.parse(JSON.stringify(snapshot));
    if (result.current && result.current.active) {
      result.current.decay = clamp(safeNumber(result.current.decay, 1) * decay, 0, 1);
      result.current.confidence = clamp(safeNumber(result.current.confidence, 0) * decay, 0, 1);
      if (result.current.decay < 0.08) result.current.active = false;
      if (Array.isArray(result.current.favoredTransitions)) {
        result.current.favoredTransitions = result.current.favoredTransitions.map((t: any) => ({
          ...t,
          weight: clamp(safeNumber(t.weight) * decay, 0, 1),
        }));
      }
    }
    return result;
  }

  private applyDecayToRaSnapshot(snapshot: any, decay: number): any {
    if (!snapshot || !snapshot.zoneStates) return snapshot;
    const result = JSON.parse(JSON.stringify(snapshot));
    for (const zone of Object.keys(result.zoneStates)) {
      const state = result.zoneStates[zone];
      const rawSl = safeNumber(state.rawSelfLoopProb, 0);
      const retained = safeNumber(state.retainedSelfLoopProb, rawSl);
      result.zoneStates[zone].retainedSelfLoopProb = clamp(rawSl + (retained - rawSl) * decay, 0, 1);
      result.zoneStates[zone].priorPeakSelfLoop = clamp(safeNumber(state.priorPeakSelfLoop, 0) * Math.sqrt(decay), 0, 1);
      const ageStepsEquivalent = Math.floor((1 - decay) * 500);
      result.zoneStates[zone].retentionWindowAge = clamp(safeNumber(state.retentionWindowAge, 0) + ageStepsEquivalent, 0, 600);
      if (result.zoneStates[zone].priorPeakSelfLoop < 0.35 * 0.85) {
        result.zoneStates[zone].retentionFloorActive = false;
        result.zoneStates[zone].decayMode = "inactive";
      }
    }
    return result;
  }
}

export class SubstrateSession {
  private persistence: SubstrateStatePersistence;
  constructor(
    db: Firestore,
    instanceKey: string,
    private readonly engines: {
      processMemory: ProcessMemoryEngine;
      commitmentMemory: CommitmentMemoryEngine;
      retentionAsymmetry: RetentionAsymmetryEngine;
    },
    config?: Partial<SubstrateStatePersistenceConfig>
  ) {
    this.persistence = new SubstrateStatePersistence(db, instanceKey, config);
  }
  public async restore(): Promise<PersistenceLoadResult> {
    return this.persistence.load(this.engines.processMemory, this.engines.commitmentMemory, this.engines.retentionAsymmetry);
  }
  public async checkpoint(currentSl?: number): Promise<PersistenceSaveResult> {
    return this.persistence.save(this.engines.processMemory, this.engines.commitmentMemory, this.engines.retentionAsymmetry, currentSl);
  }
  public async clear(): Promise<void> {
    return this.persistence.clear();
  }
}
