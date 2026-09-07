// ============================================================================
// ECOLOGICAL INTELLIGENCE - PUBLIC API
// ============================================================================

export * from './types';
export * from './measurements';
export { MemorySystem } from './memory';
export { OperatorSystem } from './operators';
export { EcologyManager } from './integration';

// Re-export default config for convenience
export { DEFAULT_ECOLOGY_CONFIG } from './types';
