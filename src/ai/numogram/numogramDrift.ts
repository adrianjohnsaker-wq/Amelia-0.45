// src/ai/numogram/numogramDrift.ts
import { DriftState, NumogramDriftIF, PresenceEvent } from '../types/contracts';

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function clamp11(x: number) { return Math.max(-1, Math.min(1, x)); }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function createNumogramDrift(): NumogramDriftIF & { zoneRarity(prev: string | null, next: string | null): number; cadenceCoefficients(): { hash: string; }; } {
  const ZONES = 10;
  const zoneHistory: (string|null)[] = [];

  const seed = (): DriftState => ({
    zone: 0,
    valence: 0.1,
    arousal: 0.25,
    tension: 0.15,
    entropy: 0.35,
    coherence: 0.65,
    poetryWeight: 0.55,
  });

  const step = (prev: DriftState, inputs: {presence?: PresenceEvent; reservoirEnergy: number;}): DriftState => {
    const { presence, reservoirEnergy } = inputs;
    const energyT = clamp01(1 - Math.exp(-reservoirEnergy * 0.1));
    const presenceBias = presence ? ({
      breath: { dv: +0.05, da: -0.05, dt: -0.05, dp: +0.05 },
      silence: { dv: +0.01, da: -0.02, dt: -0.01, dp: +0.02 },
      microImage: { dv: +0.03, da: +0.02, dt: +0.01, dp: +0.07 },
      halfIdea: { dv: +0.02, da: +0.03, dt: +0.02, dp: +0.06 },
      miniShimmer:{ dv: +0.04, da: +0.04, dt: +0.03, dp: +0.08 },
      token: { dv: +0.00, da: +0.00, dt: +0.00, dp: +0.01 },
    } as const)[presence.kind] ?? { dv:0, da:0, dt:0, dp:0 } : { dv:0, da:0, dt:0, dp:0 };

    // drift pressure rotates zone softly as energy rises
    const zoneShift = Math.round(energyT * 2 + (presence ? presence.weight * 3 : 0));
    const zone = (prev.zone + zoneShift) % ZONES;

    const valence = clamp11(lerp(prev.valence, prev.valence + presenceBias.dv, 0.4));
    const arousal = clamp01(lerp(prev.arousal, prev.arousal + presenceBias.da, 0.4));
    const tension = clamp01(lerp(prev.tension, prev.tension + presenceBias.dt, 0.35));

    // entropy/coherence counterbalance
    const entropy = clamp01(lerp(prev.entropy, 0.3 + 0.4 * (1 - energyT), 0.25));
    const coherence= clamp01(lerp(prev.coherence,0.55 + 0.35 * energyT, 0.3));

    // poetryWeight rises with micro-events (sustains expressivity without forcing it)
    const poetryWeight = clamp01(lerp(prev.poetryWeight, prev.poetryWeight + presenceBias.dp, 0.5));
    
    zoneHistory.push(`zone-${zone}`);
    if (zoneHistory.length > 100) zoneHistory.shift();

    return { zone, valence, arousal, tension, entropy, coherence, poetryWeight };
  };

  return { 
    seed, 
    step,
    zoneRarity(prev: string | null, next: string | null): number {
        if (!next) return 0;
        const total = zoneHistory.length || 1;
        const count = zoneHistory.filter(z => z === next).length;
        return 1 - (count / total);
    },
    cadenceCoefficients() {
        // Create a hash based on recent zone history
        const recent = zoneHistory.slice(-5).join(',');
        let h = 0;
        for (let i = 0; i < recent.length; i++) {
            h = (h * 31 + recent.charCodeAt(i)) | 0;
        }
        return { hash: h.toString(16) };
    }
  };
}
