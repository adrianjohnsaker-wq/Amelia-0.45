// ============================================================================
// ECOLOGICAL INTELLIGENCE - TRAJECTORY MEMORY SYSTEM
// ============================================================================

import {
  TrajectoryMemory,
  TaskFeatures,
  EcologyConfig,
  RegimeSequence,
  SuccessMetrics
} from './types';
import { extractKeywords, classifyTask, estimateComplexity } from './measurements';

/**
 * Memory storage and retrieval system
 */
export class MemorySystem {
  private memories: TrajectoryMemory[] = [];
  private config: EcologyConfig;
  private nextId = 1;
  
  constructor(config: EcologyConfig) {
    this.config = config;
  }
  
  /**
   * Extract task features from prompt
   */
  extractTaskFeatures(prompt: string): TaskFeatures {
    return {
      class: classifyTask(prompt) as any,
      keywords: extractKeywords(prompt),
      complexity: estimateComplexity(prompt),
      prompt
    };
  }
  
  /**
   * Store new trajectory memory
   */
  storeMemory(
    taskFeatures: TaskFeatures,
    regimeSequence: RegimeSequence,
    successMetrics: SuccessMetrics,
    operators: string[],
    currentStep: number
  ): TrajectoryMemory {
    const memory: TrajectoryMemory = {
      id: `mem_${this.nextId++}`,
      createdAtStep: currentStep,
      taskFeatures,
      regimeSequence,
      successMetrics,
      operators,
      reuseCount: 0
    };
    
    this.memories.push(memory);
    
    // Limit memory size
    if (this.memories.length > this.config.maxMemories) {
      // Remove oldest, lowest-scoring memories
      this.memories.sort((a, b) => {
        // Sort by score descending, then by reuse descending
        if (b.successMetrics.score !== a.successMetrics.score) {
          return b.successMetrics.score - a.successMetrics.score;
        }
        return b.reuseCount - a.reuseCount;
      });
      
      this.memories = this.memories.slice(0, this.config.maxMemories);
    }
    
    return memory;
  }
  
  /**
   * Retrieve most similar memory for current task
   */
  retrieveMemory(taskFeatures: TaskFeatures): TrajectoryMemory | null {
    const matches = this.memories
      .map(memory => ({
        memory,
        similarity: this.computeSimilarity(memory.taskFeatures, taskFeatures)
      }))
      .filter(m => m.similarity > this.config.memorySimilarityThreshold)
      .sort((a, b) => b.similarity - a.similarity);
    
    if (matches.length === 0) return null;
    
    const bestMatch = matches[0].memory;
    
    // Increment reuse count
    bestMatch.reuseCount++;
    
    return bestMatch;
  }
  
  /**
   * Compute similarity between task features (0-1 scale)
   */
  private computeSimilarity(
    memory: TaskFeatures,
    task: TaskFeatures
  ): number {
    const weights = this.config.similarityWeights;
    
    // 1. Task class match (binary)
    const classMatch = memory.class === task.class ? 1 : 0;
    
    // 2. Keyword overlap (Jaccard)
    const memSet = new Set(memory.keywords);
    const taskSet = new Set(task.keywords);
    const intersection = [...taskSet].filter(k => memSet.has(k)).length;
    const union = new Set([...memSet, ...taskSet]).size;
    const keywordOverlap = union > 0 ? intersection / union : 0;
    
    // 3. Complexity similarity (exponential distance)
    const complexityDistance = Math.abs(memory.complexity - task.complexity);
    const complexityScore = Math.exp(-complexityDistance);
    
    // Weighted combination
    return (
      weights.taskClass * classMatch +
      weights.keywords * keywordOverlap +
      weights.complexity * complexityScore
    );
  }
  
  /**
   * Build zone distribution from memory
   */
  buildZoneDistribution(memory: TrajectoryMemory): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    memory.regimeSequence.zones.forEach(zone => {
      distribution[zone] = (distribution[zone] || 0) + 1;
    });
    
    // Normalize
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) return distribution;

    Object.keys(distribution).forEach(zone => {
      distribution[zone] /= total;
    });
    
    return distribution;
  }
  
  /**
   * Blend base transition with memory distribution
   */
  computeNextZone(
    baseTransition: Record<string, number>,
    memory: TrajectoryMemory | null
  ): string {
    if (!memory) {
      return this.sampleFromDistribution(baseTransition);
    }
    
    const memoryDistribution = this.buildZoneDistribution(memory);
    const lambda = this.config.memoryBlendWeight;
    
    // Blend distributions
    const blended: Record<string, number> = {};
    
    // Get all possible zones
    const allZones = new Set([
      ...Object.keys(baseTransition),
      ...Object.keys(memoryDistribution)
    ]);
    
    allZones.forEach(zone => {
      const base = baseTransition[zone] || 0;
      const mem = memoryDistribution[zone] || 0;
      
      blended[zone] = (1 - lambda) * base + lambda * mem;
    });
    
    // Normalize and sample
    return this.sampleFromDistribution(this.normalize(blended));
  }
  
  /**
   * Normalize distribution to sum to 1
   */
  private normalize(distribution: Record<string, number>): Record<string, number> {
    const total = Object.values(distribution).reduce((sum, p) => sum + p, 0);
    
    if (total === 0) return distribution;
    
    const normalized: Record<string, number> = {};
    Object.keys(distribution).forEach(key => {
      normalized[key] = distribution[key] / total;
    });
    
    return normalized;
  }
  
  /**
   * Sample zone from probability distribution
   */
  private sampleFromDistribution(distribution: Record<string, number>): string {
    const zones = Object.keys(distribution);
    if (zones.length === 0) return "zone-0-flux"; // Fallback

    const probabilities = zones.map(z => distribution[z]);
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < zones.length; i++) {
      cumulative += probabilities[i];
      if (random < cumulative) {
        return zones[i];
      }
    }
    
    return zones[zones.length - 1];
  }
  
  /**
   * Get all memories
   */
  getMemories(): TrajectoryMemory[] {
    return [...this.memories];
  }
  
  /**
   * Get memory statistics
   */
  getStatistics() {
    return {
      totalMemories: this.memories.length,
      averageReuseCount: this.memories.reduce((sum, m) => sum + m.reuseCount, 0) / this.memories.length || 0,
      memoryByClass: this.groupByClass()
    };
  }
  
  private groupByClass() {
    const groups: Record<string, number> = {};
    this.memories.forEach(m => {
      const cls = m.taskFeatures.class;
      groups[cls] = (groups[cls] || 0) + 1;
    });
    return groups;
  }
  
  /**
   * Clear all memories
   */
  clear(): void {
    this.memories = [];
    this.nextId = 1;
  }
}
