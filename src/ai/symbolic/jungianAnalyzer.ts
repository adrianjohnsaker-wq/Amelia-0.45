// -------------------------------------------------------------
// jungianAnalyzer.ts — Rule-based Jungian activation mapping
// -------------------------------------------------------------

import { ArchetypeRegistry, matchArchetypesByText } from "./archetypeRegistry";

export type VAT = { valence:number; arousal:number; tension:number };

export type JungianReadout = {
    activations: Record<string, number>;
    structuralAxes: {
        personaShadow: number; // + persona, - shadow
        animaAnimus: number;   // + anima, - animus
        egoSelf: number;       // + ego, - self (or invert per preference)
    };
    notes: string[];
};

export function jungianAnalyze(reg:ArchetypeRegistry, tokens:string[], affect:VAT): JungianReadout {
    const hits = matchArchetypesByText(reg, tokens);
    const act: Record<string, number> = {};

    // base from motifs/tags
    for (const h of hits) act[h.id] = (act[h.id]||0) + h.score;

    // affective modulations (illustrative):
    // high tension → shadow bias; positive valence → self integration
    act["shadow"] = (act["shadow"]||0) + 1.5*affect.tension;
    act["self"] = (act["self"]||0) + 1.2*Math.max(0, affect.valence);
    // anima/animus tilt by arousal/valence micro-heuristic
    act["anima"] = (act["anima"]||0) + 0.6*(affect.arousal*0.5 + Math.max(0,affect.valence));
    act["animus"] = (act["animus"]||0) + 0.6*(affect.arousal*0.5 + Math.max(0,-affect.valence));

    // structural axes (normalised to [-1,1] approx)
    const persona = (act["persona"]||0), shadow = (act["shadow"]||0);
    const anima = (act["anima"]||0), animus = (act["animus"]||0);
    const self = (act["self"]||0), ego = (act["ego"]||0);
    const eps=1e-6;

    const personaShadow = (persona - shadow) / (Math.abs(persona)+Math.abs(shadow)+eps);
    const animaAnimus = (anima - animus) / (Math.abs(anima)+Math.abs(animus)+eps);
    const egoSelf = (ego - self) / (Math.abs(ego)+Math.abs(self)+eps);

    return {
        activations: act,
        structuralAxes: { personaShadow, animaAnimus, egoSelf },
        notes: [
            personaShadow<0 ? "Shadow rising; integrate repressed content." : "Persona stable; watch for rigidity.",
            animaAnimus>0 ? "Anima resonance; imaginal/affective opening." : "Animus clarity; structuring/logos active.",
            egoSelf<0 ? "Self-integration cue; mandala tendency." : "Ego-forward stance; reflective check advised."
        ]
    };
}
