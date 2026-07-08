'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'
import {
  createClientSchema,
  updateClientSchema,
  clientStatus,
} from '@/lib/validation/clients'

export interface ClientActionState {
  error?: string
  fieldErrors?: Record<string, string>
  success?: string
  createdId?: string
}

function parseForm(formData: FormData) {
  return {
    type: formData.get('type'),
    name: formData.get('name'),
    phone: formData.get('phone') ?? '',
    whatsapp: formData.get('whatsapp') ?? '',
    email: formData.get('email') ?? '',
    address: formData.get('address') ?? '',
    notes: formData.get('notes') ?? '',
    cedula: formData.get('cedula') ?? '',
    rnc: formData.get('rnc') ?? '',
    contact_person: formData.get('contact_person') ?? '',
  }
}

function fieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {}
  for (const i of issues) out[String(i.path[0])] = i.message
  return out
}

export async function createClient(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const admin = await requireRole('super_admin')
  const parsed = createClientSchema.safeParse(parseForm(formData))
  if (!parsed.success) {
    return { error: 'Revisa los campos.', fieldErrors: fieldErrors(parsed.error.issues) }
  }
  const input = parsed.data

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...input, created_by: admin.id })
    .select('id')
    .single()

  if (error || !data) return { error: 'No se pudo guardar el cliente.' }

  await logAudit({
    actorId: admin.id,
    action: 'client.create',
    targetType: 'client',
    targetId: data.id,
    details: { name: input.name, type: input.type },
  })

  revalidatePath('/clientes')
  return { success: `Cliente ${input.name} guardado.`, createdId: data.id }
}

export async function updateClient(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const admin = await requireRole('super_admin')
  const parsed = updateClientSchema.safeParse({
    ...parseForm(formData),
    id: formData.get('id'),
  })
  if (!parsed.success) {
    return { error: 'Revisa los campos.', fieldErrors: fieldErrors(parsed.error.issues) }
  }
  const { id, ...input } = parsed.data

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('clients').update(input).eq('id', id)
  if (error) return { error: 'No se pudo actualizar el cliente.' }

  await logAudit({
    actorId: admin.id,
    action: 'client.update',
    targetType: 'client',
    targetId: id,
    details: { name: input.name },
  })

  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
  return { success: 'Cliente actualizado.' }
}

/** Soft-delete: flip status. NEVER deletes — history is preserved. */
export async function setClientStatus(formData: FormData): Promise<void> {
  const admin = await requireRole('super_admin')
  const id = String(formData.get('id') ?? '')
  const status = clientStatus.parse(formData.get('status'))
  if (!id) return

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('clients').update({ status }).eq('id', id)
  if (error) return

  await logAudit({
    actorId: admin.id,
    action: status === 'activo' ? 'client.activate' : 'client.deactivate',
    targetType: 'client',
    targetId: id,
  })
  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
}

/** Save internal notes from the profile (super_admin only). */
export async function saveClientNotes(formData: FormData): Promise<void> {
  const admin = await requireRole('super_admin')
  const id = String(formData.get('id') ?? '')
  const notes = String(formData.get('notes') ?? '').slice(0, 2000)
  if (!id) return

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('clients').update({ notes }).eq('id', id)
  if (error) return

  await logAudit({ actorId: admin.id, action: 'client.notes', targetType: 'client', targetId: id })
  revalidatePath(`/clientes/${id}`)
}
