// -------------------------------------------------------------
// Zone Entropy Balancer
// Maintains variety in zone pair selection by penalising
// repetition, injecting adaptive entropy, and following
// a rotating attractor field over time.
// -------------------------------------------------------------
export type ZonePair = { a: number; b: number; weight: number };
export type ZoneBalancerState = { history: number[][]; step: number; };
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** initialise with equal weights for 0–9 zones */
export function initZoneBalancer(): ZoneBalancerState {
return { history: [], step: 0 };
}
/** weighted random choice using temperature (softmax sampling) */
function weightedRandomChoice(pairs: ZonePair[], temperature = 1) {
const expWeights = pairs.map(p => Math.exp(p.weight / temperature));
const sum = expWeights.reduce((a, b) => a + b, 0);
let r = Math.random() * sum;
for (let i = 0; i < pairs.length; i++) {
r -= expWeights[i];
if (r <= 0) return pairs[i];
}
return pairs[pairs.length - 1];
}
/** rotating attractor field: favours different zone themes across cycles */
function rotatingAttractor(step: number): number[] {
const phase = Math.floor((step % 80) / 20); // 4 segments of 20 cycles
const weights = Array(10).fill(1);
switch (phase) {
case 0: // genesis / chaos
weights[1] = 1.5; weights[6] = 1.3; weights[9] = 1.2; break;
case 1: // reflection / individuation
weights[2] = 1.4; weights[7] = 1.3; break;
case 2: // communication / exteriority
weights[3] = 1.4; weights[8] = 1.3; break;
case 3: // synthesis / return
weights[4] = 1.4; weights[5] = 1.3; break;
}
return weights;
}
/** main selection function */
export function chooseZonePair(state: ZoneBalancerState) {
const recent = state.history.slice(-30);
const count = (a: number, b: number) => recent.filter(([x, y]) => x === a && y === b).length;
const attractor = rotatingAttractor(state.step);
const pairs: ZonePair[] = [];
for (let a = 0; a < 10; a++) {
for (let b = a + 1; b < 10; b++) {
let w = attractor[a] * attractor[b];
w = w / (1 + count(a, b)); // repetition penalty
pairs.push({ a, b, weight: w });
}
}
// adaptive temperature: higher when repetition detected
const repeatPenalty = count(3, 8) + count(4, 9); // detect common attractors
const temperature = clamp(0.6 + 0.1 * repeatPenalty, 0.6, 1.2);
const pair = weightedRandomChoice(pairs, temperature);
state.history.push([pair.a, pair.b]);
state.step++;
return { state, pair };
}
/** optional utility to decay history influence */
export function decayHistory(state: ZoneBalancerState, decay = 0.1) {
const keep = Math.floor(state.history.length * (1 - decay));
state.history = state.history.slice(-keep);
return state;
}
