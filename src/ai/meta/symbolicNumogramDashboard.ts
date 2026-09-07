// -------------------------------------------------------------
// symbolicNumogramDashboard.ts
// Compact per-cycle symbolic–numogram telemetry + anti-stagnation hook
// -------------------------------------------------------------
import { BridgeState, fusePass } from "./symbolicNumogramBridge";
import { VAT } from "@/ai/symbolic/jungianAnalyzer";

// local ring buffer of cycle logs
const MAX_HISTORY = 200;
const history: {
    cycle: number;
    topArchetypes: { id: string; score: number }[];
    fractalIndex: number;
    zone: number;
    phase: number;
    periodicity: number;
}[] = [];
let cycleCounter = 0;

// Thresholds for anti-stagnation
const FRACTAL_SAT_THRESHOLD = 0.80; // symbolic echo saturation
const ZONE_REPEAT_LIMIT = 6; // excessive staying in one numogram zone (plateau)

export type DashboardSignal = {
    poeticNudge: number; // >0 = encourage novelty, <0 = stabilise
    reason: string[];
};

/**
 * Run a cycle + log telemetry.
 * Returns features + nudge signal to modulate poetic weight upstream.
 */
export function symbolicNumogramDashboardStep(
    bridge: BridgeState,
    tokens: string[],
    affect: VAT
): DashboardSignal & { notes: any, features: any } {
    cycleCounter++;
    const { features, notes } = fusePass(bridge, tokens, affect);
    const fract = notes.fractal.fractalIndex;
    const zone = notes.zone;
    const phase = notes.temporal.phase;
    const periodicity = notes.temporal.periodicity;

    // top archetypes sorted array: [[id,score]]
    const topArchetypes = notes.topArchetypes.map(([id, score]: [string, number]) => ({ id, score }));
    history.push({ cycle: cycleCounter, topArchetypes, fractalIndex: fract, zone, phase, periodicity });
    if (history.length > MAX_HISTORY) history.shift();

    // --- Anti-stagnation logic ------------------------------------
    const reasons: string[] = [];
    let poeticNudge = 0;

    // 1) High fractal index = symbolic self-repetition / over-coherence
    if (fract > FRACTAL_SAT_THRESHOLD) {
        poeticNudge += 0.15; // increase novelty, loosen structure
        reasons.push(`Fractal > ${FRACTAL_SAT_THRESHOLD}`);
    }

    // 2) Zone stagnation (last N zones identical)
    const lastZones = history.slice(-ZONE_REPEAT_LIMIT).map(h => h.zone);
    if (lastZones.length >= ZONE_REPEAT_LIMIT && new Set(lastZones).size === 1) {
        poeticNudge += 0.20;
        reasons.push(`Zone stagnation in Zone ${zone}`);
    }

    // 3) Extremely low periodicity → dissolution state (stabilize slightly)
    if (periodicity < 0.10) {
        poeticNudge -= 0.05;
        reasons.push("Low periodicity (chaotic drift)");
    }

    // no movement reason (steady evolution)
    if (reasons.length === 0) {
        reasons.push("Stable creative balance");
    }

    // --- Console table row ----------------------------------------
    console.log(
        `${String(cycleCounter).padStart(4)} | ` +
        `${topArchetypes[0]?.id ?? "—"} (${topArchetypes[0]?.score.toFixed(2) ?? "—"}) | ` +
        `Fr=${fract.toFixed(2)} | Z=${zone} | Ph=${phase.toFixed(2)} | Per=${periodicity.toFixed(2)} | ` +
        `Δpoetic=${poeticNudge.toFixed(2)}`
    );

    return { poeticNudge, reason: reasons, notes, features };
}

/** Optional getter for UI integration */
export function getSymbolicNumogramHistory() {
    return [...history];
}
