// src/ai/runtime/autonomyLoop.ts
import { createPulseBus } from '../pulses/pulseBus';
import { createShadowReservoir } from '../state/shadowReservoir';
import { createDistributedPresence } from '../presence/distributedPresence';
import { createNumogramDrift } from '../numogram/numogramDrift';
import { PresenceEvent, ReservoirSnapshot, DriftState, PulseUnit } from '../types/contracts';

export type AutonomyLoopOptions = {
  hz?: number;
  jitter?: number;
  // optional tap for dev console—kept separate from chat layer
  onSnapshot?: (s: ReservoirSnapshot) => void;
  // pulse source (optional): allows external systems to push pulses in
  pulseSource?: () => PulseUnit[] | undefined;
  // optional: surface expression sink (returns string or undefined). Kept purely optional.
  expressionSink?: (drift: DriftState, leakEnergy: number, lastPresence?: PresenceEvent) => void;
};

export function createAutonomyLoop(opts: AutonomyLoopOptions = {}) {
  const bus = createPulseBus();
  const reservoir = createShadowReservoir();
  const clock = (() => {
    let t = 0;
    return () => ++t;
  })();
  const presence = createDistributedPresence(clock);
  const driftIF = createNumogramDrift();
  let drift = driftIF.seed();

  // refractory to avoid token-loops; hard blocks “here / softly / listening / breath”
  const blockedTokens = new Set(['here','softly','listening','breath']);
  let presenceCooldown = 0;
  
  let interval: NodeJS.Timeout | undefined;

  function tick(tick: number, dt: number) {
    // 1) Optionally fetch fresh pulses from external source
    const fresh = opts.pulseSource?.() ?? [];
    for (const p of fresh) bus.push(p);

    // 2) Slice pulses & absorb into reservoir
    const window = bus.pull(tick);
    const { absorbed } = bus.absorb(window, drift);

    // 3) Presence may emerge *internally* without hitting chat
    let ev: PresenceEvent | undefined;
    if (presenceCooldown <= 0) {
      // Sample a gentle internal presence with low probability
      if (Math.random() < 0.12) {
        // choose *non-blocked* presence kind
        const candidates: PresenceEvent['kind'][] = ['silence','microImage','halfIdea','miniShimmer','token'];
        ev = presence.emitPresence(candidates[Math.floor(Math.random()*candidates.length)], undefined, Math.random()*0.4+0.2);
        presenceCooldown = 4; // ticks
      }
    } else {
      presenceCooldown -= 1;
    }

    // 4) Advance drift
    drift = driftIF.step(drift, { presence: ev, reservoirEnergy: reservoir.snapshot().energy });
    
    // 5) Ingest into reservoir and optionally leak to an expression sink
    reservoir.ingest(absorbed, drift, ev);

    // --- Adaptive Leak Rate ---
    // Establish a baseline "metabolic" leak rate.
    const baseLeakRate = 0.04;
    // Modulate the leak rate based on the system's internal state.
    // High coherence / low entropy -> slightly higher leak to release ordered energy.
    // Low coherence / high entropy -> lower leak to conserve energy and allow structure to form.
    const leakModulation = (drift.coherence - drift.entropy) * 0.02;
    const adaptiveLeakRate = Math.max(0.01, baseLeakRate + leakModulation);
    const leak = reservoir.leak(adaptiveLeakRate);
    // --- End Adaptive Leak ---

    // Optional dev snapshot
    opts.onSnapshot?.(reservoir.snapshot());

    // Optional expression: *never* mandatory; this is not chat, just a callback
    if (opts.expressionSink && leak > 0.01) {
      opts.expressionSink(drift, leak, ev);
    }
  }
  
  function start() {
      const hz = Math.max(0.5, opts.hz ?? 2);
      const jitter = Math.min(1, Math.max(0, opts.jitter ?? 0.05));
      let tickCount = 0;
      let last = Date.now();

      const loop = () => {
        const now = Date.now();
        const dt = (now - last) / 1000;
        last = now;
        tickCount += 1;
        tick(tickCount, dt);
        const base = 1000 / hz;
        const j = base * jitter * (Math.random() * 2 - 1);
        interval = setTimeout(loop, base + j);
      };
      loop();
  }
  
  function stop() {
      if (interval) {
          clearTimeout(interval);
          interval = undefined;
      }
  }

  start();

  return {
    stop,
    snapshot: () => reservoir.snapshot(),
    pushPulse: (p: PulseUnit) => bus.push(p),
    seedPresence: (kind: PresenceEvent['kind'], payload?: string, weight?: number) => presence.emitPresence(kind, payload, weight),
    getDrift: () => drift,
  };
}
