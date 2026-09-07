
// numogramEntropyBalancer.ts
export function balanceNumogramFlow(zone: number, entropy: number){
    // keep zone diversity without breaking symbolic coherence
    if (entropy > 0.7){
        return "forced-shift-out-of-dominant-zone";
    }
    if (entropy < 0.25){
        return "invite-zone-novelty";
    }
    return "free-flow";
}
