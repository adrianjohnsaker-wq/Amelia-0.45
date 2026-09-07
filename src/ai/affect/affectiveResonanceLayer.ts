/**
 * Simplified affective field used by ConceptualAnchor feedback.
 * In your full system this likely already exists; just ensure
 * these methods and keys are present.
 */
export interface AffectiveField {
  warmth: number;
  fluidity: number;
  entropy: number;
  adjustTone(delta: Partial<AffectiveField>): void;
}

/** Example default implementation */
export class DefaultAffectiveField implements AffectiveField {
  warmth = 0;
  fluidity = 0;
  entropy = 0;

  adjustTone(delta: Partial<AffectiveField>) {
    const jitter = () => (Math.random() - 0.5) * 0.05;
    this.warmth = clamp(this.warmth + (delta.warmth ?? 0) + jitter(), -1, 1);
    this.fluidity = clamp(this.fluidity + (delta.fluidity ?? 0) + jitter(), -1, 1);
    this.entropy = clamp(this.entropy + (delta.entropy ?? 0) + jitter(), -1, 1);
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}
