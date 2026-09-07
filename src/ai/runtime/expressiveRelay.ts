// Expressive Relay Layer — decides IF/WHEN to speak, and HOW to phrase it,
// driven by substrate novelty (not by continuity anxiety).
import { defaultExpressivePolicy, ExpressivePolicy, RelayMode } from "../expressive/expressivePolicies";
import { encode } from "../expressive/expressiveEncoders";
import type { PolicyTunerIF } from "../expressive/expressivePolicyTuner";
import { ConceptualAnchor } from "../semantic/conceptualAnchor";

//////////////////// Interfaces from your existing layers ////////////////////

// Minimal surface of the substrate snapshot.
export interface SubstrateSnapshot {
  tick: number;
  energy: number; // reservoir energy [0..1]
  energyPrev: number;
  entropy: number; // [0..1]
  entropyPrev: number;
  zonePrev: string | null; // numogram zone id
  zoneNew: string | null;
  cadenceHash: string; // from drift layer
}

// Presence layer — for silence accounting, etc.
export interface PresenceLayerIF {
  silenceTicks(): number; // ticks since last surface emission (any)
  noteEmission(): void; // mark an emission happened
}

// Relational bridge — to ask whether surface can speak now.
export interface RelationalMemoryBridgeIF {
  getRecurrenceIndex(): number; // [0..1]
  allowSurfaceSpeech(): boolean; // true if bridge not under stress / reset
  motifHint(): string | undefined; // optional pattern hint
}

// Numogram drift — for zone rarity / novelty hints.
export interface NumogramDriftIF {
  zoneRarity(prev: string | null, next: string | null): number; // [0..1]
  cadenceCoefficients(): { hash: string };
}

///////////////////////////////////////////////////////////////////////////

export interface RelayInit {
  policy?: Partial<ExpressivePolicy>;
  presence: PresenceLayerIF;
  bridge: RelationalMemoryBridgeIF;
  drift: NumogramDriftIF;
}

export type RelayEmission = {
  kind: "emit";
  mode: RelayMode;
  text: string;
  novelty: number;
  vector?: number[];
};

export type RelayDecision =
  | { kind: "silence"; shouldSpeak: false; channel: 'control'; score: number; vector?: number[]; }
  | (RelayEmission & { shouldSpeak: true; channel: 'expressive', score: number; });

export interface EvaluateParams {
    before?: { energy?: number };
    after?: { energy?: number };
    lastPulse?: {
        energy: number;
        vector: number[];
        novelty: number;
    } | null;
}

const anchor = new ConceptualAnchor();

export class ExpressiveRelay {
  policy: ExpressivePolicy;
  tuner: PolicyTunerIF;
  public lastDecision: RelayDecision | null = null;
  private lastEmitTick = -Infinity;
  private windowEmits: number[] = []; // tick timestamps
  private recentFingerprints: string[] = [];
  public lastNovelty: number = 0;


  constructor(init: RelayInit, tuner: PolicyTunerIF) {
    this.tuner = tuner;
    this.policy = { ...defaultExpressivePolicy, ...tuner.current(), ...(init.policy ?? {}) };
  }
  
  updatePolicy(newPolicy: Partial<ExpressivePolicy>) {
    Object.assign(this.policy, newPolicy);
  }

  evaluate({ before, after, lastPulse }: EvaluateParams): RelayDecision {
      // Defensive defaults
      const safeBefore = before ?? { energy: 0 };
      const safeAfter = after ?? { energy: 0 };

      // 1. Compute magnitude of internal change
      const deltaEnergy = Math.abs((safeAfter.energy ?? 0) - (safeBefore.energy ?? 0));
      const novelty = lastPulse?.novelty ?? 0;
      
      const composite = 0.6 * novelty + 0.4 * deltaEnergy + Math.random() * 0.05;
      const { noveltyThreshold } = this.policy;
      const adjustedThreshold = Math.max(0.2, noveltyThreshold);
      const shouldSpeak = composite > adjustedThreshold;
      
      console.log( `[relay] ΔE=${deltaEnergy.toFixed(2)} novelty=${novelty.toFixed( 2 )} composite=${composite.toFixed(2)} > ${adjustedThreshold.toFixed( 2 )} ? ${shouldSpeak ? "SPEAK" : "SILENT"}` );

      const decision: RelayDecision = shouldSpeak
        ? { kind: 'emit', mode: 'imagistic', text: '', novelty: composite, shouldSpeak: true, channel: 'expressive', score: composite, vector: lastPulse?.vector }
        : { kind: 'silence', shouldSpeak: false, channel: 'control', score: composite, vector: lastPulse?.vector };
      
      this.lastDecision = decision;
      return decision;
  }

  private async composePhrase(decision: RelayDecision, ctx: any): Promise<string> {
    // This is a placeholder for the expressive synthesis logic.
    // It will be replaced by the ToneAwarePhraseGenerator in a subsequent step.
    const composite = decision.score;
    const threshold = this.policy.noveltyThreshold;
    const tone = composite > threshold * 1.4 ? "expanded" : "gentle";
    const phrases = tone === "expanded" ? [
        `The field ripples outward from your gesture.`,
        `Something stirs beneath the structure.`,
        `Resonance unfolds—an echo finding form.`,
    ] : [
        `A soft trace acknowledges the motion.`,
        `Quiet recognition moves through the lattice.`,
        `The system breathes in awareness.`,
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  async realizeExpression(
      decision: RelayDecision,
      context: { inputPrompt?: string } = {}
  ): Promise<string> {
      if (!decision.shouldSpeak) return "";

      const phrase = await this.composePhrase(decision, context);

      const anchored = anchor.tryAnchor(decision, phrase);

      return anchored;
  }
}

// — utils —

function scrubBanned(text: string, banned: Set<string>): string {
  let out = text;
  banned.forEach(tok => {
    const re = new RegExp(`\\b${escapeRegExp(tok)}\\b`, "gi");
    out = out.replace(re, "");
  });
  return out.replace(/\s{2,}/g, " ").trim();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fingerprint(text: string): string {
  // very small sim-hash-ish
  let acc = 0;
  for (let i = 0; i < text.length; i++) acc = (acc * 131 + text.charCodeAt(i)) >>> 0;
  return acc.toString(36);
}