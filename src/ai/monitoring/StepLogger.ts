
import * as fs from 'fs'
import * as path from 'path'
import { StepLog, TransitionEvent, PromptType } from './types'

export class StepLogger {
  private logs: StepLog[] = []
  private transitions: TransitionEvent[] = []
  private silenceCounter = 0
  private runId: string
  private outputDir: string

  constructor(runId?: string) {
    this.runId = runId || `run_${Date.now()}`
    this.outp utDir = path.join('logs', 'stage5', this.runId)
    if (typeof window === 'undefined') {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  logStep(data: Omit<StepLog, 'step' | 'timestamp' | 'silenceDuration'>): void {
    const step = this.logs.length
    const timestamp = Date.now()

    // Track silence duration
    if (data.promptType === 'silence' || data.promptType === 'ellipsis') {
      this.silenceCounter++
    } else {
      this.silenceCounter = 0
    }

    const log: StepLog = {
      step,
      timestamp,
      silenceDuration: this.silenceCounter,
      ...data
    }

    this.logs.push(log)

    // Track transitions
    if (log.transitionOccurred && log.transitionType) {
      this.transitions.push({
        step,
        from: log.previousRegime!,
        to: log.regime,
        fieldSnapshot: { ...log.field }
      })
    }

    // Write incrementally (don't wait for full run)
    if (typeof window === 'undefined') {
      this.writeStep(log)
    }
  }

  private writeStep(log: StepLog): void {
    const csvLine = [
      log.step,
      log.timestamp,
      log.regime,
      log.previousRegime || '',
      log.transitionOccurred ? 1 : 0,
      log.transitionType || '',
      log.field.intensity,
      log.field.tension,
      log.field.entropy,
      log.field.turbulence,
      log.field.stability,
      log.field.fatigue,
      log.field.residue || 0,
      log.promptType,
      log.promptLength,
      log.outputLength,
      log.silenceDuration,
      log.renderer,
      log.stage
    ].join(',')

    const csvPath = path.join(this.outputDir, 'steps.csv')

    // Write header if file doesn't exist
    if (!fs.existsSync(csvPath)) {
      const header = [
        'step', 'timestamp', 'regime', 'previousRegime', 'transitionOccurred',
        'transitionType', 'intensity', 'tension', 'entropy', 'turbulence',
        'stability', 'fatigue', 'residue', 'promptType', 'promptLength',
        'outputLength', 'silenceDuration', 'renderer', 'stage'
      ].join(',') + '\n'
      fs.writeFileSync(csvPath, header)
    }

    fs.appendFileSync(csvPath, csvLine + '\n')
  }

  // Export full logs at any point
  exportLogs(): void {
    if (typeof window !== 'undefined') return;
    // Full JSON logs
    fs.writeFileSync(
      path.join(this.outputDir, 'logs_full.json'),
      JSON.stringify(this.logs, null, 2)
    )

    // Transitions only
    fs.writeFileSync(
      path.join(this.outputDir, 'transitions.json'),
      JSON.stringify(this.transitions, null, 2)
    )
  }

  getLogs(): StepLog[] {
    return this.logs
  }

  getTransitions(): TransitionEvent[] {
    return this.transitions
  }
}
