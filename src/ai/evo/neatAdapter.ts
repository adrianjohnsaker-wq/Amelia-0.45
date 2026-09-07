
// src/ai/evo/neatAdapter.ts
// -------------------------------------------------------------
// Simple NEAT-like neural network adapter.
// -------------------------------------------------------------

export interface NeatGene {
    in: number;
    out: number;
    weight: number;
    enabled: boolean;
}

export interface NeatGenome {
    id: string;
    inputs: number;
    outputs: number;
    hidden: number;
    genes: NeatGene[];
}

export function initNeat(inputs: number, outputs: number): NeatGenome {
    const genes: NeatGene[] = [];
    for (let i = 0; i < inputs; i++) {
        for (let o = 0; o < outputs; o++) {
            genes.push({ in: i, out: inputs + o, weight: Math.random() * 2 - 1, enabled: true });
        }
    }
    return { id: Math.random().toString(36).slice(2), inputs, outputs, hidden: 0, genes };
}

export function mutateNeat(g: NeatGenome): NeatGenome {
    const m = JSON.parse(JSON.stringify(g));
    const idx = Math.floor(Math.random() * m.genes.length);
    m.genes[idx].weight += (Math.random() * 2 - 1) * 0.1;
    return m;
}

export function crossoverNeat(a: NeatGenome, b: NeatGenome): NeatGenome {
    const child = JSON.parse(JSON.stringify(a));
    for (let i = 0; i < child.genes.length; i++) {
        if (Math.random() < 0.5 && i < b.genes.length) child.genes[i].weight = b.genes[i].weight;
    }
    return child;
}

export function compileNeat(genome: NeatGenome) {
    return {
        predict: (inputs: number[]) => {
            const outputs = new Array(genome.outputs).fill(0);
            for (const g of genome.genes) {
                if (!g.enabled) continue;
                const value = inputs[g.in] * g.weight;
                const outIdx = g.out - genome.inputs;
                if (outputs[outIdx] !== undefined) outputs[outIdx] += value;
            }
            return outputs.map(o => Math.tanh(o)); // bounded -1..1
        }
    };
}
