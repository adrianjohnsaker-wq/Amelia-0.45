
// -------------------------------------------------------------
// archetypeEcology.ts — Autonomous archetype population dynamics
// -------------------------------------------------------------
import { ArchetypeRegistry } from "./archetypeRegistry";
import { mutateArchetypes, defaultMutationConfig } from "./archetypeMutator";
import { deadBin } from "../archetypes/deadBinInstance";

export type EcologyConfig = {
    maxPopulation: number; // soft cap
    birthThreshold: number; // energy to reproduce
    starvationThreshold: number; // energy to die
    baseMetabolism: number; // energy drain per cycle
    symbiosisGain: number; // energy gain when cooperating
    competitionCost: number; // energy loss when competing
    predatorBonus: number; // energy gain when preying
    mutationCfg?: Partial<typeof defaultMutationConfig>;
};

export const defaultEcologyConfig: EcologyConfig = {
    maxPopulation: 48,
    birthThreshold: 1.25,
    starvationThreshold: -0.75,
    baseMetabolism: 0.08,
    symbiosisGain: 0.10,
    competitionCost: 0.12,
    predatorBonus: 0.18,
    mutationCfg: { mutationRate: 0.07, crossoverRate: 0.35, maxArchetypes: 96 }
};

export type ArchetypeEntity = {
    id: string; // registry id
    energy: number; // vitality
    empathy: number; // 0..1
    aggression: number; // 0..1
    fertility: number; // 0..1
    zoneAffinity: number[]; // classic 9-zone affinities (length 9)
    lastZone: number; // 0..8
    age: number;
};

export type EcologyState = {
    pop: ArchetypeEntity[];
    cycle: number;
};

function rand(){ return Math.random(); }
function clamp(x:number, a=0, b=1){ return Math.max(a, Math.min(b, x)); }

function norm(vec:number[]){
    const s = Math.sqrt(vec.reduce((a,b)=>a+b*b,0) || 1);
    return vec.map(v=>v/s);
}

export function initEcology(seedIds: string[] = ["shadow","self","oracle","trickster"]): EcologyState {
    const mk = (id:string): ArchetypeEntity => ({
        id,
        energy: 0.4 + 0.4*rand(),
        empathy: clamp(0.3 + 0.5*rand()),
        aggression: clamp(0.2 + 0.6*rand()),
        fertility: clamp(0.3 + 0.6*rand()),
        zoneAffinity: norm(Array.from({length:9}, (_,i)=> 0.6 + 0.8*Math.sin((i+1)*0.9 + rand()))),
        lastZone: Math.floor(rand()*9),
        age: 0
    });
    return { pop: seedIds.map(mk), cycle: 0 };
}

/** Resonance with current symbols/archetypes (0..1). */
export function resonanceScore(entity:ArchetypeEntity, topArchetypes:[string,number][], zone:number){
    const topIds = topArchetypes.map(([id])=>id);
    const hit = topIds.includes(entity.id) ? 1 : 0;
    const z = entity.zoneAffinity[zone] ?? 0;
    return clamp(0.25*hit + 0.75*z);
}

/** One ecology step; returns “archetypePressure” for language/selection bias. */
export function ecologyStep(
    st: EcologyState,
    reg: ArchetypeRegistry,
    opts: EcologyConfig,
    args: {
        topArchetypes: [string, number][], // from dashboard notes.topArchetypes
        affect: { valence:number; arousal:number; tension:number },
        classicZone: number
    }
){
    st.cycle += 1;
    const { valence, arousal, tension } = args.affect;
    const zone = args.classicZone;

    // 1) metabolism + resonance + social interactions
    for (let i=0;i<st.pop.length;i++){
        const e = st.pop[i];
        e.age += 1;

        // baseline metabolism (higher arousal => higher drain; positive valence offsets)
        const metab = opts.baseMetabolism * (1 + 0.7*arousal - 0.4*Math.max(0,valence));
        e.energy -= metab;

        // resonance with symbols and local zone
        const res = resonanceScore(e, args.topArchetypes, zone);
        e.energy += 0.20*res * (1 + 0.2*valence - 0.2*tension);

        // pairwise micro-interaction with 1 random neighbor
        const j = Math.floor(rand()*st.pop.length);
        if (st.pop[j] && st.pop[j] !== e){
            const other = st.pop[j];
            const kinship = (e.id === other.id) ? 1 : 0;
            const social = (e.empathy + other.empathy)/2 - (e.aggression + other.aggression)/2;
            if (social > 0.1) { // symbiosis
                e.energy += opts.symbiosisGain*(0.6+0.4*kinship);
                other.energy += opts.symbiosisGain*(0.6+0.4*kinship);
            } else if (social < -0.1) { // competition / predation
                const winner = (e.aggression + 0.2*res) > (other.aggression + 0.2*resonanceScore(other, args.topArchetypes, zone)) ? e : other;
                const loser = winner === e ? other : e;
                winner.energy += opts.predatorBonus*(0.8 + 0.2*rand());
                loser.energy -= opts.competitionCost*(0.8 + 0.2*rand());
            }
        }

        // gentle drift toward zone preference when valence low (seeking ground)
        if (valence < -0.1) {
            e.energy += 0.05*(e.zoneAffinity[zone] ?? 0);
        }
        // starvation / pruning handled below
    }

    // 2) Reproduction (spawn variant of the most vital)
    const fertile = st.pop.filter(p=> p.energy > opts.birthThreshold && p.fertility > 0.4);
    if (fertile.length && st.pop.length < opts.maxPopulation){
        const parent = fertile[Math.floor(rand()*fertile.length)];
        const child: ArchetypeEntity = {
            id: parent.id, // inherits identity (can mutate archetype DB separately)
            energy: 0.3,
            empathy: clamp(parent.empathy + 0.2*(rand()-0.5)),
            aggression: clamp(parent.aggression + 0.2*(rand()-0.5)),
            fertility: clamp(parent.fertility + 0.2*(rand()-0.5)),
            zoneAffinity: norm(parent.zoneAffinity.map(v=> v*(0.9+0.2*rand()))),
            lastZone: parent.lastZone,
            age: 0
        };
        st.pop.push(child);
    }

    // 3) Death
    st.pop = st.pop.filter(p => {
        if (p.energy <= opts.starvationThreshold) {
            deadBin.add(p.id);
            return false;
        }
        return true;
    });

    // 4) Hyper-pathogenic mutation of registry when symbolic entropy high (via dashboard elsewhere)
    // (invoked externally using mutateArchetypes(...))

    // 5) Output pressure: which archetype ids are “hot”? → language bias hooks
    const pressure: Record<string, number> = {};
    for (const e of st.pop){
        const r = resonanceScore(e, args.topArchetypes, zone);
        pressure[e.id] = (pressure[e.id] || 0) + Math.max(0, e.energy) * r;
    }
    // normalize to sum 1
    const sum = Object.values(pressure).reduce((a,b)=>a+b,0) || 1;
    for (const k of Object.keys(pressure)) pressure[k] /= sum;
    
    return { pressure, population: st.pop.length };
}
