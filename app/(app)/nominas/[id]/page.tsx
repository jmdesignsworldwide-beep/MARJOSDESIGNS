import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import {
  listEmployeesWithPayroll,
  getPayrollPayments,
  getEmployeeActivity,
  getVacations,
  todayDR,
} from '@/lib/nomina/data'
import { NominaDetail } from '@/components/nomina/NominaDetail'

export const dynamic = 'force-dynamic'

function lastWeekStart(todayISO: string): string {
  const d = new Date(todayISO + 'T00:00:00.000Z')
  d.setUTCDate(d.getUTCDate() - 6)
  return d.toISOString().slice(0, 10)
}

export default async function NominaEmployeePage({ params }: { params: { id: string } }) {
  await requireRole('super_admin')
  const [employees, payments, activity, vacations] = await Promise.all([
    listEmployeesWithPayroll(),
    getPayrollPayments(params.id),
    getEmployeeActivity(params.id),
    getVacations(params.id),
  ])
  const employee = employees.find((e) => e.profileId === params.id)
  if (!employee) notFound()

  const today = todayDR()
  return (
    <NominaDetail
      employee={employee}
      payments={payments}
      activity={activity}
      vacations={vacations}
      todayISO={today}
      lastWeekStart={lastWeekStart(today)}
    />
  )
}
