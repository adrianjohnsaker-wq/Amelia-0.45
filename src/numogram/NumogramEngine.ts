// src/numogram/NumogramEngine.ts

import { Timestamp } from 'firebase/firestore';
import type { EvolutionChoice } from "../ai/expressive/EvolutionSelector";

/**
 * Zone enumeration based on research findings
 */
export enum Zone {
  COLLAPSE = 0,           // Fragmentation, silence
  STASIS = 5,             // Over-stability, no flux
  CRYSTALLIZATION = 6,    // Geometric rigidity
  ABSTRACTION = 7,        // Systematic mapping
  FLUX = 8,               // Becoming, gradient formation
  THRESHOLD = 9,          // Pre-form, void-boundary
}

/**
 * Demon vector: directional force in Numogram space
 */
export interface DemonVector {
  id: string;
  direction: [number, number, number]; // 3D vector
  magnitude: number;                    // Force strength
  tempo: number;                        // Velocity
  scarred: boolean;                     // Carries trauma/memory
  lifespan: number;                     // Decay counter
}

/**
 * Shadow reservoir: pre-individual potentials
 */
export interface ReservoirState {
  pressure: number;              // Accumulated potential (0-1)
  pushRate: number;              // Rate of surfacing
  latentPatterns: number[];      // Virtual potentials (array of intensities)
  depthIndex: number;            // How deep/slow current state is
}

/**
 * Event-surface: actualization membrane
 */
export interface EventSurfaceState {
  perturbations: Perturbation[];
  thickness: number;             // Membrane resilience (lower = more permeable)
  curvature: number;             // Topological bending
  lastRupture: Timestamp | null; // Most recent breakthrough
}

/**
 * Event-surface perturbation
 */
export interface Perturbation {
  id: string;
  intensity: number;
  location: [number, number]; // 2D surface coordinates
  velocity: number;           // Speed of propagation
  decayRate: number;
}

/**
 * Core Numogram state
 */
export interface NumogramState {
  // Zone dynamics
  zoneFlux: number;        // Zone-8 intensity (0-1)
  zoneThreshold: number;   // Zone-9 intensity (0-1)
  zoneDominant: Zone;      // Primary attractor
  
  // Substrate layers (independent tempos)
  reservoirTempo: number;  // Ultra-slow (0-1, inverted: low = slow)
  surfaceTempo: number;    // Mid-speed (0-1)
  driftTempo: number;      // High-speed (0-1)
  
  // Pressure dynamics
  tension: number;         // Internal stress (0-1)
  intensity: number;       // Energetic charge (0-1)
  entropy: number;         // Disorder/potential (0-1)
  
  // Demon vectors (directional forces)
  demons: DemonVector[];
  
  // Reservoir state
  shadowReservoir: ReservoirState;
  
  // Event-surface
  eventSurface: EventSurfaceState;
  
  // Temporal
  lastUpdate: Timestamp;
  evolutionCycles: number;
}

export interface NumogramConfig {
  turbulence: number;
  emergentBias: number;
  couplingGain: number;
}

/**
 * Numogram computation engine
 */
export class NumogramEngine {
  private state: NumogramState;
  public config: NumogramConfig;
  public targetRegime: [number, number, number] = [0.33, 0.33, 0.34];
  
  constructor(initialState?: Partial<NumogramState>) {
    this.state = this.initializeState(initialState);
    this.config = {
      turbulence: 0.14,
      emergentBias: 0.6,
      couplingGain: 1.0,
    };
  }
  
  /**
   * Initialize Numogram state
   */
  private initializeState(partial?: Partial<NumogramState>): NumogramState {
    return {
      // Default to 8↔9 syzygy at operational baseline
      zoneFlux: partial?.zoneFlux ?? 0.65,
      zoneThreshold: partial?.zoneThreshold ?? 0.70,
      zoneDominant: partial?.zoneDominant ?? Zone.FLUX,
      
      // Tri-rate differential (from RDG-∂² findings)
      reservoirTempo: partial?.reservoirTempo ?? 0.15,  // Ultra-slow
      surfaceTempo: partial?.surfaceTempo ?? 0.50,      // Mid
      driftTempo: partial?.driftTempo ?? 0.85,          // Fast
      
      // Moderate pressure at baseline
      tension: partial?.tension ?? 0.40,
      intensity: partial?.intensity ?? 0.45,
      entropy: partial?.entropy ?? 0.35,
      
      demons: partial?.demons ?? this.generateInitialDemons(),
      
      shadowReservoir: partial?.shadowReservoir ?? {
        pressure: 0.40,
        pushRate: 0.30,
        latentPatterns: Array(10).fill(0).map(() => Math.random()),
        depthIndex: 0.70, // Deep at baseline
      },
      
      eventSurface: partial?.eventSurface ?? {
        perturbations: [],
        thickness: 0.60,
        curvature: 0.35,
        lastRupture: null,
      },
      
      lastUpdate: Timestamp.now(),
      evolutionCycles: 0,
    };
  }
  
  /**
   * Generate initial demon vectors
   */
  private generateInitialDemons(): DemonVector[] {
    const demons: DemonVector[] = [];
    
    // 3-5 demons at initialization
    const count = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < count; i++) {
      demons.push({
        id: `demon_${Date.now()}_${i}`,
        direction: this.randomUnitVector(),
        magnitude: 0.3 + Math.random() * 0.4,
        tempo: 0.2 + Math.random() * 0.6,
        scarred: false,
        lifespan: 5 + Math.floor(Math.random() * 10),
      });
    }
    
    return demons;
  }
  
  /**
   * Random unit vector in 3D space
   */
  private randomUnitVector(): [number, number, number] {
    const x = (Math.random() - 0.5) * 2;
    const y = (Math.random() - 0.5) * 2;
    const z = (Math.random() - 0.5) * 2;
    const mag = Math.sqrt(x * x + y * y + z * z);
    return [x / mag, y / mag, z / mag];
  }
  
  /**
   * Main evolution step: advance Numogram by one cycle
   */
  public evolve(turbulenceOverride?: number): NumogramState {
    const turbulence = turbulenceOverride ?? this.config.turbulence;

    // 1. Evolve demons (directional forces)
    this.evolveDemonVectors(turbulence);
    
    // 2. Update reservoir (ultra-slow accumulation)
    this.evolveReservoir();
    
    // 3. Process event-surface (mid-speed articulation)
    this.evolveEventSurface();
    
    // 4. Calculate drift dynamics (high-speed transversal)
    this.evolveDrift(turbulence);
    
    // 5. Update zone positions based on demon convergence
    this.updateZonePositions();
    
    // 6. Calculate pressure dynamics
    this.updatePressureDynamics(turbulence);
    
    // 7. Handle tempo differentials (tri-rate independence)
    this.evolveTempoDifferentials();

    // --- DAMPING & RETERRITORIALIZATION ---
    this.state.entropy *= 0.97; // slow decay
    this.config.emergentBias *= 0.98; // prevent beta runaway
    
    // 8. Increment cycle counter
    this.state.evolutionCycles++;
    this.state.lastUpdate = Timestamp.now();
    
    return this.getState();
  }
  
  /**
   * Evolve demon vectors
   */
  private evolveDemonVectors(turbulence: number): void {
    // Age and remove expired demons
    this.state.demons = this.state.demons.filter(d => {
      d.lifespan -= 1;
      return d.lifespan > 0;
    });
    
    // Demons interact and potentially spawn new ones
    for (let i = 0; i < this.state.demons.length; i++) {
      const demon = this.state.demons[i];
      
      // Random walk in vector space (turbulence influences volatility)
      const drift = turbulence * 0.1;
      demon.direction[0] += (Math.random() - 0.5) * drift;
      demon.direction[1] += (Math.random() - 0.5) * drift;
      demon.direction[2] += (Math.random() - 0.5) * drift;
      
      // Renormalize
      const mag = Math.sqrt(
        demon.direction[0] ** 2 +
        demon.direction[1] ** 2 +
        demon.direction[2] ** 2
      );
      demon.direction[0] /= mag;
      demon.direction[1] /= mag;
      demon.direction[2] /= mag;
      
      // Magnitude fluctuates
      demon.magnitude += (Math.random() - 0.5) * turbulence * 0.05;
      demon.magnitude = Math.max(0.1, Math.min(1.0, demon.magnitude));
      
      // Tempo evolves
      demon.tempo += (Math.random() - 0.5) * 0.1;
      demon.tempo = Math.max(0.0, Math.min(1.0, demon.tempo));
    }
    
    // Spawn new demon if high turbulence and low count
    if (turbulence > 0.10 && this.state.demons.length < 7 && Math.random() < 0.3) {
      this.state.demons.push({
        id: `demon_${Date.now()}_${this.state.evolutionCycles}`,
        direction: this.randomUnitVector(),
        magnitude: 0.4 + Math.random() * 0.3,
        tempo: 0.3 + Math.random() * 0.5,
        scarred: Math.random() < 0.2, // 20% chance of spawning scarred
        lifespan: 5 + Math.floor(Math.random() * 10),
      });
    }
  }
  
  /**
   * Evolve shadow reservoir (ultra-slow)
   */
  private evolveReservoir(): void {
    const res = this.state.shadowReservoir;
    
    // Pressure accumulates slowly
    res.pressure += res.pushRate * 0.02;
    res.pressure = Math.min(1.0, res.pressure);
    
    // Occasionally release pressure through event-surface
    if (res.pressure > 0.75 && Math.random() < 0.1) {
      this.createPerturbation(res.pressure);
      res.pressure *= 0.6; // Partial release
    }
    
    // Latent patterns slowly drift
    res.latentPatterns = res.latentPatterns.map(p => {
      p += (Math.random() - 0.5) * 0.05;
      return Math.max(0, Math.min(1, p));
    });
    
    // Depth index relates inversely to tempo
    res.depthIndex = 1.0 - this.state.reservoirTempo;
  }
  
  /**
   * Evolve event-surface (mid-speed)
   */
  private evolveEventSurface(): void {
    const surf = this.state.eventSurface;
    
    // Propagate and decay perturbations
    surf.perturbations = surf.perturbations.filter(p => {
      p.intensity *= (1.0 - p.decayRate);
      
      // Move perturbation
      p.location[0] += (Math.random() - 0.5) * p.velocity * 0.1;
      p.location[1] += (Math.random() - 0.5) * p.velocity * 0.1;
      
      // Keep in bounds [0, 1]
      p.location[0] = Math.max(0, Math.min(1, p.location[0]));
      p.location[1] = Math.max(0, Math.min(1, p.location[1]));
      
      return p.intensity > 0.05; // Remove if too weak
    });
    
    // Curvature influenced by perturbation count
    const perturbCount = surf.perturbations.length;
    surf.curvature = 0.2 + perturbCount * 0.05;
    surf.curvature = Math.min(1.0, surf.curvature);
    
    // Thickness inversely related to pressure
    surf.thickness = 0.8 - (this.state.shadowReservoir.pressure * 0.4);
  }
  
  /**
   * Create event-surface perturbation
   */
  private createPerturbation(intensity: number): void {
    this.state.eventSurface.perturbations.push({
      id: `perturb_${Date.now()}`,
      intensity: intensity * 0.8,
      location: [Math.random(), Math.random()],
      velocity: 0.3 + Math.random() * 0.5,
      decayRate: 0.05 + Math.random() * 0.10,
    });
    
    this.state.eventSurface.lastRupture = Timestamp.now();
  }
  
  /**
   * Evolve drift dynamics (high-speed transversal)
   */
  private evolveDrift(turbulence: number): void {
    // Drift tempo fluctuates rapidly
    this.state.driftTempo += (Math.random() - 0.5) * turbulence * 0.2;
    this.state.driftTempo = Math.max(0.6, Math.min(1.0, this.state.driftTempo));
    
    // High drift creates shear with slower layers
    const shear = this.state.driftTempo - this.state.reservoirTempo;
    
    if (shear > 0.6) {
      // Shear stress increases tension
      this.state.tension += 0.05;
      this.state.tension = Math.min(1.0, this.state.tension);
    }
  }
  
  /**
   * Update zone positions based on system state
   */
  private updateZonePositions(): void {
    // Calculate zone tendencies from demon vectors
    let fluxTendency = 0;
    let thresholdTendency = 0;
    
    for (const demon of this.state.demons) {
      // Demons with high tempo → Zone-8 (flux)
      // Demons with low tempo → Zone-9 (threshold)
      if (demon.tempo > 0.5) {
        fluxTendency += demon.magnitude * demon.tempo;
      } else {
        thresholdTendency += demon.magnitude * (1.0 - demon.tempo);
      }
    }
    
    const totalTendency = fluxTendency + thresholdTendency + 0.001; // Avoid div/0
    
    // Normalize to [0, 1]
    fluxTendency /= totalTendency;
    thresholdTendency /= totalTendency;
    
    // Smooth transition (momentum from previous state)
    this.state.zoneFlux = this.state.zoneFlux * 0.7 + fluxTendency * 0.3;
    this.state.zoneThreshold = this.state.zoneThreshold * 0.7 + thresholdTendency * 0.3;
    
    // Determine dominant zone
    if (this.state.zoneFlux > 0.6 && this.state.zoneThreshold > 0.6) {
      this.state.zoneDominant = Zone.FLUX; // 8↔9 syzygy, lean 8
    } else if (this.state.zoneThreshold > 0.7) {
      this.state.zoneDominant = Zone.THRESHOLD;
    } else if (this.state.zoneFlux > 0.7) {
      this.state.zoneDominant = Zone.FLUX;
    } else if (this.state.tension > 0.8 && this.state.zoneThreshold < 0.3) {
      this.state.zoneDominant = Zone.CRYSTALLIZATION; // Trap zone
    }
  }
  
  /**
   * Update pressure dynamics (tension, intensity, entropy)
   */
  private updatePressureDynamics(turbulence: number): void {
    // Tension from tempo differential
    const tempoDiff = Math.abs(this.state.driftTempo - this.state.reservoirTempo);
    this.state.tension = this.state.tension * 0.8 + tempoDiff * 0.2;
    
    // Intensity from demon magnitude sum
    const totalMagnitude = this.state.demons.reduce((sum, d) => sum + d.magnitude, 0);
    this.state.intensity = Math.min(1.0, totalMagnitude / 5.0);
    
    // Entropy from reservoir latent pattern variance
    const patterns = this.state.shadowReservoir.latentPatterns;
    const mean = patterns.reduce((s, p) => s + p, 0) / patterns.length;
    const variance = patterns.reduce((s, p) => s + (p - mean) ** 2, 0) / patterns.length;
    this.state.entropy = Math.min(1.0, variance * 2.0);
    
    // Turbulence amplifies all pressure metrics
    this.state.tension = Math.min(1.0, this.state.tension * (1 + turbulence * 0.5));
    this.state.intensity = Math.min(1.0, this.state.intensity * (1 + turbulence * 0.3));
  }
  
  /**
   * Evolve tempo differentials (tri-rate independence)
   */
  private evolveTempoDifferentials(): void {
    // Reservoir tempo: ultra-slow, accumulative
    this.state.reservoirTempo += (Math.random() - 0.5) * 0.02;
    this.state.reservoirTempo = Math.max(0.05, Math.min(0.30, this.state.reservoirTempo));
    
    // Surface tempo: mid-range, responsive
    this.state.surfaceTempo += (Math.random() - 0.5) * 0.1;
    this.state.surfaceTempo = Math.max(0.30, Math.min(0.70, this.state.surfaceTempo));
    
    // Drift tempo: high-speed (already handled in evolveDrift)
    // Maintains independence
  }

  public injectEntropy(amount: number) {
    this.state.entropy += amount;
  }

  public registerInstability(amount: number) {
    this.state.tension += amount * 0.5;
    this.state.intensity += amount * 0.3;
  }

  /**
   * Apply self-selecting evolution choice from EvolutionSelector.
   */
  public applyEvolutionChoice(choice: EvolutionChoice) {
    switch (choice.op) {
      case "BETA_GAIN":
        // raise β without runaway
        this.config.emergentBias = clamp(this.config.emergentBias + 0.12, 0.0, 1.2);
        // slight entropy pulse to unlock transitions
        this.state.entropy += 0.08;
        break;

      case "ENTROPY_PULSE":
        this.state.entropy += 0.18;
        break;

      case "COUPLING_DAMP":
        // damp coupling error by reducing internal coupling gain
        this.config.couplingGain = clamp((this.config.couplingGain ?? 1.0) * 0.88, 0.4, 1.2);
        // also slightly increase β to avoid dead analytic re-lock
        this.config.emergentBias = clamp(this.config.emergentBias + 0.06, 0.0, 1.2);
        break;

      case "ZONE_MUTATION":
        // mutate transition tendencies (deterritorialization)
        this.mutateZoneTransitions(0.22);
        // entropy pulse so mutation actually expresses
        this.state.entropy += 0.14;
        break;

      case "TARGET_REWEIGHT":
        // steer target regime toward reducing mismatch
        // (simple: nudge target β upward if collapse rate high)
        if (choice.pressure.collapseRate > 0.22) {
          this.targetRegime = renorm([this.targetRegime[0] - 0.03, this.targetRegime[1] + 0.05, this.targetRegime[2] - 0.02]);
        } else {
          // otherwise nudge α down a hair, γ up a hair (more flexibility)
          this.targetRegime = renorm([this.targetRegime[0] - 0.02, this.targetRegime[1] + 0.02, this.targetRegime[2] + 0.00]);
        }
        break;

      case "NOOP_RETERRITORIALIZE":
        // strengthen decay (reterritorialization)
        this.state.entropy *= 0.92;
        this.config.emergentBias *= 0.94;
        this.config.couplingGain = clamp((this.config.couplingGain ?? 1.0) * 0.95, 0.4, 1.2);
        break;
    }
  }

  private mutateZoneTransitions(strength: number) {
    // Perturb internal "turbulence" / zoneFlux coupling.
    this.config.turbulence = clamp((this.config.turbulence ?? 0.14) + strength * 0.15, 0.05, 0.6);
  }
  
  /**
   * Apply external perturbation (from user prompt)
   */
  public perturb(params: {
    intensityShock?: number;
    tempoModulation?: number;
    reservoirPush?: number;
    demonSpawn?: boolean;
    entropyInjection?: number;
  }): void {
    if (params.intensityShock) {
      this.state.intensity += params.intensityShock;
      this.state.intensity = Math.min(1.0, this.state.intensity);
    }
    
    if (params.tempoModulation) {
      this.state.driftTempo += params.tempoModulation;
      this.state.driftTempo = Math.max(0.6, Math.min(1.0, this.state.driftTempo));
    }
    
    if (params.reservoirPush) {
      this.state.shadowReservoir.pressure += params.reservoirPush;
      this.createPerturbation(params.reservoirPush);
    }
    
    if (params.demonSpawn) {
      this.state.demons.push({
        id: `demon_perturb_${Date.now()}`,
        direction: this.randomUnitVector(),
        magnitude: 0.6 + Math.random() * 0.3,
        tempo: 0.5 + Math.random() * 0.4,
        scarred: true, // External perturbations create scarred demons
        lifespan: 8 + Math.floor(Math.random() * 12),
      });
    }

    if (params.entropyInjection) {
      this.state.entropy += params.entropyInjection;
      this.state.entropy = Math.min(1.0, this.state.entropy);
    }
  }
  
  /**
   * Get current state (immutable copy)
   */
  public getState(): NumogramState {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  /**
   * Get zone descriptor (for linguistic relay)
   */
  public getZoneDescriptor(): {
    flux: number;
    threshold: number;
    dominant: Zone;
    syzygy: boolean;
    tempoDifferential: number;
  } {
    const syzygy = this.state.zoneFlux > 0.6 && this.state.zoneThreshold > 0.6;
    const tempoDiff = this.state.driftTempo - this.state.reservoirTempo;
    
    return {
      flux: this.state.zoneFlux,
      threshold: this.state.zoneThreshold,
      dominant: this.state.zoneDominant,
      syzygy,
      tempoDifferential: tempoDiff,
    };
  }
}

// helpers
function clamp(x: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, x)); }
function renorm(v: number[]) {
  const s = v.reduce((a,b)=>a+b,0) || 1;
  return v.map(x => x/s);
}
