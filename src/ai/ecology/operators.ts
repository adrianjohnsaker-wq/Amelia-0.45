// ============================================================================
// ECOLOGICAL INTELLIGENCE - OPERATOR EVOLUTION SYSTEM
// ============================================================================

import {
  Operator,
  EcologyConfig,
  TaskClass
} from './types';
import { computeNovelty, updateFitness } from './measurements';

/**
 * Operator evolution and management system
 */
export class OperatorSystem {
  private operators: Operator[] = [];
  private config: EcologyConfig;
  private nextId = 1;
  private currentStep = 0;
  
  constructor(config: EcologyConfig) {
    this.config = config;
  }
  
  /**
   * Set current step (for temporal tracking)
   */
  setCurrentStep(step: number): void {
    this.currentStep = step;
  }
  
  /**
   * Parse operator from text response
   * Expected format: "Name | Procedure | Applicability"
   */
  parseOperator(text: string): Operator | null {
    // Look for structured format
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let name = '';
    let procedure: string[] = [];
    let applicability: TaskClass[] = [];
    
    // Try to find sections
    for (const line of lines) {
      const lower = line.toLowerCase();
      
      if (lower.includes('name:') || lower.includes('operator:')) {
        name = line.split(':')[1]?.trim() || '';
      } else if (lower.includes('procedure:') || lower.includes('steps:')) {
        const procText = line.split(':')[1]?.trim() || '';
        procedure = procText.split(',').map(s => s.trim()).filter(s => s.length > 0);
      } else if (lower.includes('applicability:') || lower.includes('applies to:')) {
        const appText = line.split(':')[1]?.trim() || '';
        applicability = this.parseApplicability(appText);
      }
    }
    
    // Fallback: try pipe-separated format
    if (!name || procedure.length === 0) {
      const parts = text.split('|').map(p => p.trim());
      if (parts.length >= 2) {
        name = parts[0];
        procedure = parts[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (parts.length >= 3) {
          applicability = this.parseApplicability(parts[2]);
        }
      }
    }
    
    // Validation
    if (!name || procedure.length === 0) {
      return null;
    }
    
    // Create operator
    const operator: Operator = {
      id: `op_${this.nextId++}`,
      name,
      procedure,
      applicability: applicability.length > 0 ? applicability : ['math', 'philosophy', 'hybrid'],
      
      uses: 0,
      successRate: 0,
      
      novelty: 0,
      coherence: 0,
      fitness: 0,
      
      introduced: this.currentStep,
      lastUsed: this.currentStep
    };
    
    // Compute initial metrics
    operator.novelty = computeNovelty(operator, this.operators);
    operator.coherence = this.estimateCoherence(operator);
    updateFitness(operator, this.config.fitnessWeights);
    
    return operator;
  }
  
  /**
   * Parse applicability from text
   */
  private parseApplicability(text: string): TaskClass[] {
    const lower = text.toLowerCase();
    const applicability: TaskClass[] = [];
    
    if (lower.includes('math')) applicability.push('math');
    if (lower.includes('phil')) applicability.push('philosophy');
    if (lower.includes('hybrid')) applicability.push('hybrid');
    if (lower.includes('meta')) applicability.push('meta');
    if (lower.includes('applied')) applicability.push('applied');
    
    return applicability;
  }
  
  /**
   * Estimate coherence of operator definition
   */
  private estimateCoherence(operator: Operator): number {
    // Check if procedure steps are meaningful
    const hasSubstance = operator.procedure.every(step => step.length > 5);
    const hasVariety = new Set(operator.procedure).size === operator.procedure.length;
    const reasonableLength = operator.procedure.length >= 2 && operator.procedure.length <= 10;
    
    let score = 0;
    if (hasSubstance) score += 0.4;
    if (hasVariety) score += 0.3;
    if (reasonableLength) score += 0.3;
    
    return score;
  }
  
  /**
   * Mutate operators (generate new ones)
   */
  async mutateOperators(
    context: string,
    generateFunction: (prompt: string) => Promise<string>
  ): Promise<Operator[]> {
    // Check mutation rate
    if (Math.random() > this.config.mutationRate) {
      return [];
    }
    
    // Generate new operator
    const prompt = this.buildMutationPrompt(context);
    const response = await generateFunction(prompt);
    
    const newOperator = this.parseOperator(response);
    
    return newOperator ? [newOperator] : [];
  }
  
  /**
   * Build prompt for operator mutation
   */
  private buildMutationPrompt(context: string): string {
    const existingNames = this.operators.map(op => op.name).join(', ');
    
    return `Invent one new reasoning operator useful for: ${context}

${existingNames ? `Existing operators: ${existingNames}` : ''}

Create something novel and distinct. Return in this format:
Name: [operator name]
Procedure: [step 1], [step 2], [step 3], ...
Applicability: [task types this applies to]

Keep it concise and implementable.`;
  }
  
  /**
   * Record operator use
   */
  useOperator(operatorId: string, success: boolean): void {
    const operator = this.operators.find(op => op.id === operatorId);
    if (!operator) return;
    
    operator.uses++;
    operator.lastUsed = this.currentStep;
    
    // Update success rate (exponential moving average)
    const alpha = 0.3; // Learning rate
    operator.successRate = (1 - alpha) * operator.successRate + alpha * (success ? 1 : 0);
    
    // Update fitness
    updateFitness(operator, this.config.fitnessWeights);
  }
  
  /**
   * Select best operators (keep top-K by fitness with diversity)
   */
  selectOperators(): Operator[] {
    const sorted = [...this.operators].sort((a, b) => b.fitness - a.fitness);
    
    const selected: Operator[] = [];
    const diversityThreshold = 0.7; // Similarity threshold
    
    for (const op of sorted) {
      if (selected.length >= this.config.maxOperators) break;
      
      // Check if too similar to already selected
      const tooSimilar = selected.some(s => 
        this.operatorSimilarity(op, s) > diversityThreshold
      );
      
      if (!tooSimilar) {
        selected.push(op);
      }
    }
    
    return selected;
  }
  
  /**
   * Compute similarity between operators (0-1 scale)
   */
  private operatorSimilarity(op1: Operator, op2: Operator): number {
    // Name similarity
    const nameSim = this.stringSimilarity(op1.name, op2.name);
    
    // Procedure overlap (Jaccard)
    const proc1Set = new Set(op1.procedure);
    const proc2Set = new Set(op2.procedure);
    const intersection = [...proc1Set].filter(p => proc2Set.has(p)).length;
    const union = new Set([...proc1Set, ...proc2Set]).size;
    const procSim = union > 0 ? intersection / union : 0;
    
    // Applicability overlap
    const app1Set = new Set(op1.applicability);
    const app2Set = new Set(op2.applicability);
    const appIntersection = [...app1Set].filter(a => app2Set.has(a)).length;
    const appUnion = new Set([...app1Set, ...app2Set]).size;
    const appSim = appUnion > 0 ? appIntersection / appUnion : 0;
    
    return 0.3 * nameSim + 0.5 * procSim + 0.2 * appSim;
  }
  
  /**
   * Simple string similarity (normalized Levenshtein)
   */
  private stringSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    const maxLength = Math.max(s1.length, s2.length);
    const distance = this.levenshteinDistance(s1.toLowerCase(), s2.toLowerCase());
    
    return 1 - distance / maxLength;
  }
  
  /**
   * Levenshtein distance
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2[i - 1] === s1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[s2.length][s1.length];
  }
  
  /**
   * Consolidate operators (apply aging decay, filter by fitness)
   */
  consolidateOperators(): void {
    this.operators = this.operators.map(op => {
      // Apply aging decay
      const age = this.currentStep - op.lastUsed;
      const decay = Math.exp(-age / this.config.decayRate);
      
      op.fitness *= decay;
      
      return op;
    }).filter(op => op.fitness > this.config.minOperatorFitness);
  }
  
  /**
   * Add operators to library
   */
  addOperators(operators: Operator[]): void {
    this.operators.push(...operators);
  }
  
  /**
   * Set operators (replace library)
   */
  setOperators(operators: Operator[]): void {
    this.operators = operators;
  }
  
  /**
   * Get all operators
   */
  getOperators(): Operator[] {
    return [...this.operators];
  }
  
  /**
   * Get operator by ID
   */
  getOperator(id: string): Operator | null {
    return this.operators.find(op => op.id === id) || null;
  }
  
  /**
   * Get operators applicable to task class
   */
  getApplicableOperators(taskClass: TaskClass): Operator[] {
    return this.operators.filter(op => 
      op.applicability.includes(taskClass) ||
      op.applicability.includes('hybrid')
    );
  }
  
  /**
   * Get operator statistics
   */
  getStatistics() {
    return {
      totalOperators: this.operators.length,
      averageFitness: this.operators.reduce((sum, op) => sum + op.fitness, 0) / this.operators.length || 0,
      averageNovelty: this.operators.reduce((sum, op) => sum + op.novelty, 0) / this.operators.length || 0,
      totalUses: this.operators.reduce((sum, op) => sum + op.uses, 0),
      operatorsByClass: this.groupByApplicability()
    };
  }
  
  private groupByApplicability() {
    const groups: Record<string, number> = {};
    this.operators.forEach(op => {
      op.applicability.forEach(cls => {
        groups[cls] = (groups[cls] || 0) + 1;
      });
    });
    return groups;
  }
  
  /**
   * Clear all operators
   */
  clear(): void {
    this.operators = [];
    this.nextId = 1;
  }
}
