// ============================================================================
// ECOLOGICAL INTELLIGENCE - FIREBASE PERSISTENCE
// ============================================================================

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { EcologyManager } from './integration';
import { TrajectoryMemory, Operator, EcologyConfig } from './types';

/**
 * Firebase paths for ecology data
 */
const ECOLOGY_PATHS = {
  memories: (userId: string) => `users/${userId}/ecology/memories`,
  operators: (userId: string) => `users/${userId}/ecology/operators`,
  metadata: (userId: string) => `users/${userId}/ecology/metadata`
};

/**
 * Save ecology state to Firebase
 */
export async function saveEcologyState(
  userId: string,
  ecology: EcologyManager
): Promise<void> {
  const db = getFirestore();
  const state = ecology.exportState();
  
  const batch = db.batch();
  
  // Save memories
  const memoriesRef = db.collection(ECOLOGY_PATHS.memories(userId));
  state.memories.forEach((memory) => {
    const docRef = memoriesRef.doc(memory.id);
    batch.set(docRef, {
      ...memory,
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  
  // Save operators
  const operatorsRef = db.collection(ECOLOGY_PATHS.operators(userId));
  state.operators.forEach(operator => {
    const docRef = operatorsRef.doc(operator.id);
    batch.set(docRef, {
      ...operator,
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  
  // Save config and metadata
  const metadataRef = db.doc(ECOLOGY_PATHS.metadata(userId));
  batch.set(metadataRef, {
    currentStep: state.currentStep,
    config: state.config,
    memoryCount: state.memories.length,
    operatorCount: state.operators.length,
    lastUpdated: FieldValue.serverTimestamp()
  });
  
  await batch.commit();
}

/**
 * Load ecology state from Firebase
 */
export async function loadEcologyState(
  userId: string
): Promise<{
  config: EcologyConfig;
  memories: TrajectoryMemory[];
  operators: Operator[];
  currentStep: number;
} | null> {
  const db = getFirestore();
  
  try {
    // Load metadata
    const metadataDoc = await db.doc(ECOLOGY_PATHS.metadata(userId)).get();
    if (!metadataDoc.exists) {
      return null;
    }
    
    const metadata = metadataDoc.data()!;
    
    // Load memories
    const memoriesSnapshot = await db.collection(ECOLOGY_PATHS.memories(userId)).get();
    const memories: TrajectoryMemory[] = memoriesSnapshot.docs.map(doc => {
      const data = doc.data();
      const { updatedAt, ...memory } = data;
      return memory as TrajectoryMemory;
    });
    
    // Load operators
    const operatorsSnapshot = await db.collection(ECOLOGY_PATHS.operators(userId)).get();
    const operators: Operator[] = operatorsSnapshot.docs.map(doc => {
      const data = doc.data();
      const { updatedAt, ...operator } = data;
      return operator as Operator;
    });
    
    return {
      config: metadata.config,
      memories,
      operators,
      currentStep: metadata.currentStep
    };
  } catch (error) {
    console.error('Error loading ecology state:', error);
    return null;
  }
}
