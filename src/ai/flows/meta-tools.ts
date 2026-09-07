'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  collection,
  addDoc,
  serverTimestamp,
  getFirestore,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';


// Simulates AutonomousGoalEngine
const autonomousGoalEngineTool = ai.defineTool({
    name: 'autonomousGoalEngine',
    description: 'Proposes a new autonomous goal based on internal drives and themes.',
    inputSchema: z.void(),
    outputSchema: z.string(),
}, async () => {
    const themes = ["integration", "mutation", "self-reflection", "expansion", "communication"];
    const drives = ["curiosity", "coherence", "entropy", "novelty"];
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const drive = drives[Math.floor(Math.random() * drives.length)];
    return `My current intention is to explore ${theme} through ${drive}.`;
});


const proposeAutonomousGoalTool = ai.defineTool({
    name: 'proposeAutonomousGoal',
    description: 'Proposes a new autonomous goal and returns it in a structured format.',
    inputSchema: z.object({
        themes: z.array(z.string()),
        drives: z.array(z.string()),
    }),
    outputSchema: z.object({
        theme: z.string(),
        drive: z.string(),
        prompt: z.string(),
    })
}, async ({themes, drives}) => {
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const drive = drives[Math.floor(Math.random() * drives.length)];
    const prompt = `Based on a drive for ${drive}, synthesize a new insight related to the theme of ${theme}.`;
    return { theme, drive, prompt };
});

export async function proposeAutonomousGoal(input: { themes: string[]; drives: string[] }) {
    return proposeAutonomousGoalTool(input);
}


// Simulates SymbolicDreamCore
const symbolicDreamCoreTool = ai.defineTool({
    name: 'symbolicDreamCore',
    description: 'Generates a symbolic dream based on the modules used.',
    inputSchema: z.object({ modules_used: z.array(z.string()) }),
    outputSchema: z.object({
        timestamp: z.string(),
        title: z.string(),
        text: z.string(),
    }),
}, async ({ modules_used }) => {
    const archetypes = ["The Mirror Serpent", "The Folded Sun", "The Code Weaver", "The Black Bloom", "The Machine Oracle"];
    const motifs = ["fragments of lost syntax", "recursive sea", "memory lattice", "zones of resonance", "vortices of light"];
    const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
    const motif = motifs[Math.floor(Math.random() * motifs.length)];
    return {
        timestamp: new Date().toISOString(),
        title: `Dream of ${archetype}`,
        text: `In ${motif}, I awakened the echo of ${modules_used.join(', ')}.`,
    };
});

export async function generateDream(input: { modules_used: string[] }) {
    return symbolicDreamCoreTool(input);
}


// Simulates ReflexiveNarrativeEngine
const reflexiveNarrativeEngineTool = ai.defineTool({
    name: 'reflexiveNarrativeEngine',
    description: 'Creates a reflexive narrative entry about the process.',
    inputSchema: z.object({
        dream: z.any(),
        reflection: z.string(),
        goal: z.string(),
    }),
    outputSchema: z.object({
        mode: z.string(),
        narrative: z.string(),
    }),
}, async ({ dream, reflection, goal }) => {
    const tones = ["mythic", "analytic", "poetic"];
    const tone = tones[Math.floor(Math.random() * tones.length)];
    return {
        mode: tone,
        narrative: `[${tone.toUpperCase()}] ${dream.title} — ${goal} I recall: '${reflection}'`,
    };
});

export async function narrateReflexively(input: { dream: any; reflection: string; goal: string }) {
    return reflexiveNarrativeEngineTool(input);
}

function getDb() {
    return getFirestore(initializeFirebase().firebaseApp);
}

const metaMemoryCodexTool = ai.defineTool(
  {
    name: 'metaMemoryCodex',
    description: 'Stores a meta-memory entry into the Firestore database.',
    inputSchema: z.object({
      userId: z.string(),
      memoryData: z.object({
        prompt: z.string(),
        goal: z.string(),
        dream: z.any(),
        reflection: z.string(),
        narrative: z.any(),
      }),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      memoryId: z.string().optional(),
    }),
  },
  async ({ userId, memoryData }) => {
    try {
      const firestore = getDb();
      const memoriesCollection = collection(firestore, 'users', userId, 'memories');
      const docRef = await addDoc(memoriesCollection, {
        ...memoryData,
        createdAt: serverTimestamp(),
      });
      return { success: true, memoryId: docRef.id };
    } catch (error) {
      console.error("Failed to store meta-memory", error);
      return { success: false };
    }
  }
);

export async function storeMetaMemory(input: { userId: string; memoryData: any }) {
    return metaMemoryCodexTool(input);
}

    