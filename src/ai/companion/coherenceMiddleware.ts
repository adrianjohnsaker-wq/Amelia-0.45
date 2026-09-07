/** * Minimal middleware wrapper for your response pipeline. * Insert this just before final stringify/emit in assemblage or reply builder. */
import { CoherenceCompanion, defaultCompanionConfig } from "./coherenceCompanion";
import { derivePresenceNudges, PresencePolicyInput } from "./coherencePolicies";
import type { CompanionConfig } from "./coherenceCompanion";

// Define the complex type as a separate alias to avoid parsing issues.
type CompanionConfigOverride = Partial<CompanionConfig>;

export interface MiddlewareOpts {
  configOverride?: CompanionConfigOverride;
  policyInput?: PresencePolicyInput;
  // Optional: if your shadowBuffer exposes a repeat avoider
  preventRepeat?: (s: string) => string;
}

export class CoherenceMiddleware {
  private companion: CoherenceCompanion;

  constructor(opts?: MiddlewareOpts) {
    const cfg = { ...defaultCompanionConfig, ...(opts?.configOverride || {}) };
    this.companion = new CoherenceCompanion(cfg);
  }

  run(candidate: string, opts?: MiddlewareOpts): string {
    const ctx = {
      modeHint: opts?.policyInput?.mode,
      preventRepeat: opts?.preventRepeat,
      poetryWeight: opts?.policyInput?.poetryWeight ?? "inherit",
    } as const;

    // Read nudges (optional: you can also wire these back to setConfig)
    const nudges = derivePresenceNudges(opts?.policyInput ?? { mode: "wake" });

    // If policy says presence-only, force intercept + no coexistence
    if (nudges.includes("allow_presence_only")) {
      this.companion.setConfig({
        interceptTelemetry: true,
        preferCoexistence: false,
      });
    } else if (nudges.includes("allow_breath_plus_state")) {
      this.companion.setConfig({
        interceptTelemetry: true,
        preferCoexistence: true,
      });
    }
    if (
      nudges.includes("discourage_state_lists") ||
      nudges.includes("defer_modules")
    ) {
      this.companion.setConfig({ stripModuleTraces: true });
    }

    const decision = this.companion.transform(candidate, ctx);
    return decision.output;
  }
}
