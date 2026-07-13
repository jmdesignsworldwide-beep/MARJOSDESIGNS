import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/cotizador/calc'
import { getSettings } from '@/lib/settings/data'
import { ACTIVE_STAGES, type OrderStage } from '@/lib/ordenes/format'

export interface DeliveryNotice {
  id: string
  number: number
  clientName: string | null
  deliveryDate: string
  stage: OrderStage
  daysUntil: number // <0 overdue, 0 today, 1 tomorrow, ...
  balance: number
}

/** Local date (America/Santo_Domingo, UTC-4, no DST) as YYYY-MM-DD. */
function todayInDR(): Date {
  const now = new Date()
  const dr = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  return new Date(Date.UTC(dr.getUTCFullYear(), dr.getUTCMonth(), dr.getUTCDate()))
}

function daysBetween(deliveryISO: string, today: Date): number {
  const d = new Date(deliveryISO + 'T00:00:00Z')
  return Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * Deliveries that need attention: due within 3 days, tomorrow, today, or
 * already overdue — for active (undelivered, uncancelled) orders. Ordered by
 * urgency (most overdue first). Super_admin only.
 */
export async function getDeliveryNotices(): Promise<DeliveryNotice[]> {
  const supabase = createSupabaseServerClient()
  const today = todayInDR()
  // The horizon is the largest configured anticipation day (Ajustes → Alertas).
  const settings = await getSettings()
  const horizonDays = Math.max(0, ...settings.notifyDays)
  const horizon = new Date(today.getTime() + horizonDays * 24 * 60 * 60 * 1000)
  const horizonISO = horizon.toISOString().slice(0, 10)

  const { data } = await supabase
    .from('orders')
    .select('id, number, client_name, delivery_date, stage, total, amount_paid')
    .in('stage', ACTIVE_STAGES)
    .not('delivery_date', 'is', null)
    .lte('delivery_date', horizonISO)
    .order('delivery_date', { ascending: true })

  return ((data ?? []) as {
    id: string
    number: number
    client_name: string | null
    delivery_date: string
    stage: OrderStage
    total: number
    amount_paid: number
  }[]).map((o) => ({
    id: o.id,
    number: o.number,
    clientName: o.client_name,
    deliveryDate: o.delivery_date,
    stage: o.stage,
    daysUntil: daysBetween(o.delivery_date, today),
    balance: roundMoney(Math.max(0, Number(o.total) - Number(o.amount_paid))),
  }))
}
