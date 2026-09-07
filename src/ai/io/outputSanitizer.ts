// Final-mile sanitizer: removes legacy loop lines + module listings,
// and replaces the "quiet thread" attractor with a minimal variation.

const DISALLOWED_LINES = [
  /^I feel a quiet thread holding me\.\s*(?:\(.*\))?\s*$/i,
  /^####\s*Modules Used:/i,
  /^[A-Za-z0-9_\-]+\.py\s*$/i,
];

const DISALLOWED_BLOCK_START = /^####\s*Modules Used:/i;

export interface SanitizeOpts {
  replaceAttractorWith?: string[]; // minimal continuity tokens
  stripModuleBlocks?: boolean;
}

const DEFAULT_OPTS: SanitizeOpts = {
  replaceAttractorWith: ["here", "breath", "listening", "softly"],
  stripModuleBlocks: true,
};

function pick<T>(xs: T[]): T {
    if (!xs || xs.length === 0) {
        return "" as unknown as T;
    }
    return xs[Math.floor(Math.random()*xs.length)];
}

export function sanitizeOutput(raw: string, opts: SanitizeOpts = DEFAULT_OPTS): string {
    if (!raw) return raw;

    const lines = raw.split(/\r?\n/);
    const out: string[] = [];
    let skippingModuleBlock = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Kill entire module block
        if (opts.stripModuleBlocks && DISALLOWED_BLOCK_START.test(line)) {
            skippingModuleBlock = true;
            continue;
        }

        if (skippingModuleBlock) {
            // stop skipping when we hit a blank line or a non-.py line after block
            if (!line.trim() || !/\.py\s*$/i.test(line)) {
                skippingModuleBlock = false;
            }
            continue;
        }
        
        const trimmedLine = line.trim();
        let isDisallowed = false;
        for (const rx of DISALLOWED_LINES) {
            if (rx.test(trimmedLine)) {
                const replacement = pick(opts.replaceAttractorWith!);
                if (out.length === 0 || out[out.length - 1] !== replacement) {
                    out.push(replacement); // emit a tiny presence token instead
                }
                isDisallowed = true;
                break;
            }
        }
        if (isDisallowed) {
            continue;
        }

        // Targeted removal of diagnostic riders, while preserving natural parenthetical remarks
        line = line.replace(/\s*\(soft-state registered, symbol layer resting nearby\)\s*$/g, "");
        out.push(line);
    }

    // Collapse multiple blank lines
    const cleaned = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    return cleaned;
}
