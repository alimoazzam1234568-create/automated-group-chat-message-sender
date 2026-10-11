import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, MousePointerClick, OctagonX, X } from 'lucide-react';
import Header from './components/Header';
import Composer from './components/Composer';
import ChatPreview from './components/ChatPreview';
import StatsBar from './components/StatsBar';
import ConnectionsPanel from './components/ConnectionsPanel';
import BridgePanel from './components/BridgePanel';
import { useBlaster, type Mode } from './lib/useBlaster';
import { setSoundMuted } from './lib/sound';
import type { Relay } from './lib/discord';

const RELAYS_KEY = 'echo.relays.v1';

function loadRelays(): Relay[] {
  try {
    const raw = localStorage.getItem(RELAYS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (r): r is Relay =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as Relay).id === 'string' &&
        typeof (r as Relay).url === 'string' &&
        typeof (r as Relay).name === 'string',
    );
  } catch {
    return [];
  }
}

function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-grid absolute inset-0" />
      <div className="blob absolute -top-44 left-[-10%] h-[540px] w-[540px] rounded-full bg-violet-600/22 blur-[130px]" />
      <div
        className="blob absolute right-[-8%] top-[28%] h-[460px] w-[460px] rounded-full bg-cyan-500/14 blur-[130px]"
        style={{ animationDelay: '-8s' }}
      />
      <div
        className="blob absolute bottom-[-22%] left-[32%] h-[440px] w-[440px] rounded-full bg-fuchsia-600/14 blur-[140px]"
        style={{ animationDelay: '-4s' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050509]" />
    </div>
  );
}

export default function App() {
  const blaster = useBlaster();

  const [text, setText] = useState('hello\nwelcome to the echo chamber');
  const [count, setCount] = useState(10);
  const [intervalMs, setIntervalMs] = useState(1000);
  const [mode, setMode] = useState<Mode>('sequential');
  const [mixer, setMixer] = useState(true);
  const [numbering, setNumbering] = useState(true);
  const [startDelayMs, setStartDelayMs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [relays, setRelays] = useState<Relay[]>(loadRelays);

  const [toast, setToast] = useState<string | null>(null);

  const running = blaster.phase === 'running';
  const activeRelays = relays.filter((r) => r.enabled);

  // persist relays
  useEffect(() => {
    try {
      localStorage.setItem(RELAYS_KEY, JSON.stringify(relays));
    } catch {
      /* storage unavailable */
    }
  }, [relays]);

  const fire = useCallback(() => {
    if (running) return;
    const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return;
    blaster.launch({
      texts: lines,
      count,
      intervalMs,
      mode,
      mixer,
      numbering,
      startDelayMs,
      relays: activeRelays.map(({ id, name, url, avatarUrl }) => ({ id, name, url, avatarUrl })),
    });
  }, [blaster, running, text, count, intervalMs, mode, mixer, numbering, startDelayMs, activeRelays]);

  // result toast
  useEffect(() => {
    if (!blaster.lastResult) return;
    setToast(blaster.lastResult);
    const t = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(t);
  }, [blaster.lastResult]);

  // ctrl/cmd + enter to launch
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (running) blaster.stop();
        else fire();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fire, running, blaster]);

  const toggleSound = () => {
    setMuted((m) => {
      setSoundMuted(!m);
      return !m;
    });
  };

  const relayGap = Math.max(intervalMs, 1100);
  const pendingRelayOps = Math.max(0, blaster.relayProgress.total - blaster.relayProgress.done);
  const dripEta =
    mode === 'sequential'
      ? Math.max(0, blaster.total - blaster.sent) * intervalMs
      : Math.max(0, (blaster.total - blaster.sent) * Math.min(140, 2800 / Math.max(blaster.total, 1)));
  const etaMs = running ? Math.max(dripEta, pendingRelayOps * relayGap) : null;

  return (
    <div className="noise relative min-h-screen">
      <Background />
      <Header muted={muted} onToggleSound={toggleSound} />

      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* ---------- hero ---------- */}
        <section className="flex flex-col justify-between gap-8 pb-10 pt-12 md:flex-row md:items-end lg:pt-16">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/8 px-3.5 py-1.5"
            >
              <MousePointerClick size={12} className="text-fuchsia-300" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.3em] text-fuchsia-200/80">
                Count · Tempo · Emojis · Discord relays
              </span>
            </motion.div>

            <h1 className="font-display text-[42px] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                >
                  One message.
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  className="text-glow block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent"
                  initial={{ y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
                >
                  Infinite echoes.
                </motion.span>
              </span>
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-sm text-[15px] leading-relaxed text-white/45"
          >
            Compose once — Echo fires it as many times as you want, drip-fed on your tempo or
            detonated all at once. Plug in a Discord webhook and every echo lands in your channel
            for real.
          </motion.p>
        </section>

        {/* ---------- workbench ---------- */}
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="grid items-start gap-8 lg:grid-cols-[minmax(400px,470px)_1fr]"
        >
          <div className="space-y-8">
            <Composer
              text={text}
              setText={setText}
              count={count}
              setCount={setCount}
              intervalMs={intervalMs}
              setIntervalMs={setIntervalMs}
              mode={mode}
              setMode={setMode}
              mixer={mixer}
              setMixer={setMixer}
              numbering={numbering}
              setNumbering={setNumbering}
              startDelayMs={startDelayMs}
              setStartDelayMs={setStartDelayMs}
              running={running}
              relaysActive={activeRelays.length > 0}
              onLaunch={fire}
              onStop={blaster.stop}
            />
            <ConnectionsPanel relays={relays} setRelays={setRelays} disabled={running} />
            <BridgePanel />
          </div>

          <div className="lg:sticky lg:top-24">
            <ChatPreview
              messages={blaster.messages}
              typing={blaster.typing}
              phase={blaster.phase}
              relayCount={activeRelays.length}
            />
          </div>
        </motion.section>

        {/* ---------- stats ---------- */}
        <StatsBar
          phase={blaster.phase}
          sent={blaster.sent}
          total={blaster.total}
          elapsedMs={blaster.elapsed}
          etaMs={etaMs}
          mode={mode}
          relay={blaster.relayProgress}
        />

        {/* ---------- footer ---------- */}
        <footer className="py-10 text-center">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.35em] text-white/25">
            echo.lab — discord delivery is direct browser→discord · use responsibly
          </p>
        </footer>
      </main>

      {/* ---------- toast ---------- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 24, scale: 0.95, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed bottom-6 right-6 z-[80] flex max-w-xs items-start gap-3 rounded-2xl border border-white/10 bg-[#0c0c18]/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            {blaster.phase === 'done' ? (
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-cyan-300" />
            ) : (
              <OctagonX size={20} className="mt-0.5 shrink-0 text-rose-300" />
            )}
            <div>
              <p className="font-display text-sm font-semibold">
                {blaster.phase === 'done' ? 'Sequence complete' : 'Sequence aborted'}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/50">{toast}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-1 shrink-0 text-white/30 transition-colors hover:text-white/70"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
