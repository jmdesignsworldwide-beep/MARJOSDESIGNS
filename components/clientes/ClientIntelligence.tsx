import { Trophy, Repeat, BellRing } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import type { ClientIntelligence as Intel } from '@/lib/clients/data'

/**
 * CRM intelligence — best clients + reactivation alerts. Built now, lit up
 * automatically when the Órdenes tanda produces data. Honest empty states.
 */
export function ClientIntelligence({ intel }: { intel: Intel }) {
  return (
    <div className="mt-12">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Inteligencia de clientes</h2>
        <p className="text-sm text-muted-foreground">
          Mejores clientes y quién reactivar. Se llena solo cuando existan
          órdenes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Top por monto" subtitle="Quién más ha gastado" />
          {intel.topBySpend.length === 0 ? (
            <MiniEmpty icon={Trophy} text="Aparecerá cuando haya órdenes con pagos." />
          ) : (
            <ol className="space-y-2">
              {intel.topBySpend.map((r, i) => (
                <li key={r.id} className="flex justify-between text-sm">
                  <span>{i + 1}. {r.name}</span>
                  <span className="tnum font-medium text-gold-brand">{r.value}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <CardHeader title="Más frecuentes" subtitle="Por cantidad de órdenes" />
          {intel.topByOrders.length === 0 ? (
            <MiniEmpty icon={Repeat} text="Se calcula con el historial de órdenes." />
          ) : (
            <ol className="space-y-2">
              {intel.topByOrders.map((r, i) => (
                <li key={r.id} className="flex justify-between text-sm">
                  <span>{i + 1}. {r.name}</span>
                  <span className="tnum font-medium">{r.value}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <CardHeader title="Reactivación" subtitle="Sin ordenar hace 30/60/90 días" />
          {intel.reactivation.length === 0 ? (
            <MiniEmpty
              icon={BellRing}
              text="Los clientes dormidos aparecerán aquí, listos para escribirles por WhatsApp."
            />
          ) : (
            <ul className="space-y-2">
              {intel.reactivation.map((r) => (
                <li key={r.id} className="flex justify-between text-sm">
                  <span>{r.name}</span>
                  <span className="text-status-overdue">{r.daysSince} días</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function MiniEmpty({
  icon: Icon,
  text,
}: {
  icon: typeof Trophy
  text: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-gradient-soft text-gold-brand">
        <Icon className="h-5 w-5" />
      </span>
      <p className="max-w-[13rem] text-xs text-muted-foreground">{text}</p>
    </div>
  )
}
