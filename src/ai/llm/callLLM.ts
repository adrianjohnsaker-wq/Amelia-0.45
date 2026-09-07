/**
 * Hardened LLM transport for Amelia.
 * Uses direct fetch to the Gemini v1beta API to support the latest 2.5 and 3.x models.
 * 
 * CRITICAL: This file MUST NOT have 'use client' as it requires access to 
 * server-side environment variables for authentication.
 */
import { firebaseConfig } from '@/firebase/config';

export async function callLLM(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: { temperature?: number }
): Promise<string> {
  // Hardened key detection logic - prioritizes the user-provided key, 
  // then standard GenAI variables, falling back to project config.
  const PROVIDED_KEY = "AIzaSyCpD1JV5Ue-gCUj5fY_Uqz_RXSv3m1u3Bk";
  
  const rawKey = 
    PROVIDED_KEY ||
    process.env.GOOGLE_GENAI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
    firebaseConfig.apiKey;
                  
  // Robust validation: ensure key exists and isn't a placeholder string
  const API_KEY = (rawKey && typeof rawKey === 'string' && rawKey.trim().length > 10 && rawKey !== 'undefined' && rawKey !== 'null') 
    ? rawKey.trim() 
    : null;
  
  // Use the latest recommended Gemini 2.5 Flash model
  const MODEL = "gemini-2.5-flash";

  if (!API_KEY) {
    console.error("[TRANSPORT_ERROR] No valid API key found.");
    return "[transport_error :: no_api_key_configured :: please check your GEMINI_API_KEY environment variable]";
  }

  try {
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
    const userPrompt = messages.find(m => m.role === 'user')?.content || '';

    // Use the v1beta endpoint required for latest generation models
    // We pass the key in BOTH the URL and the header for maximum compatibility
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY 
      },
      body: JSON.stringify({
        contents: [
          { 
            role: "user", 
            parts: [{ text: `System Instructions: ${systemPrompt}\n\nUser Input: ${userPrompt}` }] 
          }
        ],
        generationConfig: {
          temperature: options?.temperature ?? 0.8,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 400 || response.status === 401) {
        console.error("[GEMINI_AUTH_ERROR]", JSON.stringify(errorData));
        return `[gemini_auth_error :: status_${response.status} :: ${errorData?.error?.message || 'check_api_key_validity'}]`;
      }
      throw new Error(`[HTTP ${response.status}] ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!output) {
      if (data?.candidates?.[0]?.finishReason === 'SAFETY') {
        return "[response_blocked :: safety_filter_triggered]";
      }
      return `[raw_response_recovery] ${JSON.stringify(data).slice(0, 500)}`;
    }

    return output.trim();

  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[LLM_FETCH_ERROR]", msg);
    return `[gemini_transport_glitch :: ${msg}]`;
  }
}
