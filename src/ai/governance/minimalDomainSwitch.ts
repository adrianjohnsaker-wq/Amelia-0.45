// src/ai/governance/minimalDomainSwitch.ts

export function isMathLikeTask(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return (
    /\bprove\b|\bproof\b|\bshow that\b|\bderive\b|\blemma\b|\btheorem\b|\bexplain why\b/.test(t) ||
    /\bodd\b|\beven\b|\binteger\b|\bdivisible\b|\bequation\b|\binequality\b|\bderivative\b|\blimit\b|\bintegral\b|\bsin\b|\bcos\b|\btan\b/.test(t)
  );
}
