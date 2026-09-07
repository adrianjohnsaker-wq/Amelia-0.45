// src/ai/runtime/expressiveEnvironment.ts

import { runCycle } from "../meta/dreamWakeCycle";
import { SemanticRelay } from "../expressive/semanticRelay";

export class ExpressiveEnvironment {
  private tickCount = 0;
  private interval?: NodeJS.Timeout;
  private loop;
  private semantic?: SemanticRelay;

  constructor() {
    this.loop = runCycle({
      onDev: (snap) => {
        // This is where you could forward snapshots to a dev console or UI
      }
    });
  }

  start(period = 100) {
    if (this.interval) clearInterval(this.interval);
    
    const { relay, tuner } = this.loop.getInternals();
    this.semantic = new SemanticRelay(relay, tuner);

    console.log("[ExpressiveEnvironment] Starting heartbeat...");
    this.interval = setInterval(() => this.tick(), period);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log("[ExpressiveEnvironment] Heartbeat stopped.");
    }
    this.interval = undefined;
    this.loop.stop();
  }

  private tick() {
    this.tickCount++;
    const snap = this.loop.snapshot();
    
    // The maybeEmit is handled inside dreamWakeCycle's onSnapshot now.
    // We just need to get the last decision.
    const { relay, tuner } = this.loop.getInternals();
    const decision = relay.lastDecision;
    
    if (decision) {
      tuner.observe({
        tick: snap.ts,
        novelty: decision.kind === "emit" ? decision.novelty : 0,
        emitted: decision.kind === "emit",
        entropy: snap.drift.entropy,
        energyDelta: snap.energy - this.loop.getPrevEnergy(),
      });
    }
    
    // new: semantic conversion
    const phrase = this.semantic?.tick(snap);
    if (phrase) {
        console.log(`[SPOKEN] ${phrase}`);
    }

    if (this.tickCount % 256 === 0) {
      const P = tuner.current();
      relay.updatePolicy(P);
      console.log(
        `[TUNER] tick=${this.tickCount} novelty=${P.noveltyThreshold.toFixed(
          3
        )} recurrence=${P.recurrenceCeil.toFixed(3)}`
      );
    }
  }
}
