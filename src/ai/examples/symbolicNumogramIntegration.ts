// -------------------------------------------------------------
// symbolicNumogramIntegration.ts — Compose with fused features
// -------------------------------------------------------------

import { initSymbolicNumogramBridge, fusePass } from "@/ai/meta/symbolicNumogramBridge";
import { initComposer, forwardComposer } from "@/ai/nn/attentiveComposer";
import { neuromodulate } from "@/ai/nn/neuromodulator";
import { buildAttentionMask } from "@/ai/nn/neuralSymbolicBridge";

export async function demoSymbolicNumogramRun(tokens:string[]){
    const bridge = initSymbolicNumogramBridge(15, 3);
    const vocab = Array.from(new Set(["<pad>", ...tokens]));
    const composer = initComposer(vocab);

    // Minimal affect example; use your live VAT
    const affect = { valence: 0.1, arousal: 0.7, tension: 0.3 };

    // Fuse symbolic+HD-numogram+temporal
    const { features, notes } = fusePass(bridge, tokens, affect);

    // Build affect vector for composer cross-attn (8 dims expected by attentiveComposer init)
    // We map: [V,A,T, empathy, reciprocity, CET.balance, CET.lex, CET.rhythm]
    // Here we inject fused features into the tail (you can extend composer to accept >8 dims easily)
    const empathy=0.62, reciprocity=0.58;
    const cet = {
        balanceIndex: (features[4]+features[5])/2,
        lexicalEntropy: features[3],
        rhythmicCoherence: 1-features[6]
    };
    const affectVec = [
        affect.valence,
        affect.arousal,
        affect.tension,
        empathy,
        reciprocity,
        cet.balanceIndex,
        cet.lexicalEntropy,
        cet.rhythmicCoherence
    ];

    const mod = neuromodulate(affect);
    const mask = buildAttentionMask(tokens, [], []);

    const { Y } = forwardComposer(tokens, affectVec, composer, mod, mask);

    return { Y, notes, affectVec, mod };
}
