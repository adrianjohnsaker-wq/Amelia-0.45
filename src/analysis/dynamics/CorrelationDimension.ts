
export interface CorrDimConfig {
  embedDim: number;      // m (e.g., 3..8)
  tau: number;           // delay (e.g., 1..10)
  radii: number[];       // log-spaced radii, e.g. [1e-3..1e-1]
  sampleMax?: number;    // optional subsampling for speed
}

function dist(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

export function embed(series: number[], m: number, tau: number): number[][] {
  const N = series.length - (m - 1) * tau;
  const X: number[][] = [];
  for (let i = 0; i < N; i++) {
    const v: number[] = [];
    for (let k = 0; k < m; k++) v.push(series[i + k * tau]);
    X.push(v);
  }
  return X;
}

export function correlationSum(X: number[][], r: number): number {
  const n = X.length;
  if (n < 2) return 0;
  let count = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      total++;
      if (dist(X[i], X[j]) < r) count++;
    }
  }
  return total ? count / total : 0;
}

export function estimateCorrelationDimension(series: number[], cfg: CorrDimConfig) {
  const X = embed(series, cfg.embedDim, cfg.tau);
  // Optional subsample for speed
  const Xs = cfg.sampleMax && X.length > cfg.sampleMax
    ? X.filter((_, i) => i % Math.ceil(X.length / cfg.sampleMax!) === 0)
    : X;

  const Cs = cfg.radii.map(r => correlationSum(Xs, r));
  // Fit slope of log C(r) vs log r over mid region
  const pts = cfg.radii
    .map((r, i) => ({ x: Math.log(r), y: Math.log(Cs[i] + 1e-12) }))
    .filter(p => Number.isFinite(p.y));

  // crude: take central 60%
  const a = Math.floor(pts.length * 0.2);
  const b = Math.ceil(pts.length * 0.8);
  const mid = pts.slice(a, b);

  const n = mid.length;
  if (n === 0) return { radii: cfg.radii, C: Cs, corrDim: NaN };
  const sx = mid.reduce((s, p) => s + p.x, 0);
  const sy = mid.reduce((s, p) => s + p.y, 0);
  const sxx = mid.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = mid.reduce((s, p) => s + p.x * p.y, 0);

  const denom = n * sxx - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : NaN;

  return { radii: cfg.radii, C: Cs, corrDim: slope };
}
