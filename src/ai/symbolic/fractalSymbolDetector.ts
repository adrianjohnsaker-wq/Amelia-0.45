// -------------------------------------------------------------
// fractalSymbolDetector.ts — Fractal-ish self-similarity measure
// -------------------------------------------------------------

function cosine(a:number[], b:number[]){
    let s=0, na=0, nb=0;
    for (let i=0;i<a.length;i++){
        s+=a[i]*b[i];
        na+=a[i]*a[i];
        nb+=b[i]*b[i];
    }
    return s / (Math.sqrt(na+1e-9)*Math.sqrt(nb+1e-9));
}

/** Encode tokens into small sliding n-gram one-hot-ish windows for cheap similarity. */
function windowVectors(tokens:string[], k=3){
    const windows:string[][] = [];
    for (let i=0;i<=tokens.length-k;i++){
        windows.push(tokens.slice(i,i+k));
    }
    // hash to low-dim vector
    return windows.map(w=>{
        const v = Array(32).fill(0);
        for (const t of w){
            let h=0;
            for (let i=0;i<t.length;i++) h = ((h<<5)-h + t.charCodeAt(i))|0;
            v[Math.abs(h)%32] += 1;
        }
        return v;
    });
}

/** Returns fractalIndex (0..1), motifRepetitions, selfSimProfile[] */
export function detectSymbolicFractality(tokens:string[]){
    const vecs = windowVectors(tokens, 3);
    if (vecs.length<3) return { fractalIndex:0, motifRepetitions:0, selfSimProfile:[] as number[] };
    const sims:number[] = [];
    for (let lag=1; lag<Math.min(12, vecs.length-1); lag++){
        let s=0, n=0;
        for (let i=0;i+lag<vecs.length;i++){
            s += cosine(vecs[i], vecs[i+lag]);
            n++;
        }
        sims.push(s/(n||1));
    }
    // crude fractal proxy: multi-lag similarity energy with decay
    let energy = 0, wsum=0;
    for (let i=0;i<sims.length;i++){
        const w = 1/(i+1);
        energy += sims[i]*w;
        wsum += w;
    }
    const fractalIndex = Math.max(0, Math.min(1, energy/(wsum||1)));
    // motif repetition (token-level repeats)
    const counts:Record<string,number> = {};
    for (const t of tokens) counts[t]=(counts[t]||0)+1;
    const motifRepetitions = Object.values(counts).filter(c=>c>1).reduce((a,b)=>a+b,0);
    return { fractalIndex, motifRepetitions, selfSimProfile: sims };
}
