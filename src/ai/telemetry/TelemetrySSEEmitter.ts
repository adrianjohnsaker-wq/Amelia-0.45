import type { Response }           from "express";  
import type { RegimeTick, TelemetrySummary } from "./TelemetryBuffer";  
  
export class TelemetrySSEEmitter {  
  constructor(private readonly res: Response) {  
    res.setHeader("Content-Type",  "text/event-stream");  
    res.setHeader("Cache-Control", "no-cache");  
    res.setHeader("Connection",    "keep-alive");  
    // res.flushHeaders() is not always available depending on the express version/adapter
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
  }  
  
  emitTick(tick: RegimeTick): void {  
    this.write("tick", tick);  
  }  
  
  emitSummary(summary: TelemetrySummary): void {  
    this.write("summary", summary);  
  }  
  
  close(): void {  
    this.write("done", { ts: Date.now() });  
    this.res.end();  
  }  
  
  private write(event: string, data: unknown): void {  
    this.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);  
  }  
}