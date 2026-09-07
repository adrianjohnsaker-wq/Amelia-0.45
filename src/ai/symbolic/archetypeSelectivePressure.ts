
// -------------------------------------------------------------
// archetypeSelectivePressure.ts
// Selective pressure on archetypes based on relational,
// affective, coherence, novelty & symbolic fitness.
// -------------------------------------------------------------
import { ArchetypeEntity } from "./archetypeEcology";

export type ArchetypeFitnessInput = {
    archetype: ArchetypeEntity;
    affect: { valence:number; arousal:number; tension:number };
    relational: { empathy:number; reciprocity:number };
    symbolic: { novelty:number; coherence:number; recurrence:number };
    system: { entropy:number; stagnation:number };
};

export type ArchetypeSelectionWeights = {
    valenceWeight: number;
    empathyWeight: number;
    reciprocityWeight: number;
    noveltyWeight: number;
    coherenceWeight: number;
    recurrencePenalty: number;
    entropyBonus: number;
    stagnationPenalty: number;
};

export const defaultSelectionWeights: ArchetypeSelectionWeights = {
    valenceWeight: 0.18,
    empathyWeight: 0.22,
    reciprocityWeight: 0.22,
    noveltyWeight: 0.16,
    coherenceWeight: 0.12,
    recurrencePenalty: 0.15,
    entropyBonus: 0.10,
    stagnationPenalty: 0.20
};

// 0..1 fitness multiplier applied to energy drift
export function computeArchetypeFitness(
    input: ArchetypeFitnessInput,
    w: ArchetypeSelectionWeights = defaultSelectionWeights
){
    const { affect, relational, symbolic, system } = input;

    // base drivers
    let score =
        w.valenceWeight * (affect.valence + 1) / 2 +
        w.empathyWeight * relational.empathy +
        w.reciprocityWeight * relational.reciprocity +
        w.noveltyWeight * symbolic.novelty +
        w.coherenceWeight * symbolic.coherence;

    // penalties
    score -= w.recurrencePenalty * symbolic.recurrence;
    score -= w.stagnationPenalty * system.stagnation;

    // encouragement of exploratory entropy (only when valence stable)
    if (affect.valence > -0.2) score += w.entropyBonus * system.entropy;

    // clamp
    score = Math.max(-1, Math.min(1, score));

    return score;
}

// Apply fitness to archetype population (energy adjustment)
export function applySelectivePressure(
    pop: ArchetypeEntity[],
    fitnessScores: Record<string, number>
){
    for (const e of pop){
        const f = fitnessScores[e.id] ?? 0;
        // fitness as metabolic modulation
        // positive = bonus vitality; negative = soft decline
        e.energy += 0.12 * f;
        
        // slightly update aggression/empathy drift
        e.empathy = Math.min(1, Math.max(0, e.empathy + 0.05*f));
        e.aggression = Math.min(1, Math.max(0, e.aggression - 0.04*f));
    }
}
