// angiogenesis.ts

import { SpatialTopology, Edge } from "./spatial-topology";
import { ForestState, AngiogenesisParams, DevelopmentLog } from "./types";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function edgeKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function euclidean(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function buildNodeMap(topology: SpatialTopology) {
  const m: Record<string, { x: number; y: number }> = {};
  for (const n of topology.nodes) m[n.id] = n.pos;
  return m;
}

function edgeExists(topology: SpatialTopology, a: string, b: string) {
  const list = topology.adjacency[a] ?? [];
  return list.some(e => e.to === b);
}

function addEdge(topology: SpatialTopology, a: string, b: string, weight: number) {
  if (!topology.adjacency[a]) topology.adjacency[a] = [];
  if (!topology.adjacency[b]) topology.adjacency[b] = [];

  topology.adjacency[a].push({ from: a, to: b, weight });
  topology.adjacency[b].push({ from: b, to: a, weight });
}

function removeEdge(topology: SpatialTopology, a: string, b: string) {
  topology.adjacency[a] = (topology.adjacency[a] ?? []).filter(e => e.to !== b);
  topology.adjacency[b] = (topology.adjacency[b] ?? []).filter(e => e.to !== a);
}

function getEdge(topology: SpatialTopology, a: string, b: string): Edge | undefined {
  return (topology.adjacency[a] ?? []).find(e => e.to === b);
}

export function performAngiogenesis(
  topology: SpatialTopology,
  state: ForestState,
  params: AngiogenesisParams,
  logs: DevelopmentLog
): SpatialTopology {
  const nodeMap = buildNodeMap(topology);

  const newTopology: SpatialTopology = {
    ...topology,
    adjacency: JSON.parse(JSON.stringify(topology.adjacency))
  };

  const edgeFlux = state.vascular.edgeFlux ?? {};

  // 1. EDGE REINFORCEMENT / DECAY
  for (const node of topology.nodes) {
    const neighbors = topology.adjacency[node.id] ?? [];

    for (const edge of neighbors) {
      if (node.id > edge.to) continue;

      const k = edgeKey(edge.from, edge.to);
      const flux = edgeFlux[k] ?? 0;

      const existing = getEdge(newTopology, edge.from, edge.to);
      if (!existing) continue;

      let newWeight = existing.weight;

      if (flux > params.growthThreshold) {
        newWeight += params.reinforcementRate * flux;
        logs.angiogenesis.edgesReinforced++;
      } else {
        newWeight -= params.decayRate;
      }

      newWeight = clamp(newWeight, params.minEdgeWeight, params.maxEdgeWeight);

      existing.weight = newWeight;

      const reverse = getEdge(newTopology, edge.to, edge.from);
      if (reverse) reverse.weight = newWeight;

      // FIX 1: Pruning structural decay rule
      if (
        flux < params.pruneThreshold &&
        newWeight <= params.minEdgeWeight * 2 &&
        Math.random() < params.pruneProbability
      ) {
        removeEdge(newTopology, edge.from, edge.to);
        logs.angiogenesis.edgesPruned++;
      }
    }
  }

  // 2. VASCULAR SPROUTING
  const strongNodes = state.cells
    .filter(c => (state.field.flux[c.id] ?? 0) > params.growthThreshold)
    .map(c => c.id);

  for (const nodeId of strongNodes) {
    const localFlux = state.field.flux[nodeId] ?? 0;
    const surplus = localFlux - params.growthThreshold;

    // FIX 2: Graded sprouting pressure
    if (surplus > 0 && Math.random() < params.sproutProbability * surplus) {
      const origin = nodeMap[nodeId];

      const candidates = topology.nodes.filter(n => {
        if (n.id === nodeId) return false;
        if (edgeExists(newTopology, nodeId, n.id)) return false;

        const d = euclidean(origin, n.pos);
        return d <= params.longRangeSproutDistance;
      });

      if (candidates.length === 0) continue;

      const target = randomChoice(candidates);
      addEdge(newTopology, nodeId, target.id, params.minEdgeWeight * 2);
      logs.angiogenesis.sproutsCreated++;
    }
  }

  return newTopology;
}
