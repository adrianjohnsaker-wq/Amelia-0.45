
export function crossCorrelation(a: number[], b: number[], maxLag: number) {
  const n = Math.min(a.length, b.length);
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  if(n === 0) return [];
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));

  const norm = (x: number[], m: number) =>
    Math.sqrt(x.reduce((s, v) => s + (v - m) * (v - m), 0)) + 1e-9;

  const na = norm(a.slice(0, n), ma);
  const nb = norm(b.slice(0, n), mb);

  const out: { lag: number; corr: number }[] = [];
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let s = 0;
    let c = 0;
    for (let i = 0; i < n; i++) {
      const j = i + lag;
      if (j < 0 || j >= n) continue;
      s += (a[i] - ma) * (b[j] - mb);
      c++;
    }
    out.push({ lag, corr: c ? (s / (na * nb)) : 0 });
  }
  return out;
}
