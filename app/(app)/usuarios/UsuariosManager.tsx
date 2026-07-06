'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { UserPlus, Pencil, Power } from 'lucide-react'
import type { Profile } from '@/lib/auth/guards'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import {
  Table,
  TableHead,
  Th,
  TableBody,
  Tr,
  Td,
} from '@/components/ui/Table'
import {
  createUser,
  updateUser,
  setUserStatus,
  type ActionState,
} from './actions'

const initial: ActionState = {}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  )
}

/** Inline activate / deactivate toggle (server action). */
function StatusToggle({
  user,
  disabled,
}: {
  user: Profile
  disabled: boolean
}) {
  const next = user.status === 'activo' ? 'inactivo' : 'activo'
  return (
    <form action={setUserStatus}>
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        disabled={disabled}
        title={disabled ? 'No puedes desactivar tu propia cuenta' : `Marcar como ${next}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-gold-mid/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Power className="h-3.5 w-3.5" />
        {user.status === 'activo' ? 'Desactivar' : 'Activar'}
      </button>
    </form>
  )
}

function UserForm({
  mode,
  user,
  onDone,
}: {
  mode: 'create' | 'edit'
  user?: Profile
  onDone: () => void
}) {
  const action = mode === 'create' ? createUser : updateUser
  const [state, formAction] = useFormState(action, initial)
  const { toast } = useToast()

  useEffect(() => {
    if (state.success) {
      toast({ title: state.success, variant: 'success' })
      onDone()
    }
  }, [state.success, toast, onDone])

  return (
    <form action={formAction} className="space-y-4">
      {mode === 'edit' && <input type="hidden" name="id" value={user!.id} />}

      <Input
        id="full_name"
        name="full_name"
        label="Nombre completo"
        defaultValue={user?.full_name}
        error={state.fieldErrors?.full_name}
        required
      />

      {mode === 'create' && (
        <>
          <Input
            id="email"
            name="email"
            type="email"
            label="Correo"
            placeholder="persona@marjosdesigns.do"
            error={state.fieldErrors?.email}
            required
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Contraseña temporal"
            hint="Mínimo 8 caracteres. La persona puede cambiarla luego."
            error={state.fieldErrors?.password}
            required
          />
        </>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select id="role" name="role" label="Rol" defaultValue={user?.role ?? 'empleado'}>
          <option value="empleado">Empleado</option>
          <option value="super_admin">Super Admin</option>
        </Select>
        <Select
          id="status"
          name="status"
          label="Estado"
          defaultValue={user?.status ?? 'activo'}
        >
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </Select>
        <Input id="position" name="position" label="Cargo" defaultValue={user?.position ?? ''} />
        <Input id="phone" name="phone" label="Teléfono" defaultValue={user?.phone ?? ''} />
      </div>

      {state.error && (
        <p className="text-sm font-medium text-status-overdue">{state.error}</p>
      )}

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton label={mode === 'create' ? 'Crear usuario' : 'Guardar cambios'} />
      </div>
    </form>
  )
}

export function UsuariosManager({
  users,
  currentUserId,
}: {
  users: Profile[]
  currentUserId: string
}) {
  const [mode, setMode] = useState<null | 'create' | 'edit'>(null)
  const [editing, setEditing] = useState<Profile | undefined>()

  const openCreate = () => {
    setEditing(undefined)
    setMode('create')
  }
  const openEdit = (u: Profile) => {
    setEditing(u)
    setMode('edit')
  }
  const close = () => setMode(null)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea y administra las cuentas. Solo Super Admin.
          </p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      <Table>
        <TableHead>
          <Th>Nombre</Th>
          <Th>Rol</Th>
          <Th>Cargo</Th>
          <Th>Estado</Th>
          <Th className="text-right">Acciones</Th>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <Tr key={u.id}>
              <Td>
                <span className="font-medium">{u.full_name}</span>
                <span className="block text-xs text-muted-foreground">{u.email}</span>
              </Td>
              <Td>
                <Badge status={u.role === 'super_admin' ? 'ready' : 'process'}>
                  {u.role === 'super_admin' ? 'Super Admin' : 'Empleado'}
                </Badge>
              </Td>
              <Td className="text-muted-foreground">{u.position ?? '—'}</Td>
              <Td>
                <Badge status={u.status === 'activo' ? 'ready' : 'neutral'}>
                  {u.status === 'activo' ? 'Activo' : 'Inactivo'}
                </Badge>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-gold-mid/50 hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <StatusToggle user={u} disabled={u.id === currentUserId} />
                </div>
              </Td>
            </Tr>
          ))}
        </TableBody>
      </Table>

      <Modal
        open={mode !== null}
        onClose={close}
        title={mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
        description={
          mode === 'create'
            ? 'Crea una cuenta con su rol y estado.'
            : 'Actualiza el rol, estado y datos de la cuenta.'
        }
      >
        {mode && (
          <UserForm
            key={editing?.id ?? 'create'}
            mode={mode}
            user={editing}
            onDone={close}
          />
        )}
      </Modal>
    </div>
  )
}
