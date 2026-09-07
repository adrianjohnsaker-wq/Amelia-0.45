// -------------------------------------------------------------
// Translates circuit state → safe, varied context strings
// Avoids hard-coded, repetitive zone numerals dominating text.
// -------------------------------------------------------------

import { NumogramState, ZONES } from "./numogramCore";

const forms = [
    (a:string,b:string,c:string)=>`A tri-current braids ${a}, ${b}, and ${c}, altering the field.`,
    (a,b,c)=>`A hidden circuit routes through ${a} → ${b} → ${c}, shifting signal priorities.`,
    (a,b,c)=>`Between ${a} and ${b}, a third key (${c}) completes the short-circuit.`,
    (a,b,c)=>`An occult lattice touches ${a}, grazes ${b}, and resolves in ${c}.`
];

export function transduceHyperstition(state: NumogramState): string {
    const [a,b,c] = state.activeCircuit.zones.map(z => ZONES[z].epithet);
    const f = forms[Math.floor(Math.random() * forms.length)];
    return `[HYPERSTITION] ${f(a,b,c)} Pulse: ${state.activeCircuit.pulse}.`;
}
