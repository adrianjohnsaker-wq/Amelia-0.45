
// -------------------------------------------------------------
// attentiveComposer.ts — End-to-end symbolic+affect encoder
// -------------------------------------------------------------
import { positionalEncoding, encoderForward, initEncoder, layerNorm } from "./attentionCore";
import { crossAttention, initCross } from "./crossAttentionFusion";
import { neuromodulate, NeuroModSignal } from "./neuromodulator";
export type ComposerParams = {
tokenDim:number;
modelDim:number;
heads:number;
hidden:number;
vocab: string[];
E: number[][]; // [V, D] embeddings
enc: ReturnType<typeof initEncoder>;
cross: ReturnType<typeof initCross>;
Wout: number[][];
bout:number[];
};
export function initComposer(vocab:string[], modelDim=128, heads=4, hidden=256): ComposerParams {
const E = Array.from({length:vocab.length},()=>Array(modelDim).fill(0).map(()=> (Math.random()*2-1)*0.05));
return {
tokenDim: modelDim, modelDim, heads, hidden, vocab, E,
enc: initEncoder(modelDim, heads, hidden),
cross: initCross(modelDim, /*affect dim*/ 8, modelDim), // Now expects 8-dim affectVec
Wout: Array.from({length:modelDim},()=>Array(modelDim).fill(0).map(()=> (Math.random()*2-1)*0.03)),
bout: Array(modelDim).fill(0)
};
}
export function forwardComposer(
tokens:string[],
affectVec:number[], // e.g., [valence, arousal, tension, empathy, reciprocity, cetBalance, entropy, coherence]
p:ComposerParams,
mod: NeuroModSignal,
attnMask?: boolean[][]
){
const T = tokens.length, D = p.modelDim;
const idx = tokens.map(t=> p.vocab.indexOf(t)).map(i=> (i>=0? i : 0));
// token embeddings + PE
let X = idx.map(i => [...p.E[i]]);
const PE = positionalEncoding(T, D);
X = X.map((row,i)=>row.map((v,j)=> v + PE[i][j]));
// encoder (self-attn)
let H = encoderForward(X, p.enc, attnMask);
H = H.map((r)=>r.map(v=> v * mod.attnGain));
// cross-attend to affect memory (reshape affect vector as [F, dk])
const A = affectVec.map(x=>[x]); // [8, 1] → project inside cross
const CA = crossAttention(H, A, p.cross);
const fused = layerNorm(H.map((row,i)=> row.map((v,j)=> v + CA[i][j]))).map(r=> r.map(v=> v * mod.ffnGain));
// project to latent output space (use in downstream synthesis)
const Y = fused.map(r=> r.map((_,j)=> r.reduce((s,rv,k)=> s + rv * p.Wout[k][j], 0) + p.bout[j]));
return { Y, fused };
}
