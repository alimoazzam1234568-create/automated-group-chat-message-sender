import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Smile, Heart, Hand, Zap, PawPrint } from 'lucide-react';
import { EMOJI_CATEGORIES } from '../lib/emojis';
import { cn } from '../utils/cn';

const TAB_ICONS = [Smile, Heart, Hand, Zap, PawPrint];

interface Props {
  open: boolean;
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ open, onPick, onClose }: Props) {
  const [tab, setTab] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const cat = EMOJI_CATEGORIES[tab];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 14, scale: 0.94, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 14, scale: 0.94, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 480, damping: 32 }}
          className="absolute bottom-[calc(100%+12px)] right-0 z-50 w-[300px] origin-bottom-right overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c18]/95 p-3 shadow-2xl shadow-black/70 backdrop-blur-2xl"
        >
          {/* tabs */}
          <div className="mb-2 grid grid-cols-5 gap-1">
            {EMOJI_CATEGORIES.map((c, i) => {
              const Icon = TAB_ICONS[i];
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setTab(i)}
                  title={c.label}
                  className={cn(
                    'flex items-center justify-center rounded-lg py-1.5 transition-all duration-200',
                    i === tab
                      ? 'bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 text-white shadow-inner'
                      : 'text-white/35 hover:bg-white/5 hover:text-white/70',
                  )}
                >
                  <Icon size={15} strokeWidth={2.2} />
                </button>
              );
            })}
          </div>

          {/* grid */}
          <div className="emoji-scroll grid max-h-[216px] grid-cols-8 gap-0.5 overflow-y-auto pr-1">
            {cat.emojis.map((e) => (
              <motion.button
                key={e + cat.id}
                type="button"
                whileHover={{ scale: 1.28, rotate: -6 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                onClick={() => onPick(e)}
                className="flex aspect-square items-center justify-center rounded-lg text-lg transition-colors hover:bg-white/10"
              >
                {e}
              </motion.button>
            ))}
          </div>

          <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-white/25">
            tap to insert — {cat.label}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
