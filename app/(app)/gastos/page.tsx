import { requireRole } from '@/lib/auth/guards'
import {
  getOverview,
  listCategories,
  listExpenses,
  getRecurringReminders,
  monthKeyDR,
  todayDR,
} from '@/lib/gastos/data'
import { getOpenRegister } from '@/lib/caja/data'
import { listProducts } from '@/lib/cotizador/data'
import type { ExpenseFilters, ExpenseGroup, ExpenseMethod } from '@/lib/gastos/types'
import { GastosBoard } from '@/components/gastos/GastosBoard'

export const dynamic = 'force-dynamic'

const GROUPS = ['produccion', 'negocio', 'personal']
const METHODS = ['efectivo', 'transferencia', 'debito', 'credito']

export default async function GastosPage({
  searchParams,
}: {
  searchParams: { group?: string; categoryId?: string; method?: string; from?: string; to?: string }
}) {
  await requireRole('super_admin')

  const filters: ExpenseFilters = {
    group: GROUPS.includes(searchParams.group ?? '') ? (searchParams.group as ExpenseGroup) : undefined,
    categoryId: searchParams.categoryId || undefined,
    method: METHODS.includes(searchParams.method ?? '') ? (searchParams.method as ExpenseMethod) : undefined,
    from: searchParams.from || undefined,
    to: searchParams.to || undefined,
  }

  const [overview, categories, allCategories, expenses, reminders, register, products] = await Promise.all([
    getOverview(),
    listCategories(false),
    listCategories(true),
    listExpenses(filters),
    getRecurringReminders(),
    getOpenRegister(),
    listProducts(),
  ])

  return (
    <GastosBoard
      overview={overview}
      categories={categories}
      allCategories={allCategories}
      expenses={expenses}
      reminders={reminders}
      filters={filters}
      cajaOpen={!!register}
      products={products.map((p) => ({ id: p.id, name: p.name }))}
      currentMonth={monthKeyDR()}
      today={todayDR()}
    />
  )
}
