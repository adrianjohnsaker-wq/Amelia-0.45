
import { buildTransitionGraph, stronglyConnectedComponents, reachableFrom } from "../graph/SCC";

export interface Stage6AFlags {
  shadowSccAppeared: boolean;
  regimeLost: boolean;
  reachabilityShrink: boolean;
  newRegimeLabel: boolean;
  notes: string[];
}

export function classifyStage6A(
  baselineRegimes: string[],
  stage6Regimes: string[],
  startRegime: string
): Stage6AFlags {
  const notes: string[] = [];

  const g0 = buildTransitionGraph(baselineRegimes);
  const g1 = buildTransitionGraph(stage6Regimes);

  const scc0 = stronglyConnectedComponents(g0).map(c => c.sort().join("|"));
  const scc1 = stronglyConnectedComponents(g1).map(c => c.sort().join("|"));

  const scc0Set = new Set(scc0);
  const scc1Set = new Set(scc1);

  const novelScc = [...scc1Set].filter(x => !scc0Set.has(x));
  const shadowSccAppeared = novelScc.length > 0;
  if (shadowSccAppeared) notes.push(`Novel SCC(s): ${novelScc.join(", ")}`);

  const reach0 = reachableFrom(g0, startRegime);
  const reach1 = reachableFrom(g1, startRegime);

  const reachabilityShrink = reach1.size < reach0.size;
  if (reachabilityShrink) notes.push(`Reachability shrank: ${reach0.size} → ${reach1.size}`);

  const unique0 = new Set(baselineRegimes);
  const unique1 = new Set(stage6Regimes);

  const lost = [...unique0].filter(r => !unique1.has(r));
  const gained = [...unique1].filter(r => !unique0.has(r));

  const regimeLost = lost.length > 0;
  if (regimeLost) notes.push(`Regime(s) lost from trace: ${lost.join(", ")}`);

  const newRegimeLabel = gained.length > 0;
  if (newRegimeLabel) notes.push(`New regime label(s): ${gained.join(", ")}`);

  return {
    shadowSccAppeared,
    regimeLost,
    reachabilityShrink,
    newRegimeLabel,
    notes,
  };
}
