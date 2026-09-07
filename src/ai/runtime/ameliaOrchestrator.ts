
// src/ai/runtime/ameliaOrchestrator.ts
import { autonomousCycleOnce } from '../flows/autonomous-cycle';

/**
 * Main orchestrator.
 * - Injects prompt pulses into the substrate
 * - Runs the full autonomous-cycle + expressive relay pipeline
 * - Returns final natural-language output for the UI
 */
export async function ameliaRespond(prompt: string) {
  try {
    const text = await autonomousCycleOnce(prompt);

    // --- Handle silence gracefully ---
    if (!text || text.trim().length === 0) {
      return {
        text: null, // UI should not render an empty bubble
        meta: { wasSilent: true },
      };
    }

    // --- Return formatted natural-language output ---
    return {
      text,
      meta: { wasSilent: false },
    };
  } catch (error) {
    console.error('Amelia orchestrator error:', error);

    return {
      text: '⚠️ An internal process in Amelia misfired.',
      meta: null,
    };
  }
}
