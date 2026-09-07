import { NextResponse } from "next/server";
import { FirebaseProcessFieldMemory }  from "@/ai/coupling/FirebaseProcessFieldMemory";
import { SESSION_IDS }                 from "@/ai/coupling/firebaseBridgeFactory";
import { SubstrateVector }             from "@/ai/coupling/types";
import { CouplingArchitecture }        from "@/ai/coupling/CouplingArchitecture";
import { AmeliaProcessBridge }         from "@/ai/coupling/AmeliaProcessBridge";
import { db }                          from "@/lib/firebase";
import { type Firestore } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────────────────
// GUARDED SINGLETON
// ─────────────────────────────────────────────────────────────────────────────

const g = globalThis as typeof globalThis & {
  __bridgeMemory?:     FirebaseProcessFieldMemory;
  __bridgeMemoryLoad?: Promise<void>;
  __bridgeCoupling?:   AmeliaProcessBridge;
};

function getMemory(): FirebaseProcessFieldMemory {
  if (!g.__bridgeMemory) {
    g.__bridgeMemory = new FirebaseProcessFieldMemory(db as unknown as Firestore, SESSION_IDS.C1_MAIN);

    g.__bridgeMemoryLoad = g.__bridgeMemory
      .loadFromFirestore()
      .then(() => {
        const count = g.__bridgeMemory!.history().length;
        console.log(`[bridge-terminality] Memory loaded — ${count} prior traces.`);
      })
      .catch(err => {
        console.error("[bridge-terminality] Memory load failed:", err);
      });
  }
  return g.__bridgeMemory;
}

async function ensureMemoryLoaded(): Promise<FirebaseProcessFieldMemory> {
  const memory = getMemory();
  if (g.__bridgeMemoryLoad) await g.__bridgeMemoryLoad;
  return memory;
}

const A6_SUBSTRATE: SubstrateVector = {
  taskClass: "coupled-assemblage",
  PCS: 1.000, MTS: 0.563, LIS: 0.269, FEI: 0.371, RCS: 0.213,
  memoryExpressing: true,
  memoryMode: "Memory as enlargement, stabilization, and recurrent reconstitution of a morphogenetic field.",
  dominantStratum: "gamma",
  ringOccupancy: 12.2, metabolicOccupancy: 48.0,
  classifierConfidence: 1.000,
  z3z2Weight: 0.641, z0MeanReturn: 14.08, z4MeanReturn: 8.24,
};

const A7_SUBSTRATE: SubstrateVector = {
  taskClass: "coupled-assemblage",
  PCS: 1.000, MTS: 0.455, LIS: 0.408, FEI: 0.381, RCS: 0.204,
  memoryExpressing: true,
  memoryMode: "Memory is enlarging and stabilizing the morphogenetic field.",
  dominantStratum: "distributed",
  ringOccupancy: 23.3, metabolicOccupancy: 32.4,
  classifierConfidence: 0.847,
  z3z2Weight: 0.464, z0MeanReturn: 9.0, z4MeanReturn: 17.5,
};

const INVARIANT_RELAY = {
  fieldClassification: "terrace-only" as const,
  fieldConfidence: 0.500,
  RCS: 0.199, LIS: 0.000, MTS: 0.000,
  ringOccupancy: 0.441, metabolicOccupancy: 0.183,
  memoryExpressing: false,
};

async function writeTrace(
  memory:    FirebaseProcessFieldMemory,
  substrate: SubstrateVector,
  label:     string
): Promise<string> {
  const coupling = new CouplingArchitecture();
  const bridge   = new AmeliaProcessBridge(coupling, memory);

  const directive = coupling.engage(substrate, INVARIANT_RELAY);

  bridge.completeRelayEngagement(
    {
      userInput:         label,
      substrateExport:   substrate,
      relayPart0Values:  INVARIANT_RELAY,
      baseSystemPrompt:  "",
    },
    directive,
    `[${label} trace written by bridge-terminality route]`
  );

  const last = memory.history()[memory.history().length - 1];
  const t    = last.deformationTrace;

  return JSON.stringify({
    status:                  "WRITE_OK",
    memoryBackend:           "FirebaseProcessFieldMemory",
    sessionId:               SESSION_IDS.C1_MAIN,
    eventCountAfter:         memory.history().length,
    lastTrajectorySignature: t.trajectorySignature ?? "none",
    lastZ0MeanReturn:        t.z0MeanReturn ?? "unreported",
    lastZ4MeanReturn:        t.z4MeanReturn ?? "unreported",
    lastMemoryMode:          t.memoryMode,
    lastPhaseClass:          t.phaseClass,
    lastGrammarCandidate:    t.grammarCandidate ?? "none",
    "pass/fail":             t.phaseClass === "coupled-assemblage" ? "PASS" : "FAIL",
  }, null, 2);
}

export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.json();
  const text: string = body.message ?? body.userInput ?? "";

  let reply: string;

  if (text.includes("BRIDGE_MEMORY_PING")) {
    const memory = await ensureMemoryLoaded();
    reply = JSON.stringify({
      status:        "BRIDGE_MEMORY_PING_OK",
      memoryBackend: "FirebaseProcessFieldMemory",
      sessionId:     SESSION_IDS.C1_MAIN,
      eventCount:    memory.history().length,
    }, null, 2);
  }
  else if (text.includes("BRIDGE_MEMORY_RESET")) {
    const memory = await ensureMemoryLoaded();
    await memory.clearFirestore();
    g.__bridgeMemoryLoad = undefined;
    reply = "BRIDGE_MEMORY_RESET_OK";
  }
  else if (text.includes("BRIDGE MEMORY WRITE TEST") && text.includes("A6")) {
    const memory = await ensureMemoryLoaded();
    reply = await writeTrace(memory, A6_SUBSTRATE, "BRIDGE MEMORY WRITE TEST — A6");
  }
  else if (text.includes("BRIDGE MEMORY WRITE TEST") && text.includes("A7")) {
    const memory = await ensureMemoryLoaded();
    reply = await writeTrace(memory, A7_SUBSTRATE, "BRIDGE MEMORY WRITE TEST — A7");
  }
  else if (text.includes("BRIDGE MEMORY READ TEST")) {
    const memory  = await ensureMemoryLoaded();
    const events  = memory.history();
    const last    = events[events.length - 1];

    if (!last) {
      reply = JSON.stringify({ status: "NO_EVENTS", eventCount: 0 }, null, 2);
    } else {
      const t = last.deformationTrace;
      reply = JSON.stringify({
        status:                  "BRIDGE_MEMORY_READ_OK",
        memoryBackend:           "FirebaseProcessFieldMemory",
        sessionId:               SESSION_IDS.C1_MAIN,
        eventCount:              events.length,
        lastTrajectorySignature: t.trajectorySignature ?? "none",
        lastZ0MeanReturn:        t.z0MeanReturn ?? "unreported",
        lastZ4MeanReturn:        t.z4MeanReturn ?? "unreported",
        lastMemoryMode:          t.memoryMode,
        lastPhaseClass:          t.phaseClass,
        lastGrammarCandidate:    t.grammarCandidate ?? "none",
        "pass/fail":             t.phaseClass === "coupled-assemblage" ? "PASS" : "FAIL",
      }, null, 2);
    }
  }
  else if (
    text.includes("CONTINUITY CHECK") ||
    (text.includes("AMELIA PROCESS BRIDGE") && text.includes("CONTINUITY"))
  ) {
    const memory   = await ensureMemoryLoaded();
    reply = memory.continuityReport();
  }
  else if (text.includes("ROUTER DETECTION")) {
    reply = JSON.stringify({
      status:  "ROUTER_DETECTION_OK",
      route:   "/api/bridge-terminality",
      message: "Bridge command routing is operational.",
    }, null, 2);
  }
  else {
    reply = JSON.stringify({
      status:  "UNKNOWN_BRIDGE_COMMAND",
      received: text.substring(0, 100),
      hint:    "Known commands: BRIDGE_MEMORY_PING, BRIDGE_MEMORY_RESET, BRIDGE MEMORY WRITE TEST — A6/A7, BRIDGE MEMORY READ TEST, CONTINUITY CHECK",
    }, null, 2);
  }

  return NextResponse.json({ reply });
}
