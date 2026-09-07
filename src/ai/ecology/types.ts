// ============================================================================
// ECOLOGICAL INTELLIGENCE - TYPE DEFINITIONS
// ============================================================================

/**
 * Task classification for memory retrieval
 */
export type TaskClass = 'math' | 'philosophy' | 'hybrid' | 'meta' | 'applied';

/**
 * Task features extracted from prompt
 */
export interface TaskFeatures {
  class: TaskClass;
  keywords: string[];
  complexity: number;       // 0-1 scale
  prompt: string;
}

/**
 * Regime sequence captured in trajectory
 */
export interface RegimeSequence {
  zones: string[];          // Zone labels in order
  weights: Array<{
    alpha: number;
    beta: number;
    gamma: number;
  }>;
  transitions: number;      // Total zone transitions
}

/**
 * Success metrics for trajectory
 */
export interface SuccessMetrics {
  solved: boolean;
  coherence: number;        // 0-1 scale
  efficiency: number;       // Steps to solution
  score: number;            // Weighted composite score
}

/**
 * Trajectory memory stored from successful runs
 */
export interface TrajectoryMemory {
  id: string;
  createdAtStep: number;
  
  taskFeatures: TaskFeatures;
  regimeSequence: RegimeSequence;
  successMetrics: SuccessMetrics;
  
  operators: string[];      // Operator IDs used
  reuseCount: number;       // Times memory was retrieved
}

/**
 * Reasoning operator that can evolve
 */
export interface Operator {
  id: string;
  name: string;
  procedure: string[];      // Ordered steps
  applicability: TaskClass[];
  
  // Usage statistics
  uses: number;
  successRate: number;
  
  // Quality metrics
  novelty: number;          // 0-1, distinctiveness
  coherence: number;        // 0-1, sensibility
  fitness: number;          // Composite score
  
  // Temporal tracking
  introduced: number;       // Step number created
  lastUsed: number;         // Step number last applied
}

/**
 * Memory retrieval result with similarity score
 */
export interface MemoryMatch {
  memory: TrajectoryMemory;
  similarity: number;
}

/**
 * Operator library state
 */
export interface OperatorLibrary {
  operators: Operator[];
  maxSize: number;
  minFitness: number;
}

/**
 * Configuration for ecological system
 */
export interface EcologyConfig {
  // Memory parameters
  memoryBlendWeight: number;        // λ (0-1)
  memorySimilarityThreshold: number;
  maxMemories: number;
  
  // Operator parameters
  maxOperators: number;
  minOperatorFitness: number;
  mutationRate: number;
  decayRate: number;                // Steps for significant decay
  
  // Fitness weights
  fitnessWeights: {
    success: number;
    coherence: number;
    novelty: number;
  };
  
  // Similarity weights for retrieval
  similarityWeights: {
    taskClass: number;
    keywords: number;
    complexity: number;
  };
}

/**
 * Default configuration
 */
export const DEFAULT_ECOLOGY_CONFIG: EcologyConfig = {
  memoryBlendWeight: 0.3,
  memorySimilarityThreshold: 0.4,
  maxMemories: 50,
  
  maxOperators: 10,
  minOperatorFitness: 0.2,
  mutationRate: 0.2,
  decayRate: 20,
  
  fitnessWeights: {
    success: 0.4,
    coherence: 0.3,
    novelty: 0.3
  },
  
  similarityWeights: {
    taskClass: 0.5,
    keywords: 0.3,
    complexity: 0.2
  }
};
