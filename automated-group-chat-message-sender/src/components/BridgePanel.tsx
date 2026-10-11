import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AppWindow,
  FolderDown,
  Layers3,
  ListChecks,
  Loader2,
  MessagesSquare,
  Repeat2,
  Timer,
} from 'lucide-react';
import { buildBridgeZip } from '../lib/zip';
import { cn } from '../utils/cn';

const STEPS = [
  { n: '01', t: 'Download & extract the zip' },
  { n: '02', t: 'chrome://extensions → Developer mode ON' },
  { n: '03', t: 'Load unpacked → pick the folder' },
  { n: '04', t: 'Open WhatsApp Web / IG DMs → press SCAN' },
];

const FEATURES = [
  { icon: ListChecks, label: 'Scans your chats & groups' },
  { icon: MessagesSquare, label: 'Pick multiple targets' },
  { icon: Repeat2, label: 'Rotating messages per line' },
  { icon: Layers3, label: 'Custom count per chat' },
  { icon: Timer, label: 'Custom gap in milliseconds' },
  { icon: AppWindow, label: 'Runs inside your live tab' },
];

export default function BridgePanel() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await buildBridgeZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'echo-bridge.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setDone(true);
      window.setTimeout(() => setDone(false), 4000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass relative overflow-hidden rounded-3xl border border-white/10 p-6 shadow-2xl shadow-black/50 sm:p-7">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
      <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-white/35">
          <AppWindow size={12} strokeWidth={2.2} className="text-emerald-400/90" />
          Tab bridge
        </div>
        <span className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-emerald-200">
          EXTENSION
        </span>
      </div>

      <p className="mb-5 text-[12.5px] leading-relaxed text-white/40">
        Like a volume booster, Echo Bridge <span className="text-emerald-300">attaches to your
        live WhatsApp / Instagram tab</span> — it scans your account chats &amp; groups, you tick
        the targets, and it types the messages for you, on your tempo.
      </p>

      {/* features */}
      <div className="mb-5 grid grid-cols-2 gap-x-3 gap-y-2.5">
        {FEATURES.map((f) => (
          <div key={f.label} className="flex items-center gap-2">
            <f.icon size={13} className="shrink-0 text-emerald-300/80" strokeWidth={2.2} />
            <span className="text-[11.5px] leading-tight text-white/55">{f.label}</span>
          </div>
        ))}
      </div>

      {/* download */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => void download()}
        disabled={busy}
        className={cn(
          'flex w-full items-center justify-center gap-2.5 rounded-2xl py-3.5 font-display text-[13.5px] font-bold tracking-wide transition-all duration-300',
          busy
            ? 'cursor-wait bg-white/5 text-white/30'
            : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-[0_8px_34px_-8px_rgba(16,185,129,0.6)] hover:brightness-110',
        )}
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <FolderDown size={16} />
        )}
        {busy ? 'BUILDING ZIP…' : done ? 'DOWNLOADED — CHECK YOUR FILES' : 'DOWNLOAD ECHO-BRIDGE.ZIP'}
      </motion.button>

      {/* steps */}
      <div className="mt-5 space-y-2">
        {STEPS.map((s) => (
          <div key={s.n} className="flex items-center gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.03] font-mono text-[9px] font-semibold text-emerald-300/90">
              {s.n}
            </span>
            <span className="text-[11.5px] leading-snug text-white/45">{s.t}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-400/[0.05] px-3.5 py-2.5 text-[10.5px] leading-relaxed text-amber-200/60">
        Automation runs the real page in your own logged-in tab. Use small counts and slow gaps —
        bulk messaging can violate WhatsApp / Instagram terms and get accounts limited. You are
        responsible for how you use it.
      </p>
    </section>
  );
}
