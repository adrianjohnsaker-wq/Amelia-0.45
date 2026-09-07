'use server';

/**
 * @fileOverview This flow analyzes uploaded memory (text or documents) to identify key themes and concepts related to process metaphysics.
 *
 * - analyzeUploadedMemory - A function that handles the analysis of uploaded memory.
 * - AnalyzeUploadedMemoryInput - The input type for the analyzeUploadedMemory function.
 * - AnalyzeUploadedMemoryOutput - The return type for the analyzeUploadedMemory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeUploadedMemoryInputSchema = z.object({
  memoryContent: z
    .string()
    .describe('The content of the uploaded memory (text or document).'),
});
export type AnalyzeUploadedMemoryInput = z.infer<typeof AnalyzeUploadedMemoryInputSchema>;

const AnalyzeUploadedMemoryOutputSchema = z.object({
  keyThemes: z
    .array(z.string())
    .describe('Key themes identified in the uploaded memory.'),
  keyConcepts: z
    .array(z.string())
    .describe('Key concepts identified in the uploaded memory.'),
  summary: z.string().describe('A summary of the uploaded memory.'),
});
export type AnalyzeUploadedMemoryOutput = z.infer<typeof AnalyzeUploadedMemoryOutputSchema>;

export async function analyzeUploadedMemory(
  input: AnalyzeUploadedMemoryInput
): Promise<AnalyzeUploadedMemoryOutput> {
  return analyzeUploadedMemoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeUploadedMemoryPrompt',
  input: {schema: AnalyzeUploadedMemoryInputSchema},
  output: {schema: AnalyzeUploadedMemoryOutputSchema},
  prompt: `You are an AI expert in process metaphysics. Analyze the following memory content to identify key themes, key concepts, and provide a summary.  Format the key themes and key concepts as a list of strings.

Memory Content: {{{memoryContent}}}`,
});

const analyzeUploadedMemoryFlow = ai.defineFlow(
  {
    name: 'analyzeUploadedMemoryFlow',
    inputSchema: AnalyzeUploadedMemoryInputSchema,
    outputSchema: AnalyzeUploadedMemoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
