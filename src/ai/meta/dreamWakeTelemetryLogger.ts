// -------------------------------------------------------------
// Dream–Wake Telemetry Logger
// Records metrics for each autonomous cycle in Amelia's architecture.
// Works as a passive observer—does not alter state, only witnesses it.
// -------------------------------------------------------------
import fs from "fs";
import path from "path";

export interface TelemetryEntry {
  cycleId: string;
  timestamp: number;
  mode: "dream" | "wake";
  temperature: number;
  poeticWeight: number;
  coherence: number;
  entropy: number;
  affect: {
    valence: number;
    arousal: number;
    tension: number;
  };
  modulesActivated: string[];
  notes?: string; // optional narrative or annotation
}

export interface TelemetryLog {
  entries: TelemetryEntry[];
  stats: {
    totalCycles: number;
    dreamCount: number;
    wakeCount: number;
    avgCoherence: number;
    avgEntropy: number;
    avgValence: number;
    avgTension: number;
  };
}

const TELEMETRY_DIR = "data";
const TELEMETRY_PATH = path.join(TELEMETRY_DIR, "dreamWakeTelemetry.json");


// Persistent in-memory buffer
let telemetryBuffer: TelemetryEntry[] = [];

// Ensure the data directory exists
function ensureDataDirectory() {
    if (typeof window === 'undefined' && !fs.existsSync(TELEMETRY_DIR)) {
        fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
    }
}

// Load existing telemetry on startup
function loadTelemetry() {
    if (typeof window !== 'undefined') return;
    try {
        if (fs.existsSync(TELEMETRY_PATH)) {
            const data = fs.readFileSync(TELEMETRY_PATH, 'utf-8');
            const log: TelemetryLog = JSON.parse(data);
            telemetryBuffer = log.entries || [];
        }
    } catch (err) {
        console.error("[Telemetry] Failed to load existing log:", err);
        telemetryBuffer = [];
    }
}

// Initialize
if (typeof window === 'undefined') {
    ensureDataDirectory();
    loadTelemetry();
}


/* --- Log a single cycle --- */
export function logDreamWakeCycle(entry: TelemetryEntry) {
  telemetryBuffer.push(entry);
  if (telemetryBuffer.length % 25 === 0) { // Flush every 25 entries
    flushTelemetry();
  }
}

/* --- Write log to disk (or remote DB) --- */
export function flushTelemetry() {
  if (typeof window !== 'undefined') return; // Don't run on client
  const log: TelemetryLog = compileTelemetryStats();
  try {
    ensureDataDirectory();
    fs.writeFileSync(TELEMETRY_PATH, JSON.stringify(log, null, 2));
    console.log(`[Telemetry] Saved ${log.stats.totalCycles} entries → ${TELEMETRY_PATH}`);
  } catch (err) {
    console.error("[Telemetry] Failed to save:", err);
  }
}

/* --- Compute aggregate statistics --- */
function compileTelemetryStats(): TelemetryLog {
  const n = telemetryBuffer.length || 1;
  const dream = telemetryBuffer.filter(e => e.mode === "dream").length;
  const wake = telemetryBuffer.filter(e => e.mode === "wake").length;

  const avg = (key: 'coherence' | 'entropy') => telemetryBuffer.reduce((a, e) => a + (e[key] || 0), 0) / n;
  
  const avgAffect = (axis: keyof TelemetryEntry["affect"]) => {
      const total = telemetryBuffer.reduce((a, e) => a + (e.affect?.[axis] || 0), 0);
      return total / n;
  };

  return {
    entries: telemetryBuffer,
    stats: {
      totalCycles: n,
      dreamCount: dream,
      wakeCount: wake,
      avgCoherence: avg("coherence"),
      avgEntropy: avg("entropy"),
      avgValence: avgAffect("valence"),
      avgTension: avgAffect("tension")
    }
  };
}

/* --- Reset buffer manually if needed --- */
export function clearTelemetryBuffer() {
  telemetryBuffer = [];
  console.log("[Telemetry] Buffer cleared.");
  flushTelemetry(); // also clear the file
}

/* --- Retrieve current stats without writing --- */
export function getCurrentTelemetryStats() {
  return compileTelemetryStats().stats;
}
