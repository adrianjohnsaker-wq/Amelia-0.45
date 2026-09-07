
// src/ai/evo/vatTypes.ts
// -------------------------------------------------------------
// Continuous affect model: Valence, Arousal, Tension
// -------------------------------------------------------------

export interface VATState {
    valence: number; // -1..+1
    arousal: number; // 0..1
    tension: number; // 0..1
}

export interface VATSample {
    features: Record<string, number>;
    target: VATState;
}

export interface VATDataset {
    samples: VATSample[];
}
