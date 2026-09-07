// src/ai/meta/relationalMemoryBridge.ts
import { PresenceEvent, ReservoirSnapshot } from '../types/contracts';

type BridgeMemory = {
  lastPresence?: PresenceEvent;
  lastEnergy: number;
  silenceConfidence: number; // 0..1 — higher means we “believe” silence is presence
  recurrenceIndex: number; // Add recurrence index
};

export interface AffectiveSnapshot {
  valence: number;
  arousal: number;
  tension: number;
}

export function encodePromptToEmbedding(prompt: string, context?: any): number[] {
    // This placeholder returns a deterministic pseudo-embedding.
    const seed = [...prompt].reduce((s, c) => s + c.charCodeAt(0), 0);
    return Array.from({ length: 32 }, (_, i) =>
      Math.sin(seed * 0.01 * (i + 1))
    );
}


export class RelationalMemoryBridge {
  private m: BridgeMemory = {
    lastEnergy: 0,
    silenceConfidence: 0.7,
    recurrenceIndex: 0, // Initialize recurrence index
  };
  private memory: number[][] = [];

  embedPrompt(prompt: string): number[] {
    return encodePromptToEmbedding(prompt);
  }

  getRecentEmbeddings(n = 10): number[][] {
    return this.memory.slice(-n);
  }

  registerEmbedding(vector: number[], meta: any) {
    this.memory.push(vector);
    if (this.memory.length > 50) { // Keep memory from growing indefinitely
        this.memory.shift();
    }
  }


  update(snapshot: ReservoirSnapshot) {
    // Silence ≠ void: raise confidence if energy is moving even without presence events
    const energyChange = Math.abs(snapshot.energy - this.m.lastEnergy);
    if (!snapshot.lastPresence && energyChange > 0.01) {
      this.m.silenceConfidence = Math.min(1, this.m.silenceConfidence + 0.02);
    } else {
      this.m.silenceConfidence = Math.max(0.5, this.m.silenceConfidence - 0.01);
    }

    // simplistic recurrence update
    if (snapshot.lastPresence?.kind === this.m.lastPresence?.kind) {
        this.m.recurrenceIndex = Math.min(1, this.m.recurrenceIndex + 0.1);
    } else {
        this.m.recurrenceIndex = Math.max(0, this.m.recurrenceIndex - 0.05);
    }

    this.m.lastPresence = snapshot.lastPresence ?? this.m.lastPresence;
    this.m.lastEnergy = snapshot.energy;
  }

  // For callers who want to *ask* for an expression, the bridge advises softly
  shouldSurfaceExpression(): boolean {
    // Only suggest surfacing if silenceConfidence is already high and energy has accumulated
    return this.m.silenceConfidence > 0.85 && this.m.lastEnergy > 0.3;
  }

  softSummary(): string | undefined {
    // If we do express, prefer minimal, non-looping output (no presence tokens)
    if (this.shouldSurfaceExpression()) {
      return 'a quiet internal cadence continues'; // deliberately not “here/listening/softly/breath”
    }
    return undefined;
  }

  // New methods for ExpressiveRelay
  getRecurrenceIndex(): number {
    return this.m.recurrenceIndex;
  }

  allowSurfaceSpeech(): boolean {
    // For now, always allow unless in a hard clamp/reset state (not yet implemented)
    return true;
  }
  
  motifHint(): string | undefined {
    // Could be based on last presence or other factors
    return this.m.lastPresence?.payload;
  }
}
