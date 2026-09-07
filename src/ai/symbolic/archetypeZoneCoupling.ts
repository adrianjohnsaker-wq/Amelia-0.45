
// -------------------------------------------------------------
// archetypeZoneCoupling.ts — Binds archetypes to numogram zones
// and applies migration / zone-nudge influence.
// -------------------------------------------------------------
import { HDNumogram, stepDistribution, projectToNine } from "@/ai/numogram/numogramHD";

export type ZoneCouplingState = {
    // learned preference per archetype → HD index (soft)
    hdAffinities: Record<string, number[]>; // per-archetype distribution over HD dims
};

export function initZoneCoupling(): ZoneCouplingState {
    return { hdAffinities: {} };
}

/** Update HD affinities from ecology pressure (reinforcement-like). */
export function reinforceZoneAffinities(
    st: ZoneCouplingState,
    hd: HDNumogram,
    archetypePressure: Record<string,number>, // from ecologyStep().pressure
    currentHDIndex: number
){
    for (const [aid, w] of Object.entries(archetypePressure)){
        const A = st.hdAffinities[aid] || Array(hd.dims).fill(1/hd.dims);
        // move mass slightly toward currentHDIndex (soft winner-take-most)
        const alpha = 0.05 * w;
        for (let i=0;i<A.length;i++){
            A[i] = (1-alpha)*A[i] + (i===currentHDIndex ? alpha : 0);
        }
        // renormalize
        const s = A.reduce((a,b)=>a+b,0) || 1;
        for (let i=0;i<A.length;i++) A[i] /= s;
        st.hdAffinities[aid] = A;
    }
}

/** Compute a zone-nudge from active archetypes toward their preferred HD pockets. */
export function zoneNudgeFromArchetypes(
    st: ZoneCouplingState,
    hd: HDNumogram,
    archetypePressure: Record<string,number>,
    currentHDIndex: number
){
    // Aggregate preferred direction by mixing each archetype's HD distribution by its pressure
    const mix = Array(hd.dims).fill(0);
    for (const [aid, w] of Object.entries(archetypePressure)){
        const A = st.hdAffinities[aid] || Array(hd.dims).fill(1/hd.dims);
        for (let i=0;i<hd.dims;i++) mix[i] += w*A[i];
    }
    // Convert to probability
    const s = mix.reduce((a,b)=>a+b,0) || 1;
    for (let i=0;i<hd.dims;i++) mix[i] /= s;

    // One step suggestion: blend model’s native stepDistribution with archetype mix
    const native = stepDistribution(hd, currentHDIndex);
    const beta = 0.35; // coupling strength (0..1)
    const blended = native.map((p,i)=> (1-beta)*p + beta*mix[i]);

    // Pick argmax as suggested HD next step; also project classic zone for reporting
    let next=0, best=-1;
    for (let i=0;i<blended.length;i++) if (blended[i]>best){ best=blended[i]; next=i; }

    const classic = projectToNine(next, hd.dims);

    return { suggestedHD: next, suggestedClassic: classic, distribution: blended };
}
