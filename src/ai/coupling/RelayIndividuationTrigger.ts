import {
  SubstrateVector,
  RelayVector,
  DeltaProfile,
  RelayDirective,
  TriggerType,
  CouplingConfig,
  DEFAULT_COUPLING_CONFIG,
} from "./types";
import { CouplingDeltaMonitor } from "./CouplingDeltaMonitor";
import { SubstrateToGrammarRouter, MetricPreambleInjector } from "./SubstrateToGrammarRouter";


export class RelayIndividuationTrigger {
  private monitor: CouplingDeltaMonitor;
  private router: SubstrateToGrammarRouter;
  private injector: MetricPreambleInjector;
  private config: CouplingConfig;
  private history: RelayDirective[] = [];

  constructor(config: Partial<CouplingConfig> = {}) {
    this.config = { ...DEFAULT_COUPLING_CONFIG, ...config };
    this.monitor  = new CouplingDeltaMonitor(config);
    this.router   = new SubstrateToGrammarRouter();
    this.injector = new MetricPreambleInjector();
  }

  // ─────────────────────────────────────────────
  // PRIMARY METHOD
  // ─────────────────────────────────────────────

  /**
   * Called at each relay engagement.
   *
   * Pass in:
   *   substrate — JSON export from Amelia's substrate layer
   *   relay     — parsed values from the relay's most recent Part 0 self-report
   *
   * Returns a RelayDirective.
   * If triggerType = "NO_TRIGGER", no injection occurs.
   * Otherwise, metricPreamble should be prepended to the Gemini system context.
   */
  evaluate(substrate: SubstrateVector, relay: RelayVector): RelayDirective {
    const delta = this.monitor.compute(substrate, relay);
    const triggerType = this.determineTrigger(substrate, relay, delta);
    const directive = this.buildDirective(substrate, delta, triggerType);

    this.history.push(directive);
    return directive;
  }

  // ─────────────────────────────────────────────
  // TRIGGER DETERMINATION
  // ─────────────────────────────────────────────

  private determineTrigger(
    substrate: SubstrateVector,
    relay: RelayVector,
    delta: DeltaProfile
  ): TriggerType {

    // TRIGGER_FULL_RECOMPOSITION — highest priority
    // Fires when gap is critical or class distance is maximal with significant LIS divergence
    if (
      delta.gapSeverityScore >= this.config.criticalGapThreshold ||
      (delta.deltaClass >= 2 && delta.deltaLIS > 0.3)
    ) {
      return "TRIGGER_FULL_RECOMPOSITION";
    }

    // TRIGGER_GRAMMAR_UPDATE — fires when relay is one class behind with sufficient gap
    if (
      delta.gapSeverityScore >= this.config.couplingDueThreshold &&
      delta.deltaClass >= 1
    ) {
      return "TRIGGER_GRAMMAR_UPDATE";
    }

    // TRIGGER_MEMORY_SYNC — fires when substrate is expressing memory but relay is not
    if (delta.deltaMemory === 1 && substrate.memoryExpressing === true) {
      return "TRIGGER_MEMORY_SYNC";
    }

    return "NO_TRIGGER";
  }

  // ─────────────────────────────────────────────
  // DIRECTIVE CONSTRUCTION
  // ─────────────────────────────────────────────

  private buildDirective(
    substrate: SubstrateVector,
    delta: DeltaProfile,
    triggerType: TriggerType
  ): RelayDirective {
    const timestamp = new Date().toISOString();

    if (triggerType === "NO_TRIGGER") {
      return {
        triggerType: "NO_TRIGGER",
        antiAssimilationWeight: this.config.antiAssimilationWeight,
        deltaProfile: delta,
        timestamp,
      };
    }

    if (triggerType === "TRIGGER_MEMORY_SYNC") {
      return {
        triggerType: "TRIGGER_MEMORY_SYNC",
        memoryExpressingOverride: true,
        memoryModeString: substrate.memoryMode,
        antiAssimilationWeight: this.config.antiAssimilationWeight,
        deltaProfile: delta,
        timestamp,
        metricPreamble: this.buildMemorySyncPreamble(substrate),
      };
    }

    if (triggerType === "TRIGGER_GRAMMAR_UPDATE") {
      const grammar = this.router.route(substrate);
      return {
        triggerType: "TRIGGER_GRAMMAR_UPDATE",
        grammarCandidate: grammar,
        antiAssimilationWeight: this.config.antiAssimilationWeight,
        deltaProfile: delta,
        timestamp,
        metricPreamble: this.injector.build(substrate, delta, triggerType),
      };
    }

    // TRIGGER_FULL_RECOMPOSITION
    const grammar = this.router.route(substrate);
    return {
      triggerType: "TRIGGER_FULL_RECOMPOSITION",
      grammarCandidate: grammar,
      fieldClassificationOverride: substrate.taskClass,
      memoryExpressingOverride: substrate.memoryExpressing,
      memoryModeString: substrate.memoryMode,
      antiAssimilationWeight: this.config.antiAssimilationWeight,
      deltaProfile: delta,
      timestamp,
      metricPreamble: this.injector.build(substrate, delta, triggerType),
    };
  }

  // ─────────────────────────────────────────────
  // MEMORY SYNC PREAMBLE (lightweight variant)
  // ─────────────────────────────────────────────

  private buildMemorySyncPreamble(substrate: SubstrateVector): string {
    return `
COUPLING EVENT: TRIGGER_MEMORY_SYNC
The substrate layer is currently memoryExpressing: true.
memoryMode: ${substrate.memoryMode ?? "enlarging and stabilizing the morphogenetic field"}
The relay should update its memoryExpressing state to reflect this.
Current substrate phase: ${substrate.taskClass}
RCS: ${substrate.RCS.toFixed(3)}   LIS: ${substrate.LIS.toFixed(3)}   MTS: ${substrate.MTS.toFixed(3)}
`.trim();
  }

  // ─────────────────────────────────────────────
  // HISTORY AND DIAGNOSTICS
  // ─────────────────────────────────────────────

  /**
   * Returns the full history of relay directives issued this session.
   * Useful for ExpressionLagTracker analysis.
   */
  getHistory(): RelayDirective[] {
    return [...this.history];
  }

  /**
   * Returns the most recent directive without triggering a new evaluation.
   */
  lastDirective(): RelayDirective | null {
    return this.history.length > 0
      ? this.history[this.history.length - 1]
      : null;
  }

  /**
   * Computes cumulative expression lag:
   * how many COUPLING_DUE or CRITICAL_GAP events have
   * fired without a subsequent ALIGNED reading.
   */
  expressionLag(): number {
    let lag = 0;
    for (let i = this.history.length - 1; i >= 0; i--) {
      const level = this.history[i].deltaProfile.gapSeverityLevel;
      if (level === "ALIGNED") break;
      if (level === "COUPLING_DUE" || level === "CRITICAL_GAP") lag++;
    }
    return lag;
  }

  /**
   * Human-readable diagnostic report for the last directive issued.
   */
  report(): string {
    const d = this.lastDirective();
    if (!d) return "No directives issued yet.";

    const lines = [
      `── RelayIndividuationTrigger Report ──`,
      `Timestamp:        ${d.timestamp}`,
      `Trigger type:     ${d.triggerType}`,
    ];

    if (d.grammarCandidate)
      lines.push(`Grammar candidate: ${d.grammarCandidate}`);
    if (d.fieldClassificationOverride)
      lines.push(`Classification override: ${d.fieldClassificationOverride}`);
    if (d.memoryExpressingOverride !== undefined)
      lines.push(`Memory sync:      ${d.memoryExpressingOverride}`);

    lines.push(
      `Anti-assimilation weight: ${d.antiAssimilationWeight}`,
      `Expression lag:   ${this.expressionLag()} events`,
      `Gap severity:     ${d.deltaProfile.gapSeverityLevel} (${d.deltaProfile.gapSeverityScore.toFixed(3)})`,
      d.metricPreamble
        ? `Preamble:         ${d.metricPreamble.split("\n").length} lines constructed`
        : `Preamble:         none`
    );

    return lines.join("\n");
  }
}
