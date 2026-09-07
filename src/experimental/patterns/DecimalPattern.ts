
export function transitionProbabilities(regimes: string[]) {
  const counts = new Map<string, Map<string, number>>();
  const outCounts = new Map<string, number>();

  for (let i = 0; i < regimes.length - 1; i++) {
    const a = regimes[i], b = regimes[i+1];
    if (!counts.has(a)) counts.set(a, new Map());
    counts.get(a)!.set(b, (counts.get(a)!.get(b) ?? 0) + 1);
    outCounts.set(a, (outCounts.get(a) ?? 0) + 1);
  }

  const probs = new Map<string, Map<string, number>>();
  for (const [a, m] of counts.entries()) {
    const denom = outCounts.get(a) ?? 1;
    probs.set(a, new Map());
    for (const [b, c] of m.entries()) probs.get(a)!.set(b, c / denom);
  }
  return probs;
}

function isNearRational(x: number, maxDen: number = 16, eps: number = 1e-3) {
  for (let q = 1; q <= maxDen; q++) {
    const p = Math.round(x * q);
    if (Math.abs(x - p / q) < eps) return { p, q, approx: p / q };
  }
  return null;
}

export function detectRationalBias(probs: Map<string, Map<string, number>>) {
  const hits: string[] = [];
  for (const [a, m] of probs.entries()) {
    for (const [b, p] of m.entries()) {
      const r = isNearRational(p);
      if (r) hits.push(`${a}→${b}: ${p.toFixed(4)} ≈ ${r.p}/${r.q}`);
    }
  }
  return hits;
}
