// src/app/ui/MorphogeneticResultsPanel.tsx

import React from "react";
import type { MorphogeneticResults } from "@/ai/morphogenetic/types";

type ResultsPanelProps = {
  results: MorphogeneticResults;
};

function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.00";
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        background: "#111",
        color: "#eee",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, borderBottom: '1px solid #222', paddingBottom: 8 }}>{title}</h3>
      {children}
    </div>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        gap: 16,
      }}
    >
      <span style={{ opacity: 0.85 }}>{label}</span>
      <strong style={{ fontFamily: 'monospace', color: '#34d399' }}>{value}</strong>
    </div>
  );
}

function MorphogeneticFieldCard({
  data,
}: {
  data: MorphogeneticResults["morphogeneticField"];
}) {
  return (
    <SectionCard title="Morphogenetic Field">
      {!data ? (
        <div>No field data available.</div>
      ) : (
        <>
          <MetricRow
            label="Field Coherence"
            value={formatNumber(data.fieldCoherence)}
          />
          <MetricRow
            label="Memory Density"
            value={formatNumber(data.memoryDensity)}
          />
          <MetricRow
            label="Perturbation Level"
            value={formatNumber(data.perturbationLevel)}
          />
          <MetricRow
            label="Canalization Strength"
            value={formatNumber(data.canalizationStrength)}
          />
          <MetricRow label="Dominant Mode" value={data.dominantMode.toUpperCase()} />
        </>
      )}
    </SectionCard>
  );
}

function ZoneDifferentiationCard({
  data,
}: {
  data: MorphogeneticResults["zoneDifferentiation"];
}) {
  return (
    <SectionCard title="Zone Differentiation">
      <MetricRow
        label="Differentiation Index"
        value={formatNumber(data.differentiationIndex)}
      />
      <MetricRow
        label="Redifferentiation Rate"
        value={formatNumber(data.redifferentiationRate)}
      />

      <div style={{ marginTop: 12 }}>
        <div style={{ marginBottom: 8, opacity: 0.85, fontSize: 14, fontWeight: 600 }}>Current Zone Roles</div>
        {Object.entries(data.currentRoles).length === 0 ? (
          <div>No zone role data available.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {Object.entries(data.currentRoles)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([zone, role]) => (
                <div key={zone} style={{ background: '#0c0a09', padding: '8px', borderRadius: '6px', border: '1px solid #222' }}>
                  <div style={{ fontSize: '10px', color: '#a1a1aa', textTransform: 'uppercase' }}>{zone}</div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#c4b5fd' }}>{role}</div>
                </div>
              ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function OperatorMorphogenCard({
  data,
}: {
  data: MorphogeneticResults["operatorMorphogens"];
}) {
  return (
    <SectionCard title="Operator-Morphogens">
      <MetricRow label="Operators Introduced" value={data.introduced} />
      <MetricRow
        label="Recombination Events"
        value={data.recombinationEvents}
      />
      <MetricRow
        label="Mean Propagation Depth"
        value={formatNumber(data.meanPropagationDepth)}
      />
      <MetricRow
        label="Operator Persistence Ratio"
        value={formatNumber(data.persistenceRatio)}
      />

      <div style={{ marginTop: 12 }}>
        <div style={{ marginBottom: 8, opacity: 0.85, fontSize: 14, fontWeight: 600 }}>
          Active Propagation
        </div>
        {Object.keys(data.propagationByOperator).length === 0 ? (
          <div>No operator propagation data available.</div>
        ) : (
          Object.entries(data.propagationByOperator)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([operator, zones]) => (
              <MetricRow
                key={operator}
                label={operator}
                value={zones.join(", ")}
              />
            ))
        )}
      </div>
    </SectionCard>
  );
}

function MorphogeneticTransferCard({
  data,
}: {
  data: MorphogeneticResults["morphogeneticTransfer"];
}) {
  return (
    <SectionCard title="Morphogenetic Transfer">
      <MetricRow label="Collective TSR" value={formatNumber(data.cTSR)} />
      <MetricRow
        label="Shared Trace Utilization"
        value={formatNumber(data.sharedTraceUtilization)}
      />
      <MetricRow
        label="Delayed Transfer Count"
        value={data.delayedTransferCount}
      />
    </SectionCard>
  );
}

export default function MorphogeneticResultsPanel({ results }: ResultsPanelProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16 }}>
      <MorphogeneticFieldCard data={results.morphogeneticField} />
      <ZoneDifferentiationCard data={results.zoneDifferentiation} />
      <OperatorMorphogenCard data={results.operatorMorphogens} />
      <MorphogeneticTransferCard data={results.morphogeneticTransfer} />
    </div>
  );
}
