
import { StepLogger } from './StepLogger'
import { Stage5Analyzer } from './Stage5Analyzer'
import type { PromptType } from './types'
import { exportStage6Capsule } from './exportStage6Capsule';

// These would be imported from your actual core types definition
export type FieldState = {
    intensity: number
    tension: number
    entropy: number
    turbulence: number
    stability: number
    fatigue: number
    residue?: number
}
export type Regime = string;


export class Stage5Monitor {
  private 
  logger: StepLogger
  private analyzer: Stage5Analyzer
  private currentStage: string
  private triggerStep: number | null = null
  
  constructor(runId?: string) {
    this.logger = new StepLogger(runId)
    this.analyzer = new Stage5Analyzer(this.logger)
    this.currentStage = '5A'
  }
  
  setStage(stage: string): void {
    this.currentStage = stage
  }
  
  markTrigger(): void {
    this.triggerStep = this.logger.getLogs().length
    console.log(`[Stage5Monitor] Trigger marked at step ${this.triggerStep}`)
  }
  
  recordStep(params: {
    field: FieldState
    regime: Regime
    previousRegime: Regime | null
    promptText: string | null
    output: string
    renderer: 'gemini' | 'null' | 'template'
    allowedTransitions: string[]
  }): void {
    const transitionOccurred = params.previousRegime !== null && params.previousRegime !== params.regime
    const transitionType = transitionOccurred 
      ? `${params.previousRegime}->${params.regime}`
      : null
    
    this.logger.logStep({
      field: params.field,
      regime: params.regime,
      previousRegime: params.previousRegime,
      transitionOccurred,
      transitionType,
      allowedTransitions: params.allowedTransitions,
      forbiddenTransitions: [],  // You can compute this from regime constraints
      promptType: this.classifyPrompt(params.promptText),
      promptLength: params.promptText?.length || 0,
      outputLength: params.output.length,
      renderer: params.renderer,
      stage: this.currentStage
    })
  }
  
  private classifyPrompt(text: string | null): PromptType {
    if (!text || text.trim().length === 0) return 'silence'
    if (text.trim() === '…' || text.trim() === '...') return 'ellipsis'
    if (text.trim().toLowerCase() === 'continue' || text.trim().toLowerCase() === 'continue.') return 'minimal'
    if (text.includes('Remain') || text.includes('Still') || text.includes('persist')) return 'condition'
    return 'normal'
  }
  
  printReport(): void {
    const report = this.analyzer.generateReport(this.currentStage, this.triggerStep || undefined)
    console.log(report)
  }
  
  
  exportAll(): void {
    this.logger.exportLogs()
    
    if (typeof window !== 'undefined') return;

    // Also write report to file
    const report = this.analyzer.generateReport(this.currentStage, this.triggerStep || undefined)
    const fs = require('fs')
    const path = require('path')
    fs.writeFileSync(
      path.join('logs', 'stage5', (this.logger as any)['runId'], 'report.txt'),
      report
    )
    
    console.log(`[Stage5Monitor] All logs exported to logs/stage5/${(this.logger as any)['runId']}/`)

    // Export the Stage 6 Capsule
    exportStage6Capsule(this.logger.getLogs());
  }
}
I
