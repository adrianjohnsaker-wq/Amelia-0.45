
// -------------------------------------------------------------
// math.ts — Basic vector math utilities
// -------------------------------------------------------------

export type Vector = number[];
export type Matrix = number[][];

/**
 * Computes the dot product of two vectors.
 */
export function dot(a: Vector, b: Vector): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length for dot product.");
  }
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/**
 * Computes the magnitude (Euclidean norm) of a vector.
 */
export function magnitude(a: Vector): number {
  return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Computes the cosine similarity between two vectors.
 * Returns a value between -1 and 1.
 */
export function cosineSim(a: Vector, b: Vector): number {
  const dotProduct = dot(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) {
    return 0; // Or handle as an error, depending on desired behavior
  }
  return dotProduct / (magA * magB);
}

/**
 * Applies the softmax function to a vector.
 */
export function softmax(vec: Vector): Vector {
  const max = Math.max(...vec);
  const exps = vec.map(x => Math.exp(x - max));
  const sumExps = exps.reduce((sum, val) => sum + val, 0);
  return exps.map(e => e / (sumExps + 1e-9)); // Add epsilon for numerical stability
}

// Defining Tensor as an alias for Matrix for conceptual alignment with the user's code.
export type Tensor = Matrix;
