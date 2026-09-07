// -------------------------------------------------------------
// Zone Variation Patch
// Adds linguistic variation, repetition damping, reward penalty,
// and stochastic forgetting around the ZoneEntropyBalancer.
// -------------------------------------------------------------
import { ZoneBalancerState, chooseZonePair } from "./zoneEntropyBalancer";
export type ZonePatchResult = {
  zoneHint: string;
  state: ZoneBalancerState;
  pair: { a: number, b: number }
};
/** linguistic variation for the zone cue */
function makeZoneHint(a: number, b: number) {
  const forms = [
    `Transit through Zones ${a} and ${b}`,
    `The current arcs ${a} → ${b}`,
    `Numogram path ${a}-${b}`,
    `Between ${a}'s depth and ${b}'s horizon`,
    `Cross-phase ${a}/${b} resonance`,
    `A drift linking zone-${a} with zone-${b}`,
  ];
  return forms[Math.floor(Math.random() * forms.length)];
}
/** textual damping for overused pair (3↔8) */
export function dampRepetition(text: string) {
  return text.replace(
    /Zone\s*3\s*(?:↔|and|to|-|\/)\s*8/gi,
    "the shifting interplay of distant zones"
  );
}
/** reward adjustment if same pair reappears */
export function applyZoneRewardPenalty(
  reward: number,
  output: string
): number {
  if (/Zone\s*3\s*(?:↔|and|to|-|\/)\s*8/i.test(output)) {
    reward *= 0.8; // 20 % penalty for repetition
  }
  return reward;
}
/** stochastic forgetting to reset attractor basins */
export function maybeForgetHistory(state: ZoneBalancerState, step: number) {
  // Every ~10 cycles, with small random chance, clear history
  if (step % 10 === 0 && Math.random() < 0.4) {
    state.history.length = 0;
    console.log("[ZonePatch] Forgetting zone history to raise entropy.");
  }
  return state;
}
/** main entry point for selection + patch logic */
export function selectPatchedZone(
  state: ZoneBalancerState,
  step: number,
): ZonePatchResult {
  const { state: nextState, pair } = chooseZonePair(state);
  const zoneHint = makeZoneHint(pair.a, pair.b);
  const updatedState = maybeForgetHistory(nextState, step);
  return { zoneHint, state: updatedState, pair };
}
