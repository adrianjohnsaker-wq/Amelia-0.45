
export type Zone = string;

export const defaultZoneMap: Record<string, Zone> = {
  DRIFT: "Z-DRIFT",
  NON_ESCALATION: "Z-HOLD",
  NON_RESOLUTION: "Z-OPEN",
  SPARSE_CONTINUOUS: "Z-SPARSE",
  REMAIN_HERE: "Z-STAY",
};

export function regimesToZones(regimes: string[], map = defaultZoneMap) {
  return regimes.map(r => map[r] ?? "Z-UNKNOWN");
}
