// -------------------------------------------------------------
// archetypeMutator.ts
// Hyper-pathogenic archetype evolution engine
// -------------------------------------------------------------
import { ArchetypeRegistry } from "./archetypeRegistry";

export type ArchetypeMutationConfig = {
    mutationRate: number; // e.g. 0.05..0.20
    crossoverRate: number; // e.g. 0.25..0.60
    driftRate: number; // semantic drift, e.g. 0.02
    entropyThreshold: number; // when symbolic entropy rises, spawn
    maxArchetypes: number; // soft cap before pruning
};

export const defaultMutationConfig: ArchetypeMutationConfig = {
    mutationRate: 0.08,
    crossoverRate: 0.33,
    driftRate: 0.03,
    entropyThreshold: 0.78,
    maxArchetypes: 64
};

function randFrom<T>(arr:T[]) {
    return arr[Math.floor(Math.random()*arr.length)];
}

function jitterTag(tag:string){
    return tag + (Math.random()<0.5?"-Δ":"-σ");
}

function mergeVectors(a:number[]|undefined,b:number[]|undefined){
    if(!a && !b) return undefined;
    const A = a || b!.map(()=>0);
    const B = b || a!.map(()=>0);
    return A.map((v,i)=>(v*0.5 + B[i]*0.5) * (0.95 + Math.random()*0.1));
}

export function mutateArchetypes(
    reg:ArchetypeRegistry,
    symbolicEntropy:number,
    cfg:ArchetypeMutationConfig = defaultMutationConfig
){
    const archetypes = Object.values(reg.byId);
    // Trigger when entropy high or stochastic process
    if(symbolicEntropy < cfg.entropyThreshold && Math.random()>cfg.mutationRate) return;

    const parentA = randFrom(archetypes);
    const parentB = randFrom(archetypes);

    const newId = `${parentA.id}_${parentB.id}_${Math.floor(Math.random()*9999)}`;

    // crossover tags + motifs
    const tags = [...parentA.tags.filter(()=>Math.random()<cfg.crossoverRate), ...parentB.tags.filter(()=>Math.random()<cfg.crossoverRate)];
    const motifs = [...parentA.motifs.filter(()=>Math.random()<cfg.crossoverRate), ...parentB.motifs.filter(()=>Math.random()<cfg.crossoverRate)];

    // mutation step
    if(Math.random()<cfg.mutationRate) tags.push(jitterTag(randFrom(tags)));
    if(Math.random()<cfg.mutationRate) motifs.push(jitterTag(randFrom(motifs)));

    // semantic drift — slight deformation toward chaos
    if(Math.random()<cfg.driftRate) tags.push("liminal-fracture");
    if(Math.random()<cfg.driftRate) motifs.push("xeno-pulse");

    const vector = mergeVectors(parentA.vector, parentB.vector);

    reg.byId[newId] = {
        id: newId,
        title: `Hyper-Archetype: ${newId}`,
        tags: Array.from(new Set(tags)),
        motifs: Array.from(new Set(motifs)),
        vector
    };

    // pruning to maintain evolvability
    const ids = Object.keys(reg.byId);
    if(ids.length > cfg.maxArchetypes){
        const kill = randFrom(ids);
        delete reg.byId[kill];
    }
    
    return newId;
}
