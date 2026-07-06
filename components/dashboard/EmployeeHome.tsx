import Link from 'next/link'
import { ClipboardList, CalendarDays, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

/**
 * Employee landing. Employees never see the managerial Sala de Mando — the
 * page fetches NO managerial data for them (enforced server-side). Their
 * full workspace ships in the employee tanda; for now, a warm home with
 * links to their own areas.
 */
export function EmployeeHome({ firstName }: { firstName: string }) {
  const links = [
    { href: '/mis-ordenes', icon: ClipboardList, title: 'Mis Órdenes', desc: 'Las órdenes asignadas a ti.' },
    { href: '/mi-calendario', icon: CalendarDays, title: 'Mi Calendario', desc: 'Tus entregas y pendientes.' },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Bienvenido de vuelta</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hola, <span className="text-gold-gradient">{firstName}</span>
          </h1>
        </div>
        <Badge status="process">Empleado</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((l) => {
          const Icon = l.icon
          return (
            <Link key={l.href} href={l.href}>
              <Card clickable className="h-full">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-gradient-soft text-gold-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-semibold">{l.title}</h2>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{l.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
