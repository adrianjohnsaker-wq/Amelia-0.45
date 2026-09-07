/* =========================================================
   ProcessFieldMemory.ts
   ---------------------------------------------------------
   Minimal Process Field Memory for Amelia
   ---------------------------------------------------------
   6-variable architecture:
   - selfLoopMomentum
   - corridorPressure
   - ringBias
   - latentReadiness
   - compressionDebt
   - releaseDebt

   Grounding:
   - Morphogenesis: unfinished formation persists
   - Process philosophy: memory as becoming, not storage
   - Numogram: zones as intensities / recurrent fields
   - QBism: altered expectancy under action
   ========================================================= */

export interface ProcessFieldInput {
  step: number;
  currentZone: string;

  // run-level / field-level measures
  selfLoopDepth: number;
  ringSignal: number;
  corridorSignal: number;
  latentSignal: number;
  releaseSignal: number;

  transitionSuccess: boolean;
  compressionActive: boolean;
}

export interface FieldModulation {
  thresholdShift: number;
  corridorAvailability: number;
  persistenceFactor: number;
  releaseVolatility: number;
  fieldStateLabel: string;
}

export interface FieldTelemetry {
  step: number;
  currentZone: string;
  selfLoopMomentum: number;
  corridorPressure: number;
  ringBias: number;
  latentReadiness: number;
  compressionDebt: number;
  releaseDebt: number;
  fieldStateLabel: string;
}

export interface ProcessFieldMemoryState {
  selfLoopMomentum: number;
  corridorPressure: number;
  ringBias: number;
  latentReadiness: number;
  compressionDebt: number;
  releaseDebt: number;

  prevSelfLoopDepth: number;
  prevRingSignal: number;
  prevCorridorSignal: number;
}

function clip(value: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, value));
}

export class ProcessFieldMemory {
  // -------------------------------------------------------
  // Core field variables
  // -------------------------------------------------------
  private selfLoopMomentum = 0.0;
  private corridorPressure = 0.0;
  private ringBias = 0.0;
  private latentReadiness = 0.0;
  private compressionDebt = 0.0;
  private releaseDebt = 0.0;

  // -------------------------------------------------------
  // Previous-step values for trend tracking
  // -------------------------------------------------------
  private prevSelfLoopDepth = 0.0;
  private prevRingSignal = 0.0;
  private prevCorridorSignal = 0.0;

  // -------------------------------------------------------
  // Lightweight telemetry buffer
  // -------------------------------------------------------
  private telemetry: FieldTelemetry[] = [];

  reset(): void {
    this.selfLoopMomentum = 0.0;
    this.corridorPressure = 0.0;
    this.ringBias = 0.0;
    this.latentReadiness = 0.0;
    this.compressionDebt = 0.0;
    this.releaseDebt = 0.0;

    this.prevSelfLoopDepth = 0.0;
    this.prevRingSignal = 0.0;
    this.prevCorridorSignal = 0.0;

    this.telemetry = [];
  }

  exportState(): ProcessFieldMemoryState {
    return {
      selfLoopMomentum: this.selfLoopMomentum,
      corridorPressure: this.corridorPressure,
      ringBias: this.ringBias,
      latentReadiness: this.latentReadiness,
      compressionDebt: this.compressionDebt,
      releaseDebt: this.releaseDebt,
      prevSelfLoopDepth: this.prevSelfLoopDepth,
      prevRingSignal: this.prevRingSignal,
      prevCorridorSignal: this.prevCorridorSignal
    };
  }

  importState(state: Partial<ProcessFieldMemoryState>): void {
    this.selfLoopMomentum = state.selfLoopMomentum ?? 0.0;
    this.corridorPressure = state.corridorPressure ?? 0.0;
    this.ringBias = state.ringBias ?? 0.0;
    this.latentReadiness = state.latentReadiness ?? 0.0;
    this.compressionDebt = state.compressionDebt ?? 0.0;
    this.releaseDebt = state.releaseDebt ?? 0.0;

    this.prevSelfLoopDepth = state.prevSelfLoopDepth ?? 0.0;
    this.prevRingSignal = state.prevRingSignal ?? 0.0;
    this.prevCorridorSignal = state.prevCorridorSignal ?? 0.0;
  }

  getRecentTelemetry(n = 50): FieldTelemetry[] {
    return this.telemetry.slice(-n);
  }

  update(input: ProcessFieldInput): FieldModulation {
    const {
      step,
      currentZone,
      selfLoopDepth,
      ringSignal,
      corridorSignal,
      latentSignal,
      releaseSignal,
      transitionSuccess,
      compressionActive
    } = input;

    // -----------------------------------------------------
    // 1. selfLoopMomentum
    // Memory of compression trend, not just current value
    // -----------------------------------------------------
    const slDelta = selfLoopDepth - this.prevSelfLoopDepth;
    this.selfLoopMomentum = clip(
      0.90 * this.selfLoopMomentum + 0.10 * slDelta,
      -1.0,
      1.0
    );

    // -----------------------------------------------------
    // 2. corridorPressure
    // Pressure toward directed passage / narrowing
    // -----------------------------------------------------
    const corridorDrive =
      0.45 * clip(selfLoopDepth) +
      0.35 * clip(corridorSignal) +
      0.20 * Math.max(0, this.latentReadiness);

    this.corridorPressure = clip(
      0.92 * this.corridorPressure + 0.08 * corridorDrive
    );

    // -----------------------------------------------------
    // 3. ringBias
    // Recurrent oscillatory basin pull
    // -----------------------------------------------------
    this.ringBias = clip(
      0.95 * this.ringBias + 0.05 * clip(ringSignal)
    );

    // -----------------------------------------------------
    // 4. latentReadiness
    // QBist-style expectancy under action
    // -----------------------------------------------------
    const readinessDrive =
      0.35 * Math.max(0, this.selfLoopMomentum) +
      0.30 * this.corridorPressure +
      0.20 * this.compressionDebt +
      0.15 * clip(latentSignal);

    this.latentReadiness = clip(
      0.90 * this.latentReadiness + 0.10 * readinessDrive
    );

    // -----------------------------------------------------
    // 5. compressionDebt
    // Unresolved compression carried forward
    // -----------------------------------------------------
    if (compressionActive && !transitionSuccess) {
      this.compressionDebt = clip(this.compressionDebt + 0.03);
    } else if (transitionSuccess) {
      this.compressionDebt = clip(this.compressionDebt * 0.70);
    } else {
      this.compressionDebt = clip(this.compressionDebt * 0.98);
    }

    // -----------------------------------------------------
    // 6. releaseDebt
    // Release that vented without transforming the field
    // -----------------------------------------------------
    if (
      releaseSignal > 0.25 &&
      !transitionSuccess &&
      this.corridorPressure < 0.40
    ) {
      this.releaseDebt = clip(this.releaseDebt + 0.03);
    } else if (transitionSuccess) {
      this.releaseDebt = clip(this.releaseDebt * 0.65);
    } else {
      this.releaseDebt = clip(this.releaseDebt * 0.98);
    }

    // -----------------------------------------------------
    // Update previous values
    // -----------------------------------------------------
    this.prevSelfLoopDepth = clip(selfLoopDepth);
    this.prevRingSignal = clip(ringSignal);
    this.prevCorridorSignal = clip(corridorSignal);

    // -----------------------------------------------------
    // Compute modulation output
    // -----------------------------------------------------
    const fieldStateLabel = this.deriveFieldState();

    const modulation: FieldModulation = {
      thresholdShift: this.computeThresholdShift(),
      corridorAvailability: this.computeCorridorAvailability(),
      persistenceFactor: this.computePersistenceFactor(),
      releaseVolatility: this.computeReleaseVolatility(),
      fieldStateLabel
    };

    this.telemetry.push({
      step,
      currentZone,
      selfLoopMomentum: this.selfLoopMomentum,
      corridorPressure: this.corridorPressure,
      ringBias: this.ringBias,
      latentReadiness: this.latentReadiness,
      compressionDebt: this.compressionDebt,
      releaseDebt: this.releaseDebt,
      fieldStateLabel
    });

    if (this.telemetry.length > 2000) {
      this.telemetry = this.telemetry.slice(-2000);
    }

    return modulation;
  }

  // =======================================================
  // Internal modulation functions
  // =======================================================

  private computeThresholdShift(): number {
    const value =
      0.40 * Math.max(0, this.selfLoopMomentum) +
      0.35 * this.corridorPressure +
      0.25 * this.compressionDebt;

    return clip(value);
  }

  private computeCorridorAvailability(): number {
    const value =
      0.45 * this.corridorPressure +
      0.35 * this.latentReadiness -
      0.30 * this.ringBias;

    return clip(value);
  }

  private computePersistenceFactor(): number {
    const value =
      0.50 * Math.max(0, this.selfLoopMomentum) +
      0.30 * this.compressionDebt +
      0.20 * this.corridorPressure;

    return clip(value);
  }

  private computeReleaseVolatility(): number {
    const value =
      0.55 * this.releaseDebt +
      0.20 * this.latentReadiness -
      0.25 * this.ringBias;

    return clip(value);
  }

  private deriveFieldState(): string {
    if (this.ringBias > 0.55 && this.corridorPressure < 0.35) {
      return "oscillatory";
    }

    if (this.selfLoopMomentum > 0.10 && this.compressionDebt > 0.20) {
      if (this.corridorPressure > 0.45 && this.latentReadiness > 0.35) {
        return "transition-ready";
      }
      return "compressing";
    }

    if (this.corridorPressure > 0.45 && this.latentReadiness > 0.25) {
      return "corridor-seeking";
    }

    if (
      this.ringBias > 0.45 &&
      (this.releaseDebt > 0.20 || this.compressionDebt > 0.20)
    ) {
      return "brittle-return";
    }

    if (this.releaseDebt > 0.30) {
      return "release-building";
    }

    return "indeterminate";
  }
}