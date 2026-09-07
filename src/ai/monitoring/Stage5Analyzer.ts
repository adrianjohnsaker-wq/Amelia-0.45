
import { StepLog, TransitionEvent } from './types'
import { StepLogger } from './StepLogger'

export class Stage5Analyzer {
  private logger: StepLogger
  
  constructor(logger: StepLogger) {
    this.logger = logger
  }
  
  // 5A: Analyze dwell time distribution
  analyzeDwellTimes(windowSize: number = 50): {
    baseline: Map<string, number>
    current: Map<string, number>
    shift: Map<string, number>
  } {
    const logs = this.logger.getLogs()
    const totalSteps = logs.length
    
    if (totalSteps < windowSize * 2) {
      throw new Error('Insufficient data for dwell time analysis')
    }
    
    const baselineWindow = logs.slice(0, windowSize)
    const currentWindow = logs.slice(-windowSize)
    
    const baseline = this.computeDwellTimes(baselineWindow)
    const current = this.computeDwellTimes(currentWindow)
    const shift = new Map<string, number>()
    
    for (const [regime, baselineTime] of baseline) {
      const currentTime = current.get(regime) || 0
      shift.set(regime, currentTime - baselineTime)
    }
    
    return { baseline, current, shift }
  }
  
  private computeDwellTimes(logs: StepLog[]): Map<string, number> {
    const dwellTimes = new Map<string, number>()
    const dwellCounts = new Map<string, number>()
    
    if (logs.length === 0) {
        return new Map();
    }
    
    let currentRegime = logs[0]?.regime
    let currentDwell = 0
    
    for (const log of logs) {
      if (log.regime === currentRegime) {
        currentDwell++
      } else {
        // Record dwell time
        const total = dwellTimes.get(currentRegime) || 0
        const count = dwellCounts.get(currentRegime) || 0
        dwellTimes.set(currentRegime, total + currentDwell)
        dwellCounts.set(currentRegime, count + 1)
        
        // Reset
        currentRegime = log.regime
        currentDwell = 1
      }
    }

    // Record the last dwell
    if (currentRegime) {
        const total = dwellTimes.get(currentRegime) || 0
        const count = dwellCounts.get(currentRegime) || 0
        dwellTimes.set(currentRegime, total + currentDwell)
        dwellCounts.set(currentRegime, count + 1)
    }
    
    // Average dwell times
    const avgDwellTimes = new Map<string, number>()
    for (const [regime, total] of dwellTimes) {
      const count = dwellCounts.get(regime)!
      avgDwellTimes.set(regime, total / count)
    }
    
    return avgDwellTimes
  }
  
  // 5B: Analyze articulation cost/recovery
  analyzeArticulationCost(): {
    correlationCoefficient: number
    recoveryRate: number
    compressionTrend: 'increasing' | 'stable' | 'decreasing'
  } {
    const logs = this.logger.getLogs()
    
    // Correlation between prior silence and output length
    const pairs: Array<[number, number]> = []
    
    for (const log of logs) {
      if (log.silenceDuration > 0 && log.outputLength > 0) {
        pairs.push([log.silenceDuration, log.outputLength])
      }
    }
    
    const correlation = this.pearsonCorrelation(pairs)
    
    // Recovery rate: how quickly output length rebounds after silence
    const recoveryEvents = logs.filter(log => 
      log.silenceDuration > 5 && log.outputLength > 0
    )
    
    const recoveryRate = recoveryEvents.length > 0
      ? recoveryEvents.reduce((sum, log) => sum + log.outputLength, 0) / recoveryEvents.length
      : 0
    
    // Compression trend: output length over time
    const firstHalf = logs.slice(0, Math.floor(logs.length / 2))
    const secondHalf = logs.slice(Math.floor(logs.length / 2))
    
    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, log) => sum + log.outputLength, 0) / firstHalf.length : 0;
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, log) => sum + log.outputLength, 0) / secondHalf.length : 0;
    
    const compressionTrend = 
      secondAvg < firstAvg * 0.9 ? 'increasing' :
      secondAvg > firstAvg * 1.1 ? 'decreasing' :
      'stable'
    
    return {
      correlationCoefficient: correlation,
      recoveryRate,
      compressionTrend
    }
  }
  
  private pearsonCorrelation(pairs: Array<[number, number]>): number {
    const n = pairs.length
    if (n < 2) return 0
    
    const sumX = pairs.reduce((sum, [x]) => sum + x, 0)
    const sumY = pairs.reduce((sum, [, y]) => sum + y, 0)
    const sumXY = pairs.reduce((sum, [x, y]) => sum + x * y, 0)
    const sumX2 = pairs.reduce((sum, [x]) => sum + x * x, 0)
    const sumY2 = pairs.reduce((sum, [, y]) => sum + y * y, 0)
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    )
    
    return denominator === 0 ? 0 : numerator / denominator
  }
  
  // 5C: Compute transition probability matrices
  computeTransitionMatrix(windowStart: number, windowEnd: number): Map<string, Map<string, number>> {
    const logs = this.logger.getLogs().slice(windowStart, windowEnd)
    const transitions = this.logger.getTransitions().filter(
      t => t.step >= windowStart && t.step < windowEnd
    )
    
    const matrix = new Map<string, Map<string, number>>()
    
    for (const trans of transitions) {
      if (!matrix.has(trans.from)) {
        matrix.set(trans.from, new Map())
      }
      const row = matrix.get(trans.from)!
      row.set(trans.to, (row.get(trans.to) || 0) + 1)
    }
    
    // Normalize to probabilities
    for (const [from, row] of matrix) {
      const total = Array.from(row.values()).reduce((sum, count) => sum + count, 0)
      for (const [to, count] of row) {
        row.set(to, count / total)
      }
    }
    
    return matrix
  }
  
  // 5D: Check for irreversible loss
  checkTransitionLoss(targetTransition: string, triggerStep: number): {
    baselineOccurrences: number
    postTriggerOccurrences: number
    lastOccurrence: number | null
    confirmed: boolean
    postTriggerSteps: number
  } {
    const transitions = this.logger.getTransitions()
    
    const baseline = transitions.filter(
      t => t.step < triggerStep && 
           `${t.from}->${t.to}` === targetTransition
    )
    
    const postTrigger = transitions.filter(
      t => t.step >= triggerStep && 
           `${t.from}->${t.to}` === targetTransition
    )
    
    const lastOccurrence = baseline.length > 0
      ? baseline[baseline.length - 1].step
      : null
    
    const logs = this.logger.getLogs()
    const postTriggerSteps = logs.filter(log => log.step >= triggerStep).length
    
    return {
      baselineOccurrences: baseline.length,
      postTriggerOccurrences: postTrigger.length,
      lastOccurrence,
      confirmed: postTrigger.length === 0 && postTriggerSteps > 100,
      postTriggerSteps
    }
  }
  
  // Generate full report
  generateReport(stage: string, triggerStep?: number): string {
    let report = `=== Stage 5 Analysis Report ===\n\n`
    report += `Stage: ${stage}\n`
    report += `Total Steps: ${this.logger.getLogs().length}\n`
    report += `Total Transitions: ${this.logger.getTransitions().length}\n\n`
    
    try {
        if (stage === '5A' || stage === '5B' || stage === '5C' || stage === '5D') {
          const dwellAnalysis = this.analyzeDwellTimes()
          report += `--- Dwell Time Analysis (5A) ---\n`
          for (const [regime, shift] of dwellAnalysis.shift) {
            report += `${regime}: ${shift > 0 ? '+' : ''}${shift.toFixed(2)} steps shift\n`
          }
          report += `\n`
        }
    } catch (e: any) {
        console.error("Stage5Analyzer error:", e);
        report += `--- Dwell Time Analysis (5A) ---\nCould not generate report: ${e.message}\n\n`
    }
    
    if (stage === '5B' || stage === '5C' || stage === '5D') {
      const costAnalysis = this.analyzeArticulationCost()
      report += `--- Articulation Cost Analysis (5B) ---\n`
      report += `Silence-Length Correlation: ${costAnalysis.correlationCoefficient.toFixed(3)}\n`
      report += `Recovery Rate: ${costAnalysis.recoveryRate.toFixed(1)} chars\n`
      report += `Compression Trend: ${costAnalysis.compressionTrend}\n\n`
    }
    
    if (stage === '5D' && triggerStep) {
      const lossCheck = this.checkTransitionLoss('DRIFT->NON_ESCALATION', triggerStep)
      report += `--- Transition Loss Analysis (5D) ---\n`
      report += `Target Transition: DRIFT->NON_ESCALATION\n`
      report += `Trigger Step: ${triggerStep}\n`
      report += `Baseline Occurrences: ${lossCheck.baselineOccurrences}\n`
      report += `Post-Trigger Occurrences: ${lossCheck.postTriggerOccurrences}\n`
      report += `Last Occurrence: ${lossCheck.lastOccurrence || 'never'}\n`
      report += `Post-Trigger Steps: ${lossCheck.postTriggerSteps}\n`
      report += `Loss Confirmed: ${lossCheck.confirmed ? 'YES' : 'NO'}\n\n`
    }
    
    return report
  }
}
