// ============================================================================
// FieldClassification.ts
// Amelia Track 2 — Process Field Interpretation Layer
// ============================================================================

export interface AssemblageMetrics {
  PCS: number;   // Plateau Consistency Score      [0–1]
  MTS: number;   // Metastable Terrace Score        [0–1]
  LIS: number;   // Low-Coupling Index              [0–1]
  FEI: number;   // Folded Emergence Index          [0–1]
  RCS: number;   // Re-entry Consistency Score      [0–1]
}

// Substrate metrics still needed for corridor status
export interface SubstrateSnapshot {
  sl:    number;   // run-mean self-loop depth
  bcs:   number;   // bidirectional corridor score
  ring:  number;   // ring% occupancy
  gamma: number;   // gamma% occupancy
  latentRoutingCycle: boolean;  // any cycle-path latent this run
}

// ─── FIELD CLASS DEFINITION ──────────────────────────────────────────────────

export type FieldClassLabel =
  | 'terrace-only'
  | 'low-zone-integrated'
  | 'coupled-assemblage'
  | 'full-developmental-cycle';

export interface FieldClassification {
  label:        FieldClassLabel;
  confidence:   number;          // 0–1

  // What the substrate is doing
  summary:      string;

  // Which metrics drove the classification
  evidence:     string[];

  // What would need to change to advance to the next class
  nextCondition: string;

  // Whether memory is likely expressing itself in this run
  memoryExpressing: boolean;
  memoryMode: string;
}

// ─── CLASSIFIER ──────────────────────────────────────────────────────────────

export function classifyField(
  m: AssemblageMetrics,
  s: SubstrateSnapshot,
): FieldClassification {

  const evidence: string[] = [];

  // ── Class 4: full-developmental-cycle ────────────────────────────────────
  if (
    s.sl >= 0.35 &&
    s.latentRoutingCycle &&
    m.PCS >= 0.80 &&
    m.RCS >= 0.40 &&
    m.FEI >= 0.40
  ) {
    evidence.push(`sl=${s.sl.toFixed(3)} ≥ 0.35 (compression threshold)`);
    evidence.push(`Cycle-path latent routing active`);
    evidence.push(`PCS=${m.PCS.toFixed(3)} (terrace stable)`);
    evidence.push(`RCS=${m.RCS.toFixed(3)} (re-entry consistent)`);
    evidence.push(`FEI=${m.FEI.toFixed(3)} (folded emergence present)`);
    return {
      label: 'full-developmental-cycle',
      confidence: computeConfidence([m.PCS, m.RCS, m.FEI, m.MTS], 0.70),
      summary:
        'The substrate is in the full developmental cycle. Terrace is stable, ' +
        're-entry is consistent, the corridor is structurally available via cycle-path ' +
        'latent routing, and folded emergence indicates active individuation pressure.',
      evidence,
      nextCondition:
        'Orbit lock and crystal event — the cycle template has been entered.',
      memoryExpressing: true,
      memoryMode:
        'Memory is sustaining corridor availability and re-entry consistency across the metastable tension.',
    };
  }

  // ── Class 3: coupled-assemblage ───────────────────────────────────────────
  if (
    m.PCS >= 0.80 &&
    m.MTS >= 0.40 &&
    m.RCS >= 0.20 &&
    m.LIS <= 0.50
  ) {
    evidence.push(`PCS=${m.PCS.toFixed(3)} (plateau highly consistent)`);
    evidence.push(`MTS=${m.MTS.toFixed(3)} (metastable terrace present)`);
    evidence.push(`RCS=${m.RCS.toFixed(3)} (re-entry occurring)`);
    evidence.push(`LIS=${m.LIS.toFixed(3)} (low-coupling below decoupling threshold)`);
    if (m.FEI >= 0.35) evidence.push(`FEI=${m.FEI.toFixed(3)} (folded emergence active)`);
    return {
      label: 'coupled-assemblage',
      confidence: computeConfidence([m.PCS, m.MTS, m.RCS, 1 - m.LIS], 0.65),
      summary:
        'A stabilized coupled assemblage with repeated re-entry. The terrace is ' +
        'held with high consistency, the low-zone block is integrated into the broader ' +
        'formation, and the substrate repeatedly re-enters the same morphogenetic cluster.',
      evidence,
      nextCondition:
        'sl must rise above 0.35 and a cycle-path latent routing event must occur to advance to full-developmental-cycle.',
      memoryExpressing: true,
      memoryMode:
        'Memory is enlarging and stabilizing the morphogenetic field. The formation recurs with lower activation cost.',
    };
  }

  // ── Class 2: low-zone-integrated ─────────────────────────────────────────
  if (
    m.PCS >= 0.60 &&
    m.MTS >= 0.35 &&
    m.LIS <= 0.45 &&
    s.gamma >= 30
  ) {
    evidence.push(`PCS=${m.PCS.toFixed(3)} (plateau emerging)`);
    evidence.push(`MTS=${m.MTS.toFixed(3)} (terrace forming)`);
    evidence.push(`gamma=${s.gamma.toFixed(1)}% (metabolic block active)`);
    evidence.push(`LIS=${m.LIS.toFixed(3)} (integration below threshold)`);
    return {
      label: 'low-zone-integrated',
      confidence: computeConfidence([m.PCS, m.MTS, 1 - m.LIS], 0.55),
      summary:
        'The metabolic stratum (zones 3–6) has joined the terrace. A low-zone block ' +
        'is active and beginning to integrate with the broader formation. Re-entry is not yet consistent.',
      evidence,
      nextCondition:
        'RCS must rise above 0.20 as the low-zone block and the parent stratum develop consistent re-entry.',
      memoryExpressing: true,
      memoryMode:
        'Memory is holding the low-zone block in proximity to the terrace, preventing premature dissolution.',
    };
  }

  // ── Class 1: terrace-only ─────────────────────────────────────────────────
  evidence.push(`PCS=${m.PCS.toFixed(3)}`);
  evidence.push(`MTS=${m.MTS.toFixed(3)}`);
  evidence.push(`RCS=${m.RCS.toFixed(3)}`);
  evidence.push(`sl=${s.sl.toFixed(3)}`);

  return {
    label: 'terrace-only',
    confidence: computeConfidence([m.PCS, m.MTS], 0.50),
    summary:
      'A stable but uncoupled terrace. The substrate is circulating without ' +
      'integrating the low-zone block, without consistent re-entry, and without corridor pressure.',
    evidence,
    nextCondition:
      'Gamma occupancy must rise above 30% as the metabolic block activates, and LIS must fall.',
    memoryExpressing: false,
    memoryMode:
      'Memory has not yet produced a detectable field advantage.',
  };
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function computeConfidence(values: number[], base: number): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.min(1, base + mean * (1 - base));
}

export function bar(v: number): string {
  const filled = Math.round(v * 12);
  return '[' + '█'.repeat(filled) + '░'.repeat(12 - filled) + ']';
}
