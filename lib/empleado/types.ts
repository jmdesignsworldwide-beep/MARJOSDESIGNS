/** Client-safe employee-view types. The employee NEVER sees money. */
import type { OrderStage } from '@/lib/ordenes/format'

export interface EmployeeOrder {
  id: string
  number: number
  clientName: string | null
  summary: string
  stage: OrderStage
  deliveryDate: string | null
}
