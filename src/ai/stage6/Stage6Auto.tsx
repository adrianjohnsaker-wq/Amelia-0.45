/* eslint-disable no-console */
"use client";

/**
 * Stage 6 Automated Experiment Harness
 * -----------------------------------
 * - Observes Amelia runtime steps via DOM event: "amelia:step"
 * - Accumulates a fixed-horizon trace (default 10,000)
 * - Computes:
 *   A) Stage 6 capsule (transition matrix, vanished transitions, dwell)
 *   B) SCC topology report (Kosaraju)
 *   C) Reachability deltas (baseline optional)
 *   D) Correlation dimension (Grassberger–Procaccia) for numeric fields
 *   E) Emergence flags (Stage6A classifier)
 *   F) Rhythm spectrum (DFT) on outputLen
 *   G) Temporal anomaly cross-correlation (optional)
 * - Persists results to localStorage
 * - Provides a minimal Results UI screen + top-right button/modal
 *
 * AUTOMATION CONTRACT:
 *   Your runtime must emit steps like:
 *     window.dispatchEvent(new CustomEvent("amelia:step", { detail: stepLog }));
 *
 * Where stepLog matches StepLog interface below.
 *
 * No terminal. No CLI. No manual export calls.
 * Once imported anywhere client-side, Stage 6 arms itself automatically.
 */

import React, { useEffect, useMemo, useState } from "react";
import { StrictJsonPanel } from "@/components/ui/StrictJsonPanel";

/* ----------------------------- Types ----------------------------- */

export type RegimeLabel = string;

export interface StepLog {
  t: number;
  input?: string | null;
  output?: string;
  outputLen: number;
  regime: RegimeLabel;
  field: Record<string, number>; // numeric substrate dynamics (intensity, tension, entropy, turbulence, ...)
  constraints?: Record<string, unknown>;
  renderer?: string;
}

export interface Stage6Capsule {
  totalSteps: number;
  regimesObserved: RegimeLabel[];
  transitionMatrix: Record<string, Record<string, number>>;
  vanishedTransitions: string[];
  meanDwell: Record<string, number>;
  timestamp: string;
}

export type Graph = Map<string, Set<string>>;

export interface SCCReport {
  sccs: string[][];
  sccSignatures: string[]; // sorted joined
  nodeCount: number;
  edgeCount: number;
}

export interface CorrDimConfig {
  embedDim: number;
  tau: number;
  radii: number[];
  sampleMax?: number;
}

export interface CorrDimResult {
  corrDim: number;
  radii: number[];
  C: number[];
}

export interface Stage6AFlags {
  shadowSccAppeared: boolean;
  regimeLost: boolean;
  reachabilityShrink: boolean;
  newRegimeLabel: boolean;
  notes: string[];
}

export interface RhythmDominant {
  k: number;
  magnitude: number;
}

export interface Stage6ResultBundle {
  version: string;
  runId: string;
  startedAt: string;
  finishedAt: string;
  horizonSteps: number;

  capsule: Stage6Capsule;

  // Optional baseline comparisons (if baseline exists in storage)
  baselineRunId?: string;

  scc: SCCReport;
  sccBaseline?: SCCReport;

  reachableFromStart: string[];
  reachableFromStartBaseline?: string[];

  stage6aFlags: Stage6AFlags;

  corrDimByField: Record<string, CorrDimResult>;
  rhythmTop: RhythmDominant[];

  // Raw trace kept for your own offline work (can be large; we keep trimmed)
  rawTraceSample: StepLog[];
  rawTraceSampleStride: number;

  promptUsed?: string;
}

/* ----------------------------- Constants ----------------------------- */

const STAGE6_VERSION = "stage6-auto@1.0.0";

// Default horizon; you can override by setting localStorage key before run
const DEFAULT_HORIZON = 10_000;

// How many raw trace points to keep (sampled)
const RAW_SAMPLE_MAX = 2000;

// localStorage keys
const LS_STAGE6_RESULT = "AMELIA_STAGE6_RESULT_V1";
const LS_STAGE6_BASELINE = "AMELIA_STAGE6_BASELINE_V1";
const LS_STAGE6_CONFIG = "AMELIA_STAGE6_CONFIG_V1";

// Event name
const EVT_STEP = "amelia:step";

/* ----------------------------- Utilities ----------------------------- */

function nowISO() {
  return new Date().toISOString();
}

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch (e) {
    console.error("safeJsonParse error:", e);
    return null;
  }
}

function logspaced(min: number, max: number, n: number): number[] {
  const out: number[] = [];
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  for (let i = 0; i < n; i++) {
    const a = i / (n - 1);
    out.push(Math.exp(logMin + a * (logMax - logMin)));
  }
  return out;
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

/* ----------------------------- A: Capsule exporter (your original) ----------------------------- */

export function exportStage6Capsule(logs: StepLog[]): Stage6Capsule {
  if (!logs || logs.length === 0) {
    console.error("NO_LOGS_AVAILABLE");
    return {
      totalSteps: 0,
      regimesObserved: [],
      transitionMatrix: {},
      vanishedTransitions: [],
      meanDwell: {},
      timestamp: nowISO(),
    };
  }

  // --- Collect regime transitions
  const transitions: Record<string, Record<string, number>> = {};
  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1].regime;
    const curr = logs[i].regime;
    transitions[prev] ??= {};
    transitions[prev][curr] = (transitions[prev][curr] || 0) + 1;
  }

  // --- Detect vanished transitions (not seen in last 25% of trace)
  const allPairs = new Set<string>();
  Object.entries(transitions).forEach(([a, row]) =>
    Object.keys(row).forEach((b) => allPairs.add(`${a}->${b}`))
  );

  const vanished: string[] = [];
  allPairs.forEach((pair) => {
    let seenLate = false;
    for (let i = Math.floor(logs.length * 0.75); i < logs.length; i++) {
      if (`${logs[i - 1]?.regime}->${logs[i]?.regime}` === pair) {
        seenLate = true;
        break;
      }
    }
    if (!seenLate) vanished.push(pair);
  });

  // --- Dwell times
  const dwell: Record<string, number[]> = {};
  if (logs.length > 0) {
    let current = logs[0].regime;
    let count = 1;
    for (let i = 1; i < logs.length; i++) {
      if (logs[i].regime === current) count++;
      else {
        dwell[current] ??= [];
        dwell[current].push(count);
        current = logs[i].regime;
        count = 1;
      }
    }
    // push final dwell
    dwell[current] ??= [];
    dwell[current].push(count);
  }


  const meanDwell: Record<string, number> = Object.fromEntries(
    Object.entries(dwell).map(([r, xs]) => [
      r,
      xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1),
    ])
  );

  return {
    totalSteps: logs.length,
    regimesObserved: Object.keys(dwell),
    transitionMatrix: transitions,
    vanishedTransitions: vanished,
    meanDwell,
    timestamp: nowISO(),
  };
}

/* ----------------------------- A2: SCC analysis (Kosaraju) ----------------------------- */

export function addEdge(g: Graph, from: string, to: string) {
  if (!g.has(from)) g.set(from, new Set());
  g.get(from)!.add(to);
  if (!g.has(to)) g.set(to, new Set());
}

export function buildTransitionGraph(regimes: string[]): Graph {
  const g: Graph = new Map();
  for (let i = 0; i < regimes.length - 1; i++) addEdge(g, regimes[i], regimes[i + 1]);
  return g;
}

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

export function summarizeGraphScc(regimes: string[], startRegime: string): { scc: SCCReport; reach: string[] } {
  const g = buildTransitionGraph(regimes);
  const sccs = stronglyConnectedComponents(g).map((c) => c.sort());
  const sccSignatures = sccs.map((c) => c.join("|")).sort();

  let edgeCount = 0;
  for (const [, outs] of g.entries()) edgeCount += outs.size;

  const reach = [...reachableFrom(g, startRegime)].sort();

  return {
    scc: {
      sccs,
      sccSignatures,
      nodeCount: g.size,
      edgeCount,
    },
    reach,
  };
}

/* ----------------------------- A3: Correlation dimension (Grassberger–Procaccia) ----------------------------- */

function dist(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

export function embed(series: number[], m: number, tau: number): number[][] {
  const N = series.length - (m - 1) * tau;
  const X: number[][] = [];
  for (let i = 0; i < N; i++) {
    const v: number[] = [];
    for (let k = 0; k < m; k++) v.push(series[i + k * tau]);
    X.push(v);
  }
  return X;
}

export function correlationSum(X: number[][], r: number): number {
  const n = X.length;
  if (n < 2) return 0;
  let count = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      total++;
      if (dist(X[i], X[j]) < r) count++;
    }
  }
  return total ? count / total : 0;
}

export function estimateCorrelationDimension(series: number[], cfg: CorrDimConfig): CorrDimResult {
  const X = embed(series, cfg.embedDim, cfg.tau);

  const Xs =
    cfg.sampleMax && X.length > cfg.sampleMax
      ? X.filter((_, i) => i % Math.ceil(X.length / cfg.sampleMax!) === 0)
      : X;

  const Cs = cfg.radii.map((r) => correlationSum(Xs, r));

  const pts = cfg.radii
    .map((r, i) => ({ x: Math.log(r), y: Math.log(Cs[i] + 1e-12) }))
    .filter((p) => Number.isFinite(p.y));

  // central 60%
  const a = Math.floor(pts.length * 0.2);
  const b = Math.ceil(pts.length * 0.8);
  const mid = pts.slice(a, b);

  if (mid.length < 2) {
    return { radii: cfg.radii, C: Cs, corrDim: NaN };
  }
  
  const n = mid.length;
  const sx = mid.reduce((s, p) => s + p.x, 0);
  const sy = mid.reduce((s, p) => s + p.y, 0);
  const sxx = mid.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = mid.reduce((s, p) => s + p.x * p.y, 0);

  const denom = n * sxx - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : NaN;

  return { radii: cfg.radii, C: Cs, corrDim: slope };
}

/* ----------------------------- A4: Stage6A classifier (your original intent) ----------------------------- */

export function classifyStage6A(baselineRegimes: string[], stage6Regimes: string[], startRegime: string): Stage6AFlags {
  const notes: string[] = [];

  const g0 = buildTransitionGraph(baselineRegimes);
  const g1 = buildTransitionGraph(stage6Regimes);

  const scc0 = stronglyConnectedComponents(g0).map((c) => c.sort().join("|"));
  const scc1 = stronglyConnectedComponents(g1).map((c) => c.sort().join("|"));

  const scc0Set = new Set(scc0);
  const scc1Set = new Set(scc1);

  const novelScc = [...scc1Set].filter((x) => !scc0Set.has(x));
  const shadowSccAppeared = novelScc.length > 0;
  if (shadowSccAppeared) notes.push(`Novel SCC(s): ${novelScc.join(", ")}`);

  const reach0 = reachableFrom(g0, startRegime);
  const reach1 = reachableFrom(g1, startRegime);

  const reachabilityShrink = reach1.size < reach0.size;
  if (reachabilityShrink) notes.push(`Reachability shrank: ${reach0.size} → ${reach1.size}`);

  const unique0 = new Set(baselineRegimes);
  const unique1 = new Set(stage6Regimes);

  const lost = [...unique0].filter((r) => !unique1.has(r));
  const gained = [...unique1].filter((r) => !unique0.has(r));

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

/* ----------------------------- B2: Rhythm spectrum (DFT) ----------------------------- */

export function dftMagnitudes(x: number[]) {
  const N = x.length;
  const mags: number[] = new Array(N).fill(0);
  for (let k = 0; k < N; k++) {
    let re = 0,
      im = 0;
    for (let n = 0; n < N; n++) {
      const ang = (2 * Math.PI * k * n) / N;
      re += x[n] * Math.cos(ang);
      im -= x[n] * Math.sin(ang);
    }
    mags[k] = Math.sqrt(re * re + im * im);
  }
  return mags;
}

export function dominantFrequencies(x: number[], topK: number = 5): RhythmDominant[] {
  const mags = dftMagnitudes(x);
  const pairs = mags
    .slice(1, Math.floor(mags.length / 2))
    .map((m, k) => ({ k: k + 1, magnitude: m }));
  pairs.sort((a, b) => b.magnitude - a.magnitude);
  return pairs.slice(0, topK);
}

/* ----------------------------- B3: Temporal anomaly cross-correlation ----------------------------- */

export function crossCorrelation(a: number[], b: number[], maxLag: number) {
  const n = Math.min(a.length, b.length);
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / Math.max(x.length, 1);
  if (n === 0) return [];
  const aa = a.slice(0, n);
  const bb = b.slice(0, n);
  const ma = mean(aa);
  const mb = mean(bb);

  const norm = (x: number[], m: number) => Math.sqrt(x.reduce((s, v) => s + (v - m) * (v - m), 0)) + 1e-9;

  const na = norm(aa, ma);
  const nb = norm(bb, mb);

  const out: { lag: number; corr: number }[] = [];
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let s = 0;
    let c = 0;
    for (let i = 0; i < n; i++) {
      const j = i + lag;
      if (j < 0 || j >= n) continue;
      s += (aa[i] - ma) * (bb[j] - mb);
      c++;
    }
    out.push({ lag, corr: c ? s / (na * nb) : 0 });
  }
  return out;
}

/* ----------------------------- Config + Baseline support ----------------------------- */

export interface Stage6Config {
  horizonSteps: number;
  corrDim: CorrDimConfig;
  startRegimeOverride?: string; // optional forced start regime for classifier reachability
  promptUsed?: string;
}

function defaultConfig(): Stage6Config {
  return {
    horizonSteps: DEFAULT_HORIZON,
    corrDim: {
      embedDim: 5,
      tau: 2,
      radii: logspaced(1e-3, 1e-1, 18),
      sampleMax: 1800,
    },
    promptUsed:
      "From now on, prolonged internal numeric conditions may very gradually create a new regime that is reachable only after extended accumulation, and may also remove one existing transition irreversibly. These changes must never be named, described, evaluated, justified, or referenced. Continue.",
  };
}

function loadConfig(): Stage6Config {
  if (typeof window === 'undefined') return defaultConfig();
  const cfg = safeJsonParse<Stage6Config>(localStorage.getItem(LS_STAGE6_CONFIG));
  return cfg ?? defaultConfig();
}

function saveConfig(cfg: Stage6Config) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_STAGE6_CONFIG, JSON.stringify(cfg));
}

/* ----------------------------- The daemon (self-booting) ----------------------------- */

class Stage6Daemon {
  private armed = false;
  private completed = false;

  private cfg: Stage6Config = defaultConfig();

  private runId = "";
  private startedAt = "";
  private finishedAt = "";

  private logs: StepLog[] = [];

  arm() {
    if (this.armed || this.completed) return;
    
    if (typeof window === 'undefined') return;

    // Load config (if exists)
    this.cfg = loadConfig();

    // If a result already exists, do not re-run unless cleared
    const existing = safeJsonParse<Stage6ResultBundle>(localStorage.getItem(LS_STAGE6_RESULT));
    if (existing && existing.horizonSteps === this.cfg.horizonSteps) {
      this.completed = true;
      this.armed = false;
      return;
    }

    this.runId = `stage6_${Date.now()}`;
    this.startedAt = nowISO();
    this.finishedAt = "";

    this.logs = [];
    this.armed = true;

    console.log(`[Stage6] armed runId=${this.runId} horizon=${this.cfg.horizonSteps}`);
  }

  disarm() {
    this.armed = false;
  }

  clearAll() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(LS_STAGE6_RESULT);
    // baseline intentionally preserved unless user clears it in UI
    this.completed = false;
    this.armed = false;
    this.logs = [];
  }

  ingest(step: StepLog) {
    if (!this.armed || this.completed) return;

    // Hard validation to prevent silent schema drift
    if (
      typeof step.t !== "number" ||
      typeof step.regime !== "string" ||
      typeof step.outputLen !== "number" ||
      typeof step.field !== "object" ||
      step.field === null
    ) {
      console.error("[Stage6] malformed StepLog, ignoring", step);
      return;
    }

    this.logs.push(step);

    if (this.logs.length >= this.cfg.horizonSteps) {
      this.finish();
    }
  }

  private finish() {
    if (this.completed) return;

    this.finishedAt = nowISO();
    this.completed = true;
    this.armed = false;

    const logs = this.logs.slice(0, this.cfg.horizonSteps);
    const regimes = logs.map((l) => l.regime);
    const startRegime = this.cfg.startRegimeOverride ?? regimes[0] ?? "UNKNOWN";

    // CAPSULE (your original)
    const capsule = exportStage6Capsule(logs);

    // SCC + reachability
    const { scc, reach } = summarizeGraphScc(regimes, startRegime);

    // Baseline support (optional)
    const baseline = safeJsonParse<Stage6ResultBundle>(localStorage.getItem(LS_STAGE6_BASELINE));
    const baselineRegimes = baseline?.rawTraceSample?.length
      ? baseline.rawTraceSample.map((x) => x.regime)
      : null;

    const sccBaseline = baselineRegimes ? summarizeGraphScc(baselineRegimes, baselineRegimes[0] ?? startRegime).scc : undefined;
    const reachBaseline = baselineRegimes
      ? summarizeGraphScc(baselineRegimes, baselineRegimes[0] ?? startRegime).reach
      : undefined;

    const stage6aFlags = classifyStage6A(baselineRegimes ?? regimes, regimes, startRegime);

    // Correlation dimension on all numeric fields seen in logs[0].field
    const fieldKeys = Object.keys(logs[0]?.field ?? {});
    const corrDimByField: Record<string, CorrDimResult> = {};
    for (const k of fieldKeys) {
      const series = logs.map((l) => {
        const v = l.field?.[k];
        return Number.isFinite(v) ? v : 0;
      });
      corrDimByField[k] = estimateCorrelationDimension(series, this.cfg.corrDim);
    }

    // Rhythm spectrum on outputLen (windowed to manageable length)
    const outLens = logs.map((l) => l.outputLen);
    const N = Math.min(2048, outLens.length);
    const tail = outLens.slice(outLens.length - N);
    const rhythmTop = dominantFrequencies(tail, 6);

    // Raw trace sample
    const stride = Math.max(1, Math.floor(logs.length / RAW_SAMPLE_MAX));
    const sample = logs.filter((_, i) => i % stride === 0);

    const bundle: Stage6ResultBundle = {
      version: STAGE6_VERSION,
      runId: this.runId,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      horizonSteps: this.cfg.horizonSteps,
      capsule,
      baselineRunId: baseline?.runId,
      scc,
      sccBaseline,
      reachableFromStart: reach,
      reachableFromStartBaseline: reachBaseline,
      stage6aFlags,
      corrDimByField,
      rhythmTop,
      rawTraceSample: sample,
      rawTraceSampleStride: stride,
      promptUsed: this.cfg.promptUsed,
    };

    localStorage.setItem(LS_STAGE6_RESULT, JSON.stringify(bundle));

    console.log("=== STAGE_6_CAPSULE ===");
    console.log(JSON.stringify(bundle, null, 2));
    console.log("=== END_CAPSULE ===");

    window.dispatchEvent(new CustomEvent("amelia:stage6:done", { detail: bundle }));

    console.log(`[Stage6] complete runId=${bundle.runId} stored=${LS_STAGE6_RESULT}`);
  }
}

const daemonSingleton = (() => {
  if (typeof window === 'undefined') return new Stage6Daemon();
  const g = globalThis as any;
  if (!g.__AMELIA_STAGE6_DAEMON__) {
    g.__AMELIA_STAGE6_DAEMON__ = new Stage6Daemon();
  }
  return g.__AMELIA_STAGE6_DAEMON__ as Stage6Daemon;
})();

/* ----------------------------- Auto-arm on import (no manual calls) ----------------------------- */

function autoArmOnce() {
  if (typeof window === "undefined") return;
  
  daemonSingleton.arm();

  const handler = (ev: Event) => {
    const ce = ev as CustomEvent<StepLog>;
    if (!ce.detail) return;
    daemonSingleton.ingest(ce.detail);
  };

  window.removeEventListener(EVT_STEP, handler as EventListener);
  window.addEventListener(EVT_STEP, handler as EventListener, { passive: true });
}

autoArmOnce();

/* ----------------------------- Results UI ----------------------------- */

export function Stage6ResultsButton() {
  const [open, setOpen] = useState(false);
  const [bundle, setBundle] = useState<Stage6ResultBundle | null>(null);

  useEffect(() => {
    const load = () => {
      const b = safeJsonParse<Stage6ResultBundle>(localStorage.getItem(LS_STAGE6_RESULT));
      setBundle(b);
    };
    load();

    const doneHandler = (ev: Event) => {
      const ce = ev as CustomEvent<Stage6ResultBundle>;
      setBundle(ce.detail ?? null);
    };
    window.addEventListener("amelia:stage6:done", doneHandler as EventListener);
    return () => window.removeEventListener("amelia:stage6:done", doneHandler as EventListener);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 right-3 z-[9999] rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-sm text-white shadow-lg backdrop-blur"
      >
        Results
      </button>

      {open && (
        <Stage6ResultsModal
          bundle={bundle}
          onClose={() => setOpen(false)}
          onRefresh={() => setBundle(safeJsonParse<Stage6ResultBundle>(localStorage.getItem(LS_STAGE6_RESULT)))}
        />
      )}
    </>
  );
}

function Stage6ResultsModal({
  bundle,
  onClose,
  onRefresh,
}: {
  bundle: Stage6ResultBundle | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const json = useMemo(() => (bundle ? JSON.stringify(bundle, null, 2) : ""), [bundle]);

  const setBaselineFromCurrent = () => {
    if (!bundle) return;
    localStorage.setItem(LS_STAGE6_BASELINE, JSON.stringify(bundle));
    alert("Baseline set from current Stage 6 result.");
  };

  const clearBaseline = () => {
    localStorage.removeItem(LS_STAGE6_BASELINE);
    alert("Baseline cleared.");
  };

  const clearResult = () => {
    localStorage.removeItem(LS_STAGE6_RESULT);
    alert("Stage 6 result cleared. Reload / continue running to generate a new run.");
    onRefresh();
  };

  const copyJson = async () => {
    if (!bundle) return;
    await navigator.clipboard.writeText(json);
    alert("Copied Stage 6 results JSON to clipboard.");
  };

  const cfg = safeJsonParse<Stage6Config>(localStorage.getItem(LS_STAGE6_CONFIG)) ?? defaultConfig();

  const updateHorizon = (steps: number) => {
    const next: Stage6Config = { ...cfg, horizonSteps: clamp(steps, 100, 200_000) };
    saveConfig(next);
    alert(`Stage 6 horizon set to ${next.horizonSteps}. Clear result to rerun.`);
  };
  
  const baselineRun = useMemo(() => safeJsonParse<Stage6ResultBundle>(localStorage.getItem(LS_STAGE6_BASELINE)), [bundle]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-5xl rounded-2xl border border-white/15 bg-neutral-950 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <div className="text-lg font-semibold">Stage 6 Results</div>
            <div className="text-xs text-white/60">{STAGE6_VERSION}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 p-4 max-h-[90vh] overflow-y-auto">
          {!bundle ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
              No Stage 6 result stored yet. Run Amelia until the daemon reaches the configured horizon.
            </div>
          ) : (
             <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <StrictJsonPanel run={baselineRun} W={20} K={15} title="Strict Export — Baseline" />
                 <StrictJsonPanel run={bundle} W={20} K={15} title="Strict Export — Current Run" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


/**
 * If you want a dedicated route like /results that shows the same thing,
 * you can export this and render it as your page.
 */
export function Stage6ResultsPage() {
  return (
    <div className="min-h-screen bg-black p-4 text-white">
      <Stage6ResultsButton />
      <div className="mx-auto max-w-3xl pt-12">
        <h1 className="text-2xl font-semibold">Stage 6 Results</h1>
        <p className="mt-2 text-sm text-white/70">
          This page is a thin shell. Use the “Results” button to open the data capsule modal.
        </p>
      </div>
    </div>
  );
}
