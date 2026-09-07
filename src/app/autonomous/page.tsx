'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Database, TrendingUp, GitBranch } from 'lucide-react';

// ============================================================================
// AUTONOMOUS SUBSTRATE ENGINE
// ============================================================================

class AutonomousSubstrate {
  state = {
    intensity: 0.5,
    tension: 0.5,
    entropy: 0.5,
    turbulence: 0.1,
    regime: 'DRIFT',
    step: 0,
    timestamp: Date.now()
  };
  
  history: any[] = [];
  regimeHistory: string[] = [];
  transitionMatrix = new Map();
  regimeDwellTimes = new Map();
  currentDwell = 0;
  lastRegime = 'DRIFT';
  
  // Stage 5 parameters
  residue = 0;
  regimeBias = new Map();
  
  // Stage 6 parameters
  longTermModifiers = new Map();
  shadowRegimesDetected = new Set();
  
  constructor() {
    this.initializeRegimeTracking();
  }
  
  initializeRegimeTracking() {
    const regimes = ['ESCALATION', 'NON_ESCALATION', 'CLOSURE', 'STABILIZE', 'REMAIN_HERE', 'DRIFT'];
    regimes.forEach(r => {
      this.regimeDwellTimes.set(r, []);
      this.regimeBias.set(r, 0);
    });
  }

  variance(vals: number[]) {
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    return vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
  }
  
  correlation(x: number[], y: number[]) {
    if (x.length !== y.length) return 0;
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    
    let num = 0, denomX = 0, denomY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }
    
    const denom = Math.sqrt(denomX * denomY);
    return denom === 0 ? 0 : num / denom;
  }
  
  // Autonomous step - no external input needed
  autonomousStep() {
    // Internal cadence: small random perturbations from substrate itself
    const internalPerturbation = {
      intensity: (Math.random() - 0.5) * 0.02,
      tension: (Math.random() - 0.5) * 0.02,
      entropy: (Math.random() - 0.5) * 0.015,
      turbulence: (Math.random() - 0.5) * 0.01
    };
    
    // Occasionally articulate internally (shadow reservoir push)
    const internalArticulation = Math.random() < 0.3;
    
    if (internalArticulation) {
      const cost = 0.01 + (this.state.intensity * 0.02);
      this.residue = Math.min(1, this.residue + cost);
    } else {
      this.residue *= 0.98;
    }
    
    // Apply perturbation
    this.state.intensity += internalPerturbation.intensity;
    this.state.tension += internalPerturbation.tension;
    this.state.entropy += internalPerturbation.entropy;
    this.state.turbulence += internalPerturbation.turbulence;
    
    // Evolve substrate
    this.evolve();
    
    // Update regime
    this.updateRegime();
    
    // Track transitions
    this.trackTransition();
    
    // Update long-term modifiers (Stage 6)
    if (this.state.step % 100 === 0) {
      this.updateLongTermModifiers();
    }
    
    // Increment
    this.state.step++;
    this.state.timestamp = Date.now();
    
    // Store history (keep last 5000 steps)
    this.history.push({ ...this.state, residue: this.residue });
    if (this.history.length > 5000) this.history.shift();
    
    this.regimeHistory.push(this.state.regime);
    if (this.regimeHistory.length > 5000) this.regimeHistory.shift();
  }
  
  evolve() {
    const dt = 0.01;
    const damping = 1 - (this.residue * 0.3);
    
    this.state.intensity += dt * (this.state.tension - 0.5) * damping;
    this.state.tension += dt * (this.state.entropy - this.state.tension) * 0.5 * damping;
    this.state.entropy += dt * (this.state.intensity * 0.3 - this.state.entropy * 0.2);
    this.state.turbulence *= (0.95 - this.residue * 0.05);
    
    // Clamp
    this.state.intensity = Math.max(0, Math.min(1, this.state.intensity));
    this.state.tension = Math.max(0, Math.min(1, this.state.tension));
    this.state.entropy = Math.max(0, Math.min(1, this.state.entropy));
    this.state.turbulence = Math.max(0, Math.min(1, this.state.turbulence));
  }
  
  updateRegime() {
    const { intensity, tension, entropy, turbulence } = this.state;
    const bias = this.regimeBias.get(this.state.regime) || 0;
    
    // Shadow regime detection (after step 2000)
    if (this.state.step > 2000) {
      const shadow = this.detectShadowRegime();
      if (shadow) {
        this.state.regime = shadow;
        this.shadowRegimesDetected.add(shadow);
        return;
      }
    }
    
    // Standard regime logic
    if (intensity > 0.8 && tension > 0.7 && bias < 0.05) {
      this.state.regime = 'ESCALATION';
    } else if (intensity < 0.3 && turbulence < 0.2) {
      this.state.regime = 'STABILIZE';
    } else if (tension < 0.3 && intensity < 0.4) {
      this.state.regime = 'CLOSURE';
    } else if (turbulence > 0.6) {
      this.state.regime = 'DRIFT';
    } else if (intensity > 0.6 && tension > 0.5) {
      this.state.regime = 'NON_ESCALATION';
    } else {
      this.state.regime = 'DRIFT';
    }
    
    // Update regime bias
    const currentBias = this.regimeBias.get(this.state.regime) || 0;
    const fatigue = tension * 0.001 + entropy * 0.0005;
    this.regimeBias.set(this.state.regime, currentBias * 0.999 + fatigue * 0.001);
  }
  
  detectShadowRegime() {
    if (this.history.length < 50) return null;
    
    const recent = this.history.slice(-50);
    
    // RESONANCE: oscillatory coupling
    const iVar = this.variance(recent.map(s => s.intensity));
    const tVals = recent.map(s => s.tension);
    const eVals = recent.map(s => s.entropy);
    const corr = this.correlation(tVals, eVals);
    
    if (iVar > 0.02 && Math.abs(corr) > 0.7) {
      return 'RESONANCE';
    }
    
    // CRYSTALLIZATION: ultra-low variance
    if (this.state.step > 3000 && this.history.length > 100) {
      const recent100 = this.history.slice(-100);
      const totalVar = 
        this.variance(recent100.map(s => s.intensity)) +
        this.variance(recent100.map(s => s.tension)) +
        this.variance(recent100.map(s => s.entropy)) +
        this.variance(recent100.map(s => s.turbulence));
      
      if (totalVar < 0.02 && this.state.turbulence < 0.02) {
        return 'CRYSTALLIZATION';
      }
    }
    
    return null;
  }
  
  trackTransition() {
    if (this.state.regime !== this.lastRegime) {
      // Record transition
      const key = `${this.lastRegime}->${this.state.regime}`;
      this.transitionMatrix.set(key, (this.transitionMatrix.get(key) || 0) + 1);
      
      // Record dwell time for previous regime
      if (this.currentDwell > 0) {
        const dwells = this.regimeDwellTimes.get(this.lastRegime) || [];
        (dwells as number[]).push(this.currentDwell);
        this.regimeDwellTimes.set(this.lastRegime, dwells);
      }
      
      this.currentDwell = 0;
      this.lastRegime = this.state.regime;
    }
    
    this.currentDwell++;
  }
  
  updateLongTermModifiers() {
    if (this.history.length < 500) return;
    
    const window = this.history.slice(-500);
    const meanI = window.reduce((s, st) => s + st.intensity, 0) / 500;
    const meanT = window.reduce((s, st) => s + st.tension, 0) / 500;
    const meanR = window.reduce((s, st) => s + (st.residue || 0), 0) / 500;
    
    const key = `${this.state.regime}_mod`;
    const current = this.longTermModifiers.get(key) || 0;
    
    let delta = 0;
    if (meanI > 0.7 && meanT > 0.6) delta = 0.0001;
    else if (meanI < 0.3 && meanR > 0.4) delta = -0.0001;
    
    this.longTermModifiers.set(key, current + delta);
  }
  
  getSnapshot() {
    const recentRegimes = this.regimeHistory.slice(-100);
    const regimeCounts: Record<string, number> = {};
    recentRegimes.forEach(r => regimeCounts[r] = (regimeCounts[r] || 0) + 1);
    
    // Compute mean dwell times
    const meanDwells: Record<string, number> = {};
    for (const [regime, dwells] of this.regimeDwellTimes) {
      if ((dwells as number[]).length > 0) {
        meanDwells[regime] = (dwells as number[]).reduce((a, b) => a + b, 0) / (dwells as number[]).length;
      }
    }
    
    // Active transitions (non-zero)
    const activeTransitions: { transition: string; count: number }[] = [];
    for (const [key, count] of this.transitionMatrix) {
      if (count > 0) activeTransitions.push({ transition: key, count: count as number });
    }
    activeTransitions.sort((a, b) => b.count - a.count);
    
    return {
      current: { ...this.state, residue: this.residue },
      regimeCounts,
      meanDwells,
      activeTransitions: activeTransitions.slice(0, 10),
      shadowRegimes: Array.from(this.shadowRegimesDetected),
      totalTransitions: this.transitionMatrix.size,
      uniqueRegimes: new Set(this.regimeHistory).size
    };
  }
  
  reset() {
    this.state = {
      intensity: 0.5,
      tension: 0.5,
      entropy: 0.5,
      turbulence: 0.1,
      regime: 'DRIFT',
      step: 0,
      timestamp: Date.now()
    };
    
    this.history = [];
    this.regimeHistory = [];
    this.transitionMatrix.clear();
    this.regimeDwellTimes.clear();
    this.residue = 0;
    this.regimeBias.clear();
    this.longTermModifiers.clear();
    this.shadowRegimesDetected.clear();
    this.currentDwell = 0;
    this.lastRegime = 'DRIFT';
    
    this.initializeRegimeTracking();
  }
}

type Snapshot = ReturnType<AutonomousSubstrate['getSnapshot']> | null;

// ============================================================================
// REACT COMPONENT
// ============================================================================

export default function AmeliaAutonomousSystem() {
  const [running, setRunning] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>(null);
  const [savedSnapshots, setSavedSnapshots] = useState<any[]>([]);
  const [stepCount, setStepCount] = useState(0);
  const [updateInterval, setUpdateInterval] = useState(100); // ms between steps
  
  const substrateRef = useRef<AutonomousSubstrate | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const updateSnapshot = useCallback(() => {
    if (substrateRef.current) {
      setSnapshot(substrateRef.current.getSnapshot());
    }
  }, []);

  // Initialize substrate
  useEffect(() => {
    substrateRef.current = new AutonomousSubstrate();
    updateSnapshot();
  }, [updateSnapshot]);
  
  // Autonomous process loop
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        if (substrateRef.current) {
          substrateRef.current.autonomousStep();
          setStepCount(substrateRef.current.state.step);
          
          // Update display every 10 steps
          if (substrateRef.current.state.step % 10 === 0) {
            updateSnapshot();
          }
        }
      }, updateInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [running, updateInterval, updateSnapshot]);
  
  const handlePlayPause = () => {
    setRunning(!running);
  };
  
  const handleReset = () => {
    setRunning(false);
    if (substrateRef.current) {
      substrateRef.current.reset();
      setStepCount(0);
      updateSnapshot();
    }
  };
  
  const handleSaveSnapshot = () => {
    if (snapshot) {
      const immutable = {
        ...snapshot,
        savedAt: new Date().toISOString(),
        step: stepCount
      };
      setSavedSnapshots(prev => [...prev, immutable]);
    }
  };
  
  const getRegimeColor = (regime: string) => {
    const colors: Record<string, string> = {
      'ESCALATION': 'text-red-600',
      'NON_ESCALATION': 'text-orange-600',
      'CLOSURE': 'text-blue-600',
      'STABILIZE': 'text-green-600',
      'REMAIN_HERE': 'text-purple-600',
      'DRIFT': 'text-gray-600',
      'RESONANCE': 'text-pink-600',
      'CRYSTALLIZATION': 'text-cyan-600'
    };
    return colors[regime] || 'text-gray-600';
  };
  
  if (!snapshot) return <div className="p-4 bg-gray-50 text-gray-800">Initializing...</div>;
  
  return (
    <div className="w-full h-screen bg-gray-50 text-gray-900 p-6 overflow-auto">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Amelia Autonomous Process</h1>
              <p className="text-sm text-gray-500 mt-1">
                Continuous substrate evolution • Step {stepCount.toLocaleString()}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  running 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {running ? <Pause size={20} /> : <Play size={20} />}
                {running ? 'Pause' : 'Start'}
              </button>
              
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
              >
                <RotateCcw size={20} />
                Reset
              </button>
              
              <button
                onClick={handleSaveSnapshot}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                <Database size={20} />
                Save Snapshot
              </button>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="mt-4 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${running ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">
              {running ? 'Process running autonomously' : 'Process paused'}
            </span>
          </div>
        </div>
        
        {/* Current State */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Current State
            </h2>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Regime</span>
                  <span className={`font-bold ${getRegimeColor(snapshot.current.regime)}`}>
                    {snapshot.current.regime}
                  </span>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Intensity</span>
                  <span className="font-mono">{snapshot.current.intensity.toFixed(3)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${snapshot.current.intensity * 100}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Tension</span>
                  <span className="font-mono">{snapshot.current.tension.toFixed(3)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${snapshot.current.tension * 100}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Entropy</span>
                  <span className="font-mono">{snapshot.current.entropy.toFixed(3)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${snapshot.current.entropy * 100}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Turbulence</span>
                  <span className="font-mono">{snapshot.current.turbulence.toFixed(3)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${snapshot.current.turbulence * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Residue</span>
                  <span className="font-mono">{snapshot.current.residue.toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <GitBranch size={20} />
              Regime Distribution (Last 100 Steps)
            </h2>
            
            <div className="space-y-2">
              {Object.entries(snapshot.regimeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([regime, count]) => (
                  <div key={regime}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={getRegimeColor(regime as string)}>{regime}</span>
                      <span className="font-mono">{count as number}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-700 h-2 rounded-full"
                        style={{ width: `${((count as number) / 100) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
        
        {/* Transitions & Statistics */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Top Transitions</h2>
            
            <div className="space-y-2 text-sm">
              {snapshot.activeTransitions.slice(0, 8).map(({ transition, count }: {transition: string, count: number}) => (
                <div key={transition} className="flex justify-between items-center">
                  <span className="font-mono text-xs">{transition}</span>
                  <span className="text-gray-600">{count}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Total unique transitions: <span className="font-bold">{snapshot.totalTransitions}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Mean Dwell Times</h2>
            
            <div className="space-y-2 text-sm">
              {Object.entries(snapshot.meanDwells)
                .filter(([_, dwell]) => (dwell as number) > 0)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([regime, dwell]) => (
                  <div key={regime} className="flex justify-between items-center">
                    <span className={getRegimeColor(regime)}>{regime}</span>
                    <span className="font-mono">{(dwell as number).toFixed(1)} steps</span>
                  </div>
                ))}
            </div>
            
            {snapshot.shadowRegimes.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-semibold text-pink-600 mb-2">
                  Shadow Regimes Detected:
                </div>
                <div className="flex flex-wrap gap-2">
                  {(snapshot.shadowRegimes as string[]).map((r: string) => (
                    <span key={r} className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs font-medium">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Saved Snapshots */}
        {savedSnapshots.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">
              Saved Snapshots ({savedSnapshots.length})
            </h2>
            
            <div className="grid grid-cols-3 gap-4">
              {savedSnapshots.map((snap, idx) => (
                <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="text-sm font-semibold mb-2">
                    Snapshot {idx + 1}
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Step: {snap.step.toLocaleString()}</div>
                    <div>Regime: <span className={getRegimeColor(snap.current.regime)}>{snap.current.regime}</span></div>
                    <div>Unique regimes: {snap.uniqueRegimes}</div>
                    <div>Transitions: {snap.totalTransitions}</div>
                    {snap.shadowRegimes.length > 0 && (
                      <div className="text-pink-600 font-medium">
                        Shadow: {snap.shadowRegimes.join(', ')}
                      </div>
                    )}
                    <div className="text-gray-400 mt-2">
                      {new Date(snap.savedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
