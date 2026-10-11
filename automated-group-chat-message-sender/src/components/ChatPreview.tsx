import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  CheckCheck,
  MessageSquareDashed,
  MoreVertical,
  Paperclip,
  Mic,
  Phone,
  Radio,
  Send,
  Video,
} from 'lucide-react';
import type { ChatMsg, MsgTarget, Phase } from '../lib/useBlaster';
import DiscordIcon from './DiscordIcon';
import { cn } from '../utils/cn';

interface Props {
  messages: ChatMsg[];
  typing: boolean;
  phase: Phase;
  relayCount: number;
}

function Ticks({ status }: { status: ChatMsg['status'] }) {
  if (status === 'sent') return <Check size={12} className="text-white/60" />;
  return (
    <CheckCheck size={12} className={status === 'read' ? 'text-cyan-300' : 'text-white/60'} />
  );
}

const TARGET_STATE_STYLE: Record<MsgTarget['state'], string> = {
  queued: 'text-white/25',
  sending: 'animate-pulse text-sky-300',
  retry: 'animate-pulse text-amber-300',
  ok: 'text-emerald-300',
  fail: 'text-rose-400',
};

function TargetDots({ targets }: { targets: MsgTarget[] }) {
  return (
    <span className="mt-1.5 flex items-center justify-end gap-1.5">
      {targets.map((t) => (
        <span
          key={t.id}
          title={`${t.name} — ${t.state}${t.detail ? ` · ${t.detail}` : ''}`}
          className="inline-flex"
        >
          <DiscordIcon size={10} className={cn('transition-colors', TARGET_STATE_STYLE[t.state])} />
        </span>
      ))}
    </span>
  );
}

export default function ChatPreview({ messages, typing, phase, relayCount }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing]);

  const empty = messages.length === 0 && !typing;

  return (
    <div className="relative">
      {/* live chip */}
      <div className="absolute -top-3 right-6 z-20 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-3 py-1 backdrop-blur">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
        </span>
        <span className="font-mono text-[9px] font-medium tracking-[0.3em] text-white/60">
          {relayCount > 0 ? 'REAL-TIME RELAY' : 'LIVE SIMULATION'}
        </span>
      </div>

      {/* ambient glow behind phone */}
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-cyan-500/15 blur-2xl" />

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a14]/90 shadow-2xl shadow-black/60 backdrop-blur-xl">
        {/* ---- chat header ---- */}
        <div className="flex items-center gap-3 border-b border-white/8 bg-white/[0.03] px-5 py-4">
          <div className="relative">
            <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-[0_0_24px_-4px_rgba(217,70,239,0.7)]">
              <Radio size={19} className="text-white" strokeWidth={2.2} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#0a0a14] bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-semibold tracking-wide">Echo Relay</p>
            <p className="font-mono text-[10px] tracking-wider text-emerald-300/80">
              {phase === 'running'
                ? relayCount > 0
                  ? `relaying to ${relayCount} discord webhook${relayCount > 1 ? 's' : ''}…`
                  : 'receiving echoes…'
                : relayCount > 0
                  ? `online · ${relayCount} relay${relayCount > 1 ? 's' : ''} armed`
                  : 'online · echoes instantly'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-white/40">
            <Video size={17} className="transition-colors hover:text-white/80" />
            <Phone size={16} className="transition-colors hover:text-white/80" />
            <MoreVertical size={16} className="transition-colors hover:text-white/80" />
          </div>
        </div>

        {/* ---- messages ---- */}
        <div
          ref={scrollRef}
          className="chat-scroll chat-bg h-[480px] overflow-y-auto px-4 py-5 sm:h-[560px] sm:px-5"
        >
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <div className="relative">
                <div className="grid size-24 place-items-center rounded-full border-2 border-dashed border-white/15">
                  <MessageSquareDashed size={36} className="text-white/20" strokeWidth={1.5} />
                </div>
                <div className="absolute inset-0 -z-10 rounded-full bg-violet-500/10 blur-2xl" />
              </div>
              <div>
                <p className="font-display text-sm font-medium text-white/50">
                  No transmissions yet
                </p>
                <p className="mx-auto mt-1.5 max-w-[260px] text-xs leading-relaxed text-white/30">
                  {relayCount > 0
                    ? 'Relays armed — every echo you fire will land in your Discord channel for real.'
                    : 'Compose a message, dial in your count and tempo, then fire it into the relay.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    layout="position"
                    initial={{ opacity: 0, y: 16, scale: 0.9, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={cn('flex', m.incoming ? 'justify-start' : 'justify-end')}
                  >
                    <div
                      className={cn(
                        'max-w-[78%] px-3.5 py-2.5 text-[13.5px] leading-snug shadow-lg',
                        m.incoming
                          ? 'rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] text-white/90 shadow-black/30'
                          : 'rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-fuchsia-950/40',
                        m.hasError && 'ring-1 ring-rose-400/60',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <span
                        className={cn(
                          'mt-1 flex items-center justify-end gap-1 font-mono text-[9px]',
                          m.incoming ? 'text-white/35' : 'text-white/70',
                        )}
                      >
                        {m.time}
                        {!m.incoming && <Ticks status={m.status} />}
                      </span>
                      {!m.incoming && m.targets && m.targets.length > 0 && (
                        <TargetDots targets={m.targets} />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* typing indicator */}
              <AnimatePresence>
                {typing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-4 py-3.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="size-1.5 rounded-full bg-white/50"
                          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ---- input bar (decorative) ---- */}
        <div className="flex items-center gap-3 border-t border-white/8 bg-white/[0.02] px-4 py-3.5">
          <Paperclip size={18} className="text-white/35" />
          <div className="flex-1 rounded-full border border-white/8 bg-black/30 px-4 py-2.5 text-[13px] text-white/30">
            Message
          </div>
          {messages.length > 0 ? (
            <motion.div
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_0_16px_-2px_rgba(217,70,239,0.7)]"
            >
              <Send size={15} className="translate-x-px text-white" />
            </motion.div>
          ) : (
            <Mic size={18} className="text-white/35" />
          )}
        </div>
      </div>
    </div>
  );
}
