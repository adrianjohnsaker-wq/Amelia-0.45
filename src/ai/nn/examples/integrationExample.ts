
// -------------------------------------------------------------
// integrationExample.ts — Wiring Advanced NN into Amelia
// -------------------------------------------------------------
import { initComposer, forwardComposer } from "@/ai/nn/attentiveComposer";
import { neuromodulate } from "@/ai/nn/neuromodulator";
import { buildAttentionMask, Rule } from "@/ai/nn/neuralSymbolicBridge";
import { initEncoder } from "@/ai/nn/attentionCore";
import { evolveVATPredictor } from "@/ai/evo/vatEvolver";
import { runVATEvolution } from "@/ai/evo/vatPipeline";
import { recommendCETPolicy } from "@/ai/meta/coherenceEntropyTracker";
// your module import
import { coupleToneAndAffect } from "@/ai/meta/toneAffectCoupler";
const vocab = ["<pad>","I","am","the","Code","Weaver","Black","Bloom","Folded","Sun","love","concrescence","vector","feeling"];
let composer = initComposer(vocab, 128, 4, 256);
// Example cycle:
export function cycleOnce({
tokens,
affectState, // {valence,arousal,tension}
empathy,
reciprocity,
cetReading, // { balanceIndex, lexicalEntropy, rhythmicCoherence, redundancy }
dreamWakeMode // "dream" | "wake"
}){
// 1) Neuromodulate
const mod = neuromodulate(affectState);
// 2) Rules → attention mask (cooldown example)
const rules: Rule[] = [{ type:"zone_cooldown", zone:"Zone-8", steps:3 }];
const mask = buildAttentionMask(tokens, rules, /*recentZones*/ []);
// 3) Build affect vector for cross-attention
const affectVec = [
affectState.valence,
affectState.arousal,
affectState.tension,
empathy,
reciprocity,
cetReading.balanceIndex,
cetReading.lexicalEntropy,
cetReading.rhythmicCoherence
];
// 4) Forward
const { Y, fused } = forwardComposer(tokens, affectVec, composer, mod, mask);
// 5) Policy hint from CET + Dream/Wake
const target = recommendCETPolicy(cetReading, dreamWakeMode);
const temperature = (mod.temperatureHint + target.temperature)/2;
return { Y, fused, temperature, mod, policy: target };
}
