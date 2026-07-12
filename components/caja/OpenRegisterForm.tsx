'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Wallet, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { openRegister, type CajaState } from '@/lib/caja/actions'

const initial: CajaState = {}

function OpenBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
      <Wallet className="h-4 w-4" />
      Abrir caja del día
    </Button>
  )
}

export function OpenRegisterForm() {
  const [state, action] = useFormState(openRegister, initial)
  const { toast } = useToast()

  useEffect(() => {
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast])

  return (
    <Card className="mx-auto max-w-lg text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold-gradient-soft text-gold-brand">
        <Sparkles className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-xl font-bold tracking-tight">Empieza el día abriendo la caja</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Registra el fondo inicial en efectivo (para dar cambio). A partir de ahí, cada pago de orden y cada venta
        rápida entra sola.
      </p>
      <form action={action} className="mx-auto mt-6 max-w-xs space-y-4 text-left">
        <Input
          id="opening-float"
          name="openingFloat"
          label="Fondo inicial en efectivo (RD$)"
          type="number"
          inputMode="decimal"
          step="1"
          min="0"
          defaultValue="0"
          required
          autoFocus
        />
        <div className="flex justify-center pt-1">
          <OpenBtn />
        </div>
      </form>
    </Card>
  )
}
