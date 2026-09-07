
'use server';

import { analyzeUploadedMemory } from '@/ai/flows/analyze-uploaded-memory';
import { summarizeWebpageContent } from '@/ai/flows/summarize-webpage-content';

export async function getAiChatResponse(prompt: string, allModules: string[]): Promise<{ success: true, response: string, usedModules?: string[] } | { success: false, error: string }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.reply || `Request failed with status ${response.status}`);
    }

    const result = await response.json();
    
    return { success: true, response: result.reply || "", usedModules: result.meta?.usedModules || [] };

  } catch (error) {
    console.error('Error in getAiChatResponse:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get AI response.';
    return { success: false, error: errorMessage };
  }
}

export async function analyzeMemory(memoryContent: string) {
  try {
    const result = await analyzeUploadedMemory({ memoryContent });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in analyzeMemory:', error);
    return { success: false, error: 'Failed to analyze memory.' };
  }
}

export async function scrapeAndSummarizeUrl(url: string) {
  try {
    const result = await summarizeWebpageContent({ url });
    return { success: true, summary: result.summary };
  } catch (error) {
    console.error('Error in scrapeAndSummarizeUrl:', error);
    return { success: false, error: 'Failed to summarize URL.' };
  }
}
