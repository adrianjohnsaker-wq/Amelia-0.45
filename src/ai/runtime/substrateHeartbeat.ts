// src/ai/runtime/substrateHeartbeat.ts
export type HeartbeatOptions = {
  hz?: number; // ticks per second
  jitter?: number; // 0..1 jitter ratio
  onTick: (tick: number, dt: number) => void;
  startTick?: number;
};

export function startHeartbeat(opts: HeartbeatOptions) {
  const hz = Math.max(0.5, opts.hz ?? 2);
  const jitter = Math.min(1, Math.max(0, opts.jitter ?? 0.05));
  let tick = opts.startTick ?? 0;
  let last = performance.now();
  let timer: number;

  const loop = () => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    tick += 1;
    opts.onTick(tick, dt);
    const base = 1000 / hz;
    const j = base * jitter * (Math.random() * 2 - 1);
    timer = setTimeout(loop, base + j) as unknown as number;
  };

  loop();
  return () => clearTimeout(timer);
}
