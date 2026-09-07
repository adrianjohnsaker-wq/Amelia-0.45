
// archetypeLedgerReflect.ts
export function reflectArchetypeLedger(ledger: Record<string,number>){
    return Object.entries(ledger)
        .map(([name, energy]) => `${name}:${energy > 0 ? "+" : ""}${energy.toFixed(2)}`)
        .join(" | ");
}
