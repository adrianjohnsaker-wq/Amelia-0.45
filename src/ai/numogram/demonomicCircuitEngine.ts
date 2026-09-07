// -------------------------------------------------------------
// Selects + rotates circuits with entropy controls and cooling-off
// -------------------------------------------------------------

import { CIRCUITS, NumogramState, Circuit } from "./numogramCore";
const clamp = (x:number,a=0,b=1)=>Math.min(b,Math.max(a,x));

export type CircuitPolicy = {
    coolingWindow: number; // how many recent steps a circuit is “cooling”
    rotateEvery: number; // hard rotation period
    entropyBias: number; // 0..1 -> higher = more novelty
};

export function selectCircuit(state: NumogramState, policy: CircuitPolicy): NumogramState {
    const step = state.step + 1;
    const cooling = new Set(state.lastCircuits.slice(-policy.coolingWindow));

    // base pool minus cooling circuits
    const pool = CIRCUITS.filter(c => !cooling.has(c.id));

    // weight circuits by novelty vs stability
    const weights = pool.map(c => {
        const novelty = c.traits.exteriority + c.traits.creativity; // rough novelty proxy
        const stability = c.traits.empathy + (1 - c.traits.tension);
        return clamp(policy.entropyBias * novelty + (1 - policy.entropyBias) * stability, 0.01, 1);
    });

    // rotate if period reached
    let chosen: Circuit;
    if (step % policy.rotateEvery === 0) {
        chosen = pool[Math.floor(Math.random() * pool.length)];
    } else {
        // softmax choice
        const exps = weights.map(w => Math.exp(w));
        const sum = exps.reduce((a,b)=>a+b,0);
        let r = Math.random() * sum;
        let idx = 0;
        for (; idx < exps.length; idx++) {
            r -= exps[idx];
            if (r <= 0) break;
        }
        chosen = pool[Math.min(idx, pool.length-1)];
    }

    return { activeCircuit: chosen, lastCircuits: [...state.lastCircuits, chosen.id].slice(-32), step };
}
