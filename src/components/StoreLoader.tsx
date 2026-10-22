import { resolveAssetUrl } from '../store'

interface StoreLoaderProps {
  title?: string
  subtitle?: string
}

export default function StoreLoader({
  title = 'DisplayDelight Commercial Displays',
  subtitle = 'Synchronizing real-time commercial catalogue & showroom...',
}: StoreLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-[#0c101c] px-4 text-white select-none transition-all duration-500"
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-[500px] rounded-full bg-brand/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-[500px] rounded-full bg-brand/15 blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Logo Container with ambient pulse glow */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-3xl bg-brand/20 blur-xl animate-pulse" />
          <img
            src={resolveAssetUrl('/logo-white.png')}
            alt="DisplayDelight"
            className="relative h-14 sm:h-16 w-auto max-w-[260px] object-contain drop-shadow-[0_8px_24px_rgba(255,79,24,0.35)]"
          />
        </div>

        {/* Tagline Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[.2em] text-[#ff9b73] backdrop-blur">
          <span className="size-1.5 rounded-full bg-brand animate-ping" />
          Innovation is Key to Success
        </div>

        {/* Dynamic Dual-Ring Spinner */}
        <div className="relative mb-6 size-12">
          <div className="size-full rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 size-full animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>

        {/* Headings */}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed max-w-sm">
          {subtitle}
        </p>

        {/* Animated Progress Bar */}
        <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-brand to-transparent animate-[shimmer_1.8s_infinite] -translate-x-full" />
        </div>
      </div>
    </div>
  )
}
