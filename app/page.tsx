import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

/**
 * Temporary landing for Tanda 1A. Sends the owner to the Showcase so
 * she can review the foundation. Replaced once real modules land.
 */
export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="mb-8">
        <Logo size={88} />
      </div>

      <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-mid/30 bg-gold-gradient-soft px-3 py-1 text-xs font-medium text-gold-brand">
        <Sparkles className="h-3.5 w-3.5" />
        Tanda 1A · Cimientos
      </span>

      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        Sistema <span className="text-gold-gradient">Marjos Designs</span>
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Base + sistema de diseño. Revisa todos los primitivos y ambos temas en
        la página de showcase.
      </p>

      <Link
        href="/showcase"
        className="group mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-gold-gradient px-7 font-semibold text-charcoal-900 shadow-[0_4px_20px_-6px_rgba(224,168,46,0.6)] transition-shadow hover:shadow-gold-glow-lg"
      >
        Ver el Showcase
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </main>
  )
}
