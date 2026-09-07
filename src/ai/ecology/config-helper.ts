// ============================================================================
// ECOLOGICAL INTELLIGENCE - CONFIGURATION HELPERS
// ============================================================================

import { EcologyConfig } from './types';

/**
 * Preset configurations for different experimental conditions
 */
export const ECOLOGY_PRESETS = {
  
  /**
   * Condition A: Baseline (No memory, no operators)
   */
  BASELINE: {
    memoryBlendWeight: 0.0,      // No memory influence
    memorySimilarityThreshold: 1.0, // Never retrieve
    maxMemories: 0,
    
    maxOperators: 0,             // No operators
    mutationRate: 0.0,
    
    minOperatorFitness: 0.0,
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
  } as EcologyConfig,
  
  /**
   * Condition B: Full Ecology (Memory + Operators)
   */
  FULL_ECOLOGY: {
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
  } as EcologyConfig,
  
  /**
   * Memory Only (No operators)
   */
  MEMORY_ONLY: {
    memoryBlendWeight: 0.3,
    memorySimilarityThreshold: 0.4,
    maxMemories: 50,
    
    maxOperators: 0,
    minOperatorFitness: 0.0,
    mutationRate: 0.0,
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
  } as EcologyConfig,
  
  /**
   * Operators Only (No memory)
   */
  OPERATORS_ONLY: {
    memoryBlendWeight: 0.0,
    memorySimilarityThreshold: 1.0,
    maxMemories: 0,
    
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
  } as EcologyConfig
};

/**
 * Validate configuration
 */
export function validateConfig(config: Partial<EcologyConfig>): string[] {
  const errors: string[] = [];
  
  if (config.memoryBlendWeight !== undefined) {
    if (config.memoryBlendWeight < 0 || config.memoryBlendWeight > 1) {
      errors.push('memoryBlendWeight must be between 0 and 1');
    }
  }
  
  if (config.memorySimilarityThreshold !== undefined) {
    if (config.memorySimilarityThreshold < 0 || config.memorySimilarityThreshold > 1) {
      errors.push('memorySimilarityThreshold must be between 0 and 1');
    }
  }
  
  if (config.mutationRate !== undefined) {
    if (config.mutationRate < 0 || config.mutationRate > 1) {
      errors.push('mutationRate must be between 0 and 1');
    }
  }
  
  if (config.maxMemories !== undefined && config.maxMemories < 0) {
    errors.push('maxMemories must be non-negative');
  }
  
  if (config.maxOperators !== undefined && config.maxOperators < 0) {
    errors.push('maxOperators must be non-negative');
  }
  
  if (config.fitnessWeights) {
    const sum = (config.fitnessWeights.success || 0) + 
                (config.fitnessWeights.coherence || 0) + 
                (config.fitnessWeights.novelty || 0);
    
    if (Math.abs(sum - 1.0) > 0.01) {
      errors.push('fitnessWeights must sum to 1.0');
    }
  }
  
  if (config.similarityWeights) {
    const sum = (config.similarityWeights.taskClass || 0) + 
                (config.similarityWeights.keywords || 0) + 
                (config.similarityWeights.complexity || 0);
    
    if (Math.abs(sum - 1.0) > 0.01) {
      errors.push('similarityWeights must sum to 1.0');
    }
  }
  
  return errors;
}
