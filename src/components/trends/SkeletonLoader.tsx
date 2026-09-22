import { motion } from 'framer-motion';

export function SkeletonCard() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="h-48 bg-gradient-to-br from-[#FFD6E7]/30 to-[#DDA0FF]/30 skeleton-pulse animate-pulse" />
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-4 w-16 bg-[#FFD6E7]/50 rounded-full animate-pulse" />
          <div className="h-4 w-12 bg-[#FFD6E7]/50 rounded-full animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-3/4 bg-[#DDA0FF]/30 rounded-full animate-pulse" />
          <div className="h-5 w-1/2 bg-[#DDA0FF]/30 rounded-full animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-white/40 rounded-full animate-pulse" />
          <div className="h-3 w-4/5 bg-white/40 rounded-full animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-[#FFD6E7]/40 rounded-full animate-pulse" />
          <div className="h-6 w-16 bg-[#FFD6E7]/40 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.1 }}
        >
          <SkeletonCard />
        </motion.div>
      ))}
    </div>
  );
}
