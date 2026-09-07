// spatial-topology.ts

export type Vec2 = {
  x: number;
  y: number;
};

export type SpatialNode = {
  id: string;
  pos: Vec2;
};

export type Edge = {
  from: string;
  to: string;
  weight: number; // conductance / permeability
};

export type TopologyKind = "grid" | "small-world" | "custom";

export type SpatialTopology = {
  kind: TopologyKind;
  width: number;
  height: number;
  nodes: SpatialNode[];
  adjacency: Record<string, Edge[]>;
};

export type TopologyConfig = {
  width: number;
  height: number;
  diagonal?: boolean;
  wrap?: boolean;
  defaultWeight?: number;
};

function nodeId(x: number, y: number): string {
  return `cell_${x}_${y}`;
}

function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function wrapCoord(v: number, max: number): number {
  return ((v % max) + max) % max;
}

function addDirectedEdge(
  adjacency: Record<string, Edge[]>,
  from: string,
  to: string,
  weight: number
) {
  if (!adjacency[from]) adjacency[from] = [];
  adjacency[from].push({ from, to, weight });
}

function addUndirectedEdge(
  adjacency: Record<string, Edge[]>,
  a: string,
  b: string,
  weight: number
) {
  addDirectedEdge(adjacency, a, b, weight);
  addDirectedEdge(adjacency, b, a, weight);
}

export function createGridTopology(config: TopologyConfig): SpatialTopology {
  const {
    width,
    height,
    diagonal = false,
    wrap = false,
    defaultWeight = 1.0,
  } = config;

  const nodes: SpatialNode[] = [];
  const adjacency: Record<string, Edge[]> = {};

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      nodes.push({
        id: nodeId(x, y),
        pos: { x, y },
      });
    }
  }

  const cardinalDirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  const diagonalDirs = [
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: -1 },
  ];

  const dirs = diagonal ? [...cardinalDirs, ...diagonalDirs] : cardinalDirs;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = nodeId(x, y);

      for (const { dx, dy } of dirs) {
        let nx = x + dx;
        let ny = y + dy;

        if (wrap) {
          nx = wrapCoord(nx, width);
          ny = wrapCoord(ny, height);
        }

        if (!wrap && !inBounds(nx, ny, width, height)) continue;

        const b = nodeId(nx, ny);

        // Prevent duplicate undirected additions by lexicographic ordering
        if (a < b) {
          const isDiagonal = Math.abs(dx) + Math.abs(dy) === 2;
          const weight = isDiagonal ? defaultWeight * 0.7071 : defaultWeight;
          addUndirectedEdge(adjacency, a, b, weight);
        }
      }
    }
  }

  return {
    kind: "grid",
    width,
    height,
    nodes,
    adjacency,
  };
}

export function getNeighbors(topology: SpatialTopology, nodeId: string): Edge[] {
  return topology.adjacency[nodeId] ?? [];
}

export function topologyEdgeCount(topology: SpatialTopology): number {
  let total = 0;
  for (const edges of Object.values(topology.adjacency)) total += edges.length;
  return total / 2;
}

export function topologyMeanDegree(topology: SpatialTopology): number {
  const degrees = topology.nodes.map(n => (topology.adjacency[n.id] ?? []).length);
  if (degrees.length === 0) return 0;
  return degrees.reduce((a, b) => a + b, 0) / degrees.length;
}
