
// Minimal DFT (OK for N~2048 windows). For large N, swap to FFT lib in branch.
export function dftMagnitudes(x: number[]) {
  const N = x.length;
  const mags: number[] = new Array(N).fill(0);
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const ang = (2 * Math.PI * k * n) / N;
      re += x[n] * Math.cos(ang);
      im -= x[n] * Math.sin(ang);
    }
    mags[k] = Math.sqrt(re*re + im*im);
  }
  return mags;
}

export function dominantFrequencies(x: number[], topK: number = 5) {
  const mags = dftMagnitudes(x);
  const pairs = mags
    .slice(1, Math.floor(mags.length/2)) // ignore DC and mirror
    .map((m, k) => ({ k: k+1, m }));
  pairs.sort((a, b) => b.m - a.m);
  return pairs.slice(0, topK);
}
