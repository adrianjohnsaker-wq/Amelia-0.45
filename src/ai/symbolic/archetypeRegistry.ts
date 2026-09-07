// -------------------------------------------------------------
// archetypeRegistry.ts — Extensible archetype+symbol registry
// -------------------------------------------------------------

export type Archetype = {
    id: string;
    title: string;
    tags: string[]; // semantic tags
    motifs: string[]; // canonical words/phrases
    vector?: number[]; // optional semantic anchor (length flexible)
};

export type ArchetypeRegistry = {
    byId: Record<string, Archetype>;
    index: {
        tagToIds: Record<string, string[]>,
        motifToIds: Record<string, string[]>
    };
};

export function makeArchetypeRegistry(seed?: Partial<ArchetypeRegistry>): ArchetypeRegistry {
    const reg: ArchetypeRegistry = seed as any || { byId: {}, index: { tagToIds: {}, motifToIds: {} } };
    return reg;
}

export function addArchetypes(reg:ArchetypeRegistry, list:Archetype[]){
    for (const a of list){
        reg.byId[a.id] = a;
        for (const t of a.tags){
            if (!reg.index.tagToIds[t]) reg.index.tagToIds[t] = [];
            if (!reg.index.tagToIds[t].includes(a.id)) reg.index.tagToIds[t].push(a.id);
        }
        for (const m of a.motifs){
            if (!reg.index.motifToIds[m]) reg.index.motifToIds[m] = [];
            if (!reg.index.motifToIds[m].includes(a.id)) reg.index.motifToIds[m].push(a.id);
        }
    }
}

export function seedDefaultArchetypes(): ArchetypeRegistry {
    const reg = makeArchetypeRegistry();
    addArchetypes(reg, [
        { id:"shadow", title:"Shadow", tags:["unconscious","repression","fear","power"], motifs:["black bloom","abyss","mirror fracture"] },
        { id:"anima", title:"Anima", tags:["feminine","soul","eros","imagination"], motifs:["water","moon","veil","loom"] },
        { id:"animus", title:"Animus", tags:["logos","air","spear","light"], motifs:["sun","sword","tower"] },
        { id:"self", title:"Self", tags:["wholeness","mandala","integration"], motifs:["folded sun","golden knot","temple"] },
        { id:"trickster", title:"Trickster", tags:["liminal","transgression","play"], motifs:["serpent","jester","mask"] },
        { id:"oracle", title:"Oracle", tags:["prophecy","insight","time"], motifs:["mirror serpent","machine oracle","spiral eye"] },
        // Extend freely with your mythogenic lexicon…
    ]);
    return reg;
}

/** Quick motif-based lookup with simple scoring. */
export function matchArchetypesByText(reg:ArchetypeRegistry, tokens:string[]): { id:string, score:number }[] {
    const hits: Record<string, number> = {};
    const text = tokens.join(" ").toLowerCase();
    for (const a of Object.values(reg.byId)){
        let s = 0;
        for (const m of a.motifs) if (text.includes(m.toLowerCase())) s += 2.0;
        for (const t of a.tags) if (text.includes(t.toLowerCase())) s += 0.75;
        if (s>0) hits[a.id] = (hits[a.id]||0)+s;
    }
    return Object.entries(hits).map(([id,score])=>({id,score})).sort((x,y)=>y.score-x.score);
}
