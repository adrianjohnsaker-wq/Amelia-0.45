
export interface StepLog {
  step: number
  timestamp: number
  
  // Substrate state
  field: {
    intensity: number
    tension: number
    entropy: number
    turbulence: number
    stability: number
    fatigue: number
    residue?: number  // For Stage 5B
  }
  
  // Regime & transitions
  regime: string
  previousRegime: string | null
  transitionOccurred: boolean
  transitionType: string | null  // e.g., "DRIFT->NON_ESCALATION"
  
  // Constraints
  allowedTransitions: string[]
  forbiddenTransitions: string[]
  
  // Input/output
  promptType: PromptType
  promptLength: number
  outputLength: number
  silenceDuration: number  // Steps since last non-minimal input
  
  // Renderer
  renderer: "gemini" | "null" | "template"
  
  // Stage tracking
  stage: string  // e.g., "5A", "5B", "5C_baseline", "5D_post_trigger"
}

export type PromptType = 
  | "silence" 
  | "ellipsis" 
  | "minimal" 
  | "condition" 
  | "normal"

export interface TransitionEvent {
  step: number
  from: string
  to: string
  fieldSnapshot: StepLog['field']
}

export interface Stage5Metrics {
  // 5A: Probability bias
  dwellTimes: Map<string, number[]>  // regime -> array of consecutive step counts
  
  // 5B: Re sidue accumulation
  articulationCosts: Array<{
    step: number
    outputLength: number
    priorSilence: number
    residue: number
  }>
  
  // 5C: Transition drift
  transitionMatrices: Array<{
    windowStart: number
    windowEnd: number
    matrix: Map<string, Map<string, number>>  // from -> to -> count
  }>
  
  // 5D: Irreversible loss
  targetTransition: string
  lastOccurrence: number | null
  triggerStep: number | null
  postTriggerAttempts: number
}
