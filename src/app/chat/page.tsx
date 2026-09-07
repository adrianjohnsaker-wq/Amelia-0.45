"use client";
import { useState, useEffect } from "react";
import { Stage6ResultsPanel } from "../ui/Stage6ResultsPanel";
import { initStage6Observer } from "@/analysis/stage6/Stage6Observer";

function isBridgeCommand(message: string): boolean {
  return (
    message.includes("BRIDGE_MEMORY_PING") ||
    message.includes("BRIDGE_MEMORY_RESET") ||
    message.includes("BRIDGE MEMORY WRITE TEST") ||
    message.includes("BRIDGE MEMORY READ TEST") ||
    message.includes("BRIDGE TERMINALITY TEST") ||
    message.includes("ROUTER DETECTION") ||
    message.includes("AMELIA PROCESS BRIDGE") ||
    message.includes("CONTINUITY CHECK")
  );
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string | null }[]
  >([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    initStage6Observer();
  }, []);

  async function dispatchAmeliaStep(detail: any) {
     window.dispatchEvent(new CustomEvent("amelia:step", { detail }));
  }

  async function sendMessage() {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setInput("");

    const isBridge = isBridgeCommand(userMsg);
    const apiUrl = isBridge ? "/api/bridge-terminality" : "/api/chat";

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });

      const raw = await res.text();
      console.log("[fetch status]", res.status);
      
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch (err) {
        throw new Error(`Expected JSON but received non-JSON. Status=${res.status}. Body starts: ${raw.slice(0, 200)}`);
      }
      
      const aiText =
        data.reply ??
        data.response ??
        data.text ??
        JSON.stringify(data, null, 2);

      setMessages((m) => [
        ...m,
        { role: "ai", text: aiText },
      ]);

      if (!isBridge) {
        if (data.meta?.stepsTrace && Array.isArray(data.meta.stepsTrace)) {
          data.meta.stepsTrace.forEach((step: any, idx: number) => {
            if (idx === data.meta.stepsTrace.length - 1) {
              step.output = aiText;
              step.outputLen = aiText.length;
            }
            dispatchAmeliaStep(step);
          });
        } else if (data.meta) {
          dispatchAmeliaStep({
            t: data.meta?.numogram?.tick ?? Date.now(),
            input: userMsg,
            output: aiText,
            outputLen: aiText.length,
            regime: data.meta?.numogram?.mutationTag ?? 'unknown',
            field: {
              intensity: data.meta?.numogram?.intensity ?? 0,
              tension: data.meta?.numogram?.tension ?? 0,
              entropy: data.meta?.numogram?.entropy ?? 0,
              turbulence: 0
            },
            renderer: 'gemini',
          });
        }
      }

    } catch (err: any) {
      console.error("Chat error:", err);
      const errorText = `Error: ${err.message || "An unexpected error occurred."}`;
      setMessages((m) => [
        ...m,
        { role: "ai", text: errorText },
      ]);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", color: "#eee", background: '#0c0a09', minHeight: '100vh' }}>
      <div style={{ position: 'relative', borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1>Amelia</h1>
        <button
          onClick={() => setShowResults(true)}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: "#27272a",
            color: "#fff",
            border: "1px solid #3f3f46",
            padding: "6px 12px",
            cursor: "pointer",
            borderRadius: '4px'
          }}
        >
          Results
        </button>
      </div>

      {showResults && <Stage6ResultsPanel onClose={() => setShowResults(false)} />}

      <div
        style={{
          border: "1px solid #3f3f46",
          padding: 10,
          height: "60vh",
          overflowY: "auto",
          marginBottom: 20,
          background: '#18181b',
          borderRadius: '4px'
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 12, lineHeight: 1.6 }}>
            <strong style={{ color: msg.role === "user" ? "#93c5fd" : "#c4b5fd", display: 'block', marginBottom: '4px' }}>
              {msg.role === "user" ? "You" : "Amelia"}
            </strong>
            <div style={{ whiteSpace: 'pre-wrap'}}>{msg.text}</div>
          </div>
        ))}
      </div>
      <div style={{display: 'flex'}}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          style={{
            width: "calc(100% - 80px)",
            padding: 8,
            background: "#27272a",
            color: "#fff",
            border: "1px solid #3f3f46",
            borderRadius: '4px'
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            marginLeft: 10,
            padding: "8px 14px",
            background: "#3f3f46",
            color: "#fff",
            border: "1px solid #52525b",
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
