import { useCallback, useEffect, useRef, useState } from 'react';
import { blip } from './sound';
import { MIXER_POOL } from './emojis';
import { RELAY_MIN_GAP_MS, type RelayTarget } from './discord';

export type Status = 'sent' | 'delivered' | 'read';
export type TargetState = 'queued' | 'sending' | 'retry' | 'ok' | 'fail';

export interface MsgTarget {
  id: string;
  name: string;
  state: TargetState;
  detail?: string;
}

export interface ChatMsg {
  id: number;
  text: string;
  time: string;
  status: Status;
  incoming?: boolean;
  targets?: MsgTarget[];
  hasError?: boolean;
}

export type Mode = 'sequential' | 'burst';
export type Phase = 'idle' | 'running' | 'done' | 'stopped';

export interface LaunchConfig {
  /** Rotation pool — echo i sends texts[i % texts.length]. */
  texts: string[];
  count: number;
  intervalMs: number;
  mode: Mode;
  mixer: boolean;
  numbering: boolean;
  startDelayMs: number;
  relays: RelayTarget[];
}

export interface RelayProgress {
  done: number;
  ok: number;
  fail: number;
  total: number;
}

const stamp = () =>
  new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

const randomEmoji = () => MIXER_POOL[Math.floor(Math.random() * MIXER_POOL.length)];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Burst cadence: visual dispatch happens inside a ~2.8s window. */
const burstGap = (count: number) => Math.min(140, Math.max(28, 2800 / Math.max(count, 1)));

export function useBlaster() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [typing, setTyping] = useState(false);
  const [sent, setSent] = useState(0);
  const [total, setTotal] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [relayProgress, setRelayProgress] = useState<RelayProgress>({
    done: 0,
    ok: 0,
    fail: 0,
    total: 0,
  });

  const timers = useRef<number[]>([]);
  const ticker = useRef<number | null>(null);
  const startAt = useRef(0);
  const idSeq = useRef(0);
  const sentSeq = useRef(0);
  const totalRef = useRef(0);
  const runId = useRef(0);
  const chains = useRef(new Map<string, Promise<void>>());
  const lastRelayAt = useRef(new Map<string, number>());
  const aborts = useRef<AbortController[]>([]);
  const tally = useRef<RelayProgress>({ done: 0, ok: 0, fail: 0, total: 0 });

  const clearAll = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (ticker.current !== null) {
      window.clearInterval(ticker.current);
      ticker.current = null;
    }
    aborts.current.forEach((a) => a.abort());
    aborts.current = [];
    chains.current = new Map();
    lastRelayAt.current = new Map();
  };

  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
  };

  const pushMessage = useCallback(
    (text: string, incoming: boolean, targets?: MsgTarget[], simulate = true) => {
      const id = ++idSeq.current;
      setMessages((prev) => [
        ...prev.slice(-249),
        { id, text, time: stamp(), status: 'sent' as Status, incoming, targets },
      ]);
      if (!incoming && simulate) {
        later(
          () =>
            setMessages((prev) =>
              prev.map((m) => (m.id === id ? { ...m, status: 'delivered' as Status } : m)),
            ),
          420,
        );
        later(
          () =>
            setMessages((prev) =>
              prev.map((m) => (m.id === id ? { ...m, status: 'read' as Status } : m)),
            ),
          950,
        );
      }
      return id;
    },
    [],
  );

  const botReply = useCallback(
    (text: string) => {
      setTyping(true);
      later(() => {
        setTyping(false);
        pushMessage(text, true);
        blip('receive');
      }, 850);
    },
    [pushMessage],
  );

  /** Patch the per-target delivery state of a message. */
  const setTargetState = (msgId: number, relayId: string, patch: Partial<MsgTarget>) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.targets
          ? {
              ...m,
              targets: m.targets.map((t) => (t.id === relayId ? { ...t, ...patch } : t)),
            }
          : m,
      ),
    );
  };

  /** Serial, paced delivery of one message to one webhook, with 429 backoff. */
  const relayOne = (
    msgId: number,
    relay: RelayTarget,
    content: string,
    gap: number,
    myRun: number,
  ) => {
    const prev = chains.current.get(relay.id) ?? Promise.resolve();
    const task = prev.then(async () => {
      if (runId.current !== myRun) return;

      const last = lastRelayAt.current.get(relay.id) ?? 0;
      const wait = Math.max(0, last + gap - performance.now());
      if (wait > 20) await sleep(wait);
      if (runId.current !== myRun) return;

      setTargetState(msgId, relay.id, { state: 'sending' });
      const ac = new AbortController();
      aborts.current.push(ac);

      let attempts = 0;
      let settled = false;
      while (!settled) {
        if (runId.current !== myRun) {
          ac.abort();
          return;
        }
        attempts++;
        lastRelayAt.current.set(relay.id, performance.now());
        try {
          const res = await fetch(relay.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
            signal: ac.signal,
          });
          if (res.status === 204) {
            setTargetState(msgId, relay.id, { state: 'ok' });
            tally.current.ok++;
            settled = true;
          } else if (res.status === 429 && attempts <= 5) {
            let retryAfter = 1.2;
            try {
              const j = (await res.json()) as { retry_after?: number };
              if (typeof j.retry_after === 'number') retryAfter = j.retry_after;
            } catch {
              /* use default */
            }
            setTargetState(msgId, relay.id, {
              state: 'retry',
              detail: `rate-limited · retry ${attempts}/5`,
            });
            await sleep(retryAfter * 1000 + 250);
          } else {
            setTargetState(msgId, relay.id, {
              state: 'fail',
              detail:
                res.status === 404
                  ? 'webhook deleted'
                  : res.status === 401
                    ? 'invalid token'
                    : `HTTP ${res.status}`,
            });
            tally.current.fail++;
            settled = true;
          }
        } catch {
          if (runId.current !== myRun) return;
          if (attempts <= 2) {
            setTargetState(msgId, relay.id, {
              state: 'retry',
              detail: `network error · retry ${attempts}`,
            });
            await sleep(1200);
          } else {
            setTargetState(msgId, relay.id, { state: 'fail', detail: 'network error' });
            tally.current.fail++;
            settled = true;
          }
        }
      }
      tally.current.done++;
      setRelayProgress({ ...tally.current });
    });
    chains.current.set(relay.id, task);
  };

  const launch = useCallback(
    (cfg: LaunchConfig) => {
      runId.current += 1;
      const myRun = runId.current;
      clearAll();
      setMessages([]);
      setTyping(false);
      idSeq.current = 0;
      sentSeq.current = 0;
      totalRef.current = cfg.count;
      tally.current = { done: 0, ok: 0, fail: 0, total: cfg.count * cfg.relays.length };
      setRelayProgress({ ...tally.current });
      setSent(0);
      setTotal(cfg.count);
      setElapsed(0);
      setLastResult(null);
      setPhase('running');
      blip('launch');

      const hasRelays = cfg.relays.length > 0;
      const relayGap = Math.max(cfg.intervalMs, RELAY_MIN_GAP_MS);

      const pool = cfg.texts.length > 0 ? cfg.texts : [''];
      const texts = Array.from({ length: cfg.count }, (_, i) => {
        let t = pool[i % pool.length];
        if (cfg.mixer) t = `${t} ${randomEmoji()}`;
        if (cfg.numbering) t = `#${i + 1} · ${t}`;
        return t;
      });

      const gap = cfg.mode === 'burst' ? burstGap(cfg.count) : cfg.intervalMs;

      const startTicker = () => {
        ticker.current = window.setInterval(() => {
          setElapsed(performance.now() - startAt.current);
        }, 100);
      };

      const settleAndFinish = () => {
        // wait for every webhook queue to fully drain
        void Promise.all([...chains.current.values()]).then(() => {
          if (runId.current !== myRun) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.incoming || !m.targets || m.targets.length === 0) return m;
              const anyFail = m.targets.some((t) => t.state === 'fail');
              return { ...m, status: 'delivered' as Status, hasError: anyFail };
            }),
          );
          later(() => {
            if (runId.current !== myRun) return;
            setMessages((prev) =>
              prev.map((m) =>
                !m.incoming && m.status === 'delivered' ? { ...m, status: 'read' as Status } : m,
              ),
            );
          }, 650);

          if (ticker.current !== null) {
            window.clearInterval(ticker.current);
            ticker.current = null;
          }
          const final = performance.now() - startAt.current;
          setElapsed(final);
          setPhase('done');
          blip('done');
          const secs = (final / 1000).toFixed(1);
          if (hasRelays) {
            const { ok, fail } = tally.current;
            setLastResult(
              `${cfg.count} echoes · ${ok} delivered${fail ? ` · ${fail} failed` : ''} on Discord`,
            );
            botReply(
              fail
                ? `Relay finished — ${ok}/${ok + fail} deliveries confirmed on Discord (${fail} failed) in ${secs}s ⚡`
                : `Relay complete — all ${ok} deliveries confirmed on Discord in ${secs}s ⚡`,
            );
          } else {
            setLastResult(`${cfg.count} echoes delivered in ${secs}s`);
            botReply(
              `Relay confirmed — ${cfg.count} echo${cfg.count > 1 ? 'es' : ''} received in ${secs}s ⚡`,
            );
          }
        });
      };

      later(() => {
        if (runId.current !== myRun) return;
        startAt.current = performance.now();
        startTicker();
        texts.forEach((txt, i) => {
          later(() => {
            if (runId.current !== myRun) return;
            const targets: MsgTarget[] | undefined = hasRelays
              ? cfg.relays.map((r) => ({ id: r.id, name: r.name, state: 'queued' as TargetState }))
              : undefined;
            const msgId = pushMessage(txt, false, targets, !hasRelays);
            sentSeq.current += 1;
            setSent(sentSeq.current);
            blip('send');
            if (hasRelays) {
              cfg.relays.forEach((r) => relayOne(msgId, r, txt, relayGap, myRun));
            }
          }, i * gap);
        });
        // once the visual dispatch is fully scheduled, settle the relay queues
        later(settleAndFinish, (texts.length - 1) * gap + (hasRelays ? 150 : 550));
      }, cfg.startDelayMs);
    },
    [botReply, pushMessage],
  );

  const stop = useCallback(() => {
    runId.current += 1;
    const hadWork = timers.current.length > 0;
    clearAll();
    setTyping(false);
    // mark anything not yet relayed as aborted
    setMessages((prev) =>
      prev.map((m) =>
        m.targets && m.targets.length > 0
          ? {
              ...m,
              hasError: true,
              targets: m.targets.map((t) =>
                t.state === 'ok' ? t : { ...t, state: 'fail' as TargetState, detail: 'aborted' },
              ),
            }
          : m,
      ),
    );
    const final = startAt.current ? performance.now() - startAt.current : 0;
    setElapsed(startAt.current ? final : 0);
    setPhase('stopped');
    if (hadWork) blip('stop');
    const n = sentSeq.current;
    const t = totalRef.current;
    const { ok, fail } = tally.current;
    setLastResult(
      tally.current.total > 0
        ? `Stopped after ${n} of ${t} · ${ok} relayed${fail ? ` · ${fail} failed` : ''}`
        : `Stopped after ${n} of ${t}`,
    );
    botReply(
      tally.current.total > 0
        ? `Transmission cut — ${n} of ${t} echoes fired, ${ok} confirmed on Discord.`
        : `Transmission cut — received ${n} of ${t} echoes.`,
    );
  }, [botReply]);

  useEffect(() => clearAll, []);

  return {
    messages,
    phase,
    typing,
    sent,
    total,
    elapsed,
    lastResult,
    relayProgress,
    launch,
    stop,
  };
}
