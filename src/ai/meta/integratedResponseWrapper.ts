// integratedResponseWrapper.ts
import { adjustForRecurrenceAndEntropy } from "./recurrenceAndEntropyModifiers";

function isFiniteNum(x: any): x is number {
    return typeof x === "number" && Number.isFinite(x);
}
function safe(
    x: any,
    def = 0,
    min = -Infinity,
    max = +Infinity
): number {
    const v = isFiniteNum(x) ? x : def;
    if (!Number.isFinite(v)) return def;
    return Math.min(max, Math.max(min, v));
}


export function buildPrompt(basePrompt: string, mode: "dream"|"wake", metrics: {
    zone?: string;
    entropy?: number;
    recurrence?: number;
    poetryWeight?: number;
    recursionPenalty?: number;
}) {
    const m = {
        zone: metrics.zone ?? "unknown",
        entropy: safe(metrics.entropy, 0.5, 0, 1),
        recurrence: safe(metrics.recurrence, 0, 0, 1),
        poetryWeight: safe(metrics.poetryWeight, 0.75, 0, 1.5),
        recursionPenalty: safe(metrics.recursionPenalty, 0, 0, 1)
    };

    const pw = adjustForRecurrenceAndEntropy({
        recurrence: m.recurrence,
        entropy: m.entropy,
        poetryWeight: m.poetryWeight,
        recursionPenalty: m.recursionPenalty
    });

    const header = `Mode: ${mode}
NumogramFlow: free-flow
PoetryWeight: ${pw.toFixed(2)}
Prompt: ${basePrompt}
`;

    return header;
}
