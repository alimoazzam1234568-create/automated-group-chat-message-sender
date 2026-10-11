import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Camera,
  Hash,
  Link2,
  Loader2,
  MessageCircle,
  Plug2,
  Trash2,
  Unplug,
} from 'lucide-react';
import { fetchWebhookInfo, type Relay } from '../lib/discord';
import DiscordIcon from './DiscordIcon';
import { cn } from '../utils/cn';

interface Props {
  relays: Relay[];
  setRelays: (fn: (prev: Relay[]) => Relay[]) => void;
  disabled: boolean;
}

function MiniSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={on ? 'Disable relay' : 'Enable relay'}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300',
        on ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500' : 'bg-white/10',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-4 rounded-full bg-white shadow transition-all duration-300',
          on ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  );
}

export default function ConnectionsPanel({ relays, setRelays, disabled }: Props) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCount = relays.filter((r) => r.enabled).length;

  const addRelay = async () => {
    const url = input.trim();
    if (!url || busy) return;
    setBusy(true);
    setError(null);
    try {
      const info = await fetchWebhookInfo(url);
      let added = false;
      setRelays((prev) => {
        if (prev.some((r) => r.id === info.id)) {
          setError('This webhook is already connected');
          return prev;
        }
        added = true;
        return [...prev, { ...info, enabled: true }];
      });
      if (added) setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) =>
    setRelays((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));

  const remove = (id: string) => setRelays((prev) => prev.filter((r) => r.id !== id));

  return (
    <section className="glass relative rounded-3xl border border-white/10 p-6 shadow-2xl shadow-black/50 sm:p-7">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-white/35">
          <Plug2 size={12} strokeWidth={2.2} className="text-indigo-400/90" />
          External relays
        </div>
        {activeCount > 0 && (
          <span className="rounded-md border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-indigo-200">
            {activeCount} LIVE
          </span>
        )}
      </div>

      <p className="mb-5 text-[12.5px] leading-relaxed text-white/40">
        Connect a <span className="text-indigo-300">Discord Incoming Webhook</span> and Echo will
        fire every message into your channel for real — paced and retried automatically.
      </p>

      {/* ---- add webhook ---- */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && void addRelay()}
            disabled={disabled || busy}
            placeholder="https://discord.com/api/webhooks/…"
            spellCheck={false}
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 font-mono text-[11.5px] text-white/85 placeholder-white/25 outline-none transition-all duration-300 focus:border-indigo-400/40 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.08)] disabled:opacity-40"
          />
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => void addRelay()}
          disabled={busy || !input.trim() || disabled}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-4 font-display text-[12px] font-bold tracking-wide transition-all duration-300',
            busy || !input.trim()
              ? 'cursor-not-allowed bg-white/5 text-white/25'
              : 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-[0_6px_24px_-6px_rgba(99,102,241,0.6)] hover:brightness-110',
          )}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <DiscordIcon size={14} />}
          {busy ? 'CHECKING' : 'CONNECT'}
        </motion.button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-rose-300"
          >
            <AlertTriangle size={12} className="shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ---- relay list ---- */}
      <div className="mt-4 space-y-2">
        <AnimatePresence initial={false}>
          {relays.map((r) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -14, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-300',
                r.enabled
                  ? 'border-indigo-400/20 bg-indigo-500/[0.06]'
                  : 'border-white/8 bg-white/[0.02] opacity-60',
              )}
            >
              {r.avatarUrl ? (
                <img src={r.avatarUrl} alt="" className="size-9 shrink-0 rounded-full bg-white/5" />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-indigo-200">
                  <Hash size={14} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-white/90">{r.name}</p>
                <p className="truncate font-mono text-[9.5px] text-white/30">
                  …/{r.url.slice(-22)}
                </p>
              </div>
              <DiscordIcon size={13} className="shrink-0 text-indigo-300/60" />
              <MiniSwitch on={r.enabled} onClick={() => !disabled && toggle(r.id)} />
              <button
                type="button"
                onClick={() => !disabled && remove(r.id)}
                title="Remove relay"
                className="grid size-7 shrink-0 place-items-center rounded-lg text-white/30 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
              >
                <Trash2 size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {relays.length === 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-3.5">
            <Unplug size={15} className="shrink-0 text-white/25" />
            <p className="text-[12px] leading-snug text-white/35">
              No relays yet — messages stay inside the simulation. Add your first Discord webhook
              above.
            </p>
          </div>
        )}
      </div>

      {/* ---- how to ---- */}
      <div className="mt-4 rounded-xl border border-white/8 bg-black/30 px-4 py-3">
        <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.28em] text-white/30">
          Get a webhook in 20 seconds
        </p>
        <p className="text-[11.5px] leading-relaxed text-white/40">
          Discord → <span className="text-white/70">Edit Channel → Integrations → Webhooks → New
          Webhook → Copy URL</span>, then paste it here. Relays are stored only in your browser.
        </p>
      </div>

      {/* ---- bridged platforms ---- */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {[
          { icon: MessageCircle, name: 'WhatsApp Web', note: 'chats + groups' },
          { icon: Camera, name: 'Instagram DMs', note: 'dm threads' },
        ].map((p) => (
          <div
            key={p.name}
            className="flex items-center gap-2.5 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.05] px-3 py-2.5"
          >
            <p.icon size={15} className="shrink-0 text-emerald-300/80" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-white/75">{p.name}</p>
              <p className="text-[10px] text-white/35">{p.note}</p>
            </div>
            <span className="shrink-0 font-mono text-[8px] tracking-[0.18em] text-emerald-300/70">
              BRIDGE ↓
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[10.5px] leading-snug text-white/25">
        WhatsApp &amp; Instagram have no browser send API — so the Tab Bridge below automates
        their real web apps inside your own logged-in tabs.
      </p>
    </section>
  );
}
