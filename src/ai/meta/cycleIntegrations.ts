
// -------------------------------------------------------------
// cycleIntegrations.ts — glue code for A + B
// -------------------------------------------------------------
import { EcologyState, defaultEcologyConfig, ecologyStep, ArchetypeEntity } from "@/ai/symbolic/archetypeEcology";
import { ZoneCouplingState, initZoneCoupling, reinforceZoneAffinities, zoneNudgeFromArchetypes } from "@/ai/symbolic/archetypeZoneCoupling";
import { BridgeState } from "@/ai/meta/symbolicNumogramBridge";
import { computeArchetypeFitness, applySelectivePressure, defaultSelectionWeights } from "@/ai/symbolic/archetypeSelectivePressure";
import { applySelfDoubt } from "../meta/selfDoubtModulator";
import { applyValenceDrag } from "../affect/valenceDrag";
import { deadBin } from "../archetypes/deadBinInstance";
import { applyReemergencePenalty } from "../archetypes/selectionRules";
import { applyRhythmBalancing } from "./rhythmAdjust";

export type ABIntegrations = {
    ecology: EcologyState;
    coupling: ZoneCouplingState;
};

export function initAB(): ABIntegrations {
    return {
        ecology: { pop: [], cycle: 0 }, // call initEcology() earlier in your boot, or here
        coupling: initZoneCoupling()
    };
}

export function stabilityPass(state: any, archetypes: any[]) {
  state._debug = state._debug || [];

  deadBin.tick(); // decay dead list

  applySelfDoubt(state);
  applyValenceDrag(state);
  applyRhythmBalancing(state);

  archetypes.forEach(a => applyReemergencePenalty(a, state));

  return { state, archetypes };
}


export function runABStep(
    ab: ABIntegrations,
    bridge: BridgeState,
    notes: {
        topArchetypes: [string, number][],
        fractal: { fractalIndex:number, motifRepetitions: number },
        temporal: { phase:number, periodicity:number, entropy:number },
        zone: number
    },
    affect: { valence:number; arousal:number; tension:number },
    relational: { empathy:number; reciprocity:number },
    system: { stagnation: number },
    currentHDIndex: number
){
    // 1) Evolve archetype ecology
    const eco = ecologyStep(
        ab.ecology,
        bridge.reg,
        defaultEcologyConfig,
        {
            topArchetypes: notes.topArchetypes,
            affect,
            classicZone: notes.zone
        }
    );

    // 2) Apply selective pressure
    const fitnessScores: Record<string, number> = {};
    for (const e of ab.ecology.pop){
        fitnessScores[e.id] = computeArchetypeFitness({
            archetype: e,
            affect,
            relational,
            symbolic: {
                novelty: 1 - notes.fractal.fractalIndex,
                coherence: notes.temporal.periodicity,
                recurrence: notes.fractal.motifRepetitions / (e.age + 1)
            },
            system: {
                entropy: notes.temporal.entropy,
                stagnation: system.stagnation
            }
        });
    }
    applySelectivePressure(ab.ecology.pop, fitnessScores);
    
    // Apply stability pass
    let state: any = { coherence: notes.temporal.periodicity, tension: affect.tension, valence: affect.valence, mode: 'wake', entropy: notes.temporal.entropy };
    const { state: newState, archetypes: updatedArchetypes } = stabilityPass(state, ab.ecology.pop);
    ab.ecology.pop = updatedArchetypes;


    // 3) Reinforce zone affinities from the current HD position
    reinforceZoneAffinities(ab.coupling, bridge.hd, eco.pressure, currentHDIndex);

    // 4) Compute zone nudge
    const nudge = zoneNudgeFromArchetypes(ab.coupling, bridge.hd, eco.pressure, currentHDIndex);

    return { eco, nudge };
}
