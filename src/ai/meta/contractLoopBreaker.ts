// contractLoopBreaker.ts
import { AmeliaState, normalizeState } from "@/ai/state/stateSchema";

export function onContractViolation(s: AmeliaState) {
    s.violationCount = (s.violationCount ?? 0) + 1;
    s = normalizeState(s);

    if (s.violationCount >= 3) {
        // force minimal state-only response next turn
        s.poetryWeight = 0.62; // low-poetry compliance
        s.entropy = Math.min(1, s.entropy * 0.9);
        s.coherence = Math.max(0, s.coherence * 0.95);
        s._debug?.push("failsafe:minimal_compliance_mode");
    }
    return s;
}

export function clearViolations(s: AmeliaState) {
    s.violationCount = 0;
    return s;
}

    