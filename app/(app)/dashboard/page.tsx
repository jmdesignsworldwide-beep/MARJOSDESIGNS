import { requireAuth } from '@/lib/auth/guards'
import { getDashboardData } from '@/lib/dashboard/data'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { EmployeeHome } from '@/components/dashboard/EmployeeHome'

export const dynamic = 'force-dynamic'

/**
 * The dashboard is role-aware and role-protected SERVER-SIDE:
 * - super_admin gets the managerial "Sala de mando" (and only then is the
 *   managerial data fetched).
 * - empleado gets their own simple home — the managerial data is never
 *   queried or rendered for them.
 */
export default async function DashboardPage() {
  const profile = await requireAuth()
  const firstName = profile.full_name.split(' ')[0]

  if (profile.role !== 'super_admin') {
    return <EmployeeHome firstName={firstName} />
  }

  const data = await getDashboardData()
  return <AdminDashboard firstName={firstName} data={data} />
}
