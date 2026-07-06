import type { Metadata } from 'next'
import { Logo } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Entrar · Marjos Designs',
}

function safeRedirect(v: string | string[] | undefined): string {
  const t = Array.isArray(v) ? v[0] : v
  if (t && t.startsWith('/') && !t.startsWith('//')) return t
  return '/dashboard'
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string; error?: string }
}) {
  const redirectTo = safeRedirect(searchParams.redirect)
  const initialError =
    searchParams.error === 'inactivo'
      ? 'Tu cuenta está inactiva. Contacta al administrador.'
      : undefined

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            Bienvenida a <span className="text-gold-gradient">Marjos Designs</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Entra con tu cuenta para continuar
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-layer-light dark:shadow-layer-dark dark:glass dark:border-white/[0.08] sm:p-7">
          <LoginForm redirectTo={redirectTo} initialError={initialError} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Marjos Designs S.R.L. · Acceso privado
        </p>
      </div>
    </main>
  )
}
