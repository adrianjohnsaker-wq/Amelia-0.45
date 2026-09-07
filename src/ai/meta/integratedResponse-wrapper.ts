// integratedResponseWrapper.ts
import { adjustForRecurrenceAndEntropy } from "./recurrenceAndEntropyModifiers";
import { safe } from "@/ai/util/safeNum";

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

    // Note: The 'enforceMetaState' function now wraps a simpler header,
    // as the detailed contract is in the synthesisPrompt's system message.
    const header = `Mode: ${mode}
NumogramFlow: free-flow
PoetryWeight: ${pw.toFixed(2)}
Prompt: ${basePrompt}
`;

    return header; // No longer calling enforceMetaState here.
}
