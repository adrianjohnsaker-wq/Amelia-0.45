// src/app/api/chat/route.ts

import { NextResponse } from "next/server";

function extractUserText(body: any): string {
  return (
    body?.message ??
    body?.userInput ??
    body?.input ??
    body?.prompt ??
    body?.text ??
    body?.messages?.[body.messages.length - 1]?.content ??
    ""
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userText = extractUserText(body);

    const { runCycle } = await import("@/ai/runtime/cycle");

    // We pass a baseline state to runCycle. 
    const baselineState: any = {
        processState: { numo: null, substrate: { time: 0, heartbeatPhase: 0, pulses: [], reservoirSignature: "init" } },
        reservoir: {},
        eventSurface: {},
        driftState: {},
        cycleCount: 0,
        timestamp: Date.now()
    };

    const result = await Promise.race([
      runCycle(
        baselineState.processState,
        null,
        baselineState.reservoir,
        baselineState.eventSurface,
        baselineState.driftState,
        { userPrompt: userText, ...body },
        baselineState.cycleCount
      ),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("runCycle timed out after 25000ms")),
          25000
        )
      ),
    ]);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/chat] failed:", err);

    return NextResponse.json(
      {
        ok: false,
        status: "API_RUNTIME_ERROR",
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
