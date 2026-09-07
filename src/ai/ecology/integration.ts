// ============================================================================
// ECOLOGICAL INTELLIGENCE - INTEGRATION WITH AMELIA CYCLE
// ============================================================================

import { MemorySystem } from './memory';
import { OperatorSystem } from './operators';
import {
  EcologyConfig,
  DEFAULT_ECOLOGY_CONFIG,
  TaskFeatures,
  RegimeSequence,
  SuccessMetrics,
  TrajectoryMemory,
  Operator
} from './types';
import { computeCoherence } from './measurements';

/**
 * Ecological intelligence integration manager
 */
export class EcologyManager {
  private memorySystem: MemorySystem;
  private operatorSystem: OperatorSystem;
  private config: EcologyConfig;
  
  private currentStep = 0;
  private currentMemory: TrajectoryMemory | null = null;
  private activeOperators: string[] = [];
  
  constructor(config: Partial<EcologyConfig> = {}) {
    this.config = { ...DEFAULT_ECOLOGY_CONFIG, ...config };
    this.memorySystem = new MemorySystem(this.config);
    this.operatorSystem = new OperatorSystem(this.config);
  }
  
  /**
   * Initialize for new prompt (Phase 1: Before substrate loop)
   */
  async initializeForPrompt(
    prompt: string,
    currentStep: number
  ): Promise<{
    taskFeatures: TaskFeatures;
    memory: TrajectoryMemory | null;
    applicableOperators: Operator[];
  }> {
    this.currentStep = currentStep;
    this.operatorSystem.setCurrentStep(currentStep);
    
    // Extract task features
    const taskFeatures = this.memorySystem.extractTaskFeatures(prompt);
    
    // Retrieve relevant memory
    this.currentMemory = this.memorySystem.retrieveMemory(taskFeatures);
    
    // Get applicable operators
    const applicableOperators = this.operatorSystem.getApplicableOperators(taskFeatures.class);
    this.activeOperators = applicableOperators.map(op => op.id);
    
    return {
      taskFeatures,
      memory: this.currentMemory,
      applicableOperators
    };
  }
  
  /**
   * Compute next zone with memory blending (Phase 2: During substrate loop)
   */
  computeNextZone(
    baseTransition: Record<string, number>
  ): string {
    return this.memorySystem.computeNextZone(
      baseTransition,
      this.currentMemory
    );
  }
  
  /**
   * Finalize after response (Phase 3: After response generation)
   */
  async finalizeResponse(
    responseText: string,
    regimeSequence: RegimeSequence,
    generateFunction: (prompt: string) => Promise<string>,
    options: {
      solved: boolean;
      efficiency: number;
    }
  ): Promise<{
    newOperators: Operator[];
    consolidatedLibrary: Operator[];
    storedMemory: TrajectoryMemory | null;
  }> {
    // Compute success metrics
    const coherence = computeCoherence(responseText);
    const successScore = (
      (options.solved ? 1 : 0) * 0.5 +
      coherence * 0.3 +
      (1 / Math.max(options.efficiency, 1)) * 0.2
    );
    
    const successMetrics: SuccessMetrics = {
      solved: options.solved,
      coherence,
      efficiency: options.efficiency,
      score: successScore
    };
    
    // Store memory if successful
    let storedMemory: TrajectoryMemory | null = null;
    if (options.solved && coherence > 0.5) {
      const taskFeatures = this.memorySystem.extractTaskFeatures(''); 
      storedMemory = this.memorySystem.storeMemory(
        taskFeatures,
        regimeSequence,
        successMetrics,
        this.activeOperators,
        this.currentStep
      );
    }
    
    // Update operator statistics
    this.activeOperators.forEach(opId => {
      this.operatorSystem.useOperator(opId, options.solved);
    });
    
    // Mutate operators (generate new ones)
    const newOperators = await this.operatorSystem.mutateOperators(
      responseText.substring(0, 200), // Use response context
      generateFunction
    );
    
    if (newOperators.length > 0) {
      this.operatorSystem.addOperators(newOperators);
    }
    
    // Select best operators
    const selected = this.operatorSystem.selectOperators();
    
    // Consolidate (apply decay)
    this.operatorSystem.consolidateOperators();
    
    // Set library to selected operators
    this.operatorSystem.setOperators(selected);
    
    return {
      newOperators,
      consolidatedLibrary: this.operatorSystem.getOperators(),
      storedMemory
    };
  }
  
  /**
   * Get current statistics
   */
  getStatistics() {
    return {
      currentStep: this.currentStep,
      memory: this.memorySystem.getStatistics(),
      operators: this.operatorSystem.getStatistics()
    };
  }
  
  /**
   * Export state for persistence
   */
  exportState() {
    return {
      config: this.config,
      memories: this.memorySystem.getMemories(),
      operators: this.operatorSystem.getOperators(),
      currentStep: this.currentStep
    };
  }
  
  /**
   * Import state from persistence
   */
  importState(state: {
    config?: Partial<EcologyConfig>;
    memories: TrajectoryMemory[];
    operators: Operator[];
    currentStep: number;
  }): void {
    if (state.config) {
      this.config = { ...this.config, ...state.config };
    }
    
    // Recreate systems
    this.memorySystem = new MemorySystem(this.config);
    this.operatorSystem = new OperatorSystem(this.config);
    
    // Restore memories
    state.memories.forEach(memory => {
      // Direct insertion (bypassing storeMemory to preserve IDs and counts)
      (this.memorySystem as any).memories.push(memory);
    });
    
    // Restore operators
    this.operatorSystem.setOperators(state.operators);
    this.operatorSystem.setCurrentStep(state.currentStep);
    
    this.currentStep = state.currentStep;
  }
  
  /**
   * Reset system
   */
  reset(): void {
    this.memorySystem.clear();
    this.operatorSystem.clear();
    this.currentStep = 0;
    this.currentMemory = null;
    this.activeOperators = [];
  }
}
