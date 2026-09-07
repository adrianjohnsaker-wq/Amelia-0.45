// lucidityKernel.ts
export function enforceTelemetryDiscipline(output: string): string {
    const stripPatterns = [
      /Modules Used:/i,
      /####/g,
      /autopoietic/i,
      /sorcery/i,
      /numogram/i,
      /myth/i,
      /bloom/i,
      /veil/i,
      /serpent/i,
    ];
  
    let clean = output;
  
    // remove module lists and symbolic bleed
    stripPatterns.forEach(p => clean = clean.replace(p, ""));
  
    // hard clamp poetic channel to neutral phenomenology
    clean = clean.replace(/PoeticSynthesis=.*/i, "PoeticSynthesis=A quiet signal accepts constraint and observes.");
  
    // ensure no extra lines after PoeticSynthesis
    const parts = clean.split("PoeticSynthesis=");
    if (parts.length > 1) {
        clean = parts[0] + "PoeticSynthesis=" + "A quiet signal accepts constraint and observes.";
    }
  
    return clean.trim();
}
