'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/auth/audit'
import { roundMoney } from '@/lib/cotizador/calc'
import { recordCashMovement, findOpenRegisterId } from '@/lib/caja/movements'
import {
  createExpenseSchema,
  editExpenseSchema,
  voidExpenseSchema,
  addCategorySchema,
  toggleCategorySchema,
  receiptItemsSchema,
} from '@/lib/validation/gastos'
import { readReceiptImage, type ReceiptItem } from './ocr'
import { RECEIPTS_BUCKET, getReceiptItems } from './data'
import type { ReceiptItemRow } from './types'

export interface GastoState {
  error?: string
  ok?: boolean
}

/** State returned by readReceipt (vision OCR). Never throws to the client. */
export interface ReadReceiptState {
  error?: string
  ok?: boolean
  readable?: boolean
  reason?: string
  unconfigured?: boolean
  merchant?: string | null
  date?: string | null
  total?: number | null
  items?: ReceiptItem[]
}

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024

/** Parse the hidden receiptItems JSON field into validated rows (best-effort). */
function parseReceiptItems(raw: FormDataEntryValue | null): ReceiptItem[] {
  if (typeof raw !== 'string' || !raw.trim()) return []
  try {
    const parsed = receiptItemsSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return []
    return parsed.data.map((it) => ({
      name: it.name,
      quantity: it.quantity ?? null,
      unitPrice: it.unitPrice ?? null,
      lineTotal: it.lineTotal ?? null,
    }))
  } catch {
    return []
  }
}

/**
 * Read a receipt photo with vision AI (SERVER-SIDE). Transcribes exactly what
 * it sees; if the photo can't be read, asks for a clearer one instead of
 * guessing. The image itself is NOT uploaded here — it stays in the form and is
 * saved (or not) when Marjos confirms the expense.
 */
export async function readReceipt(_prev: ReadReceiptState, formData: FormData): Promise<ReadReceiptState> {
  await requireRole('super_admin')
  const file = formData.get('receipt')
  if (!(file instanceof File) || file.size === 0) return { error: 'Sube una foto del recibo primero.' }
  if (!ALLOWED_MIME.includes(file.type)) return { error: 'Tipo no permitido (imagen o PDF).' }
  if (file.size > MAX_BYTES) return { error: 'El recibo supera 10 MB.' }

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
  const result = await readReceiptImage(base64, file.type)

  if (!result.ok) {
    if (result.kind === 'unconfigured') return { ok: true, unconfigured: true, reason: result.message }
    return { error: result.message }
  }

  const d = result.data
  if (!d.readable) return { ok: true, readable: false, reason: d.reason }
  return {
    ok: true,
    readable: true,
    merchant: d.merchant,
    date: d.date,
    total: d.total,
    items: d.items,
  }
}

function revalidateGastos() {
  revalidatePath('/gastos')
  revalidatePath('/caja')
  revalidatePath('/dashboard')
}

/** Upload a receipt to the PRIVATE bucket; returns its storage path or null. */
async function uploadReceipt(file: File, actorId: string): Promise<{ path?: string; error?: string }> {
  if (!ALLOWED_MIME.includes(file.type)) return { error: 'Recibo: tipo no permitido (imagen o PDF).' }
  if (file.size > MAX_BYTES) return { error: 'El recibo supera 10 MB.' }
  const safeName = file.name.replace(/[^\w.\-]/g, '_').slice(0, 80)
  const path = `${actorId}/${Date.now()}-${safeName}`
  const admin = createSupabaseAdminClient()
  const { error } = await admin.storage.from(RECEIPTS_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) return { error: 'No se pudo subir el recibo.' }
  return { path }
}

export async function createExpense(_prev: GastoState, formData: FormData): Promise<GastoState> {
  const admin = await requireRole('super_admin')
  const parsed = createExpenseSchema.safeParse({
    categoryId: formData.get('categoryId'),
    description: formData.get('description'),
    amount: formData.get('amount'),
    expenseDate: formData.get('expenseDate'),
    method: formData.get('method'),
    vendor: formData.get('vendor') ?? '',
    notes: formData.get('notes') ?? '',
    isRecurring: formData.get('isRecurring') === 'on' || formData.get('isRecurring') === 'true',
    deductFromCaja: formData.get('deductFromCaja') === 'on' || formData.get('deductFromCaja') === 'true',
    productId: formData.get('productId') ?? '',
    receiptTotal: formData.get('receiptTotal') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const input = parsed.data
  const amount = roundMoney(input.amount)
  const receiptItems = parseReceiptItems(formData.get('receiptItems'))

  // Optional receipt.
  let receiptPath: string | null = null
  const file = formData.get('receipt')
  if (file instanceof File && file.size > 0) {
    const up = await uploadReceipt(file, admin.id)
    if (up.error) return { error: up.error }
    receiptPath = up.path ?? null
  }

  const supabase = createSupabaseServerClient()
  const { data: row, error } = await supabase
    .from('expenses')
    .insert({
      category_id: input.categoryId,
      description: input.description,
      amount,
      expense_date: input.expenseDate,
      method: input.method,
      vendor: input.vendor || null,
      notes: input.notes || null,
      is_recurring: !!input.isRecurring,
      receipt_path: receiptPath,
      product_id: input.productId || null,
      receipt_read: receiptItems.length > 0,
      receipt_total: input.receiptTotal ?? null,
      created_by: admin.id,
    })
    .select('id')
    .single()

  if (error || !row) {
    if (receiptPath) await createSupabaseAdminClient().storage.from(RECEIPTS_BUCKET).remove([receiptPath])
    return { error: 'No se pudo registrar el gasto.' }
  }

  // Persist the transcribed receipt lines (consumption history — best-effort;
  // never blocks the expense itself).
  if (receiptItems.length > 0) {
    await supabase.from('expense_receipt_items').insert(
      receiptItems.map((it, i) => ({
        expense_id: row.id,
        name: it.name,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        line_total: it.lineTotal,
        position: i,
      })),
    )
  }

  // Caja hook (opt-in): an efectivo expense leaves today's open drawer.
  if (input.deductFromCaja && input.method === 'efectivo') {
    const rid = await findOpenRegisterId()
    if (rid) {
      await recordCashMovement(
        {
          direction: 'salida',
          source: 'expense',
          amount,
          method: 'efectivo',
          concept: `Gasto: ${input.description}`,
          expenseId: row.id,
          createdBy: admin.id,
        },
        rid,
      )
    }
  }

  await logAudit({ actorId: admin.id, action: 'expense.create', targetType: 'expense', targetId: String(row.id), details: { amount, method: input.method, category: input.categoryId } })
  revalidateGastos()
  return { ok: true }
}

/** Edit a gasto — always audited (amount changes are never silent). */
export async function editExpense(_prev: GastoState, formData: FormData): Promise<GastoState> {
  const admin = await requireRole('super_admin')
  const parsed = editExpenseSchema.safeParse({
    id: formData.get('id'),
    categoryId: formData.get('categoryId'),
    description: formData.get('description'),
    amount: formData.get('amount'),
    expenseDate: formData.get('expenseDate'),
    method: formData.get('method'),
    vendor: formData.get('vendor') ?? '',
    notes: formData.get('notes') ?? '',
    isRecurring: formData.get('isRecurring') === 'on' || formData.get('isRecurring') === 'true',
    productId: formData.get('productId') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const input = parsed.data
  const amount = roundMoney(input.amount)

  const supabase = createSupabaseServerClient()
  const { data: before } = await supabase.from('expenses').select('amount').eq('id', input.id).maybeSingle()

  // Optional receipt replacement.
  let receiptPatch: Record<string, unknown> = {}
  const file = formData.get('receipt')
  if (file instanceof File && file.size > 0) {
    const up = await uploadReceipt(file, admin.id)
    if (up.error) return { error: up.error }
    receiptPatch = { receipt_path: up.path }
  }

  const { error } = await supabase
    .from('expenses')
    .update({
      category_id: input.categoryId,
      description: input.description,
      amount,
      expense_date: input.expenseDate,
      method: input.method,
      vendor: input.vendor || null,
      notes: input.notes || null,
      is_recurring: !!input.isRecurring,
      product_id: input.productId || null,
      ...receiptPatch,
    })
    .eq('id', input.id)
    .eq('status', 'activo')
  if (error) return { error: 'No se pudo editar el gasto.' }

  await logAudit({
    actorId: admin.id,
    action: 'expense.edit',
    targetType: 'expense',
    targetId: String(input.id),
    details: { oldAmount: before ? Number(before.amount) : null, newAmount: amount },
  })
  revalidateGastos()
  return { ok: true }
}

/** Soft-void a gasto (reason required). Reverses its caja salida if open. */
export async function voidExpense(_prev: GastoState, formData: FormData): Promise<GastoState> {
  const admin = await requireRole('super_admin')
  const parsed = voidExpenseSchema.safeParse({ id: formData.get('id'), reason: formData.get('reason') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Motivo requerido.' }
  const { id, reason } = parsed.data

  const supabase = createSupabaseServerClient()
  const { data: exp } = await supabase.from('expenses').select('id, amount, description, status').eq('id', id).maybeSingle()
  if (!exp) return { error: 'Gasto no encontrado.' }
  if (exp.status === 'anulado') return { error: 'El gasto ya está anulado.' }

  const { error } = await supabase
    .from('expenses')
    .update({ status: 'anulado', void_reason: reason, voided_by: admin.id, voided_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'activo')
  if (error) return { error: 'No se pudo anular el gasto.' }

  // If it left the caja and that register is still open, put the money back.
  const { data: mv } = await supabase
    .from('cash_movements')
    .select('register_id, amount, method')
    .eq('expense_id', id)
    .eq('direction', 'salida')
    .maybeSingle()
  if (mv) {
    const { data: reg } = await supabase.from('cash_registers').select('id, status').eq('id', mv.register_id).maybeSingle()
    if (reg?.status === 'abierta') {
      await recordCashMovement(
        { direction: 'entrada', source: 'expense', amount: Number(mv.amount), method: mv.method, concept: `Reverso gasto anulado: ${exp.description}`, expenseId: id, createdBy: admin.id },
        mv.register_id,
      )
    }
  }

  await logAudit({ actorId: admin.id, action: 'expense.void', targetType: 'expense', targetId: String(id), details: { reason, amount: Number(exp.amount) } })
  revalidateGastos()
  return { ok: true }
}

/** Load the transcribed lines of one receipt on demand (behind "Ver detalle"). */
export async function fetchReceiptItems(expenseId: number): Promise<ReceiptItemRow[]> {
  await requireRole('super_admin')
  if (!Number.isInteger(expenseId) || expenseId <= 0) return []
  return getReceiptItems(expenseId)
}

export async function addCategory(_prev: GastoState, formData: FormData): Promise<GastoState> {
  const admin = await requireRole('super_admin')
  const parsed = addCategorySchema.safeParse({ name: formData.get('name'), grp: formData.get('grp') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('expense_categories').insert({ name: parsed.data.name, grp: parsed.data.grp, position: 99 })
  if (error) return { error: 'No se pudo crear la categoría.' }
  await logAudit({ actorId: admin.id, action: 'expense_category.create', targetType: 'expense_category', details: { name: parsed.data.name, grp: parsed.data.grp } })
  revalidatePath('/gastos')
  return { ok: true }
}

export async function toggleCategory(formData: FormData): Promise<void> {
  const admin = await requireRole('super_admin')
  const parsed = toggleCategorySchema.safeParse({ id: formData.get('id'), status: formData.get('status') })
  if (!parsed.success) return
  const supabase = createSupabaseServerClient()
  await supabase.from('expense_categories').update({ status: parsed.data.status }).eq('id', parsed.data.id)
  await logAudit({ actorId: admin.id, action: 'expense_category.toggle', targetType: 'expense_category', targetId: parsed.data.id, details: { status: parsed.data.status } })
  revalidatePath('/gastos')
}
