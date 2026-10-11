import { useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  PenLine,
  Smile,
  Layers,
  Timer,
  Zap,
  Clock3,
  Dices,
  ListOrdered,
  SendHorizontal,
  Square,
  Hourglass,
  Minus,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import { cn } from '../utils/cn';
import type { Mode } from '../lib/useBlaster';

const MAX_LEN = 600;
const MAX_COUNT = 500;
const COUNT_PRESETS = [5, 10, 25, 50];
const INTERVAL_PRESETS = [250, 1000, 2000, 5000];
const DELAY_OPTIONS = [
  { label: 'NOW', value: 0 },
  { label: '3S', value: 3000 },
  { label: '5S', value: 5000 },
  { label: '10S', value: 10000 },
];

const fmtMs = (ms: number) =>
  ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;

interface Props {
  text: string;
  setText: (v: string) => void;
  count: number;
  setCount: (v: number) => void;
  intervalMs: number;
  setIntervalMs: (v: number) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  mixer: boolean;
  setMixer: (b: boolean) => void;
  numbering: boolean;
  setNumbering: (b: boolean) => void;
  startDelayMs: number;
  setStartDelayMs: (v: number) => void;
  running: boolean;
  relaysActive: boolean;
  onLaunch: () => void;
  onStop: () => void;
}

function SectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-white/35">
      <Icon size={12} strokeWidth={2.2} className="text-fuchsia-400/80" />
      {children}
    </div>
  );
}

function Toggle({
  on,
  onClick,
  icon: Icon,
  label,
  hint,
}: {
  on: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-300',
        on
          ? 'border-violet-400/30 bg-violet-500/10'
          : 'border-white/8 bg-white/[0.02] hover:border-white/15',
      )}
    >
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-lg transition-colors',
          on ? 'bg-violet-500/25 text-violet-200' : 'bg-white/5 text-white/35',
        )}
      >
        <Icon size={15} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-white/90">{label}</span>
        <span className="block truncate text-[11px] text-white/35">{hint}</span>
      </span>
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300',
          on ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'bg-white/10',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
          className={cn(
            'absolute top-0.5 size-4 rounded-full bg-white shadow',
            on ? 'right-0.5' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

export default function Composer(p: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const insertEmoji = (e: string) => {
    const el = taRef.current;
    if (!el) {
      p.setText(p.text + e);
      return;
    }
    const s = el.selectionStart ?? p.text.length;
    const en = el.selectionEnd ?? p.text.length;
    const next = (p.text.slice(0, s) + e + p.text.slice(en)).slice(0, MAX_LEN);
    p.setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = Math.min(s + e.length, next.length);
      el.setSelectionRange(pos, pos);
    });
  };

  const running = p.running;
  const launchDisabled = !running && p.text.trim().length === 0;
  const rotation = p.text.split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <section className="glass relative rounded-3xl border border-white/10 p-6 shadow-2xl shadow-black/50 sm:p-7">
      {/* card glow edge */}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/60 to-transparent" />

      {/* ---------- messages (rotation) ---------- */}
      <div className="mb-2 flex items-center justify-between">
        <SectionLabel icon={PenLine}>Messages · one per line</SectionLabel>
        <div className="flex items-center gap-2">
          {rotation.length > 1 && (
            <span className="rounded-md border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 font-mono text-[9.5px] font-semibold tracking-wider text-fuchsia-200">
              {rotation.length} IN ROTATION
            </span>
          )}
          <span className={cn('font-mono text-[10px] tracking-widest', p.text.length > MAX_LEN - 60 ? 'text-rose-400' : 'text-white/30')}>
            {p.text.length}/{MAX_LEN}
          </span>
        </div>
      </div>

      <div className="relative">
        <textarea
          ref={taRef}
          value={p.text}
          onChange={(e) => p.setText(e.target.value.slice(0, MAX_LEN))}
          rows={5}
          maxLength={MAX_LEN}
          placeholder={'hello\nwelcome to the chat\nevery line fires in rotation…'}
          spellCheck={false}
          className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 pb-12 text-[15px] leading-relaxed text-white/90 placeholder-white/25 outline-none transition-all duration-300 focus:border-fuchsia-400/40 focus:shadow-[0_0_0_4px_rgba(217,70,239,0.08)]"
        />
        {/* emoji trigger */}
        <div className="absolute bottom-3 right-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.12, rotate: -8 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setPickerOpen((o) => !o)}
            className={cn(
              'grid size-9 place-items-center rounded-xl border transition-all duration-300',
              pickerOpen
                ? 'border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-200'
                : 'border-white/10 bg-white/5 text-white/50 hover:text-white',
            )}
          >
            <Smile size={17} strokeWidth={2} />
          </motion.button>
          <EmojiPicker open={pickerOpen} onPick={insertEmoji} onClose={() => setPickerOpen(false)} />
        </div>
      </div>

      {/* rotation preview */}
      {rotation.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-fuchsia-300/50">
            rotation
          </span>
          {rotation.slice(0, 4).map((l, i) => (
            <span
              key={i}
              className="max-w-[130px] truncate rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10.5px] text-white/60"
            >
              {i + 1}· {l}
            </span>
          ))}
          {rotation.length > 4 && (
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-white/40">
              +{rotation.length - 4}
            </span>
          )}
        </div>
      )}
      <p className="mt-2 text-[10.5px] leading-snug text-white/25">
        One message per line — they fire in rotation: hello → welcome → hello → welcome…
      </p>

      {/* ---------- count ---------- */}
      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel icon={Layers}>How many messages</SectionLabel>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => p.setCount(Math.max(1, p.count - 1))}
              className="grid size-6 place-items-center rounded-md border border-violet-400/25 bg-violet-500/10 text-violet-200 transition-colors hover:bg-violet-500/25"
              aria-label="Decrease count"
            >
              <Minus size={11} />
            </button>
            <input
              type="number"
              min={1}
              max={MAX_COUNT}
              value={p.count}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                p.setCount(Number.isFinite(v) ? Math.min(MAX_COUNT, Math.max(1, v)) : 1);
              }}
              aria-label="Custom message count"
              className="w-[62px] rounded-md border border-violet-400/25 bg-violet-500/10 px-1 py-1 text-center font-mono text-[12px] font-semibold text-violet-200 outline-none transition-colors focus:border-violet-300/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => p.setCount(Math.min(MAX_COUNT, p.count + 1))}
              className="grid size-6 place-items-center rounded-md border border-violet-400/25 bg-violet-500/10 text-violet-200 transition-colors hover:bg-violet-500/25"
              aria-label="Increase count"
            >
              <Plus size={11} />
            </button>
            <span className="ml-1 font-mono text-[8.5px] tracking-[0.18em] text-white/25">
              MAX {MAX_COUNT}
            </span>
          </div>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          step={1}
          value={Math.min(p.count, 50)}
          onChange={(e) => p.setCount(Number(e.target.value))}
          className="slider"
          aria-label="Message count slider"
        />
        <div className="mt-2 flex gap-2">
          {COUNT_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => p.setCount(c)}
              className={cn(
                'flex-1 rounded-lg border py-1.5 font-mono text-[11px] transition-all duration-200',
                p.count === c
                  ? 'border-violet-400/40 bg-violet-500/15 text-violet-200'
                  : 'border-white/8 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/70',
              )}
            >
              ×{c}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- interval ---------- */}
      <div className={cn('mt-6 transition-opacity duration-300', p.mode === 'burst' && 'pointer-events-none opacity-35')}>
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel icon={Timer}>Time between sends</SectionLabel>
          <span className="rounded-md border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-200">
            {fmtMs(p.intervalMs)}
          </span>
        </div>
        <input
          type="range"
          min={200}
          max={5000}
          step={50}
          value={p.intervalMs}
          onChange={(e) => p.setIntervalMs(Number(e.target.value))}
          className="slider"
          aria-label="Interval between messages"
        />
        <div className="mt-2 flex gap-2">
          {INTERVAL_PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => p.setIntervalMs(v)}
              className={cn(
                'flex-1 rounded-lg border py-1.5 font-mono text-[11px] transition-all duration-200',
                p.intervalMs === v
                  ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                  : 'border-white/8 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/70',
              )}
            >
              {fmtMs(v)}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- mode ---------- */}
      <div className="mt-6">
        <SectionLabel icon={Zap}>Fire mode</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(
            [
              {
                id: 'sequential' as Mode,
                icon: Clock3,
                title: 'Drip Feed',
                desc: `one every ${fmtMs(p.intervalMs)}`,
              },
              {
                id: 'burst' as Mode,
                icon: Zap,
                title: 'Burst',
                desc: 'all at the same time',
              },
            ]
          ).map((m) => (
            <motion.button
              key={m.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => p.setMode(m.id)}
              className={cn(
                'relative overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-300',
                p.mode === m.id
                  ? 'border-fuchsia-400/40 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 shadow-[0_0_30px_-8px_rgba(217,70,239,0.35)]'
                  : 'border-white/8 bg-white/[0.02] hover:border-white/15',
              )}
            >
              <m.icon
                size={17}
                strokeWidth={2.2}
                className={cn('mb-2', p.mode === m.id ? 'text-fuchsia-300' : 'text-white/35')}
              />
              <span className={cn('block text-[13px] font-semibold', p.mode === m.id ? 'text-white' : 'text-white/60')}>
                {m.title}
              </span>
              <span className="block text-[10.5px] text-white/35">{m.desc}</span>
              {p.mode === m.id && (
                <motion.span
                  layoutId="mode-dot"
                  className="absolute right-3 top-3 size-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_10px_2px_rgba(217,70,239,0.8)]"
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ---------- extras ---------- */}
      <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Toggle
          on={p.mixer}
          onClick={() => p.setMixer(!p.mixer)}
          icon={Dices}
          label="Emoji Mixer"
          hint="random emoji on each echo"
        />
        <Toggle
          on={p.numbering}
          onClick={() => p.setNumbering(!p.numbering)}
          icon={ListOrdered}
          label="Numbering"
          hint="prefix #1, #2, #3…"
        />
      </div>

      {/* ---------- start delay ---------- */}
      <div className="mt-6">
        <SectionLabel icon={Hourglass}>Start firing after</SectionLabel>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {DELAY_OPTIONS.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => p.setStartDelayMs(d.value)}
              className={cn(
                'rounded-xl border py-2 font-mono text-[11px] font-medium tracking-wider transition-all duration-200',
                p.startDelayMs === d.value
                  ? 'border-amber-300/40 bg-amber-400/10 text-amber-200'
                  : 'border-white/8 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/70',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- launch ---------- */}
      <motion.button
        type="button"
        whileHover={launchDisabled ? undefined : { scale: 1.015 }}
        whileTap={launchDisabled ? undefined : { scale: 0.97 }}
        onClick={running ? p.onStop : p.onLaunch}
        disabled={launchDisabled}
        className={cn(
          'group relative mt-7 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl py-4 font-display text-[15px] font-bold tracking-wide transition-all duration-300',
          running
            ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-[0_8px_40px_-8px_rgba(244,63,94,0.6)]'
            : launchDisabled
              ? 'cursor-not-allowed bg-white/5 text-white/25'
              : 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 bg-[length:200%_100%] bg-left text-white shadow-[0_8px_40px_-8px_rgba(168,85,247,0.55)] hover:bg-right',
        )}
      >
        {running ? (
          <>
            <Square size={16} className="fill-current" />
            ABORT SEQUENCE
            <span className="ml-1 font-mono text-[10px] font-normal tracking-[0.2em] text-white/60">
              LIVE
            </span>
          </>
        ) : (
          <>
            <SendHorizontal size={17} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" />
            LAUNCH SEQUENCE
          </>
        )}
        {running && (
          <motion.span
            className="absolute inset-0 rounded-2xl border border-rose-300/50"
            animate={{ opacity: [0.8, 0.1, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </motion.button>
      <p className="mt-3 text-center font-mono text-[10px] tracking-[0.2em] text-white/25">
        CTRL + ENTER TO FIRE
      </p>
      {p.relaysActive && (
        <p className="mt-1.5 text-center font-mono text-[9px] tracking-[0.18em] text-indigo-300/70">
          DISCORD RELAYS ACTIVE · PACED ≥{(Math.max(p.intervalMs, 1100) / 1000).toFixed(1)}S TO RESPECT RATE LIMITS
        </p>
      )}
    </section>
  );
}
