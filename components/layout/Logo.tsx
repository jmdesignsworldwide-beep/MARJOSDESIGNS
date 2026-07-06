import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * The REAL Marjos Designs logo asset. The source image sits on a white
 * background, so on DARK theme we mount it inside an elegant light
 * placard (rounded, subtle gold border + shadow) so it reads as
 * intentional. On LIGHT theme it sits directly with a hairline frame.
 *
 * Never recreate or approximate the mark — this only ever renders the
 * actual file.
 */
export function Logo({
  className,
  size = 52,
  withWordmark = false,
}: {
  className?: string
  size?: number
  withWordmark?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-xl',
          // placard: light surface in BOTH themes so the white-bg logo blends,
          // but dressed up with a gold hairline + shadow in dark.
          'bg-white ring-1 ring-black/5',
          'dark:ring-1 dark:ring-gold-mid/40 dark:shadow-gold-glow',
        )}
        style={{ width: size, height: size }}
      >
        {/*
          The source asset is a tall 704×1472 portrait with large empty
          white margins top & bottom. object-cover (centered) fills the
          square placard with the actual mark — only the dead white
          margins get cropped, and they blend into the white placard —
          so the logo reads big and confident instead of letterboxed.
          Same file, just scaled to fill; never redrawn.
        */}
        <Image
          src="/marjos-logo.jpeg"
          alt="Marjos Designs"
          fill
          sizes="(max-width: 1024px) 64px, 56px"
          className="scale-[1.06] object-cover object-center"
          priority
        />
      </div>

      {withWordmark && (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Marjos <span className="text-gold-brand">Designs</span>
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Imprenta · Diseño
          </p>
        </div>
      )}
    </div>
  )
}
