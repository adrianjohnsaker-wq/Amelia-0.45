
// src/ai/evo/vatFeatureMapper.ts
// -------------------------------------------------------------
// Evolves feature-to-affect weight mapping for VAT regression
// -------------------------------------------------------------

import { evolve, EvoConfig, EvoHooks, Fitness } from "./evoCore";
import { VATDataset, VATState } from "./vatTypes";
import { computeVATFitness } from "./vatFitness";

export type FeatureGenome = {
    id: string;
    weights: Record<string, number>;
};

export async function evolveFeatureMapper(
    data: VATDataset,
    evoCfg: EvoConfig,
    predictVAT: (features: Record<string, number>) => number[]
) {
    const featureNames = Object.keys(data.samples[0].features);
    const initGenome = (): FeatureGenome => ({
        id: Math.random().toString(36).slice(2),
        weights: Object.fromEntries(featureNames.map(f => [f, Math.random() * 2 - 1]))
    });

    const mutate = (g: FeatureGenome): FeatureGenome => {
        const m = JSON.parse(JSON.stringify(g));
        const key = featureNames[Math.floor(Math.random() * featureNames.length)];
        m.weights[key] += (Math.random() * 2 - 1) * 0.2;
        return m;
    };

    const cross = (a: FeatureGenome, b: FeatureGenome): FeatureGenome => ({
        id: Math.random().toString(36).slice(2),
        weights: Object.fromEntries(featureNames.map(f =>
            [f, Math.random() < 0.5 ? a.weights[f] : b.weights[f]])
        )
    });

    const hooks: EvoHooks = {
        initPopulation: () => Array(evoCfg.popSize).fill(0).map(initGenome),
        develop: (g) => ({
            predict: (signals: Record<string, number>) => featureNames.map(f => (signals[f] ?? 0) * g.weights[f])
        }),
        evaluate: (p: any): Fitness => {
            const preds: VATState[] = [];
            const targs: VATState[] = [];
            const rel: number[] = [];
            for (const s of data.samples) {
                const x = p.predict(s.features);
                const y = predictVAT(s.features); // This seems to be comparing against another prediction, which might not be what's intended. For co-evo, it might compare to the target.
                preds.push({ valence: x[0], arousal: (x[1] + 1)/2, tension: (x[2] + 1)/2 });
                targs.push(s.target);
                rel.push(s.features.empathy ?? 0.5);
            }
            return computeVATFitness(preds, targs, rel);
        },
        mutate,
        crossover: cross
    };

    return evolve(evoCfg, hooks);
}
