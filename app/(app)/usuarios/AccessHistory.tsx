import { CheckCircle2, XCircle, LogOut, Ban } from 'lucide-react'
import {
  Table,
  TableHead,
  Th,
  TableBody,
  Tr,
  Td,
} from '@/components/ui/Table'
import { Card } from '@/components/ui/Card'

export interface AccessRow {
  id: number
  user_id: string | null
  email_attempted: string | null
  event_type: 'login_success' | 'login_failed' | 'logout' | 'login_blocked_inactive'
  ip: string | null
  created_at: string
}

const meta = {
  login_success: { label: 'Login exitoso', icon: CheckCircle2, cls: 'text-status-ready' },
  login_failed: { label: 'Login fallido', icon: XCircle, cls: 'text-status-overdue' },
  logout: { label: 'Cierre de sesión', icon: LogOut, cls: 'text-muted-foreground' },
  login_blocked_inactive: { label: 'Bloqueado (inactivo)', icon: Ban, cls: 'text-gold-brand' },
} as const

function fmt(ts: string) {
  return new Date(ts).toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Read-only login audit trail (super_admin only, append-only at the DB). */
export function AccessHistory({ rows }: { rows: AccessRow[] }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Historial de accesos</h2>
        <p className="text-sm text-muted-foreground">
          Registro append-only de entradas, salidas e intentos fallidos.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card className="py-10 text-center text-sm text-muted-foreground">
          Aún no hay registros de acceso.
        </Card>
      ) : (
        <Table>
          <TableHead>
            <Th>Evento</Th>
            <Th>Correo</Th>
            <Th>IP</Th>
            <Th className="text-right">Fecha</Th>
          </TableHead>
          <TableBody>
            {rows.map((r) => {
              const m = meta[r.event_type]
              const Icon = m.icon
              return (
                <Tr key={r.id}>
                  <Td>
                    <span className={`inline-flex items-center gap-2 font-medium ${m.cls}`}>
                      <Icon className="h-4 w-4" />
                      {m.label}
                    </span>
                  </Td>
                  <Td className="text-muted-foreground">{r.email_attempted ?? '—'}</Td>
                  <Td className="tnum text-muted-foreground">{r.ip ?? '—'}</Td>
                  <Td className="tnum text-right text-muted-foreground">{fmt(r.created_at)}</Td>
                </Tr>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
