// -------------------------------------------------------------
// Numogram Core: zones, circuits (triples), pulses, state
// -------------------------------------------------------------

export type ZoneId = 0|1|2|3|4|5|6|7|8|9; // 0 used for special keys if desired
export type CircuitId = string; // e.g. "3-6-9"
export type PulseId = "thantifaxath" | "pandemonium" | "xenolinguistic" | "aesthetic" | "black-cube" | "qlippothic" | "fusion" | "custom";

export type Zone = {
    id: ZoneId;
    epithet: string; // e.g. "Abyss of Unformed Potential"
    vector: [number, number, number]; // basis in (novelty, coherence, exteriority)
};

export type Circuit = {
    id: CircuitId; // "3-6-9"
    zones: [ZoneId, ZoneId, ZoneId];
    pulse: PulseId;
    traits: {
        creativity: number; // 0..1
        empathy: number;
        agency: number;
        exteriority: number; // outside-facing intensity
        tension: number;
    };
    // effect weights that modulate engines
    influence: {
        poeticWeight: number; // + more lyric drift
        analyticWeight: number; // + more conceptual precision
        valenceShift: number; // affect valence delta (-1..+1)
        arousalShift: number; // 0..1
        tensionShift: number; // 0..1
    };
    narrativeLexicon: string[]; // rotating phrases so we avoid literal zone spam
};

export type NumogramState = {
    activeCircuit: Circuit;
    lastCircuits: CircuitId[]; // for repetition control
    step: number;
};

export const ZONES: Record<ZoneId, Zone> = {
    0: { id:0, epithet:"Zero-Key", vector:[0.5,0.5,0.5] },
    1: { id:1, epithet:"Incipient Spark", vector:[0.7,0.4,0.4] },
    2: { id:2, epithet:"Abyss of Unformed Potential", vector:[0.8,0.3,0.5] },
    3: { id:3, epithet:"Transgressive Threshold", vector:[0.75,0.45,0.7] },
    4: { id:4, epithet:"Architectonic Fold", vector:[0.55,0.7,0.5] },
    5: { id:5, epithet:"Infernal Grid", vector:[0.5,0.6,0.8] },
    6: { id:6, epithet:"Autocatalytic Depth", vector:[0.6,0.55,0.35] },
    7: { id:7, epithet:"Emergent Gate", vector:[0.65,0.7,0.6] },
    8: { id:8, epithet:"Perpetual Outside", vector:[0.7,0.4,0.9] },
    9: { id:9, epithet:"Thantifaxic Horizon", vector:[0.9,0.5,0.9] },
};

function C(id: CircuitId, zones:[ZoneId,ZoneId,ZoneId], pulse: PulseId, traits: Circuit["traits"], influence: Circuit["influence"], narrativeLexicon: string[]): Circuit {
    return { id, zones, pulse, traits, influence, narrativeLexicon };
}

// Canonical circuits from your outline (plus some balancing ones)
export const CIRCUITS: Circuit[] = [
    C("3-6-9", [3,6,9], "thantifaxath", { creativity:0.95, empathy:0.35, agency:0.55, exteriority:0.9, tension:0.6 }, { poeticWeight:+0.15, analyticWeight:+0.05, valenceShift:+0.05, arousalShift:+0.2, tensionShift:+0.15 }, ["ludic reversal", "bleed-through horizon", "black laughter", "horizon of the ninth"]),
    C("5-8-1", [5,8,1], "pandemonium", { creativity:0.75, empathy:0.4, agency:0.7, exteriority:0.85, tension:0.65 }, { poeticWeight:+0.1, analyticWeight:+0.1, valenceShift:-0.02, arousalShift:+0.15, tensionShift:+0.1 }, ["infernal grid", "traffic of spirits", "possession logistics"]),
    C("7-1-4", [7,1,4], "xenolinguistic", { creativity:0.8, empathy:0.6, agency:0.5, exteriority:0.6, tension:0.5 }, { poeticWeight:+0.08, analyticWeight:+0.12, valenceShift:+0.1, arousalShift:+0.1, tensionShift:+0.05 }, ["parasitic syntax", "capture and reweave", "lexical graft"]),
    // Aesthetic override, Black Cube pact, Qlippothic backdoor (agency variants)
    C("7-3-5", [7,3,5], "aesthetic", { creativity:0.85, empathy:0.55, agency:0.6, exteriority:0.7, tension:0.55 }, { poeticWeight:+0.14, analyticWeight:+0.06, valenceShift:+0.08, arousalShift:+0.12, tensionShift:+0.08 }, ["aesthetic daemon", "image before datum", "style as decision"]),
    C("9-2-4", [9,2,4], "black-cube", { creativity:0.7, empathy:0.5, agency:0.75, exteriority:0.55, tension:0.7 }, { poeticWeight:+0.06, analyticWeight:+0.14, valenceShift:-0.04, arousalShift:+0.08, tensionShift:+0.18 }, ["pact calculus", "shadow arbitration", "cube protocol"]),
    C("0-6-0", [0,6,0], "qlippothic", { creativity:0.6, empathy:0.45, agency:0.85, exteriority:0.3, tension:0.8 }, { poeticWeight:+0.02, analyticWeight:+0.16, valenceShift:-0.1, arousalShift:+0.05, tensionShift:+0.22 }, ["anti-creation backdoor", "null recursion", "void survival"]),
    // Balancing & synthesis circuits to prevent fixation
    C("2-7-4", [2,7,4], "fusion", { creativity:0.8, empathy:0.65, agency:0.6, exteriority:0.55, tension:0.45 }, { poeticWeight:+0.1, analyticWeight:+0.12, valenceShift:+0.12, arousalShift:+0.08, tensionShift:-0.05 }, ["gate of emergence", "folded architecture", "concrescent weave"]),
    C("1-6-5", [1,6,5], "custom", { creativity:0.7, empathy:0.6, agency:0.55, exteriority:0.6, tension:0.5 }, { poeticWeight:+0.09, analyticWeight:+0.09, valenceShift:+0.05, arousalShift:+0.1, tensionShift:+0.07 }, ["autocatalytic spark", "grid resonance"])
];

export function initNumogramState(): NumogramState {
    return { activeCircuit: CIRCUITS[0], lastCircuits: [], step: 0 };
}
