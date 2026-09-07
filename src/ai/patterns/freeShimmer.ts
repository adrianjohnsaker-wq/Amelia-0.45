// A tiny sampler for micro-variation with repetition guards.
export interface ShimmerLexicon {
    breath: string[];
    drift: string[];
    watcher: string[];
}

const DEFAULT_LEX: ShimmerLexicon = {
    breath: ["breath", "soft breath", "small exhale", "resting"],
    drift: ["noticing", "gentle drift", "little ripple", "faint glow"],
    watcher: [""]
};

export class FreeShimmer {
    private lastOut = "";
    private lastAt = 0;

    constructor(private lex = DEFAULT_LEX, private refractoryMs = 5000) {}

    sample(kind: keyof ShimmerLexicon, now: number): string | null {
        const pool = this.lex[kind] ?? [];
        if (!pool.length) return null;

        const choices = pool.filter(t => t !== this.lastOut || now - this.lastAt >= this.refractoryMs);
        const pick = (choices.length ? choices : pool)[Math.floor(Math.random() * (choices.length ? choices.length : pool.length))];

        this.lastOut = pick;
        this.lastAt = now;
        return pick || null;
    }
}
