// src/ai/ui/expressionAdapter.ts
import { autonomousCycleOnce } from '../flows/autonomous-cycle';

export async function maybeRenderMinimalLine(): Promise<string | null> {
  const s = await autonomousCycleOnce();
  return s ?? null;
}
