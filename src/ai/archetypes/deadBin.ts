// src/ai/archetypes/deadBin.ts

interface DeadArchetype { name: string; ttl: number; }

export class DeadArchetypeBin {
  private bin: DeadArchetype[] = [];
  private ttlDefault = 5; // cycles

  add(name: string) {
    if (!this.contains(name)) {
      this.bin.push({ name, ttl: this.ttlDefault });
    }
  }

  tick() {
    this.bin = this.bin
      .map(a => ({ ...a, ttl: a.ttl - 1 }))
      .filter(a => a.ttl > 0);
  }

  contains(name: string) {
    return this.bin.some(a => a.name === name);
  }
}
