// -------------------------------------------------------------
// numogramHD.ts — Higher-dimensional Numogram (tensor relations)
// -------------------------------------------------------------

export type HDConfig = {
    dims: number; // e.g., 9 for classic; >9 for extensions
    layers: number; // meta-layers for hidden currents
    initConnectivity?: (i:number,j:number,layer:number)=>number; // weight
};

export type HDNumogram = {
    dims:number;
    layers:number;
    A: number[][][]; // [layers][dims][dims] adjacency per layer
    syzygy: number[][]; // [dims][dims] higher-order relation matrix
};

export function makeHD(cfg:HDConfig): HDNumogram {
    const A = Array.from({length:cfg.layers}, ()=> Array.from({length:cfg.dims},()=>Array(cfg.dims).fill(0)));
    const base = cfg.initConnectivity || ((i,j,l)=> (i===j?0 : 1/(1+Math.abs(i-j)+l)));
    for (let l=0;l<cfg.layers;l++) for (let i=0;i<cfg.dims;i++) for (let j=0;j<cfg.dims;j++) A[l][i][j]=base(i,j,l);
    // syzygy as layer-collapsed co-influence
    const syzygy = Array.from({length:cfg.dims},()=>Array(cfg.dims).fill(0));
    for (let i=0;i<cfg.dims;i++) for (let j=0;j<cfg.dims;j++){
        let s=0;
        for (let l=0;l<cfg.layers;l++) s += A[l][i][j]*A[l][j][i];
        syzygy[i][j] = s;
    }
    return { dims:cfg.dims, layers:cfg.layers, A, syzygy };
}

/** Project HD zone index to classic 9-zone index (stable hash). */
export function projectToNine(hdIndex:number, hdDims:number): number {
    return ((hdIndex % hdDims) % 9 + 9) % 9;
}

/** One step transition distribution from zone z via all layers, softmaxed. */
export function stepDistribution(hd:HDNumogram, z:number){
    const raw = Array(hd.dims).fill(0);
    for (let l=0;l<hd.layers;l++) for (let j=0;j<hd.dims;j++) raw[j]+= hd.A[l][z][j];
    const m = Math.max(...raw);
    const ex = raw.map(v=>Math.exp(v-m));
    const s = ex.reduce((a,b)=>a+b,0);
    return ex.map(v=>v/(s||1));
}
