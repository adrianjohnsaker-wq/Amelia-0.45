// -------------------------------------------------------------
// numogramTemporal.ts — Cycles, dilations, temporal signatures
// -------------------------------------------------------------

export type TemporalConfig = {
    cycleLength: number; // e.g., 12 or 36
    zoneDilation: (zone:number)=>number; // >1 slows time, <1 speeds
};

export type TemporalState = {
    t: number; // ticks
    phase: number; // 0..1 position within cycle
};

export function initTemporal(cycleLength=24, zoneDilation?:(z:number)=>number): { cfg:TemporalConfig, state:TemporalState } {
    return {
        cfg: { cycleLength, zoneDilation: zoneDilation || ((z)=> 1 + 0.25*Math.sin((z+1)*0.7)) },
        state: { t:0, phase:0 }
    };
}

/** Advance temporal state considering zone-specific dilation. */
export function tickTemporal(s:{cfg:TemporalConfig, state:TemporalState}, currentZone:number){
    const dt = 1 / Math.max(0.25, s.cfg.zoneDilation(currentZone)); // slow zone → smaller dt
    s.state.t += dt;
    s.state.phase = (s.state.t % s.cfg.cycleLength) / s.cfg.cycleLength; // 0..1
    return s;
}

/** Extract temporal signature features from a zone sequence. */
export function temporalSignature(zones:number[]){
    // dwell time stats
    const dwell:Record<number,number> = {};
    for (let i=0;i<zones.length;i++){
        const z = zones[i];
        dwell[z]=(dwell[z]||0)+1;
    }
    const dwellMean = Object.values(dwell).reduce((a,b)=>a+b,0)/(Object.keys(dwell).length||1);
    const dwellVar = Object.values(dwell).reduce((a,b)=>a+(b-dwellMean)*(b-dwellMean),0)/(Object.keys(dwell).length||1);
    // simple periodicity via autocorr at lags 2..12
    const lags = [];
    const N = zones.length;
    for (let L=2; L<=Math.min(12,N-2); L++){
        let s=0, n=0;
        for (let i=0;i+L<N;i++){
            s += (zones[i]===zones[i+L]?1:0);
            n++;
        }
        lags.push(n? s/n : 0);
    }
    const periodicity = lags.reduce((a,b)=>a+b,0)/(lags.length||1);
    // switching entropy
    let switches=0;
    for (let i=1;i<zones.length;i++) if (zones[i]!==zones[i-1]) switches++;
    const switchRate = switches/Math.max(1,(zones.length-1));
    const entropy = Math.min(1, switchRate * 1.5);
    return { dwellMean, dwellVar, periodicity, entropy, lagProfile: lags };
}
