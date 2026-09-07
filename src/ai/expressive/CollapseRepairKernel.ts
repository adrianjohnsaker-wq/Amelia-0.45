// src/ai/expressive/CollapseRepairKernel.ts

export interface RepairMeta {
  repairs: number;
  failureType?: string;
  betaNudge: number;
  entropyInjection: number;
  structuralInstability: number;
}

export interface RepairResult<T> {
  ok: boolean;
  value?: T;
  meta: RepairMeta;
}

function classifyFailure(err: any): string {
  const msg = typeof err === "string" ? err : err?.message ?? "";

  if (msg.includes("<html")) return "TRANSPORT";
  if (msg.toLowerCase().includes("timeout")) return "UNDECIDABLE";
  if (msg.toLowerCase().includes("json")) return "TYPE";
  if (!msg) return "EMPTY";

  return "GENERIC";
}

/**
 * Executes a function with a retry-and-repair loop.
 * Detects structural collapse and applies minimal internal rewrite logic.
 */
export async function collapseRepair<T>(
  runner: () => Promise<T>,
  maxRepairs: number = 2
): Promise<RepairResult<T>> {

  let repairs = 0;

  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    try {
      const value = await runner();

      if (value === null || value === undefined) {
        throw new Error("EMPTY_OUTPUT");
      }

      return {
        ok: true,
        value,
        meta: {
          repairs,
          betaNudge: repairs > 0 ? 0.18 : 0.05,
          entropyInjection: repairs * 0.12,
          structuralInstability: repairs * 0.2
        }
      };

    } catch (err) {
      console.error(`CollapseRepairKernel attempt ${attempt} failed:`, err);
      const type = classifyFailure(err);

      if (attempt === maxRepairs) {
        return {
          ok: false,
          meta: {
            repairs,
            failureType: type,
            betaNudge: 0.15,
            entropyInjection: 0.25,
            structuralInstability: 0.4
          }
        };
      }

      repairs += 1;

      // --- Minimal Internal Rewrite Logic ---
      if (type === "TRANSPORT") {
        (globalThis as any).__FORCE_PLAIN_JSON__ = true;
      }

      if (type === "TYPE") {
        (globalThis as any).__STRICT_JSON_MODE__ = true;
      }

      if (type === "UNDECIDABLE") {
        (globalThis as any).__REDUCE_MAX_TOKENS__ = true;
      }
    }
  }

  return {
    ok: false,
    meta: {
      repairs,
      failureType: "UNKNOWN",
      betaNudge: 0.1,
      entropyInjection: 0.1,
      structuralInstability: 0.2
    }
  };
}
