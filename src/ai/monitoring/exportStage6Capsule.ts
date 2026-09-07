
import { StepLog } from "./types";

export function exportStage6Capsule(logs: StepLog[]) {
  if (!logs || logs.length === 0) {
    console.error("NO_LOGS_AVAILABLE");
    return;
  }

  // --- Collect regime transitions
  const transitions: Record<string, Record<string, number>> = {};
  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1].regime;
    const curr = logs[i].regime;
    transitions[prev] ??= {};
    transitions[prev][curr] = (transitions[prev][curr] || 0) + 1;
  }

  // --- Detect vanished transitions
  const allPairs = new Set<string>();
  Object.entries(transitions).forEach(([a, row]) =>
    Object.keys(row).forEach(b => allPairs.add(`${a}->${b}`))
  );

  const vanished: string[] = [];
  allPairs.forEach(pair => {
    let seenLate = false;
    for (let i = Math.floor(logs.length * 0.75); i < logs.length; i++) {
      if (`${logs[i - 1]?.regime}->${logs[i]?.regime}` === pair) {
        seenLate = true;
        break;
      }
    }
    if (!seenLate) vanished.push(pair);
  });

  // --- Dwell times
  const dwell: Record<string, number[]> = {};
  if (logs.length > 0) {
    let current = logs[0].regime;
    let count = 1;
    for (let i = 1; i < logs.length; i++) {
      if (logs[i].regime === current) {
        count++;
      } else {
        dwell[current] ??= [];
        dwell[current].push(count);
        current = logs[i].regime;
        count = 1;
      }
    }
    // Add the last dwell
    dwell[current] ??= [];
    dwell[current].push(count);
  }


  // --- Capsule
  const capsule = {
    totalSteps: logs.length,
    regimesObserved: Object.keys(dwell),
    transitionMatrix: transitions,
    vanishedTransitions: vanished,
    meanDwell: Object.fromEntries(
      Object.entries(dwell).map(([r, xs]) => [
        r,
        xs.reduce((a, b) => a + b, 0) / xs.length
      ])
    ),
    timestamp: new Date().toISOString()
  };

  console.log("=== STAGE_6_CAPSULE ===");
  console.log(JSON.stringify(capsule, null, 2));
  console.log("=== END_CAPSULE ===");
}
