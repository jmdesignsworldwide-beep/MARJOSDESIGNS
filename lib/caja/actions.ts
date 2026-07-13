'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'
import { roundMoney } from '@/lib/cotizador/calc'
import { openRegisterSchema, closeRegisterSchema, manualMovementSchema } from '@/lib/validation/caja'
import { businessDateDR, summarize, listMovements, getRegister } from './data'
import { recordCashMovement } from './movements'

export interface CajaState {
  error?: string
  ok?: boolean
}

function revalidateCaja() {
  revalidatePath('/caja')
  revalidatePath('/caja/historial')
  revalidatePath('/dashboard')
}

/** Open today's register with an initial cash float. */
export async function openRegister(_prev: CajaState, formData: FormData): Promise<CajaState> {
  const admin = await requireRole('super_admin')
  const parsed = openRegisterSchema.safeParse({ openingFloat: formData.get('openingFloat') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }

  const supabase = createSupabaseServerClient()
  const float = roundMoney(parsed.data.openingFloat)
  const { data, error } = await supabase
    .from('cash_registers')
    .insert({ business_date: businessDateDR(), opening_float: float, opened_by: admin.id })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'La caja de hoy ya fue abierta.' }
    return { error: 'No se pudo abrir la caja.' }
  }
  await logAudit({ actorId: admin.id, action: 'caja.open', targetType: 'cash_register', targetId: data.id, details: { openingFloat: float } })
  revalidateCaja()
  return { ok: true }
}

/** Close the register: server recomputes expected cash and the difference. */
export async function closeRegister(_prev: CajaState, formData: FormData): Promise<CajaState> {
  const admin = await requireRole('super_admin')
  const parsed = closeRegisterSchema.safeParse({
    registerId: formData.get('registerId'),
    countedCash: formData.get('countedCash'),
    note: formData.get('note') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const { registerId, countedCash, note } = parsed.data

  const register = await getRegister(registerId)
  if (!register) return { error: 'Caja no encontrada.' }
  if (register.status === 'cerrada') return { error: 'Esta caja ya está cerrada.' }

  const movements = await listMovements(registerId)
  const summary = summarize(register, movements)
  const counted = roundMoney(countedCash)
  const difference = roundMoney(counted - summary.expectedCash)

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('cash_registers')
    .update({
      status: 'cerrada',
      counted_cash: counted,
      expected_cash: summary.expectedCash,
      difference,
      closing_note: note || null,
      closed_by: admin.id,
      closed_at: new Date().toISOString(),
    })
    .eq('id', registerId)
    .eq('status', 'abierta')
  if (error) return { error: 'No se pudo cerrar la caja.' }

  await logAudit({
    actorId: admin.id,
    action: 'caja.close',
    targetType: 'cash_register',
    targetId: registerId,
    details: { expected: summary.expectedCash, counted, difference, total: summary.totalIn },
  })
  revalidateCaja()
  return { ok: true }
}

/** Manual entry/exit for money that doesn't come from an order or a POS sale. */
export async function addManualMovement(_prev: CajaState, formData: FormData): Promise<CajaState> {
  const admin = await requireRole('super_admin')
  const parsed = manualMovementSchema.safeParse({
    direction: formData.get('direction'),
    amount: formData.get('amount'),
    method: formData.get('method'),
    concept: formData.get('concept'),
    clientId: formData.get('clientId') ?? '',
    reference: formData.get('reference') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const input = parsed.data

  const supabase = createSupabaseServerClient()
  const { data: reg } = await supabase.from('cash_registers').select('id').eq('status', 'abierta').maybeSingle()
  if (!reg) return { error: 'Abre la caja antes de registrar un movimiento.' }

  // Resolve the client name from the chosen REGISTERED client (authoritative —
  // never trust a free-text name from the browser).
  let clientId: string | null = null
  let clientName: string | null = null
  if (input.clientId) {
    const { data: client } = await supabase.from('clients').select('id, name').eq('id', input.clientId).maybeSingle()
    if (!client) return { error: 'El cliente seleccionado no existe.' }
    clientId = client.id as string
    clientName = client.name as string
  }

  // Duplicate-voucher guard for transfers.
  if (input.method === 'transferencia' && input.reference) {
    const { data: dup } = await supabase
      .from('cash_movements')
      .select('id')
      .eq('register_id', reg.id)
      .eq('reference', input.reference)
      .limit(1)
    if (dup && dup.length > 0) return { error: 'Ya existe un movimiento con esa referencia.' }
  }

  const ok = await recordCashMovement(
    {
      direction: input.direction,
      source: 'manual',
      amount: input.amount,
      method: input.method,
      reference: input.reference || null,
      concept: input.concept,
      clientName,
      clientId,
      createdBy: admin.id,
    },
    reg.id,
  )
  if (!ok) return { error: 'No se pudo registrar el movimiento.' }

  await logAudit({ actorId: admin.id, action: 'caja.manual', targetType: 'cash_register', targetId: reg.id, details: { direction: input.direction, amount: roundMoney(input.amount), method: input.method } })
  revalidateCaja()
  return { ok: true }
}
