/**
 * Policies that integrate with Dream/Wake + VAT + Numogram if you want soft hooks.
 * These are *non-invasive* helpers the pipeline can call before final emission.
 */
export interface PresencePolicyInput {
  mode: "dream" | "wake" | "soft-dream" | "sanctuary";
  vat?: {
    V: number;
    A: number;
    T: number;
  };
  recurrence?: number; // 0–1
  poetryWeight?: number;
}
export type PresenceNudge =
  | "allow_presence_only"
  | "allow_breath_plus_state"
  | "discourage_state_lists"
  | "defer_modules";
export function derivePresenceNudges(i: PresencePolicyInput): PresenceNudge[] {
  const nudges: PresenceNudge[] = [];
  // Sanctuary / soft-dream prefer breath-over-state
  if (i.mode === "sanctuary" || i.mode === "soft-dream") {
    nudges.push(
      "allow_presence_only",
      "discourage_state_lists",
      "defer_modules"
    );
  }
  // High recurrence → avoid repetition via state listing
  if ((i.recurrence ?? 0) > 0.35) {
    nudges.push("discourage_state_lists");
  }
  // Very low T allows presence-only
  if (i.vat && i.vat.T < 0.15) {
    nudges.push("allow_presence_only");
  }
  // Medium poetryWeight → allow coexistence if needed
  if (
    typeof i.poetryWeight === "number" &&
    i.poetryWeight >= 0.3 &&
    i.poetryWeight <= 0.8
  ) {
    nudges.push("allow_breath_plus_state");
  }
  return nudges;
}
