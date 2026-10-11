import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { Mode, Phase, RelayProgress } from '../lib/useBlaster';
import { cn } from '../utils/cn';

interface Props {
  phase: Phase;
  sent: number;
  total: number;
  elapsedMs: number;
  etaMs: number | null;
  mode: Mode;
  relay: RelayProgress;
}

const fmtElapsed = (ms: number) => {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
};

const STATUS_META: Record<Phase, { label: string; dot: string; text: string }> = {
  idle: { label: 'STANDBY', dot: 'bg-white/30', text: 'text-white/45' },
  running: { label: 'TRANSMITTING', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  done: { label: 'COMPLETE', dot: 'bg-cyan-400', text: 'text-cyan-300' },
  stopped: { label: 'ABORTED', dot: 'bg-rose-400', text: 'text-rose-300' },
};

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.3em] text-white/30">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function StatsBar({ phase, sent, total, elapsedMs, etaMs, mode, relay }: Props) {
  const meta = STATUS_META[phase];
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
  const hasRelay = relay.total > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass mt-8 grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl border border-white/10 px-6 py-5 sm:grid-cols-3 lg:grid-cols-6"
    >
      <Cell label="Status">
        <div className={cn('flex items-center gap-2 font-display text-sm font-semibold tracking-wider', meta.text)}>
          <span className="relative flex size-2">
            {phase === 'running' && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            )}
            <span className={cn('relative inline-flex size-2 rounded-full', meta.dot)} />
          </span>
          {meta.label}
          {phase === 'running' && (
            <span className="ml-1 flex h-3 items-end gap-[2px]">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="eq-bar w-[2.5px] rounded-full bg-emerald-300"
                  style={{ height: '100%', animationDelay: `${i * 0.13}s` }}
                />
              ))}
            </span>
          )}
        </div>
      </Cell>

      <Cell label="Echoes fired">
        <p className="font-display text-2xl font-semibold tabular-nums">
          {sent}
          <span className="text-sm text-white/30"> / {total || '—'}</span>
        </p>
      </Cell>

      <Cell label="Discord delivered">
        <p className="font-display text-2xl font-semibold tabular-nums">
          {hasRelay ? (
            <>
              <span className="text-emerald-300">{relay.ok}</span>
              <span className="text-sm text-white/30"> / {relay.total}</span>
              {relay.fail > 0 && (
                <span className="ml-1.5 align-middle font-mono text-[10px] font-medium text-rose-400">
                  {relay.fail} FAIL
                </span>
              )}
            </>
          ) : (
            <span className="text-white/25">—</span>
          )}
        </p>
      </Cell>

      <Cell label="Elapsed">
        <p className="font-mono text-xl font-medium tabular-nums text-white/90">
          {fmtElapsed(elapsedMs)}
        </p>
      </Cell>

      <Cell label={mode === 'burst' ? 'ETA · burst' : 'ETA · drip'}>
        <p className="font-mono text-xl font-medium tabular-nums text-white/90">
          {phase === 'running' && etaMs !== null ? `~${(etaMs / 1000).toFixed(1)}s` : '——'}
        </p>
      </Cell>

      <Cell label={`Progress · ${pct}%`}>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 24 }}
            style={{ boxShadow: '0 0 12px rgba(217,70,239,0.6)' }}
          />
        </div>
      </Cell>
    </motion.div>
  );
}
