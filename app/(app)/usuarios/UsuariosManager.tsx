'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'
import { UserPlus, Pencil, Power, Trash2, Archive, RotateCcw } from 'lucide-react'
import type { Profile } from '@/lib/auth/guards'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { PinModal } from '@/components/security/PinModal'
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
  deleteEmployee,
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

/** Inline activate / deactivate / restore toggle (server action). */
function StatusToggle({ user, disabled }: { user: Profile; disabled: boolean }) {
  const next = user.status === 'activo' ? 'inactivo' : 'activo'
  const restoring = user.status !== 'activo' && user.status !== 'inactivo'
  const label = user.status === 'activo' ? 'Desactivar' : restoring ? 'Restaurar' : 'Activar'
  return (
    <form action={setUserStatus}>
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        disabled={disabled}
        title={disabled ? 'No puedes cambiar tu propia cuenta' : label}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-gold-mid/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        {restoring ? <RotateCcw className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
        {label}
      </button>
    </form>
  )
}

function statusBadge(status: Profile['status']) {
  if (status === 'activo') return <Badge status="ready">Activo</Badge>
  if (status === 'archivado') return <Badge status="neutral">Archivado</Badge>
  return <Badge status="neutral">Inactivo</Badge>
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
          defaultValue={user?.status === 'archivado' ? 'activo' : user?.status ?? 'activo'}
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
  const router = useRouter()
  const { toast } = useToast()
  const [mode, setMode] = useState<null | 'create' | 'edit'>(null)
  const [editing, setEditing] = useState<Profile | undefined>()
  const [showArchived, setShowArchived] = useState(false)

  // Delete flow: confirm → PIN.
  const [confirming, setConfirming] = useState<Profile | null>(null)
  const [pinFor, setPinFor] = useState<Profile | null>(null)
  const [pinError, setPinError] = useState<string | undefined>()
  const [pending, startTransition] = useTransition()

  const active = users.filter((u) => u.status !== 'archivado')
  const archived = users.filter((u) => u.status === 'archivado')

  const openCreate = () => { setEditing(undefined); setMode('create') }
  const openEdit = (u: Profile) => { setEditing(u); setMode('edit') }
  const close = () => setMode(null)

  function confirmPin(pin: string) {
    if (!pinFor) return
    setPinError(undefined)
    const target = pinFor
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', target.id)
      fd.set('pin', pin)
      const res = await deleteEmployee({}, fd)
      if (res.error) { setPinError(res.error); return }
      setPinFor(null)
      toast({ title: res.success ?? 'Listo', variant: res.mode === 'archived' ? 'warning' : 'success' })
      router.refresh()
    })
  }

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
          {active.map((u) => (
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
              <Td>{statusBadge(u.status)}</Td>
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
                  <button
                    type="button"
                    onClick={() => setConfirming(u)}
                    disabled={u.id === currentUserId}
                    title={u.id === currentUserId ? 'No puedes borrarte a ti misma' : 'Borrar'}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-status-overdue/30 px-2.5 py-1 text-xs font-medium text-status-overdue transition-colors hover:bg-status-overdue/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Borrar
                  </button>
                </div>
              </Td>
            </Tr>
          ))}
        </TableBody>
      </Table>

      {/* Archived (consultables) */}
      {archived.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Archive className="h-4 w-4" />
            {showArchived ? 'Ocultar archivados' : `Ver archivados (${archived.length})`}
          </button>
          {showArchived && (
            <div className="mt-3">
              <p className="mb-2 text-xs text-muted-foreground">Tienen historial real: se conservan pero no aparecen en la lista activa. Puedes restaurarlos.</p>
              <Table>
                <TableHead>
                  <Th>Nombre</Th>
                  <Th>Rol</Th>
                  <Th>Cargo</Th>
                  <Th className="text-right">Acción</Th>
                </TableHead>
                <TableBody>
                  {archived.map((u) => (
                    <Tr key={u.id} className="opacity-70">
                      <Td>
                        <span className="font-medium">{u.full_name}</span>
                        <span className="block text-xs text-muted-foreground">{u.email}</span>
                      </Td>
                      <Td><Badge status="neutral">{u.role === 'super_admin' ? 'Super Admin' : 'Empleado'}</Badge></Td>
                      <Td className="text-muted-foreground">{u.position ?? '—'}</Td>
                      <Td>
                        <div className="flex justify-end">
                          <StatusToggle user={u} disabled={false} />
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

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

      {/* Step 1 — confirm */}
      <Modal
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title="Borrar empleado"
        description={confirming ? `Vas a borrar a ${confirming.full_name}.` : undefined}
      >
        <div className="space-y-4">
          <p className="rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm text-muted-foreground">
            Si <span className="font-medium text-foreground">nunca tuvo actividad real</span>, se borra por completo. Si <span className="font-medium text-foreground">ya trabajó órdenes, ventas o nómina</span>, se <span className="font-medium text-foreground">archiva</span> (no se borra) para no perder su historial. En ambos casos pide tu PIN.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setConfirming(null)}>Cancelar</Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => { setPinFor(confirming); setConfirming(null); setPinError(undefined) }}
            >
              Continuar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Step 2 — PIN */}
      <PinModal
        open={!!pinFor}
        onClose={() => { setPinFor(null); setPinError(undefined) }}
        onConfirm={confirmPin}
        title="Confirma con tu PIN"
        description={pinFor ? `Para borrar a ${pinFor.full_name}` : undefined}
        actionLabel="Borrar"
        loading={pending}
        error={pinError}
      />
    </div>
  )
}
