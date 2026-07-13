'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/auth/audit'
import { createUserSchema, updateUserSchema, userStatus } from '@/lib/validation/auth'
import { deleteEmployeeSchema } from '@/lib/validation/security'
import { requirePin } from '@/lib/security/pin'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ActionState {
  error?: string
  fieldErrors?: Record<string, string>
  success?: string
}

export interface DeleteEmployeeState {
  error?: string
  success?: string
  mode?: 'deleted' | 'archived'
}

/**
 * Does this employee have REAL activity? Checks the authoritative tables:
 * orders worked/created, POS sales made, payroll payments received, and order
 * stages advanced. FAIL-SAFE: an errored check counts as "has history" so we
 * never hard-delete on doubt (archiving is always reversible; deletion isn't).
 */
async function hasRealHistory(supabase: SupabaseClient, id: string): Promise<boolean> {
  const results = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).or(`assigned_to.eq.${id},created_by.eq.${id}`),
    supabase.from('pos_sales').select('id', { count: 'exact', head: true }).eq('sold_by', id),
    supabase.from('payroll_payments').select('id', { count: 'exact', head: true }).eq('profile_id', id),
    supabase.from('order_stage_history').select('id', { count: 'exact', head: true }).eq('changed_by', id),
  ])
  return results.some((r) => r.error != null || (r.count ?? 0) > 0)
}

/**
 * Smart delete (super_admin + PIN). No real history → hard-deleted. Has history
 * → ARCHIVED (hidden, but the inviolable trail in orders/nómina is preserved).
 * Never deletes yourself or the last active admin.
 */
export async function deleteEmployee(_prev: DeleteEmployeeState, formData: FormData): Promise<DeleteEmployeeState> {
  const admin = await requireRole('super_admin')
  const parsed = deleteEmployeeSchema.safeParse({ id: formData.get('id'), pin: formData.get('pin') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const { id, pin } = parsed.data

  if (id === admin.id) return { error: 'No puedes borrarte a ti misma.' }

  const supabase = createSupabaseServerClient()
  const { data: target } = await supabase.from('profiles').select('id, full_name, role, status').eq('id', id).maybeSingle()
  if (!target) return { error: 'Empleado no encontrado.' }

  // Never leave the system without an active admin.
  if (target.role === 'super_admin') {
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'super_admin').eq('status', 'activo')
    if ((count ?? 0) <= 1) return { error: 'No puedes borrar al único Super Admin activo.' }
  }

  // PIN gate — destructive action.
  const gate = await requirePin(pin)
  if (!gate.ok) return { error: gate.error }

  if (await hasRealHistory(supabase, id)) {
    if (target.status === 'archivado') return { error: 'Ese empleado ya está archivado.' }
    const { error } = await supabase.from('profiles').update({ status: 'archivado' }).eq('id', id)
    if (error) return { error: 'No se pudo archivar el empleado.' }
    await logAudit({ actorId: admin.id, action: 'user.archive', targetType: 'profile', targetId: id, details: { name: target.full_name, reason: 'has_history' } })
    revalidatePath('/usuarios')
    return { mode: 'archived', success: `${target.full_name} tiene historial real, así que se archivó (no se borró) para conservar su registro.` }
  }

  // No history → hard delete (auth user; the profile cascades).
  const adminClient = createSupabaseAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) return { error: 'No se pudo borrar el empleado.' }
  await logAudit({ actorId: admin.id, action: 'user.delete', targetType: 'profile', targetId: id, details: { name: target.full_name } })
  revalidatePath('/usuarios')
  return { mode: 'deleted', success: `${target.full_name} se borró por completo (no tenía historial).` }
}

function emptyToNull(v?: string) {
  return v && v.trim() !== '' ? v.trim() : null
}

/** Create a user (super_admin only). Profile is created by the DB trigger. */
export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole('super_admin')

  const parsed = createUserSchema.safeParse({
    email: formData.get('email'),
    full_name: formData.get('full_name'),
    password: formData.get('password'),
    role: formData.get('role'),
    position: formData.get('position') ?? '',
    phone: formData.get('phone') ?? '',
    status: formData.get('status') ?? 'activo',
  })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message
    }
    return { error: 'Revisa los campos.', fieldErrors }
  }
  const input = parsed.data

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  })

  if (error || !data.user) {
    return { error: error?.message ?? 'No se pudo crear el usuario.' }
  }

  // Create the profile explicitly with the service_role client (bypasses the
  // FORCE RLS INSERT policy). Roll back the auth user if this fails so we
  // never leave an account without a profile.
  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    email: input.email,
    full_name: input.full_name,
    role: input.role,
    position: emptyToNull(input.position),
    phone: emptyToNull(input.phone),
    status: input.status,
  })
  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id)
    return { error: 'No se pudo crear el perfil del usuario.' }
  }

  await logAudit({
    actorId: admin.id,
    action: 'user.create',
    targetType: 'profile',
    targetId: data.user.id,
    details: { email: input.email, role: input.role, status: input.status },
  })

  revalidatePath('/usuarios')
  return { success: `Usuario ${input.full_name} creado.` }
}

/** Edit a user's profile (super_admin only). Does not change the password. */
export async function updateUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole('super_admin')

  const parsed = updateUserSchema.safeParse({
    id: formData.get('id'),
    full_name: formData.get('full_name'),
    role: formData.get('role'),
    position: formData.get('position') ?? '',
    phone: formData.get('phone') ?? '',
    status: formData.get('status'),
  })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message
    }
    return { error: 'Revisa los campos.', fieldErrors }
  }
  const input = parsed.data

  // Guard: a super_admin can't lock themselves out or demote themselves.
  if (input.id === admin.id && (input.status !== 'activo' || input.role !== 'super_admin')) {
    return { error: 'No puedes cambiar tu propio rol o desactivar tu propia cuenta.' }
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.full_name,
      role: input.role,
      position: emptyToNull(input.position),
      phone: emptyToNull(input.phone),
      status: input.status,
    })
    .eq('id', input.id)

  if (error) return { error: 'No se pudo actualizar el usuario.' }

  await logAudit({
    actorId: admin.id,
    action: 'user.update',
    targetType: 'profile',
    targetId: input.id,
    details: { role: input.role, status: input.status },
  })

  revalidatePath('/usuarios')
  return { success: 'Usuario actualizado.' }
}

/** Quick activate / deactivate toggle (super_admin only). */
export async function setUserStatus(formData: FormData): Promise<void> {
  const admin = await requireRole('super_admin')
  const id = String(formData.get('id') ?? '')
  const status = userStatus.parse(formData.get('status'))

  if (!id) return
  // Can't deactivate yourself.
  if (id === admin.id && status === 'inactivo') return

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
  if (error) return

  await logAudit({
    actorId: admin.id,
    action: status === 'activo' ? 'user.activate' : 'user.deactivate',
    targetType: 'profile',
    targetId: id,
  })
  revalidatePath('/usuarios')
}
