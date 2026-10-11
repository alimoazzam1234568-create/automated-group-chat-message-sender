import { AudioWaveform, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface Props {
  muted: boolean;
  onToggleSound: () => void;
}

export default function Header({ muted, onToggleSound }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#050509]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        {/* brand */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500 shadow-[0_0_20px_-4px_rgba(168,85,247,0.8)]">
              <AudioWaveform size={17} className="text-white" strokeWidth={2.4} />
            </div>
            <span className="logo-ring absolute inset-0 rounded-xl border border-fuchsia-400/50" />
          </div>
          <div className="leading-none">
            <p className="font-display text-lg font-bold tracking-[0.18em]">
              ECHO<span className="text-fuchsia-400">//</span>
            </p>
            <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.34em] text-white/35">
              message repeater studio
            </p>
          </div>
        </div>

        {/* right side */}
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[9.5px] tracking-[0.25em] text-white/35 sm:block">
            SIM · V2.4
          </span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onToggleSound}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
            className={cn(
              'grid size-9 place-items-center rounded-full border transition-all duration-300',
              muted
                ? 'border-white/10 bg-white/[0.03] text-white/35'
                : 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20',
            )}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </motion.button>
        </div>
      </div>
    </header>
  );
}
