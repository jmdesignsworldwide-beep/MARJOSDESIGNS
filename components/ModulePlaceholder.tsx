import { Construction, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'

/**
 * Placeholder body for modules that aren't built yet (this tanda only wires
 * auth + roles). What's REAL is that you can only reach this page if your
 * role allows it — the guard runs server-side in the page.
 */
export function ModulePlaceholder({
  title,
  description,
  icon: Icon = Construction,
  scope,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  scope?: 'admin' | 'empleado'
}) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-muted-foreground">{description}</p>
          )}
        </div>
        {scope && (
          <span className="rounded-full border border-gold-mid/30 bg-gold-gradient-soft px-3 py-1 text-xs font-medium text-gold-brand">
            {scope === 'admin' ? 'Solo admin' : 'Empleado'}
          </span>
        )}
      </div>

      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold-gradient-soft text-gold-brand">
          <Icon className="h-6 w-6" />
        </span>
        <p className="text-lg font-semibold">Próximamente</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Este módulo se construye en una tanda futura. Por ahora, lo que está
          activo es el control de acceso por rol.
        </p>
      </Card>
    </div>
  )
}
