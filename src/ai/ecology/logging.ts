// ============================================================================
// ECOLOGICAL INTELLIGENCE - LOGGING AND METRICS
// ============================================================================

import { TaskFeatures } from './types';

/**
 * Log entry for a single step
 */
export interface EcologyStepLog {
  step: number;
  timestamp: Date;
  
  // Task
  prompt: string;
  taskFeatures: TaskFeatures;
  
  // Memory
  memoryRetrieved: boolean;
  memoryId?: string;
  memorySimilarity?: number;
  
  // Operators
  applicableOperators: string[];
  operatorsUsed: string[];
  newOperatorsGenerated: number;
  
  // Zone navigation
  zoneSequence: string[];
  transitionCount: number;
  
  // Regime
  regimeWeights: { alpha: number; beta: number; gamma: number };
  regimeEntropy: number;
  
  // Success metrics
  solved: boolean;
  coherence: number;
  efficiency: number;
  score: number;
  
  // Library state
  totalMemories: number;
  totalOperators: number;
  averageOperatorFitness: number;
}

/**
 * Logger for ecology system
 */
export class EcologyLogger {
  private logs: EcologyStepLog[] = [];
  
  /**
   * Log a step
   */
  logStep(log: EcologyStepLog): void {
    this.logs.push(log);
  }
  
  /**
   * Get all logs
   */
  getLogs(): EcologyStepLog[] {
    return [...this.logs];
  }
  
  /**
   * Compute metrics across all logs
   */
  computeMetrics() {
    if (this.logs.length === 0) {
      return null;
    }
    
    // Regime Diversity (unique zones)
    const allZones = new Set(
      this.logs.flatMap(log => log.zoneSequence)
    );
    const regimeDiversity = allZones.size;
    
    // Mean dwell time
    const dwellTimes = this.logs.map(log => {
      const zones = log.zoneSequence;
      const uniqueZones = new Set(zones).size;
      return zones.length / Math.max(uniqueZones, 1);
    });
    const meanDwell = dwellTimes.reduce((sum, d) => sum + d, 0) / dwellTimes.length;
    
    // Operator Novelty Index (ONI)
    const operatorUses = this.logs.reduce((sum, log) => 
      sum + log.operatorsUsed.length, 0
    );
    const newOperators = this.logs.reduce((sum, log) => 
      sum + log.newOperatorsGenerated, 0
    );
    const oni = operatorUses > 0 ? newOperators / operatorUses : 0;
    
    // Trajectory Reuse Efficiency (TRE)
    const logsWithMemory = this.logs.filter(log => log.memoryRetrieved);
    const logsWithoutMemory = this.logs.filter(log => !log.memoryRetrieved);
    
    const avgEfficiencyWithMemory = logsWithMemory.length > 0
      ? logsWithMemory.reduce((sum, log) => sum + log.efficiency, 0) / logsWithMemory.length
      : 0;
    
    const avgEfficiencyWithoutMemory = logsWithoutMemory.length > 0
      ? logsWithoutMemory.reduce((sum, log) => sum + log.efficiency, 0) / logsWithoutMemory.length
      : 0;
    
    const tre = avgEfficiencyWithMemory > 0
      ? avgEfficiencyWithoutMemory / avgEfficiencyWithMemory
      : 1;
    
    // Cognitive Diversity Index (CDI)
    const zoneDistribution: Record<string, number> = {};
    this.logs.forEach(log => {
      log.zoneSequence.forEach(zone => {
        zoneDistribution[zone] = (zoneDistribution[zone] || 0) + 1;
      });
    });
    
    const totalZones = Object.values(zoneDistribution).reduce((sum, count) => sum + count, 0);
    const probabilities = Object.values(zoneDistribution).map(count => count / totalZones);
    const cdi = -probabilities.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
    
    // Success rate
    const successRate = this.logs.filter(log => log.solved).length / this.logs.length;
    
    // Average coherence
    const avgCoherence = this.logs.reduce((sum, log) => sum + log.coherence, 0) / this.logs.length;
    
    return {
      regimeDiversity,
      meanDwell,
      operatorNoveltyIndex: oni,
      trajectoryReuseEfficiency: tre,
      cognitiveDiversityIndex: cdi,
      successRate,
      averageCoherence: avgCoherence,
      
      totalSteps: this.logs.length,
      memoryRetrievals: logsWithMemory.length,
      memoryReuseRate: logsWithMemory.length / this.logs.length
    };
  }
}
