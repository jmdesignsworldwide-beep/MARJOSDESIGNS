'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { ArrowLeft, Wallet, CreditCard, History, Plane, Plus, Trash2, ExternalLink, Activity } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { setPayroll, payWeek, addVacation, deleteVacation, type NominaState } from '@/lib/nomina/actions'
import { employmentTypeLabel, methodLabel, type EmployeePayroll, type PayrollPayment, type ActivityRow, type VacationRow } from '@/lib/nomina/types'

const initial: NominaState = {}
function fmtDate(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) }
function fmtDateTime(d: string) { return new Date(d).toLocaleString('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
function Submit({ label }: { label: string }) { const { pending } = useFormStatus(); return <Button type="submit" loading={pending}>{label}</Button> }

export function NominaDetail({
  employee,
  payments,
  activity,
  vacations,
  todayISO,
  lastWeekStart,
}: {
  employee: EmployeePayroll
  payments: PayrollPayment[]
  activity: ActivityRow[]
  vacations: VacationRow[]
  todayISO: string
  lastWeekStart: string
}) {
  const [salaryOpen, setSalaryOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [vacOpen, setVacOpen] = useState(false)
  const [salaryState, salaryAction] = useFormState(setPayroll, initial)
  const [payState, payAction] = useFormState(payWeek, initial)
  const [vacState, vacAction] = useFormState(addVacation, initial)
  const [amount, setAmount] = useState(String(employee.weeklySalary || ''))
  const [deduction, setDeduction] = useState('')
  const { toast } = useToast()

  useEffect(() => { if (salaryState.ok) { toast({ title: 'Salario guardado', variant: 'success' }); setSalaryOpen(false) } if (salaryState.error) toast({ title: salaryState.error, variant: 'error' }) }, [salaryState, toast])
  useEffect(() => { if (payState.ok) { toast({ title: 'Nómina pagada (entró a Gastos)', variant: 'success' }); setPayOpen(false) } if (payState.error) toast({ title: payState.error, variant: 'error' }) }, [payState, toast])
  useEffect(() => { if (vacState.ok) { toast({ title: 'Vacaciones registradas', variant: 'success' }); setVacOpen(false) } if (vacState.error) toast({ title: vacState.error, variant: 'error' }) }, [vacState, toast])

  const net = Math.max(0, Math.round((Number(amount) || 0) - (Number(deduction) || 0)))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/nominas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Nómina</Link>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setSalaryOpen(true)}><Wallet className="h-4 w-4" />Editar salario</Button>
          <Button onClick={() => { setAmount(String(employee.weeklySalary || '')); setDeduction(''); setPayOpen(true) }}><CreditCard className="h-4 w-4" />Pagar semana</Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{employee.fullName}</h1>
              {employee.status === 'inactivo' && <Badge status="neutral">Inactivo</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{employee.position ?? '—'} · {employmentTypeLabel[employee.employmentType]}{employee.hireDate ? ` · desde ${fmtDate(employee.hireDate)}` : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Salario semanal</p>
            <p className="tnum text-2xl font-bold text-gold-gradient">{employee.weeklySalary > 0 ? formatDOP(employee.weeklySalary) : '—'}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payments history */}
        <Card>
          <CardHeader title="Historial de pagos" subtitle="Permanente e inviolable" action={<History className="h-4 w-4 text-muted-foreground" />} />
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} title="Sin pagos aún" subtitle="Registra el pago de la semana." />
          ) : (
            <ul className="divide-y divide-border">
              {payments.map((p) => (
                <li key={p.id} className="py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{fmtDate(p.weekStart)} → {fmtDate(p.weekEnd)}</span>
                    <span className="tnum font-semibold">{formatDOP(p.netAmount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {methodLabel[p.method] ?? p.method}
                    {p.deduction > 0 ? ` · ${formatDOP(p.amount)} − ${formatDOP(p.deduction)} deducción` : ''}
                    {p.note ? ` · ${p.note}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader title="Actividad" subtitle="Lo que hizo — inviolable (se conserva aunque se desactive)" action={<Activity className="h-4 w-4 text-muted-foreground" />} />
          {activity.length === 0 ? (
            <EmptyState icon={Activity} title="Sin actividad registrada" subtitle="Aquí aparece lo que va haciendo." />
          ) : (
            <ul className="space-y-2">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {a.label}
                    {a.orderNumber && a.orderId && <Link href={`/ordenes/${a.orderId}`} className="ml-1 inline-flex items-center gap-0.5 text-gold-brand hover:underline">#{String(a.orderNumber).padStart(4, '0')}<ExternalLink className="h-3 w-3" /></Link>}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Vacations */}
      <Card>
        <CardHeader title="Vacaciones" subtitle="Registro simple (opcional)" action={<Button size="sm" variant="secondary" onClick={() => setVacOpen(true)}><Plus className="h-4 w-4" />Agregar</Button>} />
        {vacations.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Sin vacaciones registradas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {vacations.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="flex items-center gap-2"><Plane className="h-3.5 w-3.5 text-muted-foreground" />{fmtDate(v.startDate)} → {fmtDate(v.endDate)}{v.note ? ` · ${v.note}` : ''}</span>
                <form action={deleteVacation}>
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="profileId" value={employee.profileId} />
                  <button type="submit" className="text-muted-foreground hover:text-status-overdue"><Trash2 className="h-3.5 w-3.5" /></button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Salary modal */}
      <Modal open={salaryOpen} onClose={() => setSalaryOpen(false)} title="Salario del empleado" description="Privado — el empleado nunca ve su salario en el sistema.">
        <form action={salaryAction} className="space-y-4">
          <input type="hidden" name="profileId" value={employee.profileId} />
          <Input id="ws" name="weeklySalary" label="Salario semanal (RD$)" type="number" inputMode="decimal" step="1" min="0" defaultValue={employee.weeklySalary || ''} required />
          <Select id="et" name="employmentType" label="Tipo" defaultValue={employee.employmentType}>
            <option value="fijo">Fijo</option>
            <option value="pasante">Pasante</option>
          </Select>
          <div className="flex justify-end gap-3 pt-1"><Button type="button" variant="ghost" onClick={() => setSalaryOpen(false)}>Cancelar</Button><Submit label="Guardar" /></div>
        </form>
      </Modal>

      {/* Pay modal */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Pagar la semana" description="Se registra y entra a Gastos (salarios) sin recaptura.">
        <form action={payAction} className="space-y-4">
          <input type="hidden" name="profileId" value={employee.profileId} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="pw-start" name="weekStart" label="Semana desde" type="date" defaultValue={lastWeekStart} required />
            <Input id="pw-end" name="weekEnd" label="Hasta" type="date" defaultValue={todayISO} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="pw-amount" name="amount" label="Monto (RD$)" type="number" inputMode="decimal" step="1" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Input id="pw-ded" name="deduction" label="Deducción (opcional)" type="number" inputMode="decimal" step="1" min="0" value={deduction} onChange={(e) => setDeduction(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-3.5 py-2.5 text-sm dark:border-white/[0.08]">
            <span className="text-muted-foreground">Neto a pagar</span>
            <span className="tnum text-lg font-bold text-gold-gradient">{formatDOP(net)}</span>
          </div>
          <Select id="pw-method" name="method" label="Método" defaultValue="efectivo">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
          </Select>
          <Input id="pw-note" name="note" label="Nota (opcional)" />
          <div className="flex justify-end gap-3 pt-1"><Button type="button" variant="ghost" onClick={() => setPayOpen(false)}>Cancelar</Button><Submit label={`Pagar ${formatDOP(net)}`} /></div>
        </form>
      </Modal>

      {/* Vacation modal */}
      <Modal open={vacOpen} onClose={() => setVacOpen(false)} title="Registrar vacaciones" description="Un registro simple, sin cálculos complicados.">
        <form action={vacAction} className="space-y-4">
          <input type="hidden" name="profileId" value={employee.profileId} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="v-start" name="startDate" label="Desde" type="date" defaultValue={todayISO} required />
            <Input id="v-end" name="endDate" label="Hasta" type="date" defaultValue={todayISO} required />
          </div>
          <Textarea id="v-note" name="note" label="Nota (opcional)" rows={2} />
          <div className="flex justify-end gap-3 pt-1"><Button type="button" variant="ghost" onClick={() => setVacOpen(false)}>Cancelar</Button><Submit label="Guardar" /></div>
        </form>
      </Modal>
    </div>
  )
}
