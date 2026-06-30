'use client'

/**
 * Breathing gold aurora — only visible in dark theme (hidden in light
 * via `dark:` gating). Pure CSS keyframes so it costs nothing on the
 * main thread, and prefers-reduced-motion freezes it globally.
 *
 * Fixed, behind everything, pointer-events-none.
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base wash — keeps the page from being pure black */}
      <div className="absolute inset-0 bg-bg" />

      {/* Aurora blobs — dark theme only */}
      <div className="absolute inset-0 hidden dark:block">
        <div className="absolute -left-[10%] top-[-15%] h-[60vh] w-[60vh] animate-aurora-1 rounded-full bg-[radial-gradient(circle,rgba(224,168,46,0.18),transparent_60%)] blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-[55vh] w-[55vh] animate-aurora-2 rounded-full bg-[radial-gradient(circle,rgba(244,199,64,0.12),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-20%] left-[30%] h-[50vh] w-[50vh] animate-aurora-1 rounded-full bg-[radial-gradient(circle,rgba(200,148,30,0.14),transparent_60%)] blur-3xl [animation-delay:-8s]" />
      </div>

      {/* Light theme: a whisper of warm gold so it never feels sterile */}
      <div className="absolute inset-0 hidden bg-[radial-gradient(60vh_60vh_at_85%_-10%,rgba(224,168,46,0.06),transparent)] [.light_&]:block dark:hidden" />

      {/* Fine grain / vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,transparent_40%,rgba(0,0,0,0.04))] dark:bg-[radial-gradient(120%_120%_at_50%_0%,transparent_30%,rgba(0,0,0,0.55))]" />
    </div>
  )
}
