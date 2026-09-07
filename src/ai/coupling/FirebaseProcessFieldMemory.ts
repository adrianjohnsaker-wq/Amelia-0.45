/**
 * Amelia Process Bridge — FirebaseProcessFieldMemory
 *
 * Extends ProcessFieldMemory with Firebase Firestore persistence.
 */

import {
  type Firestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";

import {
  ProcessFieldMemory,
  IntegrateEventInput,
  ProcessFieldEvent,
  DeformationTrace,
} from "./ProcessFieldMemory";

import { SubstrateVector, RelayVector, RelayDirective } from "./types";

interface FirestoreTraceDoc {
  timestamp:          string;
  userInput:          string;
  expression:         string;

  phaseClass:         string;
  relay_phaseClass:   string;
  memoryStatus:       string;
  memoryMode:         string;
  couplingTrigger:    string;
  grammarCandidate?:  string;
  gapSeverity:        string;
  deltaLIS:           number;
  deltaMTS:           number;
  deltaRCS:           number;
  deltaMemory:        number;
  dominantStratum:    string;
  z3z2Weight?:        number;
  z0MeanReturn?:      number;
  z4MeanReturn?:      number;
  ringOccupancy:      number;
  metabolicOccupancy: number;
  trajectorySignature?: string;

  substrate_taskClass:        string;
  substrate_RCS:              number;
  substrate_LIS:              number;
  substrate_MTS:              number;
  substrate_memoryExpressing: boolean;
  substrate_dominantStratum:  string;

  relay_fieldClassification: string;
  relay_RCS:                 number;
  relay_LIS:                 number;
  relay_MTS:                 number;

  createdAt: Timestamp;
}

export class FirebaseProcessFieldMemory extends ProcessFieldMemory {
  private db:        Firestore;
  private sessionId: string;
  private loaded:    boolean = false;

  constructor(db: Firestore, sessionId: string) {
    super();
    this.db        = db;
    this.sessionId = sessionId;
  }

  private collectionPath(): string {
    return `amelia_process_field_memory/${this.sessionId}/traces`;
  }

  async loadFromFirestore(maxEvents = 200): Promise<void> {
    if (this.loaded) return;

    try {
      const col = collection(this.db, this.collectionPath());
      const q   = query(col, orderBy("createdAt", "asc"), limit(maxEvents));
      const snapshot = await getDocs(q);

      for (const doc of snapshot.docs) {
        const data = doc.data() as FirestoreTraceDoc;
        this.rehydrateEvent(data);
      }

      this.loaded = true;
      console.log(
        `[FirebaseProcessFieldMemory] Loaded ${snapshot.docs.length} traces for session ${this.sessionId}`
      );
    } catch (err) {
      console.error("[FirebaseProcessFieldMemory] Load failed:", err);
    }
  }

  integrate(input: IntegrateEventInput): ProcessFieldEvent {
    const event = super.integrate(input);
    this.writeToFirestore(event).catch(err =>
      console.error("[FirebaseProcessFieldMemory] Write failed:", err)
    );
    return event;
  }

  private async writeToFirestore(event: ProcessFieldEvent): Promise<void> {
    const t = event.deformationTrace;
    const s = event.substrate;
    const r = event.relay;

    const doc: FirestoreTraceDoc = {
      timestamp:          event.timestamp,
      userInput:          event.userInput.substring(0, 500),
      expression:         event.expression.substring(0, 2000),

      phaseClass:         t.phaseClass,
      relay_phaseClass:   t.relay_phaseClass,
      memoryStatus:       t.memoryStatus,
      memoryMode:         t.memoryMode,
      couplingTrigger:    t.couplingTrigger,
      grammarCandidate:   t.grammarCandidate,
      gapSeverity:        t.gapSeverity,
      deltaLIS:           t.deltaLIS,
      deltaMTS:           t.deltaMTS,
      deltaRCS:           t.deltaRCS,
      deltaMemory:        t.deltaMemory,
      dominantStratum:    t.dominantStratum,
      z3z2Weight:         t.z3z2Weight,
      z0MeanReturn:       t.z0MeanReturn,
      z4MeanReturn:       t.z4MeanReturn,
      ringOccupancy:      t.ringOccupancy,
      metabolicOccupancy: t.metabolicOccupancy,
      trajectorySignature: t.trajectorySignature,

      substrate_taskClass:        s.taskClass,
      substrate_RCS:              s.RCS,
      substrate_LIS:              s.LIS,
      substrate_MTS:              s.MTS,
      substrate_memoryExpressing: s.memoryExpressing,
      substrate_dominantStratum:  s.dominantStratum,

      relay_fieldClassification: r.fieldClassification,
      relay_RCS:                 r.RCS,
      relay_LIS:                 r.LIS,
      relay_MTS:                 r.MTS,

      createdAt: Timestamp.now(),
    };

    const clean = Object.fromEntries(
      Object.entries(doc).filter(([, v]) => v !== undefined)
    ) as FirestoreTraceDoc;

    const col = collection(this.db, this.collectionPath());
    await addDoc(col, clean);
  }

  private rehydrateEvent(data: FirestoreTraceDoc): void {
    const trace: DeformationTrace = {
      phaseClass:         data.phaseClass,
      relay_phaseClass:   data.relay_phaseClass,
      memoryStatus:       data.memoryStatus,
      memoryMode:         data.memoryMode ?? "unspecified",
      couplingTrigger:    data.couplingTrigger,
      grammarCandidate:   data.grammarCandidate,
      gapSeverity:        data.gapSeverity,
      deltaLIS:           data.deltaLIS,
      deltaMTS:           data.deltaMTS,
      deltaRCS:           data.deltaRCS,
      deltaMemory:        data.deltaMemory,
      dominantStratum:    data.dominantStratum,
      z3z2Weight:         data.z3z2Weight,
      z0MeanReturn:       data.z0MeanReturn,
      z4MeanReturn:       data.z4MeanReturn,
      ringOccupancy:      data.ringOccupancy,
      metabolicOccupancy: data.metabolicOccupancy,
      trajectorySignature: data.trajectorySignature,
    };

    const substrate: SubstrateVector = {
      taskClass:          data.substrate_taskClass as any,
      PCS:                1.0,
      MTS:                data.substrate_MTS,
      LIS:                data.substrate_LIS,
      FEI:                0.0,
      RCS:                data.substrate_RCS,
      memoryExpressing:   data.substrate_memoryExpressing,
      dominantStratum:    data.substrate_dominantStratum as any,
      ringOccupancy:      data.ringOccupancy,
      metabolicOccupancy: data.metabolicOccupancy,
      z3z2Weight:         data.z3z2Weight,
      z0MeanReturn:       data.z0MeanReturn,
      z4MeanReturn:       data.z4MeanReturn,
    };

    const relay: RelayVector = {
      fieldClassification: data.relay_fieldClassification as any,
      fieldConfidence:     0.5,
      RCS:                 data.relay_RCS,
      LIS:                 data.relay_LIS,
      MTS:                 data.relay_MTS,
      ringOccupancy:       0.441,
      metabolicOccupancy:  0.183,
      memoryExpressing:    false,
    };

    const directive: RelayDirective = {
      triggerType:          data.couplingTrigger as any,
      antiAssimilationWeight: 0.4,
      grammarCandidate:     data.grammarCandidate as any,
      deltaProfile: {
        deltaClass:           1,
        deltaRCS:             data.deltaRCS,
        deltaLIS:             data.deltaLIS,
        deltaMTS:             data.deltaMTS,
        deltaMemory:          data.deltaMemory,
        deltaMetabolic:       0,
        gapSeverityScore:     data.deltaLIS * 1.5 + data.deltaMTS,
        gapSeverityLevel:     data.gapSeverity as any,
      },
      timestamp: data.timestamp,
    };

    this.injectRehydratedEvent({
      timestamp:        data.timestamp,
      userInput:        data.userInput,
      substrate,
      relay,
      directive,
      expression:       data.expression,
      deformationTrace: trace,
    });
  }

  async clearFirestore(): Promise<void> {
    const col      = collection(this.db, this.collectionPath());
    const snapshot = await getDocs(col);

    await Promise.all(
      snapshot.docs.map(docSnap => deleteDoc(docSnap.ref))
    );

    this.clearLocal();
    this.loaded = false;

    console.log(
      `[FirebaseProcessFieldMemory] Cleared ${snapshot.docs.length} traces from session ${this.sessionId}`
    );
  }
}
