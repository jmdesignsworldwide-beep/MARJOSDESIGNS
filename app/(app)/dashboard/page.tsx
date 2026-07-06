import { requireAuth } from '@/lib/auth/guards'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ShieldCheck, LayoutDashboard, Lock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const profile = await requireAuth()
  const isAdmin = profile.role === 'super_admin'
  const firstName = profile.full_name.split(' ')[0]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Bienvenida de vuelta</p>
          <h1 className="text-2xl font-bold tracking-tight">
            Hola, <span className="text-gold-gradient">{firstName}</span>
          </h1>
        </div>
        <Badge status={isAdmin ? 'ready' : 'process'}>
          {isAdmin ? 'Super Admin · acceso total' : 'Empleado · vista simplificada'}
        </Badge>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-gradient-soft text-gold-brand">
            {isAdmin ? <ShieldCheck className="h-5 w-5" /> : <LayoutDashboard className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="font-semibold">
              {isAdmin ? 'Tienes acceso a todo el sistema' : 'Tu vista de empleado'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? 'Ves todos los módulos en el menú. Los módulos de negocio (órdenes, cotizador, etc.) llegan en próximas tandas.'
                : 'Solo ves los módulos que te corresponden: Mis Órdenes y Mi Calendario. Las áreas de administración están bloqueadas para tu cuenta.'}
            </p>
          </div>
        </div>
      </Card>

      {!isAdmin && (
        <Card className="mt-4">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-status-overdue/10 text-status-overdue">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">Áreas protegidas</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Si intentas abrir una ruta de administración (por ejemplo,
                escribiendo la URL a mano), el servidor te devolverá a este
                panel. El acceso no es solo visual: está forzado del lado del
                servidor.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
