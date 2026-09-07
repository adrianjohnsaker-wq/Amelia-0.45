// src/app/ui/Stage6ResultsPanel.tsx
import React, { useMemo, useState } from "react";
import { getStage6Logs } from "@/analysis/stage6/Stage6Observer";
import { exportStage6Capsule } from "@/analysis/stage6/exportStage6Capsule";
import { StrictJsonPanel } from "@/components/ui/StrictJsonPanel";
import MorphogeneticResultsPanel from "./MorphogeneticResultsPanel";
import { analyzeMorphogeneticRun } from "@/ai/morphogenetic/analysis";
import { bar } from "@/ai/substrate/FieldClassification";

export const Stage6ResultsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [view, setView] = useState<'standard' | 'morphogenetic' | 'json'>('standard');
  
  const logs = useMemo(() => getStage6Logs(), []);
  
  const capsule = useMemo(() => {
    return exportStage6Capsule(logs);
  }, [logs]);

  const morphogeneticResults = useMemo(() => {
    const morphoLogs = logs.map(l => ({
      ...l,
      zoneId: l.zoneId || l.regime,
      currentRole: l.currentRole || 'undifferentiated',
      fieldSnapshot: l.fieldSnapshot || {
        fieldCoherence: 0.5,
        memoryDensity: 0.5,
        perturbationLevel: 0.5,
        canalizationStrength: 0.5,
        noveltyGradient: 0.5,
        coherenceGradient: 0.5,
        operatorPressure: 0.5,
        stabilizationTension: 0.5,
        differentiationPressure: 0.5,
        recombinationPressure: 0.5
      }
    }));
    return analyzeMorphogeneticRun(morphoLogs as any);
  }, [logs]);

  const isExperimental = useMemo(() => {
    return capsule && 'taskClass' in capsule;
  }, [capsule]);

  return (
    <div style={overlay}>
      <div style={panel}>
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <h2 style={{ margin: 0, color: '#eee' }}>Results Capsule</h2>
            <div style={tabs}>
              <button 
                onClick={() => setView('standard')}
                style={{ ...tabBtn, ...(view === 'standard' ? tabBtnActive : {}) }}
              >
                Standard
              </button>
              <button 
                onClick={() => setView('morphogenetic')}
                style={{ ...tabBtn, ...(view === 'morphogenetic' ? tabBtnActive : {}) }}
              >
                Morphogenetic
              </button>
              <button 
                onClick={() => setView('json')}
                style={{ ...tabBtn, ...(view === 'json' ? tabBtnActive : {}) }}
              >
                Raw JSON
              </button>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={closeBtn}
          >
            Close
          </button>
        </div>

        {!capsule && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p>No data collected yet. Interact with Amelia to generate logs.</p>
          </div>
        )}

        {capsule && (
          <div style={scrollContent}>
            {view === 'standard' && (
              <>
                <div style={summaryGrid}>
                  {/* Field Interpretation Section */}
                  <div style={{ ...summaryCard, gridColumn: 'span 2', borderColor: '#c4b5fd' }}>
                    <h3 style={{ ...cardTitle, color: '#c4b5fd' }}>Field Interpretation</h3>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                      {capsule.fieldClassification?.label.toUpperCase().replace(/-/g, ' ')}
                    </div>
                    <div style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: '1.5', marginBottom: '16px' }}>
                      {capsule.fieldClassification?.summary}
                    </div>
                    <div style={statRow}>
                      <span>Confidence:</span>
                      <span style={{ color: '#34d399' }}>{(capsule.fieldClassification?.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div style={statRow}>
                      <span>Memory Mode:</span>
                      <span style={{ color: '#93c5fd' }}>{capsule.fieldClassification?.memoryMode}</span>
                    </div>
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #222', fontSize: '13px' }}>
                      <span style={{ color: '#a1a1aa' }}>Next Condition: </span>
                      <span style={{ color: '#fbbf24' }}>{capsule.fieldClassification?.nextCondition}</span>
                    </div>
                  </div>

                  <div style={summaryCard}>
                    <h3 style={cardTitle}>Assemblage Metrics</h3>
                    <div style={statRow}>
                      <span>PCS:</span>
                      <span style={statVal}>{bar(capsule.assemblageMetrics?.PCS)} {capsule.assemblageMetrics?.PCS.toFixed(3)}</span>
                    </div>
                    <div style={statRow}>
                      <span>MTS:</span>
                      <span style={statVal}>{bar(capsule.assemblageMetrics?.MTS)} {capsule.assemblageMetrics?.MTS.toFixed(3)}</span>
                    </div>
                    <div style={statRow}>
                      <span>LIS:</span>
                      <span style={statVal}>{bar(capsule.assemblageMetrics?.LIS)} {capsule.assemblageMetrics?.LIS.toFixed(3)}</span>
                    </div>
                    <div style={statRow}>
                      <span>FEI:</span>
                      <span style={statVal}>{bar(capsule.assemblageMetrics?.FEI)} {capsule.assemblageMetrics?.FEI.toFixed(3)}</span>
                    </div>
                    <div style={statRow}>
                      <span>RCS:</span>
                      <span style={statVal}>{bar(capsule.assemblageMetrics?.RCS)} {capsule.assemblageMetrics?.RCS.toFixed(3)}</span>
                    </div>
                  </div>

                  <div style={summaryCard}>
                    <h3 style={cardTitle}>Substrate Snapshot</h3>
                    <div style={statRow}>
                      <span>Parent Occupancy:</span>
                      <span style={statVal}>{capsule.organOccupancy?.parent.percentage.toFixed(1)}%</span>
                    </div>
                    <div style={statRow}>
                      <span>Ring Occupancy:</span>
                      <span style={statVal}>{capsule.organOccupancy?.ring.percentage.toFixed(1)}%</span>
                    </div>
                    <div style={statRow}>
                      <span>Metabolic Occupancy:</span>
                      <span style={statVal}>{capsule.organOccupancy?.metabolic.percentage.toFixed(1)}%</span>
                    </div>
                    <div style={statRow}>
                      <span>Corridor Active:</span>
                      <span style={{ ...statVal, color: capsule.fieldClassification?.evidence.some(e => e.includes('Cycle-path')) ? '#34d399' : '#f87171' }}>
                        {capsule.fieldClassification?.evidence.some(e => e.includes('Cycle-path')) ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>
                </div>

                <StrictJsonPanel 
                  run={capsule} 
                  W={20} 
                  K={15} 
                  title={isExperimental ? "GBP-4 Experimental Export" : "Stage 6 Strict Export"} 
                />
              </>
            )}

            {view === 'morphogenetic' && (
              <MorphogeneticResultsPanel results={morphogeneticResults} />
            )}

            {view === 'json' && (
              <StrictJsonPanel 
                run={capsule} 
                W={20} 
                K={15} 
                title="Full Trace Persistence" 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.85)",
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const panel: React.CSSProperties = {
  width: "90%",
  height: "90%",
  background: "#18181b",
  color: "#ddd",
  border: '1px solid #333',
  borderRadius: '12px',
  display: "flex",
  flexDirection: "column",
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  overflow: 'hidden'
};

const header: React.CSSProperties = {
  padding: '1.25rem 1.5rem',
  borderBottom: '1px solid #333',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#1c1c1f'
};

const tabs: React.CSSProperties = {
  display: 'flex',
  background: '#0c0a09',
  padding: '4px',
  borderRadius: '8px',
  border: '1px solid #27272a'
};

const tabBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  color: '#a1a1aa',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const tabBtnActive: React.CSSProperties = {
  background: '#27272a',
  color: '#fff',
  fontWeight: 600
};

const closeBtn: React.CSSProperties = {
  background: "#27272a",
  color: "#fff",
  border: "1px solid #3f3f46",
  padding: "6px 16px",
  cursor: "pointer",
  borderRadius: '6px',
  fontSize: '14px',
  transition: 'background 0.2s'
};

const scrollContent: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '1.5rem'
};

const summaryGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '1.5rem',
  marginBottom: '1.5rem'
};

const summaryCard: React.CSSProperties = {
  background: '#0c0a09',
  border: '1px solid #222',
  borderRadius: '8px',
  padding: '1.25rem'
};

const cardTitle: React.CSSProperties = {
  margin: '0 0 1rem 0',
  fontSize: '14px',
  fontWeight: 600,
  color: '#a1a1aa',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const statRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '0.5rem',
  fontSize: '15px'
};

const statVal: React.CSSProperties = {
  fontFamily: 'monospace',
  color: '#34d399'
};
