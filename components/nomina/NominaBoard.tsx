'use client'

import Link from 'next/link'
import { Printer, Wallet, Users, ClipboardList, ChevronRight } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { employmentTypeLabel, type EmployeePayroll, type PayrollReportRow } from '@/lib/nomina/types'

export function NominaBoard({
  employees,
  report,
  monthLabel,
}: {
  employees: EmployeePayroll[]
  report: { total: number; count: number; rows: PayrollReportRow[] }
  monthLabel: string
}) {
  const active = employees.filter((e) => e.status === 'activo')
  const topLoad = [...employees].sort((a, b) => b.activeOrders - a.activeOrders)[0]

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Nómina</h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">{monthLabel} · salarios y pagos de tu equipo</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />Reporte PDF</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Nómina pagada este mes" value={report.total} currency icon={Wallet} />
        <KpiCard label="Empleados activos" value={active.length} icon={Users} />
        <Card className="flex flex-col justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ClipboardList className="h-4 w-4 text-gold-brand" />Más carga de órdenes</div>
          {topLoad && topLoad.activeOrders > 0 ? (
            <><p className="mt-1 truncate text-lg font-bold">{topLoad.fullName}</p><p className="text-sm text-muted-foreground">{topLoad.activeOrders} órdenes activas</p></>
          ) : <p className="mt-1 text-sm text-muted-foreground">Sin carga asignada</p>}
        </Card>
      </div>

      {/* Employees */}
      {employees.length === 0 ? (
        <EmptyState icon={Users} title="Sin empleados" subtitle="Crea empleados en Usuarios; aquí defines su salario y les pagas." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((e) => (
            <Link key={e.profileId} href={`/nominas/${e.profileId}`}>
              <Card clickable className="h-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{e.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.position ?? employmentTypeLabel[e.employmentType]}</p>
                  </div>
                  {e.status === 'inactivo' ? <Badge status="neutral">Inactivo</Badge> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm dark:border-white/[0.08]">
                  <span className="text-muted-foreground">Salario semanal</span>
                  <span className="tnum font-semibold">{e.weeklySalary > 0 ? formatDOP(e.weeklySalary) : '—'}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{e.activeOrders} órdenes activas</span>
                  <span className="tnum">Pagado mes: {formatDOP(e.paidThisMonth)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Report (print) */}
      <Card className="print-area">
        <div className="hidden print:mb-3 print:block">
          <h2 className="text-lg font-bold">Marjos Designs S.R.L. — Reporte de nómina</h2>
          <p className="text-sm capitalize">{monthLabel} · comprobante interno (no fiscal)</p>
        </div>
        <CardHeader title="Reporte del mes" subtitle={`${report.count} pago(s) · total ${formatDOP(report.total)}`} />
        {report.rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aún no has pagado nómina este mes.</p>
        ) : (
          <ul className="divide-y divide-border">
            {report.rows.map((r) => (
              <li key={r.profileId} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium">{r.fullName}</span>
                <span className="tnum font-semibold">{formatDOP(r.total)} <span className="text-xs font-normal text-muted-foreground">({r.count})</span></span>
              </li>
            ))}
            <li className="flex items-center justify-between pt-3 text-sm font-bold">
              <span>Total</span>
              <span className={cn('tnum text-gold-gradient')}>{formatDOP(report.total)}</span>
            </li>
          </ul>
        )}
      </Card>
    </div>
  )
}
