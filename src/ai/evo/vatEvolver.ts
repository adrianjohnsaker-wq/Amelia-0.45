
// src/ai/evo/vatEvolver.ts
// -------------------------------------------------------------
// Evolves VAT Predictor (NEAT regressor) for continuous affect
// -------------------------------------------------------------

import { evolve, EvoConfig, EvoHooks, Fitness } from "./evoCore";
import { initNeat, mutateNeat, crossoverNeat, compileNeat, NeatGenome } from "./neatAdapter";
import { VATDataset, VATState } from "./vatTypes";
import { computeVATFitness } from "./vatFitness";

export async function evolveVATPredictor(
    data: VATDataset,
    evoCfg: EvoConfig,
    featureMapper: (f: Record<string, number>) => number[]
) {
    const hooks: EvoHooks = {
        initPopulation: (cfg) => Array(cfg.popSize).fill(0).map(() => initNeat(Object.keys(data.samples[0].features).length, 3) ),
        develop: (g: NeatGenome) => compileNeat(g),
        evaluate: (phenotype): Fitness => {
            const preds: VATState[] = [];
            const targs: VATState[] = [];
            const rel: number[] = [];
            for (const s of data.samples) {
                const x = featureMapper(s.features);
                const [v, a, t] = phenotype.predict(x);
                preds.push({ valence: v, arousal: (a + 1)/2, tension: (t + 1)/2 });
                targs.push(s.target);
                rel.push(s.features.empathy ?? 0.5);
            }
            return computeVATFitness(preds, targs, rel);
        },
        mutate: mutateNeat,
        crossover: crossoverNeat
    };

    const result = await evolve(evoCfg, hooks);
    return result;
}
