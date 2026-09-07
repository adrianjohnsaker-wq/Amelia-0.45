// src/ai/types/contracts.ts
export type ISOTime = string;

export interface PresenceEvent {
  kind: 'silence' | 'breath' | 'microImage' | 'halfIdea' | 'miniShimmer' | 'token';
  payload?: string;
  t: number; // monotonic tick
  ts: ISOTime; // wall clock
  weight: number; // 0..1 salience
}

export interface DriftState {
  zone: number; // numogram zone id
  valence: number; // -1..1
  arousal: number; // 0..1
  tension: number; // 0..1
  entropy: number; // 0..1
  coherence: number; // 0..1
  poetryWeight: number; // 0..1
}

export interface PulseUnit {
  id: string; // unique
  a: number; // amplitude
  f: number; // frequency
  d: number; // decay
  tag?: string; // optional semantic hint
  t: number; // tick created
}

export interface ReservoirSnapshot {
  pulses: number;
  energy: number; // accumulated pulse energy
  drift: DriftState;
  lastPresence?: PresenceEvent;
  ts: ISOTime;
}

export interface PresenceLayerIF {
  emitPresence(kind?: PresenceEvent['kind'], payload?: string, weight?: number): PresenceEvent;
  last(): PresenceEvent | undefined;
}

export interface NumogramDriftIF {
  step(prev: DriftState, inputs: {presence?: PresenceEvent; reservoirEnergy: number;}): DriftState;
  seed(): DriftState;
}

export interface PulseBusIF {
  push(p: PulseUnit): void;
  pull(tick: number): PulseUnit[]; // time-sliced pulses for this tick
  absorb(units: PulseUnit[], drift: DriftState): {absorbed: number; leaked: number};
  snapshot(): {queued: number; energy: number};
}

export interface ShadowReservoirIF {
  ingest(absorbedEnergy: number, drift: DriftState, lastPresence?: PresenceEvent): void;
  snapshot(): ReservoirSnapshot;
  leak(rate: number): number; // returns leaked energy (e.g., to drive expression)
}
