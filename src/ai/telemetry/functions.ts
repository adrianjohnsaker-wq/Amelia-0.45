import * as functions                       from "firebase-functions";  
import { TelemetryOrchestrator }            from "./TelemetryOrchestrator";  
import { TelemetrySSEEmitter }              from "./TelemetrySSEEmitter";  
import { persistTelemetry }                 from "./firestorePersistence";  
  
/**
 * A Firebase Function that handles real-time telemetry streaming from an LLM.
 * Note: llmStream must be defined based on your specific Genkit/LLM implementation.
 */
export const streamHandler = functions.https.onRequest(async (req, res) => {  
  const responseId = crypto.randomUUID();  
  const emitter    = new TelemetrySSEEmitter(res);  
  
  const orchestrator = new TelemetryOrchestrator(  
    (tick) => emitter.emitTick(tick),  
    { chunkSize: 12, smoothingFactor: 0.3, driftThreshold: 0.35, overlapTokens: 4 }  
  );  
  
  try {  
    // This is a placeholder for where you'd connect your LLM stream.
    // Replace with: for await (const token of yourAiFlow.stream(input)) { ... }
    const llmStream: any[] = []; 
    
    for await (const token of llmStream) {  
      await orchestrator.ingestToken(token);  
    }  
  
    const summary = await orchestrator.finalize();  
    emitter.emitSummary(summary);  
  
    // Mode B — optional Firestore persistence  
    await persistTelemetry(responseId, orchestrator.getBuffer(), {  
      model: "Gemini",
      promptHash: req.body?.promptHash || 'unknown',  
    });  
  
  } catch (err) {  
    console.error("[streamHandler] fatal:", err);  
  } finally {  
    emitter.close();  
  }  
});