
// src/ai/evo/vatFitness.ts
// -------------------------------------------------------------
// Fitness function for continuous V.A.T. evolution
// -------------------------------------------------------------

import { VATState } from "./vatTypes";

export interface FitnessWeights {
    accuracy: number;
    smoothness: number;
    relational: number;
}

export function vatDistance(a: VATState, b: VATState) {
    const dv = a.valence - b.valence;
    const da = a.arousal - b.arousal;
    const dt = a.tension - b.tension;
    return Math.sqrt(dv*dv + da*da + dt*dt) / Math.sqrt(3);
}

export function computeVATFitness(
    predicted: VATState[],
    targets: VATState[],
    relationalScores: number[],
    weights: FitnessWeights = { accuracy: 0.6, smoothness: 0.2, relational: 0.2 }
) {
    const n = predicted.length;
    let acc = 0, smooth = 0, rel = 0;
    for (let i = 0; i < n; i++) {
        acc += 1 - vatDistance(predicted[i], targets[i]);
        if (i > 0) smooth += 1 - vatDistance(predicted[i], predicted[i-1]);
        rel += 1 - Math.abs(predicted[i].valence - relationalScores[i]);
    }
    acc /= n;
    smooth /= (n > 1 ? n - 1 : 1);
    rel /= n;

    const score = weights.accuracy * acc + weights.smoothness * smooth + weights.relational * rel;
    return { score, components: { acc, smooth, rel } };
}
