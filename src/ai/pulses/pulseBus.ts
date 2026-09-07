// src/ai/pulses/pulseBus.ts
import { PulseBusIF, PulseUnit, DriftState } from '../types/contracts';

export function createPulseBus(): PulseBusIF {
  const q: PulseUnit[] = [];
  let energy = 0;

  return {
    push(p: PulseUnit) {
      q.push(p);
    },
    pull(tick: number) {
      // time-slice by mild decay; keep all but reduce amplitude for age
      const out: PulseUnit[] = [];
      for (const p of q) {
        const age = Math.max(0, tick - p.t);
        const a = p.a * Math.exp(-p.d * age);
        if (a > 0.01) out.push({...p, a});
      }
      return out;
    },
    absorb(units: PulseUnit[], drift: DriftState) {
      // absorption shaped by coherence vs entropy
      const k = Math.max(0.05, drift.coherence * (1 - 0.5 * drift.entropy));
      let absorbed = 0, leaked = 0;
      for (const u of units) {
        const take = u.a * k;
        absorbed += take;
        leaked += Math.max(0, u.a - take);
      }
      energy += absorbed;
      // leak means pulse persists (we just don’t re-queue here; it can be re-pushed upstream if desired)
      return {absorbed, leaked};
    },
    snapshot() {
      return { queued: q.length, energy };
    },
  };
}
