
// src/ai/evo/vatPipeline.ts
// -------------------------------------------------------------
// Integration example: evolving both predictor + mapper together
// -------------------------------------------------------------

import { evolveVATPredictor } from "./vatEvolver";
import { evolveFeatureMapper } from "./vatFeatureMapper";
import { VATDataset } from "./vatTypes";
import { NeatGenome } from "./neatAdapter";
import { FeatureGenome } from "./vatFeatureMapper";


function getFeatures(log: any): Record<string, number> {
    const state = log.state || {};
    const execution = log.execution || {};
    const report = execution.executionReport || {};

    return {
        poeticWeight: state.poeticWeight || 0.5,
        reflectiveWeight: state.reflectiveWeight || 0.5,
        empathy: (state.lastRelationalState?.empathy) || 0.5,
        reciprocity: (state.lastRelationalState?.reciprocity) || 0.5,
        CETBalance: (log.cetReading?.balanceIndex) || 0.5,
        novelty: report.creativeValue || 0.5,
        coherence: report.creativeValue || 0.5, // Using creativeValue as a proxy
        arousal: state.arousal || 0.5,
        tension: state.tension || 0.5
    };
}


function getTarget(log: any): { valence: number, arousal: number, tension: number } {
    const state = log.state || {};
    return {
        valence: state.valence || 0,
        arousal: state.arousal || 0.5,
        tension: state.tension || 0.5
    };
}

export async function runVATEvolution(logs: any[]): Promise<{ predictor: { bestGenome: NeatGenome, bestFitness: number }, mapper: { bestGenome: FeatureGenome, bestFitness: number } }> {

    if (!logs || logs.length === 0) {
        throw new Error("Cannot run evolution with empty logs.");
    }

    const vatData: VATDataset = {
        samples: logs.map(l => ({
            features: getFeatures(l),
            target: getTarget(l)
        }))
    };

    const evoCfg = {
        popSize: 40,
        elite: 4,
        mutationRate: 0.3,
        crossoverRate: 0.5,
        maxGenerations: 25
    };

    // Evolve the predictor first
    const featureMapperFunc = (f: Record<string, number>) => Object.values(f);
    const predictorResult = await evolveVATPredictor(vatData, evoCfg, featureMapperFunc);

    // Now, evolve the feature mapper using the best predictor as a reference
    // This is a simplified co-evolution. A more complex setup might alternate generations.
    const bestPredictor = predictorResult.bestGenome as NeatGenome;
    const predictVatFunc = (features: Record<string, number>) => {
        const compiled = (compileNeat(bestPredictor) as any);
        return compiled.predict(Object.values(features));
    };

    const mapperResult = await evolveFeatureMapper(vatData, evoCfg, predictVatFunc);

    return {
        predictor: predictorResult as { bestGenome: NeatGenome, bestFitness: number },
        mapper: mapperResult as { bestGenome: FeatureGenome, bestFitness: number },
    };
}

// Add this import if not present
import { compileNeat } from './neatAdapter';
