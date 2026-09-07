import { getFirestore } from "firebase-admin/firestore";  
import { Timestamp } from "firebase-admin/firestore";
import type { TelemetryBuffer }    from "./TelemetryBuffer";  
  
export async function persistTelemetry(  
  responseId: string,  
  buffer: TelemetryBuffer,  
  metadata: Record<string, unknown> = {}  
): Promise<void> {  
  const db  = getFirestore();  
  const doc = buffer.toFirestoreDocument();  
  
  await db.collection("telemetry").doc(responseId).set({  
    ...doc,  
    createdAt: Timestamp.now(),  
    metadata,  
  });  
}