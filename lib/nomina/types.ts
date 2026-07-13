/** Client-safe nómina types (no server-only deps). */

export interface EmployeePayroll {
  profileId: string
  fullName: string
  position: string | null
  status: 'activo' | 'inactivo'
  role: 'super_admin' | 'empleado'
  hireDate: string | null
  weeklySalary: number
  employmentType: 'fijo' | 'pasante'
  activeOrders: number
  paidThisMonth: number
}

export interface PayrollPayment {
  id: number
  weekStart: string
  weekEnd: string
  amount: number
  deduction: number
  netAmount: number
  method: string
  note: string | null
  actor: string | null
  createdAt: string
}

export interface VacationRow {
  id: number
  startDate: string
  endDate: string
  note: string | null
}

export interface ActivityRow {
  id: number
  action: string
  label: string
  orderNumber: number | null
  orderId: string | null
  createdAt: string
}

export interface PayrollReportRow {
  profileId: string
  fullName: string
  total: number
  count: number
}

export const employmentTypeLabel: Record<string, string> = { fijo: 'Fijo', pasante: 'Pasante' }
export const methodLabel: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Débito',
  credito: 'Crédito',
}

/** Human labels for the employee activity feed (derived from audit_log). */
export const activityLabel: Record<string, string> = {
  'order.stage': 'Cambió la etapa de una orden',
  'order.reschedule': 'Reprogramó una entrega',
  'pos.sale': 'Registró una venta rápida',
  'payment.create': 'Registró un pago',
  'order.attach': 'Adjuntó un diseño',
}
