
// -------------------------------------------------------------
// attentionCore.ts — Minimal Transformer Primitives (TypeScript)
// NOTE: Pure TS numerical ops (arrays). Optimised libs can replace later.
// -------------------------------------------------------------
export type Tensor2D = number[][]; // [B, D] or [T, D] depending on context
const EPS = 1e-8;
const clamp = (x:number,a=-1e9,b=1e9)=>Math.min(b,Math.max(a,x));
/* ---------- basic ops ---------- */
export function matmul(A: number[][], B: number[][]): number[][] {
const n = A.length, m = B[0].length, k = B.length;
const out = Array.from({ length: n }, () => Array(m).fill(0));
for (let i=0;i<n;i++) for (let j=0;j<m;j++) {
let s=0;
for (let t=0;t<k;t++) s += A[i][t]*B[t][j];
out[i][j]=s;
}
return out;
}
export function add(A:number[][], B:number[][]){ return A.map((r,i)=>r.map((v,j)=>v+B[i][j])); }
export function addBias(A:number[][], b:number[]){ return A.map(r=>r.map((v,j)=>v+b[j])); }
export function relu(A:number[][]){ return A.map(r=>r.map(v=>v>0?v:0)); }
export function tanh(A:number[][]){ return A.map(r=>r.map(v=>Math.tanh(v))); }
export function softmaxRows(X:number[][]):number[][]{
return X.map(row=>{
const m = Math.max(...row);
const ex = row.map(v=>Math.exp(v-m));
const s = ex.reduce((a,b)=>a+b,0)+EPS;
return ex.map(v=>v/s);
});
}
/* ---------- positional encoding (sinusoidal) ---------- */
export function positionalEncoding(T:number, D:number):number[][]{
const pe = Array.from({length:T},()=>Array(D).fill(0));
for (let pos=0; pos<T; pos++){
for (let i=0;i<D;i+=2){
const div = Math.pow(10000, i / D);
pe[pos][i] = Math.sin(pos / div);
if (i+1<D) pe[pos][i+1] = Math.cos(pos / div);
}
}
return pe;
}
/* ---------- layer norm ---------- */
export function layerNorm(X:number[][], eps=1e-5){
return X.map(row=>{
const mu = row.reduce((a,b)=>a+b,0)/row.length;
const varr = row.reduce((a,b)=>a+(b-mu)*(b-mu),0)/row.length;
const inv = 1/Math.sqrt(varr+eps);
return row.map(v=>(v-mu)*inv);
});
}
/* ---------- parameter helpers ---------- */
export function randn(rows:number, cols:number, scale=0.02){
return Array.from({length:rows},()=>Array.from({length:cols},()=> (Math.random()*2-1)*scale));
}
export function zeros(rows:number, cols:number){
return Array.from({length:rows},()=>Array(cols).fill(0));
}
/* ---------- Multi-Head Self-Attention ---------- */
export type MHAParams = { Wq:number[][]; Wk:number[][]; Wv:number[][]; Wo:number[][]; bq:number[]; bk:number[]; bv:number[]; bo:number[]; heads:number; dim:number; };
export function initMHA(dim:number, heads:number): MHAParams {
return { Wq: randn(dim, dim), Wk: randn(dim, dim), Wv: randn(dim, dim), Wo: randn(dim, dim), bq: Array(dim).fill(0), bk: Array(dim).fill(0), bv: Array(dim).fill(0), bo: Array(dim).fill(0), heads, dim };
}
function splitHeads(X:number[][], heads:number){
const D = X[0].length, d = Math.floor(D/heads);
const out = Array.from({length:heads},()=>[] as number[][]);
for (const row of X){
for (let h=0;h<heads;h++){
out[h].push(row.slice(h*d,(h+1)*d));
}
}
return out; // [H][T][d]
}
function concatHeads(Hs:number[][][]){ // [H][T][d] -> [T][H*d]
const H = Hs.length, T = Hs[0].length, d = Hs[0][0].length;
const out:number[][] = Array.from({length:T},()=>Array(H*d).fill(0));
for (let t=0;t<T;t++){
for (let h=0;h<H;h++){
for (let i=0;i<d;i++) out[t][h*d+i] = Hs[h][t][i];
}
}
return out;
}
export function mhaForward(X:number[][], p:MHAParams, attnMask?: number[][]){ // X:[T][D]
const Q = addBias(matmul(X, p.Wq), p.bq);
const K = addBias(matmul(X, p.Wk), p.bk);
const V = addBias(matmul(X, p.Wv), p.bv);
const Qh = splitHeads(Q, p.heads);
const Kh = splitHeads(K, p.heads);
const Vh = splitHeads(V, p.heads);
const Hout: number[][][] = [];
for (let h=0; h<p.heads; h++){
const q = Qh[h], k = Kh[h], v = Vh[h]; // [T][d]
const Tt = q.length, d = q[0].length;
// scores = q * k^T / sqrt(d)
const kt = k[0].map((_,j)=>k.map(row=>row[j])); // transpose
let scores = matmul(q, kt).map(r=>r.map(v=>v/Math.sqrt(d)));
if (attnMask){
scores = scores.map((row,i)=>row.map((v,j)=> v + (attnMask[i][j]?-1e9:0)));
}
const probs = softmaxRows(scores); // [T][T]
const out = matmul(probs, v); // [T][d]
Hout.push(out);
}
const cat = concatHeads(Hout);
const proj = addBias(matmul(cat, p.Wo), p.bo);
return proj; // [T][D]
}
/* ---------- Positionwise FFN ---------- */
export type FFNParams = { W1:number[][]; b1:number[]; W2:number[][]; b2:number[]; };
export function initFFN(dim:number, hidden:number): FFNParams {
return { W1: randn(dim, hidden, 0.05), b1: Array(hidden).fill(0), W2: randn(hidden, dim, 0.05), b2: Array(dim).fill(0) };
}
export function ffnForward(X:number[][], p:FFNParams){
const h = relu(addBias(matmul(X, p.W1), p.b1));
return addBias(matmul(h, p.W2), p.b2);
}
/* ---------- Transformer Encoder Block ---------- */
export type EncoderParams = { mha:MHAParams; ffn:FFNParams };
export function initEncoder(dim:number, heads:number, hidden:number): EncoderParams {
return { mha: initMHA(dim, heads), ffn: initFFN(dim, hidden) };
}
export function encoderForward(X:number[][], p:EncoderParams, mask?:number[][]){
// Pre-LN style
const x1 = layerNorm(X);
const a = mhaForward(x1, p.mha, mask);
const r1 = X.map((row,i)=>row.map((v,j)=>v + a[i][j]));
const x2 = layerNorm(r1);
const f = ffnForward(x2, p.ffn);
const r2 = r1.map((row,i)=>row.map((v,j)=>v + f[i][j]));
return r2;
}
