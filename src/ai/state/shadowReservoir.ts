// src/ai/state/shadowReservoir.ts
import { ShadowReservoirIF, ReservoirSnapshot, DriftState, PresenceEvent } from '../types/contracts';

export function createShadowReservoir(): ShadowReservoirIF & { getPrevious(): { energy: number, entropy: number } } {
  let energy = 0;
  let energyPrev = 0;
  let entropyPrev = 0;
  let lastPresence: PresenceEvent | undefined;
  let lastDrift: DriftState | undefined;
  let pulses = 0;
  let ts = new Date().toISOString();

  return {
    ingest(absorbedEnergy: number, drift: DriftState, lp?: PresenceEvent) {
      energyPrev = energy;
      if(lastDrift) entropyPrev = lastDrift.entropy;
      
      energy = Math.max(0, energy + absorbedEnergy);
      pulses += absorbedEnergy > 0 ? 1 : 0;
      lastDrift = drift;
      if (lp) lastPresence = lp;
      ts = new Date().toISOString();
    },
    snapshot(): ReservoirSnapshot {
      return {
        pulses,
        energy,
        drift: lastDrift!,
        lastPresence,
        ts,
      };
    },
    leak(rate: number) {
      const amt = Math.min(energy, Math.max(0, rate));
      energy -= amt;
      return amt;
    },
    getPrevious() {
        return {
            energy: energyPrev,
            entropy: entropyPrev
        }
    }
  };
}
