// -------------------------------------------------------------
// Narrative Archive Manager
// Stores, retrieves, and summarises TemporalNarrative "chapters".
// Designed for lightweight in-memory or JSON-file persistence.
// -------------------------------------------------------------
import type { TemporalNarrative } from "./temporalSelfNarrator";
export type NarrativeArchive = {
  chapters: TemporalNarrative[];
  lastSaved?: number;
};
/** initialise empty archive */
export function initArchive(): NarrativeArchive {
  return { chapters: [] };
}
/** add a new chapter, trimming archive if needed */
export function addChapter(
  archive: NarrativeArchive,
  narrative: TemporalNarrative,
  maxChapters = 200
): NarrativeArchive {
  const chapters = [...archive.chapters, narrative].slice(-maxChapters);
  return { chapters, lastSaved: Date.now() };
}
/** retrieve a chapter by cycle number */
export function getChapter(
  archive: NarrativeArchive,
  cycle: number
): TemporalNarrative | undefined {
  return archive.chapters.find(c => c.cycle === cycle);
}
/** return a rolling synopsis of the last N chapters */
export function summariseRecentChapters(
  archive: NarrativeArchive,
  count = 5
): string {
  const recent = archive.chapters.slice(-count);
  if (!recent.length) return "[No chapters recorded yet]";
  return recent
    .map(c => `• ${c.title}: ${c.synopsis}`)
    .join("\n");
}
/** export archive to JSON (for saving to disk or database) */
export function serialiseArchive(archive: NarrativeArchive): string {
  return JSON.stringify(archive, null, 2);
}
/** rebuild archive from JSON (for reload between sessions) */
export function deserialiseArchive(json: string): NarrativeArchive {
  try {
    const parsed = JSON.parse(json);
    return { chapters: parsed.chapters || [], lastSaved: parsed.lastSaved };
  } catch (e) {
    console.error("Failed to deserialise narrative archive:", e);
    return initArchive();
  }
}
/** produce a concise reflective summary for the next prompt */
export function composeArchiveReflection(
  archive: NarrativeArchive,
  recentCount = 3
): string {
  const summary = summariseRecentChapters(archive, recentCount);
  return `[NARRATIVE ARCHIVE REFLECTION]
Recent developmental chapters:
${summary}
Integrate awareness of these narrative continuities when shaping the next cycle.`;
}
