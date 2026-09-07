
// -------------------------------------------------------------
// neuralSymbolicBridge.ts — Rules into Attention/Logits Biases
// -------------------------------------------------------------
export type Rule =
| { type:"forbid_pair"; tokenA:string; tokenB:string }
| { type:"prefer_pair"; tokenA:string; tokenB:string; weight:number }
| { type:"zone_cooldown"; zone:string; steps:number };
export function buildAttentionMask(tokens:string[], rules:Rule[], recentZones:string[]){
// mask[i][j]=true means disallow attending i→j
const T = tokens.length;
const mask:boolean[][] = Array.from({length:T},()=>Array(T).fill(false));
for (const r of rules){
if (r.type === "forbid_pair"){
const ia = tokens.findIndex(t=>t===r.tokenA);
const ib = tokens.findIndex(t=>t===r.tokenB);
if (ia>=0 && ib>=0){
mask[ia][ib] = true; mask[ib][ia] = true;
}
}
if (r.type === "zone_cooldown"){
if (recentZones.includes(r.zone)){
// soften: block strong self-attention to zone token for a few steps
const iz = tokens.findIndex(t=>t===r.zone);
if (iz>=0){
for (let i=0;i<T;i++) mask[i][iz] = true;
}
}
}
}
return mask;
}
export function buildLogitBias(tokens:string[], rules:Rule[]){
// bias[i] adds to token i logit before softmax (positive prefer / negative forbid)
const bias = Array(tokens.length).fill(0);
for (const r of rules){
if (r.type === "prefer_pair"){
const ia = tokens.findIndex(t=>t===r.tokenA);
const ib = tokens.findIndex(t=>t===r.tokenB);
if (ia>=0 && ib>=0){
bias[ia] += r.weight; bias[ib] += r.weight;
}
}
}
return bias;
}
