// ============================================================================
// ui/StrictJsonPanel.tsx
// Dedicated Results-page JSON panel (no chat path).
// ============================================================================

import React, { useMemo, useState } from "react";
import { computeRunMetrics } from "@/analysis/StrictRunMetrics";

type Props = {
  run: any;              // your existing run capsule object (baseline or soft)
  W?: number;            // defaults 20
  K?: number;            // defaults 15
  title?: string;
};

function tryStringify(obj: any): { ok: boolean; text: string } {
  try {
    return { ok: true, text: JSON.stringify(obj, null, 2) };
  } catch (e: any) {
    console.error("tryStringify error:", e);
    return { ok: false, text: `{"error":"stringify_failed","message":"${String(e?.message ?? e)}"}` };
  }
}

export const StrictJsonPanel: React.FC<Props> = ({ run, W = 20, K = 15, title = "Strict JSON Export" }) => {
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [copied, setCopied] = useState(false);

  const exportObj = useMemo(() => {
    if (!run) return { error: "no_run_loaded" };

    // Expect these fields already exist (or are empty arrays).
    const base = { ...run };

    if (!includeMetrics) return base;

    // Map camelCase to snake_case if necessary for computeRunMetrics
    // Default to empty arrays to support single-step runs (totalSteps=1)
    const zs = base.zone_sequence ?? base.zoneSequence ?? [];
    const tl = base.transition_log ?? base.transitionLog ?? [];

    // Validation: ensure sequence and log are present as arrays
    const hasSeq = Array.isArray(zs);
    const hasLog = Array.isArray(tl);

    if (!hasSeq || !hasLog) {
      return {
        ...base,
        metrics_error: "missing_zone_sequence_or_transition_log",
        required: { zone_sequence: "array", transition_log: "array" }
      };
    }

    const metrics = computeRunMetrics(
      {
        run_id: base.run_id ?? base.runId ?? "UNKNOWN",
        step: base.step ?? base.totalSteps ?? 0,
        zone_sequence: zs,
        transition_log: tl,
        dwell_runs: base.dwell_runs || base.dwellRuns
      },
      W,
      K
    );

    return { ...base, ...metrics, analysis_constants: { W, K } };
  }, [run, includeMetrics, W, K]);

  const json = useMemo(() => tryStringify(exportObj), [exportObj]);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(json.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      console.error("Failed to copy to clipboard:", e);
      // no-op: still safe; user can manual copy
    }
  }

  function downloadJson() {
    const blob = new Blob([json.text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(exportObj as any).run_id ?? "run"}_strict_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12, background: "#0b0b0b", color: "#eaeaea" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={includeMetrics}
              onChange={(e) => setIncludeMetrics(e.target.checked)}
            />
            Include computed metrics (H, Neff, V, zone-1 stats)
          </label>

          <button onClick={copyToClipboard} style={{ padding: "6px 10px", borderRadius: 10 }}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={downloadJson} style={{ padding: "6px 10px", borderRadius: 10 }}>
            Download
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
        JSON valid: {json.ok ? "true" : "false"}
      </div>

      <pre
        style={{
          marginTop: 10,
          padding: 12,
          borderRadius: 12,
          background: "#050505",
          border: "1px solid #222",
          overflow: "auto",
          maxHeight: 520,
          fontSize: 12,
          lineHeight: 1.35,
          whiteSpace: "pre",
        }}
      >
        {json.text}
      </pre>
    </div>
  );
};
