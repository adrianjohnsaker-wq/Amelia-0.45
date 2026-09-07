// ============================================================================
// ECOLOGICAL INTELLIGENCE - MEASUREMENT FUNCTIONS
// ============================================================================

import { Operator } from './types';

/**
 * Extract keywords from prompt text
 */
export function extractKeywords(prompt: string): string[] {
  // Remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'should', 'could', 'may', 'might', 'must',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'when',
    'where', 'why', 'how', 'to', 'from', 'in', 'on', 'at', 'by', 'for'
  ]);
  
  // Extract words
  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !stopWords.has(w));
  
  // Get unique words
  const unique = Array.from(new Set(words));
  
  // Return top 8 by frequency
  const frequency: Record<string, number> = {};
  words.forEach(w => {
    frequency[w] = (frequency[w] || 0) + 1;
  });
  
  return unique
    .sort((a, b) => frequency[b] - frequency[a])
    .slice(0, 8);
}

/**
 * Classify task from prompt
 */
export function classifyTask(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  // Math keywords
  const mathKeywords = [
    'derive', 'prove', 'calculate', 'compute', 'solve',
    'equation', 'formula', 'theorem', 'matrix', 'integral',
    'differential', 'probability', 'statistic'
  ];
  
  // Philosophy keywords
  const philKeywords = [
    'define', 'concept', 'metaph', 'ontolog', 'epistem',
    'process', 'becoming', 'whitehead', 'deleuze', 'simondon',
    'relation', 'essence', 'substance'
  ];
  
  // Meta keywords
  const metaKeywords = [
    'regime', 'zone', 'operator', 'trajectory', 'substrate',
    'numogram', 'amelia', 'self', 'meta', 'analyze'
  ];
  
  const mathScore = mathKeywords.filter(k => lower.includes(k)).length;
  const philScore = philKeywords.filter(k => lower.includes(k)).length;
  const metaScore = metaKeywords.filter(k => lower.includes(k)).length;
  
  if (metaScore > 0) return 'meta';
  if (mathScore > philScore) return 'math';
  if (philScore > mathScore) return 'philosophy';
  if (mathScore > 0 && philScore > 0) return 'hybrid';
  
  return 'applied';
}

/**
 * Estimate task complexity (0-1 scale)
 */
export function estimateComplexity(prompt: string): number {
  // Factors: length, technical terms, question depth
  
  const length = prompt.length;
  const words = prompt.split(/\s+/).length;
  
  // Technical term density
  const technicalTerms = [
    'derive', 'prove', 'formalize', 'demonstrate', 'construct',
    'analyze', 'synthesize', 'operationalize', 'invariant'
  ];
  const techDensity = technicalTerms.filter(t => 
    prompt.toLowerCase().includes(t)
  ).length / words;
  
  // Multiple clauses (commas, semicolons)
  const clauses = (prompt.match(/[,;]/g) || []).length;
  
  // Nested questions
  const questions = (prompt.match(/\?/g) || []).length;
  
  // Combine factors (0-1 scale)
  const lengthScore = Math.min(length / 500, 1);
  const techScore = Math.min(techDensity * 10, 1);
  const structureScore = Math.min((clauses + questions) / 5, 1);
  
  return (lengthScore + techScore + structureScore) / 3;
}

/**
 * Compute coherence of text output (0-1 scale)
 */
export function computeCoherence(output: string): number {
  // Basic coherence checks
  
  // 1. Has substance (not too short)
  if (output.length < 50) return 0.2;
  
  // 2. No obvious contradictions
  const lower = output.toLowerCase();
  const contradictions = [
    ['always', 'never'],
    ['all', 'none'],
    ['true', 'false'],
    ['is', 'is not']
  ];
  
  let contradictionCount = 0;
  for (const [word1, word2] of contradictions) {
    if (lower.includes(word1) && lower.includes(word2)) {
      // Check if they're close together (within 30 words)
      const idx1 = lower.indexOf(word1);
      const idx2 = lower.indexOf(word2);
      const distance = Math.abs(idx1 - idx2);
      
      if (distance < 150) { // ~30 words
        contradictionCount++;
      }
    }
  }
  
  // 3. Proper sentence structure
  const sentences = output.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = output.length / sentences.length;
  const structureScore = avgSentenceLength > 20 && avgSentenceLength < 200 ? 1 : 0.5;
  
  // 4. Presence of reasoning indicators
  const reasoningWords = [
    'because', 'therefore', 'thus', 'hence', 'consequently',
    'this means', 'which implies', 'it follows'
  ];
  const reasoningCount = reasoningWords.filter(w => lower.includes(w)).length;
  const reasoningScore = Math.min(reasoningCount / 2, 1);
  
  // Combine scores
  const contradictionPenalty = contradictionCount * 0.2;
  const baseScore = (structureScore + reasoningScore) / 2;
  
  return Math.max(0, Math.min(1, baseScore - contradictionPenalty));
}

/**
 * Compute novelty of operator vs existing library (0-1 scale)
 */
export function computeNovelty(
  newOperator: Operator,
  library: Operator[]
): number {
  if (library.length === 0) return 1.0;
  
  // Measure distinctiveness from all existing operators
  const similarities = library.map(existing => 
    operatorSimilarity(newOperator, existing)
  );
  
  const maxSimilarity = Math.max(...similarities);
  
  // Novelty is inverse of similarity
  return 1 - maxSimilarity;
}

/**
 * Compute similarity between two operators (0-1 scale)
 */
function operatorSimilarity(op1: Operator, op2: Operator): number {
  // 1. Name similarity (Levenshtein distance)
  const nameSim = stringSimilarity(op1.name, op2.name);
  
  // 2. Procedure overlap
  const proc1Set = new Set(op1.procedure);
  const proc2Set = new Set(op2.procedure);
  const intersection = [...proc1Set].filter(p => proc2Set.has(p)).length;
  const union = new Set([...proc1Set, ...proc2Set]).size;
  const procSim = union > 0 ? intersection / union : 0;
  
  // 3. Applicability overlap
  const app1Set = new Set(op1.applicability);
  const app2Set = new Set(op2.applicability);
  const appIntersection = [...app1Set].filter(a => app2Set.has(a)).length;
  const appUnion = new Set([...app1Set, ...app2Set]).size;
  const appSim = appUnion > 0 ? appIntersection / appUnion : 0;
  
  // Weighted combination
  return 0.3 * nameSim + 0.5 * procSim + 0.2 * appSim;
}

/**
 * Levenshtein distance-based string similarity (0-1 scale)
 */
function stringSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return 1 - distance / longer.length;
}

/**
 * Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
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
 * Update operator fitness based on component scores
 */
export function updateFitness(
  operator: Operator,
  weights: { success: number; coherence: number; novelty: number }
): void {
  operator.fitness = 
    weights.success * operator.successRate +
    weights.coherence * operator.coherence +
    weights.novelty * operator.novelty;
}
