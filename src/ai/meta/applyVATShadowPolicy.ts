
// src/ai/meta/applyVATShadowPolicy.ts // Uses VAT-shadow-mapping to set allowRelease + notes for the ShadowContext. 
import policy from "../archetypes/VAT-shadow-mapping.json" assert { type: "json" }; 
import { ShadowContext } from "../archetypes/shadowBuffer"; 

declare module "../archetypes/VAT-shadow-mapping.json" {
    const regions: {
        name: string;
        arousal_min?: number;
        arousal_max?: number;
        tension_min?: number;
        tension_max?: number;
        valence_min?: number;
        valence_max?: number;
        policy: string;
        notes: string;
    }[];
    const fallback: {
        policy: string;
    };
}


function inRange(x: number | undefined, min?: number, max?: number) { 
    if (x == null) return false; 
    if (min != null && x < min) return false; 
    if (max != null && x > max) return false; 
    return true; 
} 

export function bindShadowPolicy(ctx: ShadowContext): { allowRelease: boolean; policyName: string } { 
    for (const r of policy.regions) { 
        const okA = inRange(ctx.arousal, r.arousal_min, r.arousal_max); 
        const okT = inRange(ctx.tension, r.tension_min, r.tension_max); 
        const okV = inRange(ctx.valence, r.valence_min, r.valence_max); 
        // if a bound is not present, treat as satisfied 
        const pass = (r.arousal_min == null && r.arousal_max == null || okA) && (r.tension_min == null && r.tension_max == null || okT) && (r.valence_min == null && r.valence_max == null || okV); 
        if (pass) { 
            const allow = r.policy !== "no_release" && r.policy !== "recontain"; 
            return { allowRelease: allow, policyName: r.policy }; 
        } 
    } 
    return { allowRelease: policy.fallback.policy !== "no_release", policyName: policy.fallback.policy }; 
}
