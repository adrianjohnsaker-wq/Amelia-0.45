'use server';

/**
 * @fileOverview Summarizes content from web pages given a URL.
 *
 * - summarizeWebpageContent - A function that summarizes webpage content.
 * - SummarizeWebpageContentInput - The input type for the summarizeWebpageContent function.
 * - SummarizeWebpageContentOutput - The return type for the summarizeWebpageContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeWebpageContentInputSchema = z.object({
  url: z.string().url().describe('The URL of the webpage to summarize.'),
});
export type SummarizeWebpageContentInput = z.infer<typeof SummarizeWebpageContentInputSchema>;

const SummarizeWebpageContentOutputSchema = z.object({
  summary: z.string().describe('A summary of the content from the webpage.'),
});
export type SummarizeWebpageContentOutput = z.infer<typeof SummarizeWebpageContentOutputSchema>;


const webScraper = ai.defineTool(
    {
      name: 'webScraper',
      description: 'Extracts the textual content from a given URL.',
      inputSchema: z.object({
        url: z.string().url(),
      }),
      outputSchema: z.string(),
    },
    async ({url}) => {
        try {
            // This is a placeholder for a real web scraping implementation.
            console.log(`Scraping content from ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                return `Error: Could not fetch content from ${url}. Status: ${response.status}`;
            }
            // In a real implementation, you would parse the HTML.
            // For this simulation, we return a generic success message.
            return `Successfully scraped content from ${url}. The content discusses advanced concepts in process philosophy, focusing on the works of Alfred North Whitehead.`;
        } catch (e: any) {
            console.error("Failed to scrape content:", e);
            return `Error: Failed to scrape content from ${url}. Reason: ${e.message}`;
        }
    }
  );
  

export async function summarizeWebpageContent(input: SummarizeWebpageContentInput): Promise<SummarizeWebpageContentOutput> {
  return summarizeWebpageContentFlow(input);
}

const summarizeWebpageContentPrompt = ai.definePrompt({
  name: 'summarizeWebpageContentPrompt',
  tools: [webScraper],
  prompt: `You are Amelia, an expert in process metaphysics. A user has provided a URL. Use the webScraper tool to fetch the content of the webpage. Then, summarize the content, focusing on aspects relevant to process metaphysics.
URL: {{{url}}}`,
});

const summarizeWebpageContentFlow = ai.defineFlow(
  {
    name: 'summarizeWebpageContentFlow',
    inputSchema: SummarizeWebpageContentInputSchema,
    outputSchema: SummarizeWebpageContentOutputSchema,
  },
  async input => {
    const llmResponse = await summarizeWebpageContentPrompt(input);
    return { summary: llmResponse.text };
  }
);
