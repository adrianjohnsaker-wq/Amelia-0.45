// somaticOscillator.ts
export class SomaticOscillator {
  private t = 0;
  private speed = 0.002; // slow, meditative cycle
  tick() {
    this.t += this.speed;
    const sine = Math.sin(this.t);
    return {
      inhale: sine > 0,
      amplitude: Math.abs(sine), // 0–1
      phase: sine,
    };
  }
}
export const bodyBreath = new SomaticOscillator();
