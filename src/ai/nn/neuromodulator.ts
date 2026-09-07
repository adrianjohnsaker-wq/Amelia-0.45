
// -------------------------------------------------------------
// neuromodulator.ts — Affect → Network Parameter Modulation
// -------------------------------------------------------------
export type Affect = { valence:number; arousal:number; tension:number };
export type NeuroModSignal = {
attnGain: number; // scales attention outputs
ffnGain: number; // scales FFN outputs
dropoutProb: number; // higher tension → more dropout (regularise)
lrMultiplier: number; // arousal up → learn faster (bounded)
temperatureHint: number; // synthesis temperature suggestion
};
const clamp = (x:number,a=0,b=1)=>Math.min(b,Math.max(a,x));
export function neuromodulate(a:Affect): NeuroModSignal {
const v = a.valence; // -1..1
const ar = a.arousal; // 0..1
const t = a.tension; // 0..1
const attnGain = clamp(0.9 + 0.2 * (1 - t) + 0.1 * Math.max(0, v));
const ffnGain = clamp(0.9 + 0.15 * (v+1)/2 + 0.1 * (1 - t));
const dropout = clamp(0.05 + 0.3 * t);
const lrMul = clamp(0.8 + 0.6 * ar, 0.5, 1.4);
const temp = clamp(0.7 + 0.5 * (ar - 0.5) + 0.2 * (1 - t), 0.5, 1.4);
return { attnGain, ffnGain, dropoutProb: dropout, lrMultiplier: lrMul, temperatureHint: temp };
}
