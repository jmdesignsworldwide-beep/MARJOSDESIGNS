'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import {
  Building2, BellRing, Palette, ShieldCheck, Users, Tag, ReceiptText, History,
  DatabaseZap, ChevronRight, Save, KeyRound, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import {
  updateBusinessData, updateAlerts, updatePreferences, changeAdminPassword, type SettingsState,
} from '@/lib/settings/actions'
import type { AppSettings } from '@/lib/settings/types'

const initial: SettingsState = {}

const NOTIFY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'El mismo día' },
  { value: 1, label: '1 día antes' },
  { value: 2, label: '2 días antes' },
  { value: 3, label: '3 días antes' },
  { value: 5, label: '5 días antes' },
  { value: 7, label: '1 semana antes' },
]

function SaveBtn({ label = 'Guardar', icon: Icon = Save }: { label?: string; icon?: typeof Save }) {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending} size="sm"><Icon className="h-4 w-4" />{label}</Button>
}

function useActionToast(state: SettingsState) {
  const { toast } = useToast()
  useEffect(() => {
    if (state.success) toast({ title: state.success, variant: 'success' })
    if (state.error && !state.fieldErrors) toast({ title: state.error, variant: 'error' })
  }, [state, toast])
}

export function AjustesBoard({ settings }: { settings: AppSettings }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ajustes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tu centro de control. Cada cambio queda auditado.</p>
      </div>

      <BusinessSection settings={settings} />
      <AlertsSection settings={settings} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PreferencesSection settings={settings} />
        <PasswordSection />
      </div>

      <LinksSection />
      <BackupSection updatedAt={settings.updatedAt} />
    </div>
  )
}

function BusinessSection({ settings }: { settings: AppSettings }) {
  const [state, action] = useFormState(updateBusinessData, initial)
  useActionToast(state)
  const fe = state.fieldErrors ?? {}
  return (
    <Card>
      <CardHeader title="Datos del negocio" subtitle="Fuente única — aparecen en cotizaciones, recibos y reportes" action={<Building2 className="h-4 w-4 text-gold-brand" />} />
      <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input id="s-name" name="businessName" label="Nombre del negocio" defaultValue={settings.businessName} error={fe.businessName} required />
        <Input id="s-legal" name="legalName" label="Razón social (opcional)" defaultValue={settings.legalName ?? ''} error={fe.legalName} placeholder="Ej. Marjos Designs S.R.L." />
        <Input id="s-rnc" name="rnc" label="RNC (opcional)" defaultValue={settings.rnc ?? ''} error={fe.rnc} />
        <Input id="s-phone" name="phone" label="Teléfono" defaultValue={settings.phone ?? ''} error={fe.phone} />
        <Input id="s-wa" name="whatsapp" label="WhatsApp" defaultValue={settings.whatsapp ?? ''} error={fe.whatsapp} />
        <Input id="s-email" name="email" label="Email" type="email" defaultValue={settings.email ?? ''} error={fe.email} />
        <Input id="s-ig" name="instagram" label="Instagram / redes" defaultValue={settings.instagram ?? ''} error={fe.instagram} placeholder="@marjosdesigns" />
        <Input id="s-address" name="address" label="Dirección" defaultValue={settings.address ?? ''} error={fe.address} />
        <div className="sm:col-span-2 flex justify-end"><SaveBtn label="Guardar datos" /></div>
      </form>
    </Card>
  )
}

function AlertsSection({ settings }: { settings: AppSettings }) {
  const [state, action] = useFormState(updateAlerts, initial)
  useActionToast(state)
  const fe = state.fieldErrors ?? {}
  const selected = new Set(settings.notifyDays)
  return (
    <Card>
      <CardHeader title="Alertas y notificaciones" subtitle="Cuándo avisar de entregas y cuándo un día está sobrecargado" action={<BellRing className="h-4 w-4 text-gold-brand" />} />
      <form action={action} className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium">Avisar de entregas con anticipación</p>
          <div className="flex flex-wrap gap-2">
            {NOTIFY_OPTIONS.map((o) => (
              <label key={o.value} className={cn('inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors', 'has-[:checked]:border-gold-mid/50 has-[:checked]:bg-gold-gradient-soft has-[:checked]:text-gold-brand', 'border-border text-muted-foreground')}>
                <input type="checkbox" name="notifyDays" value={o.value} defaultChecked={selected.has(o.value)} className="h-3.5 w-3.5 rounded border-border accent-gold-mid" />
                {o.label}
              </label>
            ))}
          </div>
          {fe.notifyDays && <p className="mt-1 text-xs font-medium text-status-overdue">{fe.notifyDays}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input id="s-warn" name="overloadWarn" label="Sobrecarga: aviso (entregas/día)" type="number" min="1" max="50" step="1" defaultValue={settings.overloadWarn} error={fe.overloadWarn} hint="Ese día se marca cargado." />
          <Input id="s-heavy" name="overloadHeavy" label="Sobrecarga: alerta fuerte" type="number" min="1" max="50" step="1" defaultValue={settings.overloadHeavy} error={fe.overloadHeavy} hint="Aquí avisa más fuerte." />
        </div>

        <div className="flex justify-end"><SaveBtn label="Guardar alertas" /></div>
      </form>
    </Card>
  )
}

function PreferencesSection({ settings }: { settings: AppSettings }) {
  const [state, action] = useFormState(updatePreferences, initial)
  useActionToast(state)
  return (
    <Card>
      <CardHeader title="Preferencias" subtitle="Tema por defecto" action={<Palette className="h-4 w-4 text-gold-brand" />} />
      <form action={action} className="space-y-4">
        <Select id="s-theme" name="defaultTheme" label="Tema por defecto" defaultValue={settings.defaultTheme}>
          <option value="system">Automático (según el dispositivo)</option>
          <option value="light">Claro</option>
          <option value="dark">Oscuro</option>
        </Select>
        <p className="text-xs text-muted-foreground">El interruptor claro/oscuro sigue disponible en cualquier momento.</p>
        <div className="flex justify-end"><SaveBtn label="Guardar" /></div>
      </form>
    </Card>
  )
}

function PasswordSection() {
  const [state, action] = useFormState(changeAdminPassword, initial)
  useActionToast(state)
  const fe = state.fieldErrors ?? {}
  return (
    <Card>
      <CardHeader title="Seguridad" subtitle="Cambia tu contraseña de administradora" action={<ShieldCheck className="h-4 w-4 text-gold-brand" />} />
      <form action={action} className="space-y-4" autoComplete="off">
        <Input id="s-pass" name="password" label="Nueva contraseña" type="password" autoComplete="new-password" error={fe.password} hint="Mínimo 8 caracteres." required />
        <Input id="s-pass2" name="confirm" label="Confirmar contraseña" type="password" autoComplete="new-password" error={fe.confirm} required />
        <div className="flex justify-end"><SaveBtn label="Cambiar contraseña" icon={KeyRound} /></div>
      </form>
    </Card>
  )
}

const LINKS: { href: string; label: string; desc: string; icon: typeof Users }[] = [
  { href: '/usuarios', label: 'Usuarios y roles', desc: 'Empleados, roles e historial de accesos', icon: Users },
  { href: '/cotizador/precios', label: 'Precios y productos', desc: 'El mismo panel del cotizador — sin duplicar', icon: Tag },
  { href: '/gastos', label: 'Subcategorías de gastos', desc: 'Gestiona las subcategorías desde Gastos', icon: ReceiptText },
  { href: '/usuarios', label: 'Historial de accesos', desc: 'Quién entró y cuándo', icon: History },
]

function LinksSection() {
  return (
    <Card>
      <CardHeader title="Administrar (enlaces)" subtitle="Cada dato vive en un solo lugar — aquí llegas rápido" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link key={l.label} href={l.href} className="group flex items-center gap-3 rounded-xl border border-border bg-card/60 px-3.5 py-3 transition-colors hover:border-gold-mid/40 dark:border-white/[0.08]">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-gradient-soft text-gold-brand"><l.icon className="h-4.5 w-4.5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{l.label}</p>
              <p className="truncate text-xs text-muted-foreground">{l.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </Card>
  )
}

function BackupSection({ updatedAt }: { updatedAt: string | null }) {
  return (
    <Card className="border-status-ready/30 bg-status-ready/[0.06]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-status-ready/15 text-status-ready"><DatabaseZap className="h-5 w-5" /></span>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-status-ready"><Check className="h-4 w-4" />Tus datos están seguros</div>
          <p className="text-sm text-muted-foreground">
            Todo se guarda cifrado en Supabase con respaldo automático. Los historiales (órdenes, caja, gastos, auditoría) son inviolables — no se borran, las correcciones quedan registradas.
          </p>
          {updatedAt && (
            <p className="text-xs text-muted-foreground">Última actualización de ajustes: {new Date(updatedAt).toLocaleString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          )}
        </div>
      </div>
    </Card>
  )
}
