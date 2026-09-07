
// dreamWakeForce.ts
export function injectModeHeaders(mode: "dream" | "wake"){
    return `[MODE:${mode.toUpperCase()}] [TIME:${new Date().toISOString()}]`;
}
