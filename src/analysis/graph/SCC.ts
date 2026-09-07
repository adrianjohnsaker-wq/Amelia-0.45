
export type Graph = Map<string, Set<string>>;

export function addEdge(g: Graph, from: string, to: string) {
  if (!g.has(from)) g.set(from, new Set());
  g.get(from)!.add(to);
  if (!g.has(to)) g.set(to, new Set()); // ensure node exists
}

export function buildTransitionGraph(regimes: string[]): Graph {
  const g: Graph = new Map();
  for (let i = 0; i < regimes.length - 1; i++) addEdge(g, regimes[i], regimes[i + 1]);
  return g;
}

// Kosaraju SCC
export function stronglyConnectedComponents(g: Graph): string[][] {
  const nodes = [...g.keys()];
  const visited = new Set<string>();
  const order: string[] = [];

  function dfs(v: string) {
    visited.add(v);
    for (const w of g.get(v) ?? []) if (!visited.has(w)) dfs(w);
    order.push(v);
  }

  for (const v of nodes) if (!visited.has(v)) dfs(v);

  // transpose
  const gt: Graph = new Map();
  for (const v of nodes) gt.set(v, new Set());
  for (const [v, outs] of g.entries()) {
    for (const w of outs) {
      if (!gt.has(w)) gt.set(w, new Set());
      gt.get(w)!.add(v);
    }
  }

  const comps: string[][] = [];
  visited.clear();

  function dfsT(v: string, comp: string[]) {
    visited.add(v);
    comp.push(v);
    for (const w of gt.get(v) ?? []) if (!visited.has(w)) dfsT(w, comp);
  }

  for (let i = order.length - 1; i >= 0; i--) {
    const v = order[i];
    if (!visited.has(v)) {
      const comp: string[] = [];
      dfsT(v, comp);
      comps.push(comp);
    }
  }

  return comps;
}

export function reachableFrom(g: Graph, start: string): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const v = stack.pop()!;
    if (seen.has(v)) continue;
    seen.add(v);
    for (const w of g.get(v) ?? []) if (!seen.has(w)) stack.push(w);
  }
  return seen;
}
