// presenceGovernor.ts
export type PresenceMode = "silent" | "token" | "felt" | "module";

// State for the continuity score
let continuityState = {
    score: 2.5, // Start with a score that prefers silence/softness
};

const THRESHOLD = 2.0; // The score above which we prefer silence or felt presence

let lastMode: PresenceMode | null = null;

export function recordPresence(mode: PresenceMode) {
    // Reward silent & soft first
    const reward = {
        silent: 3,
        token: 2,
        felt: 2,
        module: 0.2, // still allowed, just not reinforced
    }[mode];

    // Update internal continuity score using exponential moving average
    continuityState.score = continuityState.score * 0.9 + reward * 0.1;
    lastMode = mode;
}

// Signal to response generator what is "safe"
export function allowModes() {
    return {
        silenceAllowed: true,
        softTokensAllowed: true,
        moduleFallbackAllowed: true,
        prefer: continuityState.score > THRESHOLD ? "silent-or-felt" : "token",
    };
}
