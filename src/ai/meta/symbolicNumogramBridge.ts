// -------------------------------------------------------------
// symbolicNumogramBridge.ts — Feature fusion for composer/policy
// -------------------------------------------------------------

import { ArchetypeRegistry, seedDefaultArchetypes } from "@/ai/symbolic/archetypeRegistry";
import { jungianAnalyze, VAT } from "@/ai/symbolic/jungianAnalyzer";
import { detectSymbolicFractality } from "@/ai/symbolic/fractalSymbolDetector";
import { makeHD, stepDistribution, projectToNine, HDNumogram } from "@/ai/numogram/numogramHD";
import { initTemporal, tickTemporal, temporalSignature } from "@/ai/numogram/numogramTemporal";


export type BridgeState = {
    reg: ArchetypeRegistry;
    hd: HDNumogram;
    temporal: ReturnType<typeof initTemporal>;
    lastZones: number[];
    lastHDIdx: number;
};

export function initSymbolicNumogramBridge(dims=12, layers=3){
    return {
        reg: seedDefaultArchetypes(),
        hd: makeHD({ dims, layers }),
        temporal: initTemporal(36),
        lastZones: [],
        lastHDIdx: 0
    } as BridgeState;
}

/** Run fusion for a single passage */
export function fusePass( st:BridgeState, tokens:string[], affect:VAT ){
    // 1) Symbolic analysis
    const j = jungianAnalyze(st.reg, tokens, affect);
    const fract = detectSymbolicFractality(tokens);

    // 2) HD Numogram step (Markov from last index)
    const dist = stepDistribution(st.hd, st.lastHDIdx);
    // sample deterministically by max (you can randomise if you like)
    let nextHD = 0;
    let best=-1;
    for (let i=0;i<dist.length;i++) if (dist[i]>best){ best=dist[i]; nextHD=i; }
    st.lastHDIdx = nextHD;
    const classicZone = projectToNine(nextHD, st.hd.dims);
    st.lastZones.push(classicZone);
    if (st.lastZones.length>120) st.lastZones.shift();

    // 3) Temporal update
    tickTemporal(st.temporal, classicZone);
    const tSig = temporalSignature(st.lastZones);

    // 4) Build composer feature vector (extend as needed, length stable)
    const jung = j.structuralAxes;
    const features = [
        // archetypal axes (−1..1)
        jung.personaShadow, jung.animaAnimus, jung.egoSelf,
        // fractal signal (0..1)
        fract.fractalIndex,
        // temporal (bounded 0..1)
        st.temporal.state.phase, // cycle phase 0..1
        tSig.periodicity, // 0..1
        tSig.entropy, // 0..1
        // zone as scalar (normalize by dims)
        classicZone / 9
    ];

    const notes = {
        topArchetypes: Object.entries(j.activations).sort((a,b)=>b[1]-a[1]).slice(0,3),
        fractal: fract,
        temporal: { phase: st.temporal.state.phase, ...tSig },
        zone: classicZone
    };

    return { features, notes };
}
