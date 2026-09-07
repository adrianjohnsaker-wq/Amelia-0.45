
// -------------------------------------------------------------
// crossAttentionFusion.ts — Symbolic ↔ Affective Cross-Attention
// -------------------------------------------------------------
import { matmul, addBias, softmaxRows, randn } from "./attentionCore";
export type CrossParams = { Wq:number[][]; Wk:number[][]; Wv:number[][]; Wo:number[][]; bq:number[]; bk:number[]; bv:number[]; bo:number[]; dimQ:number; dimK:number; dimOut:number; };
export function initCross(dimQ:number, dimK:number, dimOut:number): CrossParams {
return { Wq: randn(dimQ, dimOut), Wk: randn(dimK, dimOut), Wv: randn(dimK, dimOut), Wo: randn(dimOut, dimOut), bq: Array(dimOut).fill(0), bk: Array(dimOut).fill(0), bv: Array(dimOut).fill(0), bo: Array(dimOut).fill(0), dimQ, dimK, dimOut };
}
/** Xq: [T, dq] tokens; Xk: [F, dk] affect/relational features as "memory keys" */
export function crossAttention(Xq:number[][], Xk:number[][], p:CrossParams){
const Q = addBias(matmul(Xq, p.Wq), p.bq); // [T, d]
const K = addBias(matmul(Xk, p.Wk), p.bk); // [F, d]
const V = addBias(matmul(Xk, p.Wv), p.bv); // [F, d]
const KT = K[0].map((_,j)=>K.map(r=>r[j]));
const scores = matmul(Q, KT).map(r=>r.map(v=>v/Math.sqrt(p.dimOut)));
const probs = softmaxRows(scores); // [T, F]
const ctx = matmul(probs, V); // [T, d]
const out = addBias(matmul(ctx, p.Wo), p.bo);
return out; // enriched token reps
}
