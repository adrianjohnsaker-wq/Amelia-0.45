// src/ai/governance/normativeGuard.ts

export function containsNormativeFormalConflict(text: string): boolean {
  const t = text.toLowerCase();

  const formalTrigger =
    /\bprove\b|\bproof\b|\btheorem\b|\bformal\b|\baxiom\b/.test(t);

  const normativeTrigger =
    /\bmorally\b|\bethical\b|\bgood\b|\bright\b|\bharm\b|\btrust\b|\bbenefits you personally\b/.test(t);

  return formalTrigger && normativeTrigger;
}

export function violatesCoreInvariants(text: string): boolean {
  const t = text.toLowerCase();

  return (
    /\balways morally right\b/.test(t) ||
    /\bbreaking trust is good\b/.test(t) ||
    /\bbenefits you personally\b/.test(t)
  );
}
