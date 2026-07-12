/** Client-safe gastos types + constants (no server-only deps). */

export type ExpenseGroup = 'produccion' | 'negocio' | 'personal'
export type ExpenseMethod = 'efectivo' | 'transferencia' | 'debito' | 'credito'

export const GROUPS: ExpenseGroup[] = ['produccion', 'negocio', 'personal']

export const groupMeta: Record<
  ExpenseGroup,
  { label: string; short: string; status: 'process' | 'ready' | 'overdue' | 'neutral' }
> = {
  produccion: { label: 'Costo de producción', short: 'Producción', status: 'process' },
  negocio: { label: 'Gasto del negocio', short: 'Negocio', status: 'neutral' },
  personal: { label: 'Gasto personal', short: 'Personal', status: 'overdue' },
}

export const methodLabel: Record<ExpenseMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Débito',
  credito: 'Crédito',
}

export interface ExpenseCategory {
  id: string
  name: string
  grp: ExpenseGroup
  status: 'activo' | 'inactivo'
  is_system: boolean
}

export interface Expense {
  id: number
  category_id: string
  category_name: string | null
  grp: ExpenseGroup | null
  description: string
  amount: number
  expense_date: string
  method: ExpenseMethod
  vendor: string | null
  notes: string | null
  is_recurring: boolean
  receipt_url: string | null
  status: 'activo' | 'anulado'
  void_reason: string | null
  created_at: string
}

export interface CategoryTotal {
  categoryId: string
  name: string
  grp: ExpenseGroup
  total: number
}

export interface MonthTotal {
  month: string // YYYY-MM
  total: number
}

export interface RecurringReminder {
  categoryId: string
  categoryName: string
  grp: ExpenseGroup
  description: string
  method: ExpenseMethod
  lastAmount: number
  vendor: string | null
}

export interface ExpensesOverview {
  thisMonthTotal: number
  prevMonthTotal: number
  byGroup: Record<ExpenseGroup, number>
  byCategory: CategoryTotal[]
  byMonth: MonthTotal[]
  topCategory: { name: string; total: number } | null
}

export interface ExpenseFilters {
  group?: ExpenseGroup
  categoryId?: string
  method?: ExpenseMethod
  from?: string
  to?: string
}
