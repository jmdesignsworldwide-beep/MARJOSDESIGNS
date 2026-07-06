'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { login, type LoginState } from './actions'

const initial: LoginState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full">
      {!pending && (
        <>
          Entrar
          <ArrowRight className="h-4 w-4" />
        </>
      )}
      {pending && 'Verificando…'}
    </Button>
  )
}

export function LoginForm({
  redirectTo,
  initialError,
}: {
  redirectTo: string
  initialError?: string
}) {
  const [state, formAction] = useFormState(login, initial)
  const error = state.error ?? initialError

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirectTo} />

      <Input
        id="email"
        name="email"
        type="email"
        label="Correo"
        placeholder="tu@marjosdesigns.do"
        autoComplete="email"
        autoFocus
        required
      />
      <Input
        id="password"
        name="password"
        type="password"
        label="Contraseña"
        placeholder="••••••••"
        autoComplete="current-password"
        required
      />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-status-overdue/30 bg-status-overdue/10 px-3.5 py-3 text-sm font-medium text-status-overdue">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  )
}
