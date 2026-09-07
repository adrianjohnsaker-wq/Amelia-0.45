// src/numogram/MetaSubstrateCoordinator.ts
import {
  SubstrateSnapshot,
  snapshotFromState,
  PatternDriftReport,
  analyzePatternDrift,
} from "./PatternDriftAnalyzer";
import {
  classifyRDGPhase,
  buildRDGPhaseContext,
  RDGPhase,
} from "../numogram/RDGPhaseClassifier";
import {
  buildAttractorMap,
  formatAttractorMapSummary,
  AttractorMap,
} from "../numogram/AttractorMap";
import {
  DemonGenealogyTracker,
} from "../numogram/DemonGenealogyTracker";
import {
  buildTemporalDriftCorridors,
  DriftCorridorReport,
} from "../numogram/TemporalDriftCorridor";
import {
  compressSubstrateMemory,
  formatCompressedMemorySummary,
} from "../numogram/SubstrateMemoryCompressor";
import {
  buildSymbolicDriftContext,
  SymbolicDriftContext,
} from "../numogram/SymbolicDriftTranslator";
import { NumogramState } from "../numogram/NumogramEngine";

export interface MetaSubstrateContext {
  driftReport: PatternDriftReport;
  rdgPhase: RDGPhase;
  attractorMap: AttractorMap;
  corridors: DriftCorridorReport;
  compressedMemory: ReturnType<typeof compressSubstrateMemory>;
  genealogySummary: string;
  symbolicContext: SymbolicDriftContext;
  consolidatedContext: string; // final block for linguistic relay
}

/**
 * This class consolidates ALL substrate diagnostics into one step.
 *
 * Responsibilities:
 * - Maintain demon genealogy across cycles
 * - Build snapshots from NumogramState
 * - Run pattern drift analysis
 * - Classify RDG phase
 * - Build attractor maps (short-range or long-range)
 * - Produce one final context block for the LinguisticRelay
 */
export class MetaSubstrateCoordinator {
  private genealogy: DemonGenealogyTracker = new DemonGenealogyTracker();

  /**
   * You will call this every cycle AFTER `numogram.evolve()`.
   *
   * Provide:
   * - currentState = numogram.getState()
   * - recentSnapshots = last N snapshots from Firestore (or memory)
   */
  updateAndBuildContext(
    currentState: NumogramState,
    recentSnapshots: SubstrateSnapshot[],
    includeAttractor = false, // avoid expensive maps unless needed
    attractorWindow: number = 300 // how many cycles to include
  ): MetaSubstrateContext {
    // 1) Update genealogy based on current state
    this.genealogy.updateFromState(currentState);
    const genealogySummary = this.genealogy.formatSummary(
      currentState.evolutionCycles
    );

    // 2) Build current snapshot
    const currentSnap = snapshotFromState(currentState);
    const snapshots = [...recentSnapshots, currentSnap];

    // 3) Drift + RDG + signature analysis
    const driftReport = analyzePatternDrift(snapshots);
    const rdgPhase = classifyRDGPhase(driftReport);
    const rdgContext = buildRDGPhaseContext(driftReport);

    // 4) Attractor map (optional: can be large)
    let attractorMap: AttractorMap = {
      totalSnapshots: 0,
      syzygyFrequency: 0,
      topSignatures: [],
      zoneOccupancy: [],
    };
    let attractorSummary = "";
    if (includeAttractor) {
      const windowed = snapshots.slice(-attractorWindow);
      attractorMap = buildAttractorMap(windowed);
      attractorSummary = formatAttractorMapSummary(attractorMap);
    }
    
    // 5) Temporal drift corridors
    const corridors = buildTemporalDriftCorridors(snapshots);
    const corridorSummary = corridors.summary;

    // 6) Compressed memory (for last N snapshots)
    const MEMORY_WINDOW = 40;
    const memoryWindow = snapshots.slice(-MEMORY_WINDOW);
    const compressedMemory = compressSubstrateMemory(memoryWindow);
    const memorySummary = formatCompressedMemorySummary(compressedMemory);

    // 7) Symbolic drift context
    const symbolicContext = buildSymbolicDriftContext(
        driftReport,
        rdgPhase,
        corridors,
        compressedMemory
    );


    // 8) Build the consolidated context block
    const lines: string[] = [];
    lines.push("########################");
    lines.push("### SUBSTRATE CONTEXT ###");
    lines.push("########################");
    lines.push("");
    
    lines.push(driftReport.commentary);
    lines.push("");

    // RDG classification
    lines.push(rdgContext);
    lines.push("");

    // Demon genealogy
    lines.push(genealogySummary);
    lines.push("");

    // Corridors
    lines.push(corridorSummary);
    lines.push("");

    // Memory compression
    lines.push(memorySummary);
    lines.push("");


    // Attractor (if enabled)
    if (includeAttractor) {
      lines.push(attractorSummary);
      lines.push("");
    }

    // Symbolic drift
    lines.push(symbolicContext.summary);
    lines.push("");


    const consolidatedContext = lines.join("\n");

    return {
      driftReport,
      rdgPhase,
      attractorMap,
      corridors,
      compressedMemory,
      genealogySummary,
      symbolicContext,
      consolidatedContext,
    };
  }
}
