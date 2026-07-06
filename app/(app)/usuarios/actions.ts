'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/auth/audit'
import { createUserSchema, updateUserSchema, userStatus } from '@/lib/validation/auth'

export interface ActionState {
  error?: string
  fieldErrors?: Record<string, string>
  success?: string
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
