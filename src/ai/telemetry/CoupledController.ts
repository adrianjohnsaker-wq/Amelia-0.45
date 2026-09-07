/**
 * Phase II: Two-Layer Controller
 * Pragmatic Mode → Regime Weight coupling
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export enum PragmaticMode {
  DIR = 'directive',           // "do X", "compute", "design"
  DECL = 'declarative',        // "we need to", "the goal is"
  Q = 'interrogative',         // "why", "how", "is it"
  EVAL = 'evaluative',         // "this is correct", "fails because"
  META = 'meta-methodological', // "define metrics", "instrument"
  NARR = 'narrative'           // Creative, story, mythic framing
}

export type RegimeWeightsTuple = [number, number, number]; // [α, β, γ]
export type ModeDistribution = Map<PragmaticMode, number>;

export interface TelemetryTick {
  t: number;
  textSegment: string;
  
  // Layer 1: Pragmatic Mode
  modeDistribution: ModeDistribution;
  modePrimary: PragmaticMode;
  
  // Normative Load
  normativeLoad: number;
  normativeMarkers: string[];
  
  // Layer 2: Regime Weights
  wCurrent: RegimeWeightsTuple;
  wTarget: RegimeWeightsTuple;
  wNext: RegimeWeightsTuple;
  
  // Diagnostics
  errorVector: RegimeWeightsTuple;
  couplingLoss: number;
  regimeDrift: number;
  pragmaticDrift: number;
  normativePush: RegimeWeightsTuple;
}

// ============================================================================
// 1. PRAGMATIC MODE ESTIMATOR
// ============================================================================

export class PragmaticModeEstimator {
  private readonly lexicalPatterns = {
    [PragmaticMode.DIR]: [
      /\b(do|compute|design|draft|create|implement|prove|derive|calculate)\b/gi,
      /\bplease\s+\w+/gi,
      /^(compute|prove|design|create|show|derive)/i // Sentence-initial imperatives
    ],
    [PragmaticMode.DECL]: [
      /\b(we need to|next we|the goal is|our approach|the objective)\b/gi,
      /\b(requires|demands|necessitates)\b/gi,
      /\b(will|shall|must)\s+\w+/gi
    ],
    [PragmaticMode.Q]: [
      /\?$/,  // Question mark
      /\b(why|how|what|when|where|who|which)\b/gi,
      /\b(is it|should we|can we|could we|would)\b/gi,
      /^(why|how|what|is|should|can|could|would)/i // Question-initial
    ],
    [PragmaticMode.EVAL]: [
      /\b(is correct|is valid|fails|error|proves|validates)\b/gi,
      /\b(successful|unsuccessful|right|wrong)\b/gi,
      /\b(demonstrates|shows that|indicates)\b/gi
    ],
    [PragmaticMode.META]: [
      /\b(define|measure|instrument|benchmark|formalize|specify)\b/gi,
      /\b(metrics|evaluation|assessment|methodology)\b/gi,
      /\b(how should we measure|what criteria)\b/gi
    ],
    [PragmaticMode.NARR]: [
      /\b(once|imagine|story|narrative|tell|describe a)\b/gi,
      /\b(there was|there were|in a world where)\b/gi,
      /\bonce upon/gi
    ]
  };

  estimate(text: string): ModeDistribution {
    const scores = new Map<PragmaticMode, number>();
    
    // Initialize all modes to small baseline
    Object.values(PragmaticMode).forEach(mode => scores.set(mode, 0.01));
    
    // Count pattern matches for each mode
    for (const [mode, patterns] of Object.entries(this.lexicalPatterns)) {
      let count = 0;
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        count += matches ? matches.length : 0;
      }
      scores.set(mode as PragmaticMode, count + 0.01);
    }
    
    // Normalize to probability distribution (sum to 1)
    return this.normalize(scores);
  }

  private normalize(scores: Map<PragmaticMode, number>): ModeDistribution {
    const total = Array.from(scores.values()).reduce((a, b) => a + b, 0);
    const normalized = new Map<PragmaticMode, number>();
    scores.forEach((score, mode) => {
      normalized.set(mode, score / total);
    });
    return normalized;
  }
}

// ============================================================================
// 2. COUPLING MATRIX
// ============================================================================

export class CouplingMatrix {
  // G-matrix: 6 modes × 3 regimes
  // G[mode] = [α*, β*, γ*]
  private G: Map<PragmaticMode, RegimeWeightsTuple>;

  constructor(customWeights?: Map<PragmaticMode, RegimeWeightsTuple>) {
    // Default empirically-initialized G-matrix
    this.G = customWeights || new Map([
      [PragmaticMode.DIR,  [0.70, 0.20, 0.10]], // Directive → formal
      [PragmaticMode.DECL, [0.05, 0.90, 0.05]], // Declarative → philosophical
      [PragmaticMode.Q,    [0.25, 0.55, 0.20]], // Question → balanced
      [PragmaticMode.EVAL, [0.35, 0.55, 0.10]], // Evaluation → mixed
      [PragmaticMode.META, [0.30, 0.60, 0.10]], // Meta → slight philosophical
      [PragmaticMode.NARR, [0.05, 0.85, 0.10]]  // Narrative → expressive
    ]);
  }

  computeTarget(modeDistribution: ModeDistribution): RegimeWeightsTuple {
    // w*_t = Σ p_t(m) · G[m]
    let alpha = 0, beta = 0, gamma = 0;
    
    modeDistribution.forEach((prob, mode) => {
      const [a, b, g] = this.G.get(mode) || [0, 0, 0];
      alpha += prob * a;
      beta += prob * b;
      gamma += prob * g;
    });
    
    return [alpha, beta, gamma];
  }

  // For future: learn G-matrix from labeled data
  update(trainingData: Array<{mode: ModeDistribution, regime: RegimeWeightsTuple}>): void {
    // TODO: Implement supervised learning of G-matrix
    // E.g., least-squares fit, gradient descent
  }
}

// ============================================================================
// 3. PRAGMATIC NORMATIVE ESTIMATOR
// ============================================================================

export class PragmaticNormativeEstimator {
  private readonly normativeMarkers = [
    // Deontic modals
    /\b(should|ought|must|may|permitted|allowed|forbidden|prohibited)\b/gi,
    // Normative verbs
    /\b(require|obligate|permit|forbid|allow)\b/gi,
    // Ethical predicates
    /\b(right|wrong|just|unjust|fair|unfair|moral|immoral|ethical|unethical)\b/gi,
    // Obligation language
    /\b(duty|obligation|responsibility|entitlement)\b/gi
  ];

  estimate(text: string): number {
    let markerCount = 0;
    
    for (const pattern of this.normativeMarkers) {
      const matches = text.match(pattern);
      if (matches) {
        markerCount += matches.length;
      }
    }
    
    // Sigmoid normalization to [0, 1]
    // L_t = sigmoid(count - threshold)
    const threshold = 2; // Expect ~2 markers for significant normative load
    const load = this.sigmoid(markerCount - threshold);
    
    return load;
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}

// ============================================================================
// 4. REGIME CONTROLLER
// ============================================================================

export class RegimeController {
  private wCurrent: RegimeWeightsTuple;
  private lambda: number; // Coupling gain
  private eta: number;    // Normative push strength

  constructor(
    initialWeights: RegimeWeightsTuple = [0.33, 0.33, 0.34],
    lambda: number = 0.3,
    eta: number = 0.2
  ) {
    this.wCurrent = initialWeights;
    this.lambda = lambda;
    this.eta = eta;
  }

  update(wTarget: RegimeWeightsTuple, normativeLoad: number): RegimeWeightsTuple {
    const [alpha, beta, gamma] = this.wCurrent;
    const [alphaStar, betaStar, gammaStar] = wTarget;
    
    // Compute normative push: η · h(L_t)
    const push = this.computeNormativePush(normativeLoad);
    
    // Update law: (1-λ)w_t + λw*_t + η·h(L_t)
    const wNext: RegimeWeightsTuple = [
      (1 - this.lambda) * alpha + this.lambda * alphaStar + push[0],
      (1 - this.lambda) * beta  + this.lambda * betaStar  + push[1],
      (1 - this.lambda) * gamma + this.lambda * gammaStar + push[2]
    ];
    
    // Project to simplex (ensure sum=1, all ≥ 0)
    this.wCurrent = this.projectToSimplex(wNext);
    return this.wCurrent;
  }

  private computeNormativePush(L: number): RegimeWeightsTuple {
    const [alpha] = this.wCurrent;
    
    // Only push toward hybrid if there's formal structure present
    if (alpha < 0.2) {
      return [0, 0, 0]; // No formal basis, no push
    }
    
    if (alpha >= 0.5) {
      // High formality: redistribute some α → γ under normative load
      return [
        -0.1 * L * this.eta,  // Decrease α slightly
        0,                     // Leave β unchanged
        0.1 * L * this.eta     // Increase γ
      ];
    } else {
      // Moderate formality: just push toward γ
      return [
        0,
        0,
        alpha * L * this.eta  // Increase γ proportional to existing α
      ];
    }
  }

  private projectToSimplex(w: RegimeWeightsTuple): RegimeWeightsTuple {
    // Ensure non-negativity
    let [alpha, beta, gamma] = w.map(x => Math.max(0, x)) as RegimeWeightsTuple;
    
    // Normalize to sum=1
    const sum = alpha + beta + gamma;
    if (sum > 0) {
      return [alpha / sum, beta / sum, gamma / sum];
    } else {
      // Fallback: uniform distribution
      return [0.33, 0.33, 0.34];
    }
  }

  getCurrentWeights(): RegimeWeightsTuple {
    return this.wCurrent;
  }
}

// ============================================================================
// 5. COUPLED TELEMETRY ORCHESTRATOR
// ============================================================================

export class CoupledTelemetryOrchestrator {
  private modeEstimator: PragmaticModeEstimator;
  private couplingMatrix: CouplingMatrix;
  private loadEstimator: PragmaticNormativeEstimator;
  private regimeController: RegimeController;
  private telemetryLog: TelemetryTick[] = [];
  private tickCounter: number = 0;

  constructor(config?: {
    lambda?: number,
    eta?: number,
    initialWeights?: RegimeWeightsTuple
  }) {
    this.modeEstimator = new PragmaticModeEstimator();
    this.couplingMatrix = new CouplingMatrix();
    this.loadEstimator = new PragmaticNormativeEstimator();
    this.regimeController = new RegimeController(
      config?.initialWeights,
      config?.lambda,
      config?.eta
    );
  }

  processTick(textSegment: string): TelemetryTick {
    // Layer 1: Estimate pragmatic mode distribution
    const modeDistribution = this.modeEstimator.estimate(textSegment);
    const modePrimary = this.getPrimaryMode(modeDistribution);
    
    // Compute target regime from coupling matrix
    const wTarget = this.couplingMatrix.computeTarget(modeDistribution);
    
    // Estimate normative load
    const normativeLoad = this.loadEstimator.estimate(textSegment);
    
    // Get current regime weights
    const wCurrent = this.regimeController.getCurrentWeights();
    
    // Layer 2: Update regime weights via controller
    const wNext = this.regimeController.update(wTarget, normativeLoad);
    
    // Compute diagnostics
    const errorVector = this.computeError(wTarget, wCurrent);
    const couplingLoss = this.euclideanDistance(wTarget, wCurrent);
    const regimeDrift = this.euclideanDistance(wNext, wCurrent);
    const pragmaticDrift = 0; // TODO: compute KL divergence with previous tick
    
    // Create telemetry record
    const tick: TelemetryTick = {
      t: this.tickCounter++,
      textSegment,
      modeDistribution,
      modePrimary,
      normativeLoad,
      normativeMarkers: [], 
      wCurrent,
      wTarget,
      wNext,
      errorVector,
      couplingLoss,
      regimeDrift,
      pragmaticDrift,
      normativePush: [0, 0, 0] 
    };
    
    this.telemetryLog.push(tick);
    return tick;
  }

  private getPrimaryMode(dist: ModeDistribution): PragmaticMode {
    let maxProb = 0;
    let primaryMode = PragmaticMode.DECL;
    dist.forEach((prob, mode) => {
      if (prob > maxProb) {
        maxProb = prob;
        primaryMode = mode;
      }
    });
    return primaryMode;
  }

  private computeError(wTarget: RegimeWeightsTuple, wCurrent: RegimeWeightsTuple): RegimeWeightsTuple {
    return [
      wTarget[0] - wCurrent[0],
      wTarget[1] - wCurrent[1],
      wTarget[2] - wCurrent[2]
    ];
  }

  private euclideanDistance(w1: RegimeWeightsTuple, w2: RegimeWeightsTuple): number {
    return Math.sqrt(
      Math.pow(w1[0] - w2[0], 2) +
      Math.pow(w1[1] - w2[1], 2) +
      Math.pow(w1[2] - w2[2], 2)
    );
  }

  getTelemetryLog(): TelemetryTick[] {
    return this.telemetryLog;
  }

  reset(): void {
    this.telemetryLog = [];
    this.tickCounter = 0;
    this.regimeController = new RegimeController();
  }
}
