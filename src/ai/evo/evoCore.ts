
// src/ai/evo/evoCore.ts
// -------------------------------------------------------------
// Generic Evolution Core - handles populations, fitness, selection,
// mutation, and crossover for any genome type.
// -------------------------------------------------------------

export interface Fitness {
    score: number;
    components?: Record<string, number>;
}

export interface EvoConfig {
    popSize: number;
    elite: number;
    mutationRate: number;
    crossoverRate: number;
    maxGenerations: number;
}

export interface EvoHooks {
    initPopulation: (cfg: EvoConfig) => any[];
    develop: (genome: any) => any;
    evaluate: (phenotype: any) => Fitness;
    mutate: (genome: any) => any;
    crossover: (a: any, b: any) => any;
}

function selectByFitness(pop: any[], fits: Fitness[], eliteCount: number) {
    const combined = pop.map((p, i) => ({ p, s: fits[i].score }));
    combined.sort((a, b) => b.s - a.s);

    const elites = combined.slice(0, eliteCount).map(c => c.p);
    const total = combined.reduce((a, c) => a + Math.max(c.s, 0), 0);

    const pick = () => {
        let r = Math.random() * total;
        for (const c of combined) {
            r -= Math.max(c.s, 0);
            if (r <= 0) return c.p;
        }
        return combined[combined.length - 1].p;
    };

    return { elites, pick };
}

export async function evolve(cfg: EvoConfig, hooks: EvoHooks) {
    let population = hooks.initPopulation(cfg);
    let best: any = null;
    let bestFit = -Infinity;

    for (let g = 0; g < cfg.maxGenerations; g++) {
        const phenotypes = population.map(hooks.develop);
        const fitnesses = phenotypes.map(hooks.evaluate);
        const { elites, pick } = selectByFitness(population, fitnesses, cfg.elite);

        const genBest = Math.max(...fitnesses.map(f => f.score));
        if (genBest > bestFit) {
            bestFit = genBest;
            best = population[fitnesses.findIndex(f => f.score === bestFit)];
        }

        const next: any[] = [...elites];
        while (next.length < cfg.popSize) {
            let child;
            if (Math.random() < cfg.crossoverRate) {
                const a = pick();
                const b = pick();
                child = hooks.crossover(a, b);
            } else {
                const a = pick();
                child = JSON.parse(JSON.stringify(a));
            }
            if (Math.random() < cfg.mutationRate) child = hooks.mutate(child);
            next.push(child);
        }
        population = next;
    }
    return { bestGenome: best, bestFitness: bestFit };
}
