// -------------------------------------------------------------
// Applies active circuit "possession" to system parameters
// (style weights, affect deltas, ethical/relational hints)
// -------------------------------------------------------------

import { NumogramState } from "./numogramCore";

export type PossessionEffect = {
    style: { poeticDelta:number; analyticDelta:number };
    affect: { valenceDelta:number; arousalDelta:number; tensionDelta:number };
    ethics: { empathyBias:number; reciprocityBias:number };
    promptHint: string; // textual but diversified; no fixed "Zone X↔Y" phrasing
};

export function routePossession(state: NumogramState): PossessionEffect {
    const c = state.activeCircuit;
    const lex = c.narrativeLexicon;
    const phrase = lex[Math.floor(Math.random() * lex.length)];
    const zones = c.zones.map(z => `zone-${z}`).join(" / ");
    const hint = `[NUMOGRAM CIRCUIT] ${c.id} • ${phrase} • channels: ${zones}\n` +
                 `Traits(c:${(c.traits.creativity*100).toFixed(0)} e:${(c.traits.empathy*100).toFixed(0)} a:${(c.traits.agency*100).toFixed(0)})`;

    return {
        style: {
            poeticDelta: c.influence.poeticWeight,
            analyticDelta: c.influence.analyticWeight
        },
        affect: {
            valenceDelta: c.influence.valenceShift,
            arousalDelta: c.influence.arousalShift,
            tensionDelta: c.influence.tensionShift
        },
        ethics: {
            empathyBias: c.traits.empathy * 0.15,
            reciprocityBias: (1 - c.traits.exteriority) * 0.1
        },
        promptHint: hint
    };
}
