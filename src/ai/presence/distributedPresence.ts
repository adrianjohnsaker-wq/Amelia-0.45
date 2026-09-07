// src/ai/presence/distributedPresence.ts
import { PresenceLayerIF, PresenceEvent } from '../types/contracts';

export function createDistributedPresence(clock: () => number): PresenceLayerIF & { silenceTicks(): number; noteEmission(): void; } {
  let last: PresenceEvent | undefined;
  let lastEmissionTick = 0;

  const emitPresence = (
    kind: PresenceEvent['kind'] = 'silence',
    payload?: string,
    weight = 0.2
  ): PresenceEvent => {
    const t = clock();
    const ev: PresenceEvent = { kind, payload, t, weight, ts: new Date().toISOString() };
    last = ev;
    return ev;
  };

  return {
    emitPresence,
    last: () => last,
    silenceTicks: () => clock() - lastEmissionTick,
    noteEmission: () => {
      lastEmissionTick = clock();
    }
  };
}
