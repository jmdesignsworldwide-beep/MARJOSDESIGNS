import { requireRole } from '@/lib/auth/guards'
import { listEmployeesWithPayroll, getPayrollReport, monthKeyDR } from '@/lib/nomina/data'
import { NominaBoard } from '@/components/nomina/NominaBoard'

export const dynamic = 'force-dynamic'

export default async function NominasPage() {
  await requireRole('super_admin')
  const month = monthKeyDR()
  const [employees, report] = await Promise.all([listEmployeesWithPayroll(), getPayrollReport(month)])
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })
  return <NominaBoard employees={employees} report={report} monthLabel={monthLabel} />
}
