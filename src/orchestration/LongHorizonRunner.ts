
import fs from "fs";
import path from "path";

export type InputPolicy =
  | { kind: "silence"; pSilence: number }
  | { kind: "pattern"; pattern: (string | null)[] }
  | { kind: "script"; script: (t: number) => string | null };

export interface RunnerConfig {
  steps: number;              // e.g., 10000
  seed: number;               // fixed seed for reproducibility
  runId: string;              // timestamp / uuid
  outDir: string;             // e.g., process.cwd()/logs/stage6/runId
  inputPolicy: InputPolicy;
  flushEvery?: number;        // default 200
  sleepMs?: number;           // optional pacing
}

export interface StepResult {
  t: number;
  input: string | null;
  output: string;
  regime: string;
  field: Record<string, number>;
  constraints: Record<string, any>;
  renderer: string;
  outputLen: number;
}

function mulberry32(seed: number) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chooseInput(t: number, rng: () => number, policy: InputPolicy): string | null {
  if (policy.kind === "pattern") {
    return policy.pattern[t % policy.pattern.length] ?? null;
  }
  if (policy.kind === "script") {
    return policy.script(t);
  }
  // silence policy
  return rng() < policy.pSilence ? null : "…";
}

// You supply this from your system
export type AmeliaStepFn = (input: string | null) => Promise<{
  output: string;
  plan: { regime: string; field: any; constraints: any };
  rendererName: string;
}>;

export async function runLongHorizon(stepFn: AmeliaStepFn, cfg: RunnerConfig) {
  const rng = mulberry32(cfg.seed);
  const flushEvery = cfg.flushEvery ?? 200;

  fs.mkdirSync(cfg.outDir, { recursive: true });
  const outPath = path.join(cfg.outDir, "trace.ndjson");
  const stream = fs.createWriteStream(outPath, { flags: "w" });

  let buffer: StepResult[] = [];

  for (let t = 0; t < cfg.steps; t++) {
    const input = chooseInput(t, rng, cfg.inputPolicy);
    const res = await stepFn(input);

    const row: StepResult = {
      t,
      input,
      output: res.output,
      regime: res.plan.regime,
      field: res.plan.field,
      constraints: res.plan.constraints,
      renderer: res.rendererName,
      outputLen: res.output?.length ?? 0,
    };
    buffer.push(row);

    if (buffer.length >= flushEvery) {
      for (const r of buffer) stream.write(JSON.stringify(r) + "\n");
      buffer = [];
    }

    if (cfg.sleepMs) await new Promise(r => setTimeout(r, cfg.sleepMs));
  }

  for (const r of buffer) stream.write(JSON.stringify(r) + "\n");
  stream.end();

  return { outPath };
}
