
// -------------------------------------------------------------
// affectGatedFFN.ts - Applies affective gating to FFN layers
// -------------------------------------------------------------

import type { AffectState } from "../meta/toneAffectCoupler";

// Assuming the ffnLayer object has a 'hidden' property which is a numeric array
interface GatedFFNLayer {
    hidden: number[];
    lastAffect?: AffectState;
    // other potential properties of a feed-forward network layer
}

export function affectGatedFFN(ffnLayer: GatedFFNLayer, affect: AffectState): GatedFFNLayer {
    const { valence, arousal, tension } = affect;

    // Gate dynamics:
    // - `gain` increases with positive valence, decreases with tension.
    // - `leak` is higher when arousal is low (more dampening), lower when arousal is high (less dampening).
    const gain = 1 + 0.5 * valence - 0.3 * tension;
    const leak = Math.max(0.2, 1 - arousal);

    // Apply gating to hidden activations if they exist
    if (ffnLayer.hidden && Array.isArray(ffnLayer.hidden)) {
        ffnLayer.hidden = ffnLayer.hidden.map((h: number) => Math.tanh(gain * h) * leak);
    }
    
    ffnLayer.lastAffect = affect;
    return ffnLayer;
}
