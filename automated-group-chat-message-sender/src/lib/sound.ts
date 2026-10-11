let ctx: AudioContext | null = null;
let muted = false;

export const setSoundMuted = (m: boolean) => {
  muted = m;
};

const ensure = (): AudioContext | null => {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

const tone = (
  freq: number,
  dur = 0.06,
  type: OscillatorType = 'sine',
  gain = 0.03,
  delay = 0,
) => {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  try {
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* noop */
  }
};

export type BlipKind = 'launch' | 'send' | 'receive' | 'done' | 'stop';

export const blip = (kind: BlipKind) => {
  switch (kind) {
    case 'launch':
      tone(440, 0.07, 'triangle', 0.05);
      tone(660, 0.07, 'triangle', 0.05, 0.07);
      tone(990, 0.1, 'triangle', 0.05, 0.14);
      break;
    case 'send':
      tone(1240, 0.045, 'sine', 0.02);
      break;
    case 'receive':
      tone(740, 0.08, 'sine', 0.032);
      tone(988, 0.1, 'sine', 0.026, 0.06);
      break;
    case 'done':
      tone(523, 0.09, 'triangle', 0.05);
      tone(659, 0.09, 'triangle', 0.05, 0.09);
      tone(784, 0.16, 'triangle', 0.05, 0.18);
      break;
    case 'stop':
      tone(220, 0.12, 'square', 0.028);
      tone(160, 0.14, 'square', 0.026, 0.09);
      break;
  }
};
