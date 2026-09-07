// cognitive-homeostasis.ts

import { ForestState, CellState, OperatorClass } from "./types"
import { OrganState, Organ } from "./organogenesis"

export type HomeostasisParams = {
  balanceStrength: number
  regulationRate: number
  stressMitigation: number
  mutationSuppression: number
  activationDamping: number
}

type OrganMetrics = {
  meanActivation: number
  meanStress: number
  meanCoherence: number
  operatorProfile: Record<OperatorClass, number>
}

function mean(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((a,b)=>a+b,0)/values.length
}

function computeOperatorProfile(cells: CellState[]) {
  const profile: Record<OperatorClass, number> = {
    attention:0,
    inference:0,
    memory:0,
    mutation:0,
    stabilizer:0
  }

  for (const c of cells) {
    for (const k of Object.keys(c.localField) as OperatorClass[]) {
      profile[k]+=c.localField[k]
    }
  }

  const total = Object.values(profile).reduce((a,b)=>a+b,0) || 1

  for (const k of Object.keys(profile) as OperatorClass[]) {
    profile[k] /= total
  }

  return profile
}

function organMetrics(organ: Organ, forest: ForestState): OrganMetrics {
  const cells = Array.from(organ.cells)
    .map(id => forest.cells.find(c=>c.id===id))
    .filter(Boolean) as CellState[]

  return {
    meanActivation: mean(cells.map(c=>c.activation)),
    meanStress: mean(cells.map(c=>c.stress)),
    meanCoherence: mean(cells.map(c=>c.coherence)),
    operatorProfile: computeOperatorProfile(cells)
  }
}

function computeSystemProfile(organs: Organ[], forest: ForestState) {
  const metrics = organs.map(o => organMetrics(o,forest))

  return {
    activation: mean(metrics.map(m=>m.meanActivation)),
    stress: mean(metrics.map(m=>m.meanStress)),
    coherence: mean(metrics.map(m=>m.meanCoherence))
  }
}

function regulateCell(
  cell: CellState,
  organMetric: OrganMetrics,
  systemMetric: {activation:number,stress:number,coherence:number},
  params: HomeostasisParams
): CellState {
  const activationError = organMetric.meanActivation - systemMetric.activation
  const stressError = organMetric.meanStress - systemMetric.stress
  const coherenceError = organMetric.meanCoherence - systemMetric.coherence

  const activation = cell.activation - params.activationDamping * activationError
  const stress = cell.stress - params.stressMitigation * stressError
  const coherence = cell.coherence - params.balanceStrength * coherenceError

  const mutationAdjustment = params.mutationSuppression * stressError
  const newLocalField = { ...cell.localField }

  newLocalField.mutation = Math.max(0,newLocalField.mutation - mutationAdjustment)
  newLocalField.stabilizer = newLocalField.stabilizer + params.regulationRate * stressError

  return {
    ...cell,
    activation,
    stress,
    coherence,
    localField:newLocalField
  }
}

export function runCognitiveHomeostasis(
  forest: ForestState,
  organState: OrganState,
  params: HomeostasisParams
): ForestState {
  const organs = Object.values(organState.organs)
  if (organs.length === 0) return forest

  const systemMetric = computeSystemProfile(organs,forest)
  const updatedCells: CellState[] = forest.cells.map(c=>({...c}))
  const cellIndex: Record<string,number> = {}
  updatedCells.forEach((c,i)=>cellIndex[c.id]=i)

  for (const organ of organs) {
    const metrics = organMetrics(organ,forest)
    for (const cellId of organ.cells) {
      const idx = cellIndex[cellId]
      if (idx === undefined) continue
      updatedCells[idx] = regulateCell(
        updatedCells[idx],
        metrics,
        systemMetric,
        params
      )
    }
  }

  return {
    ...forest,
    cells:updatedCells
  }
}
